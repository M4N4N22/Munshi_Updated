/**
 * Phase 2.4 — scheduled Zoho pull sync tests (mocked, no real cron delays).
 */
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { ZohoOAuthClient } from 'src/services/integrations/zoho/zoho-oauth.client';
import { ZohoOAuthStateService } from 'src/services/integrations/zoho/zoho-oauth-state.service';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { ZohoScheduledSyncService } from 'src/services/integrations/zoho/zoho-scheduled-sync.service';
import { ZohoInventoryItemRecord } from 'src/services/integrations/zoho/zoho-inventory.types';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  SYNC_DIRECTION,
  SYNC_STATUS,
  SYNC_TRIGGER,
} from 'src/services/integrations/integration.constants';
import { seedPhase0Fixture } from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Phase 2.4 Zoho scheduled sync', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let scheduledSyncService: ZohoScheduledSyncService;
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
    process.env.ZOHO_SYNC_ENABLED = 'true';
    process.env.ZOHO_SYNC_INTERVAL_MINUTES = '360';

    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();
    const status = migrationStatusJson();
    if (status.pending_count > 0) {
      throw new Error(`Migrations pending (${status.pending_count})`);
    }

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
    scheduledSyncService = module.get(ZohoScheduledSyncService);
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

    const zohoInventoryClient = module.get(ZohoInventoryClient);
    zohoInventoryClient.setFetchAllHandler(async () => mockItems);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    stateService.resetForTests();
    mockItems = [];
    process.env.ZOHO_SYNC_ENABLED = 'true';
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
    return {
      ...fx,
      categoryName: cat!.name,
      locationName: loc!.name,
    };
  }

  async function createActiveConnection(factoryId: number, ownerId: number) {
    const state = stateService.createState(factoryId, ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);
    return dbService.sqlService.IntegrationConnection.findOne({
      where: {
        factory_id: factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      },
    });
  }

  function zohoItem(
    partial: Partial<ZohoInventoryItemRecord> & { item_id: string; sku: string },
    fx: { categoryName: string; locationName: string },
  ): ZohoInventoryItemRecord {
    return {
      name: partial.name ?? `Item ${partial.sku}`,
      unit: partial.unit ?? 'pcs',
      category_name: partial.category_name ?? fx.categoryName,
      location_name: partial.location_name ?? fx.locationName,
      available_stock: partial.available_stock ?? 0,
      reorder_level: partial.reorder_level ?? null,
      ...partial,
    };
  }

  it('executes runPullSync for active connection', async () => {
    requireDb(dbUp);
    const fx = await seedFx('sched-active');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);
    mockItems = [
      zohoItem({ item_id: 'sch-1', sku: 'SCH-1', available_stock: 2 }, fx),
    ];

    const result = await scheduledSyncService.runScheduledSyncForConnection(
      connection!.id,
      fx.factoryId,
    );
    expect(result.outcome).toBe('synced');

    const run = await dbService.sqlService.IntegrationSyncRun.findOne({
      where: {
        factory_id: fx.factoryId,
        connection_id: connection!.id,
        trigger: SYNC_TRIGGER.CRON,
        direction: SYNC_DIRECTION.PULL,
      },
      order: [['id', 'DESC']],
    });
    expect(run).not.toBeNull();
    expect(run!.status).toBe(SYNC_STATUS.COMPLETED);
  });

  it('skips inactive connections', async () => {
    requireDb(dbUp);
    const fx = await seedFx('sched-inactive');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);
    await connection!.update({ status: INTEGRATION_CONNECTION_STATUS.DISCONNECTED });

    const result = await scheduledSyncService.runScheduledSyncForConnection(
      connection!.id,
      fx.factoryId,
    );
    expect(result.outcome).toBe('skipped');
    if (result.outcome === 'skipped') {
      expect(result.reason).toBe('inactive_connection');
    }
  });

  it('records failure and continues with other connections', async () => {
    requireDb(dbUp);
    const fxA = await seedFx('sched-fail-a');
    const fxB = await seedFx('sched-fail-b');
    const connA = await createActiveConnection(fxA.factoryId, fxA.ownerId);
    const connB = await createActiveConnection(fxB.factoryId, fxB.ownerId);

    mockItems = [
      zohoItem(
        { item_id: 'bad', sku: 'BAD', category_name: 'Missing Category XYZ' },
        fxA,
      ),
    ];
    const resultA = await scheduledSyncService.runScheduledSyncForConnection(
      connA!.id,
      fxA.factoryId,
    );
    expect(resultA.outcome).toBe('synced');

    mockItems = [
      zohoItem({ item_id: 'ok', sku: 'OK-1', available_stock: 1 }, fxB),
    ];
    const resultB = await scheduledSyncService.runScheduledSyncForConnection(
      connB!.id,
      fxB.factoryId,
    );
    expect(resultB.outcome).toBe('synced');

    const runA = await dbService.sqlService.IntegrationSyncRun.findOne({
      where: { connection_id: connA!.id, trigger: SYNC_TRIGGER.CRON },
      order: [['id', 'DESC']],
    });
    expect(runA!.status).toBe(SYNC_STATUS.FAILED);

    const runB = await dbService.sqlService.IntegrationSyncRun.findOne({
      where: { connection_id: connB!.id, trigger: SYNC_TRIGGER.CRON },
      order: [['id', 'DESC']],
    });
    expect(runB!.status).toBe(SYNC_STATUS.COMPLETED);
  });

  it('skips duplicate run when sync already running', async () => {
    requireDb(dbUp);
    const fx = await seedFx('sched-dup');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    await dbService.sqlService.IntegrationSyncRun.create({
      connection_id: connection!.id,
      factory_id: fx.factoryId,
      direction: SYNC_DIRECTION.PULL,
      trigger: SYNC_TRIGGER.CRON,
      status: SYNC_STATUS.RUNNING,
      items_processed: 0,
      started_at: new Date(),
    } as any);

    const result = await scheduledSyncService.runScheduledSyncForConnection(
      connection!.id,
      fx.factoryId,
    );
    expect(result.outcome).toBe('skipped');
    if (result.outcome === 'skipped') {
      expect(result.reason).toBe('sync_already_running');
    }
  });

  it('exposes last sync metadata via connections API', async () => {
    requireDb(dbUp);
    const fx = await seedFx('sched-meta');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);
    mockItems = [
      zohoItem({ item_id: 'meta-1', sku: 'META-1', available_stock: 1 }, fx),
    ];

    await scheduledSyncService.runScheduledSyncForConnection(
      connection!.id,
      fx.factoryId,
    );

    const res = await request(app.getHttpServer())
      .get('/integrations/connections')
      .query({ factory_id: fx.factoryId, user_id: fx.ownerId })
      .expect(200);

    const body = res.body.data ?? res.body;
    const zoho = body.find(
      (c: { provider: string }) => c.provider === INTEGRATION_PROVIDER.ZOHO_INVENTORY,
    );
    expect(zoho.last_sync_run_id).toBeGreaterThan(0);
    expect(zoho.last_sync_status).toBe(SYNC_STATUS.COMPLETED);
    expect(zoho.last_sync_at).toBeTruthy();
    expect(zoho.last_successful_sync_at).toBeTruthy();
  });

  it('respects disabled scheduler flag', async () => {
    requireDb(dbUp);
    process.env.ZOHO_SYNC_ENABLED = 'false';
    const fx = await seedFx('sched-off');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    const result = await scheduledSyncService.runScheduledSyncForConnection(
      connection!.id,
      fx.factoryId,
    );
    expect(result.outcome).toBe('skipped');
    if (result.outcome === 'skipped') {
      expect(result.reason).toBe('scheduler_disabled');
    }
  });
});
