/**
 * Phase 2.5.4 — Zoho stock push handler + dispatch integration tests.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { TasksService } from 'src/services/tasks/tasks.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { DOMAIN_EVENT_STATUS, DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { IntegrationRepository } from 'src/services/integrations/integration.repository';
import { ZohoStockPushHandler } from 'src/services/integrations/zoho/zoho-stock-push.handler';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  ITEM_MAPPING_SYNC_STATUS,
  PUSH_DELIVERY_STATUS,
} from 'src/services/integrations/integration.constants';
import {
  createInventoryItemWithStock,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Phase 2.5.4 Zoho stock push handler', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let tasksService: TasksService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let domainEventsService: DomainEventsService;
  let integrationRepository: IntegrationRepository;
  let pushHandler: ZohoStockPushHandler;
  let zohoInventoryClient: ZohoInventoryClient;
  let tokenCrypto: TokenCryptoService;

  beforeAll(async () => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY =
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
      'test-integration-encryption-key-32chars-min';

    dbUp = await probePostgres();
    if (!dbUp) return;
    runMigrations();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DbModule,
        UserModule,
        DepartmentsModule,
        InventoryModule,
        IntegrationModule,
        DomainEventsModule,
        TasksModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    tasksService = module.get(TasksService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    domainEventsService = module.get(DomainEventsService);
    integrationRepository = module.get(IntegrationRepository);
    pushHandler = module.get(ZohoStockPushHandler);
    zohoInventoryClient = module.get(ZohoInventoryClient);
    tokenCrypto = module.get(TokenCryptoService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    if (zohoInventoryClient) {
      zohoInventoryClient.setAdjustStockHandler(null);
    }
  });

  afterEach(async () => {
    if (!dbUp || !dbService) return;
    await dbService.sqlService.DomainEvent.update(
      { status: DOMAIN_EVENT_STATUS.COMPLETED },
      {
        where: {
          event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED,
          status: DOMAIN_EVENT_STATUS.PENDING,
        },
      },
    );
  });

  async function seedConnection(factoryId: number) {
    return integrationRepository.createConnection({
      factory_id: factoryId,
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      access_token: tokenCrypto.encrypt('mock-access-token'),
      refresh_token: tokenCrypto.encrypt('mock-refresh-token'),
      expires_at: new Date(Date.now() + 3600_000),
      metadata: {
        api_domain: 'https://www.zohoapis.in',
        org_id: '10234695',
      },
    });
  }

  async function completeTaskWithMovement(
    tag: string,
    movementType: 'STOCK_OUT' | 'STOCK_IN',
    qty: string,
  ) {
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
    const item = await createInventoryItemWithStock(
      inventoryService,
      inventoryTransactionService,
      fx,
      tag,
      movementType === 'STOCK_OUT' ? '20' : '0',
      fx.ownerId,
    );

    const task = await tasksService.adminCreate({
      factory_id: fx.factoryId,
      assigned_to: fx.workerId,
      assigned_by: fx.ownerId,
      description: `Push ${tag}`,
      inventory_lines: [
        {
          inventory_item_id: item.id,
          quantity_expected: qty,
          movement_type: movementType,
        },
      ],
    });

    await tasksService.adminComplete(task.id, true);

    const event = await dbService.sqlService.DomainEvent.findOne({
      where: {
        event_type: DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED,
        factory_id: fx.factoryId,
      },
      order: [['id', 'DESC']],
    });

    const ledger = await dbService.sqlService.InventoryTransaction.findOne({
      where: {
        factory_id: fx.factoryId,
        reference_type: 'TASK',
        reference_id: task.id,
      },
    });

    return { fx, task, item, event: event!, ledger: ledger! };
  }

  async function processEvent(eventId: number) {
    const event = await dbService.sqlService.DomainEvent.findByPk(eventId);
    await pushHandler.handle(event!);
  }

  async function getDelivery(
    factoryId: number,
    inventoryTransactionId: number,
  ) {
    const connection = await integrationRepository.findActiveConnectionByProvider(
      factoryId,
      INTEGRATION_PROVIDER.ZOHO_INVENTORY,
    );
    return integrationRepository.findDelivery(
      factoryId,
      connection!.id,
      inventoryTransactionId,
    );
  }

  it('1 — mapped STOCK_OUT push delivers to Zoho', async () => {
    requireDb(dbUp);
    const { fx, item, event, ledger } = await completeTaskWithMovement(
      'ph-out',
      'STOCK_OUT',
      '2',
    );
    const connection = await seedConnection(fx.factoryId);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: 'zoho-ext-out',
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });

    let capturedType = '';
    zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
      capturedType = ctx.signedQuantity;
      return { success: true, externalReference: 'zoho-adj-out-1' };
    });

    await processEvent(event.id);

    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
    expect(delivery!.zoho_reference).toBe('zoho-adj-out-1');
    expect(delivery!.delivered_at).not.toBeNull();
    expect(capturedType).toBe('-2');
  });

  it('2 — mapped STOCK_IN push delivers to Zoho', async () => {
    requireDb(dbUp);
    const { fx, item, event, ledger } = await completeTaskWithMovement(
      'ph-in',
      'STOCK_IN',
      '4',
    );
    const connection = await seedConnection(fx.factoryId);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: 'zoho-ext-in',
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });

    let capturedType = '';
    zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
      capturedType = ctx.signedQuantity;
      return { success: true, externalReference: 'zoho-adj-in-1' };
    });

    await processEvent(event.id);

    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
    expect(capturedType).toBe('4');
  });

  it('3 — unmapped item marks SKIPPED_UNMAPPED without API call', async () => {
    requireDb(dbUp);
    const { fx, event, ledger } = await completeTaskWithMovement(
      'ph-unmapped',
      'STOCK_OUT',
      '1',
    );
    await seedConnection(fx.factoryId);

    const postSpy = jest.spyOn((zohoInventoryClient as any).http, 'post');

    await processEvent(event.id);

    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.SKIPPED_UNMAPPED);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('4 — duplicate event replay does not invoke adjustStock twice', async () => {
    requireDb(dbUp);
    const { fx, item, event, ledger } = await completeTaskWithMovement(
      'ph-dup',
      'STOCK_OUT',
      '1',
    );
    const connection = await seedConnection(fx.factoryId);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: 'zoho-ext-dup',
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });

    let calls = 0;
    zohoInventoryClient.setAdjustStockHandler(async () => {
      calls += 1;
      return { success: true, externalReference: 'zoho-dup-1' };
    });

    await processEvent(event.id);
    await processEvent(event.id);

    expect(calls).toBe(1);
    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
  });

  it('5 — client failure marks delivery FAILED', async () => {
    requireDb(dbUp);
    const { fx, item, event, ledger } = await completeTaskWithMovement(
      'ph-fail',
      'STOCK_OUT',
      '1',
    );
    const connection = await seedConnection(fx.factoryId);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: 'zoho-ext-fail',
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });

    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: false,
      code: 'server_error',
      message: 'Zoho unavailable',
      httpStatus: 503,
      retryable: true,
    }));

    await processEvent(event.id);

    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.FAILED);
    expect(delivery!.last_error).toContain('Zoho unavailable');
  });

  it('6 — dispatch via processPendingBatch completes domain event', async () => {
    requireDb(dbUp);
    const { fx, item, event, ledger } = await completeTaskWithMovement(
      'ph-dispatch',
      'STOCK_OUT',
      '1',
    );
    const connection = await seedConnection(fx.factoryId);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: 'zoho-ext-dispatch',
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });

    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: true,
      externalReference: 'zoho-dispatch-1',
    }));

    const processed = await domainEventsService.processPendingBatch(50);
    expect(processed).toBeGreaterThanOrEqual(1);

    const reloaded = await dbService.sqlService.DomainEvent.findByPk(event.id);
    expect(reloaded!.status).toBe(DOMAIN_EVENT_STATUS.COMPLETED);

    const delivery = await getDelivery(fx.factoryId, ledger.id);
    expect(delivery!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
  });
});
