/**
 * Phase 2.5.1 — Zoho stock push event capture integration tests.
 * Events are persisted after task completion commit only (R-P05-02).
 */
import * as request from 'supertest';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { TasksService } from 'src/services/tasks/tasks.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { InventoryImportService } from 'src/services/inventory/inventory-import.service';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { INVENTORY_REFERENCE_TYPE } from 'src/services/inventory/inventory.constants';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
} from 'src/services/integrations/integration.constants';
import { ZohoOAuthClient } from 'src/services/integrations/zoho/zoho-oauth.client';
import { ZohoOAuthStateService } from 'src/services/integrations/zoho/zoho-oauth-state.service';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { ZohoInventoryItemRecord } from 'src/services/integrations/zoho/zoho-inventory.types';
import type { InventoryCsvRow } from 'src/modules/whatsapp/inventory-csv.parse';
import {
  createInventoryItemWithStock,
  createTestApp,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function csvRow(
  partial: Partial<InventoryCsvRow> & Pick<InventoryCsvRow, 'line' | 'sku'>,
): InventoryCsvRow {
  return {
    name: partial.name ?? partial.sku,
    category: partial.category ?? 'Cat-Default',
    location: partial.location ?? 'Loc-Default',
    unit: partial.unit ?? 'pcs',
    quantity: partial.quantity ?? '0.0000',
    reorder_threshold: partial.reorder_threshold ?? null,
    ...partial,
  };
}

async function countStockPushEvents(
  dbService: DbService,
  filter?: { taskId?: number; factoryId?: number },
): Promise<number> {
  const rows = await dbService.sqlService.DomainEvent.findAll({
    where: { event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED },
  });
  if (!filter) return rows.length;
  return rows.filter((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (filter.factoryId != null && payload.factory_id !== filter.factoryId) {
      return false;
    }
    if (filter.taskId != null && payload.task_id !== filter.taskId) {
      return false;
    }
    return true;
  }).length;
}

async function listStockPushEventsForTask(
  dbService: DbService,
  taskId: number,
): Promise<
  {
    inventory_transaction_id: number;
    transaction_type: string;
    factory_id: number;
    task_id: number;
  }[]
> {
  const rows = await dbService.sqlService.DomainEvent.findAll({
    where: { event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED },
    order: [['id', 'ASC']],
  });
  return rows
    .map((row) => row.payload as Record<string, unknown>)
    .filter((payload) => payload.task_id === taskId)
    .map((payload) => ({
      factory_id: payload.factory_id as number,
      inventory_transaction_id: payload.inventory_transaction_id as number,
      task_id: payload.task_id as number,
      transaction_type: payload.transaction_type as string,
    }));
}

describe('Phase 2.5.1 Zoho stock push event capture', () => {
  let dbUp = false;
  let app: INestApplication;
  let tasksService: TasksService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let importService: InventoryImportService;
  let dbService: DbService;

  beforeAll(async () => {
    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending (${status.pending_count})`);
    }
    const ctx = await createTestApp();
    app = ctx.app;
    tasksService = ctx.tasksService;
    inventoryService = ctx.inventoryService;
    inventoryTransactionService = ctx.inventoryTransactionService;
    importService = ctx.module.get(InventoryImportService);
    dbService = ctx.dbService;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1 — task complete publishes ZOHO_STOCK_PUSH_REQUESTED', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sp1',
    );
    const item = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      'SP1',
      '10',
      fx.ownerId,
    );

    const task = await tasksService.adminCreate({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      description: 'Stock push single line',
      inventory_lines: [
        {
          inventory_item_id: item.id,
          quantity_expected: '2',
          movement_type: 'STOCK_OUT',
        },
      ],
    });

    await tasksService.adminComplete(task.id, true);

    const events = await listStockPushEventsForTask(dbService, task.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      factory_id: fx.factoryId,
      task_id: task.id,
      transaction_type: 'STOCK_OUT',
    });
    expect(events[0].inventory_transaction_id).toBeGreaterThan(0);

    const ledger = await dbService.sqlService.InventoryTransaction.findByPk(
      events[0].inventory_transaction_id,
    );
    expect(ledger?.reference_type).toBe('TASK');
    expect(ledger?.reference_id).toBe(task.id);
  });

  it('2 — multi-line task publishes one event per inventory transaction', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sp2',
    );
    const itemA = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      'SPA',
      '20',
      fx.ownerId,
    );
    const itemB = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      'SPB',
      '10',
      fx.ownerId,
    );

    const task = await tasksService.adminCreate({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      description: 'Stock push multi-line',
      inventory_lines: [
        {
          inventory_item_id: itemA.id,
          quantity_expected: '2',
          movement_type: 'STOCK_OUT',
        },
        {
          inventory_item_id: itemB.id,
          quantity_expected: '1',
          movement_type: 'STOCK_OUT',
        },
      ],
    });

    await tasksService.adminComplete(task.id, true);

    const events = await listStockPushEventsForTask(dbService, task.id);
    expect(events).toHaveLength(2);
    expect(new Set(events.map((e) => e.inventory_transaction_id)).size).toBe(2);
    expect(events.every((e) => e.transaction_type === 'STOCK_OUT')).toBe(true);
  });

  it('3 — task failure publishes no events', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sp3',
    );
    const item = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      'SP3',
      '2',
      fx.ownerId,
    );

    const task = await tasksService.adminCreate({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      description: 'Stock push fail',
      inventory_lines: [
        {
          inventory_item_id: item.id,
          quantity_expected: '5',
          movement_type: 'STOCK_OUT',
        },
      ],
    });

    const before = await countStockPushEvents(dbService, { taskId: task.id });

    await expect(tasksService.adminComplete(task.id, true)).rejects.toThrow(
      /Insufficient stock/i,
    );

    const after = await countStockPushEvents(dbService, { taskId: task.id });
    expect(after).toBe(before);
  });

  it('4 — inventory rollback publishes no events', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sp4',
    );
    const item = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      'SP4',
      '10',
      fx.ownerId,
    );

    const task = await tasksService.adminCreate({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      description: 'Stock push rollback',
      inventory_lines: [
        {
          inventory_item_id: item.id,
          quantity_expected: '3',
          movement_type: 'STOCK_OUT',
        },
        {
          inventory_item_id: item.id,
          quantity_expected: '15',
          movement_type: 'STOCK_OUT',
        },
      ],
    });

    const before = await countStockPushEvents(dbService, { taskId: task.id });

    await expect(tasksService.adminComplete(task.id, true)).rejects.toThrow(
      BadRequestException,
    );

    const after = await countStockPushEvents(dbService, { taskId: task.id });
    expect(after).toBe(before);
  });

  it('5 — CSV import publishes no ZOHO_STOCK_PUSH_REQUESTED events', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sp5',
    );
    const cat = await dbService.sqlService.InventoryCategory.findByPk(fx.categoryId);
    const loc = await dbService.sqlService.InventoryLocation.findByPk(fx.locationId);
    const batchId = 25051;
    const sku = `CSV_SP_${randomUUID().slice(0, 8)}`;

    const before = await countStockPushEvents(dbService, { factoryId: fx.factoryId });

    await importService.processImport(
      fx.factoryId,
      fx.ownerId,
      [
        csvRow({
          line: 2,
          sku,
          name: 'CSV Push Test',
          category: cat!.name,
          location: loc!.name,
          quantity: '7.0000',
        }),
      ],
      batchId,
    );

    const csvLedger = await dbService.sqlService.InventoryTransaction.count({
      where: {
        factory_id: fx.factoryId,
        reference_type: INVENTORY_REFERENCE_TYPE.CSV_IMPORT,
        reference_id: batchId,
      },
    });
    expect(csvLedger).toBeGreaterThan(0);

    const after = await countStockPushEvents(dbService, { factoryId: fx.factoryId });
    expect(after).toBe(before);
  });
});

describe('Phase 2.5.1 Zoho pull — no stock push events', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let zohoInventoryClient: ZohoInventoryClient;
  let stateService: ZohoOAuthStateService;
  let mockItems: ZohoInventoryItemRecord[] = [];

  beforeAll(async () => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY =
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
      'test-integration-encryption-key-32chars-min';
    process.env.ZOHO_CLIENT_ID = 'test-zoho-client-id';
    process.env.ZOHO_CLIENT_SECRET = 'test-zoho-client-secret';
    process.env.ZOHO_REDIRECT_URI =
      'http://localhost:4001/integrations/zoho/callback';
    process.env.ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.in';

    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DbModule,
        UserModule,
        InventoryModule,
        IntegrationModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dbService = module.get(DbService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    zohoInventoryClient = module.get(ZohoInventoryClient);
    stateService = module.get(ZohoOAuthStateService);

    const zohoOAuthClient = module.get(ZohoOAuthClient);
    zohoOAuthClient.setExchangeHandler(async () => ({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      api_domain: 'https://www.zohoapis.in',
    }));
    zohoOAuthClient.setRefreshHandler(async () => ({
      access_token: 'mock-access-token-refreshed',
      expires_in: 3600,
      api_domain: 'https://www.zohoapis.in',
    }));
    zohoInventoryClient.setFetchAllHandler(async () => mockItems);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    stateService.resetForTests();
    mockItems = [];
  });

  async function seedFx(tag: string) {
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
    const cat = await dbService.sqlService.InventoryCategory.findByPk(fx.categoryId);
    const loc = await dbService.sqlService.InventoryLocation.findByPk(fx.locationId);
    return { ...fx, categoryName: cat!.name, locationName: loc!.name };
  }

  async function createActiveConnection(factoryId: number, ownerId: number) {
    const state = stateService.createState(factoryId, ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);
    const connection = await dbService.sqlService.IntegrationConnection.findOne({
      where: {
        factory_id: factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      },
    });
    return connection!;
  }

  it('6 — ZOHO_PULL sync publishes no ZOHO_STOCK_PUSH_REQUESTED events', async () => {
    requireDb(dbUp);
    const fx = await seedFx('sp6');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      {
        item_id: 'z-sp6',
        sku: `PULL-SP6-${randomUUID().slice(0, 6)}`,
        name: 'Pull No Push',
        unit: 'pcs',
        category_name: fx.categoryName,
        location_name: fx.locationName,
        available_stock: 8,
        reorder_level: null,
      },
    ];

    const before = await countStockPushEvents(dbService, { factoryId: fx.factoryId });

    const res = await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const summary = res.body.data ?? res.body;
    expect(summary.addedCount).toBe(1);

    const zohoLedger = await dbService.sqlService.InventoryTransaction.count({
      where: {
        factory_id: fx.factoryId,
        reference_type: INVENTORY_REFERENCE_TYPE.ZOHO_PULL,
        reference_id: summary.syncRunId,
      },
    });
    expect(zohoLedger).toBe(1);

    const after = await countStockPushEvents(dbService, { factoryId: fx.factoryId });
    expect(after).toBe(before);
  });
});
