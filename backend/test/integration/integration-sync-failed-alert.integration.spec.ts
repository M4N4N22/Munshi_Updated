/**
 * Phase 3.2 — integration sync failure alert tests.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { MessagingModule } from 'src/core/messaging/messaging.module';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { ZohoPullSyncService } from 'src/services/integrations/zoho/zoho-pull-sync.service';
import { ZohoScheduledSyncService } from 'src/services/integrations/zoho/zoho-scheduled-sync.service';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { ZohoOAuthClient } from 'src/services/integrations/zoho/zoho-oauth.client';
import { ZohoOAuthStateService } from 'src/services/integrations/zoho/zoho-oauth-state.service';
import { IntegrationRepository } from 'src/services/integrations/integration.repository';
import { IntegrationSyncFailedPublisher } from 'src/services/integrations/integration-sync-failed.publisher';
import { IntegrationSyncFailedAlertHandler } from 'src/services/integrations/integration-sync-failed-alert.handler';
import { ZohoPushRetryService } from 'src/services/integrations/zoho/zoho-push-retry.service';
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import { SYNC_FAILED_AGGREGATE_TYPE } from 'src/services/integrations/integration-sync-failed.helper';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  ITEM_MAPPING_SYNC_STATUS,
  PUSH_DELIVERY_STATUS,
} from 'src/services/integrations/integration.constants';
import { MAX_PUSH_DELIVERY_ATTEMPTS } from 'src/services/integrations/zoho/zoho-push-retry.constants';
import { TASK_INVENTORY_REFERENCE_TYPE } from 'src/services/tasks/tasks.inventory.constants';
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

async function countSyncFailedEvents(
  dbService: DbService,
  factoryId?: number,
): Promise<number> {
  const rows = await dbService.sqlService.DomainEvent.findAll({
    where: { event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED },
  });
  if (factoryId == null) return rows.length;
  return rows.filter((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    return payload.factory_id === factoryId;
  }).length;
}

describe('Phase 3.2 integration sync failure alert', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let pullSyncService: ZohoPullSyncService;
  let scheduledSyncService: ZohoScheduledSyncService;
  let pushRetryService: ZohoPushRetryService;
  let integrationRepository: IntegrationRepository;
  let syncFailedPublisher: IntegrationSyncFailedPublisher;
  let syncFailedAlertHandler: IntegrationSyncFailedAlertHandler;
  let domainEventsService: DomainEventsService;
  let messagingService: MessagingService;
  let zohoInventoryClient: ZohoInventoryClient;
  let zohoOAuthService: ZohoOAuthStateService;
  let tokenCrypto: TokenCryptoService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;

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
        MessagingModule,
        InventoryModule,
        DomainEventsModule,
        IntegrationModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    pullSyncService = module.get(ZohoPullSyncService);
    scheduledSyncService = module.get(ZohoScheduledSyncService);
    pushRetryService = module.get(ZohoPushRetryService);
    integrationRepository = module.get(IntegrationRepository);
    syncFailedPublisher = module.get(IntegrationSyncFailedPublisher);
    syncFailedAlertHandler = module.get(IntegrationSyncFailedAlertHandler);
    domainEventsService = module.get(DomainEventsService);
    messagingService = module.get(MessagingService);
    zohoInventoryClient = module.get(ZohoInventoryClient);
    zohoOAuthService = module.get(ZohoOAuthStateService);
    tokenCrypto = module.get(TokenCryptoService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);

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
    zohoInventoryClient.setFetchAllHandler(async () => []);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    zohoInventoryClient.setFetchAllHandler(async () => []);
    zohoInventoryClient.setAdjustStockHandler(null);
  });

  async function createConnection(fx: Awaited<ReturnType<typeof seedPhase0Fixture>>) {
    return integrationRepository.createConnection({
      factory_id: fx.factoryId,
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      access_token: tokenCrypto.encrypt('mock-access-token'),
      refresh_token: tokenCrypto.encrypt('mock-refresh-token'),
      expires_at: new Date(Date.now() + 3600_000),
      metadata: {
        api_domain: 'https://www.zohoapis.in',
        org_id: '10234695',
        connected_by_user_id: fx.ownerId,
      },
    });
  }

  async function seedFailedDeliverySetup(tag: string) {
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
      '10',
      fx.ownerId,
    );
    const ledger = await inventoryTransactionService.recordStockOut({
      factory_id: fx.factoryId,
      inventory_item_id: item.id,
      quantity: '1',
      created_by: fx.ownerId,
      reference_type: TASK_INVENTORY_REFERENCE_TYPE,
      reference_id: 1,
    });
    const connection = await createConnection(fx);
    await integrationRepository.createMapping({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      external_id: `zoho-${tag}`,
      inventory_item_id: item.id,
      sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
    });
    const delivery = await integrationRepository.markFailedWithRetry(
      (
        await integrationRepository.createDelivery({
          connection_id: connection.id,
          factory_id: fx.factoryId,
          inventory_transaction_id: ledger.id,
        })
      ).id,
      fx.factoryId,
      'Initial failure',
      { retryCount: 1, nextRetryAt: new Date(Date.now() - 60_000) },
    );
    return { fx, connection, delivery: delivery! };
  }

  it('1 — manual pull failure publishes event', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sf-manual',
    );
    const connection = await createConnection(fx);
    const before = await countSyncFailedEvents(dbService, fx.factoryId);

    zohoInventoryClient.setFetchAllHandler(async () => {
      throw new Error('Token expired');
    });

    await expect(
      pullSyncService.runPullSync(connection.id, fx.factoryId, fx.ownerId),
    ).rejects.toThrow('Token expired');

    const after = await countSyncFailedEvents(dbService, fx.factoryId);
    expect(after - before).toBe(1);

    const event = (
      await dbService.sqlService.DomainEvent.findAll({
        where: {
          event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
          factory_id: fx.factoryId,
        },
        order: [['id', 'DESC']],
        limit: 1,
      })
    )[0];
    const payload = event.payload as Record<string, unknown>;
    expect(payload.direction).toBe('pull');
    expect(payload.sync_run_id).toBeGreaterThan(0);
    expect(String(payload.error_summary)).toContain('Token expired');
  });

  it('2 — scheduled pull failure publishes event', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sf-sched',
    );
    const connection = await createConnection(fx);
    const before = await countSyncFailedEvents(dbService, fx.factoryId);

    zohoInventoryClient.setFetchAllHandler(async () => {
      throw new Error('Scheduled pull down');
    });

    const result = await scheduledSyncService.runScheduledSyncForConnection(
      connection.id,
      fx.factoryId,
    );
    expect(result.outcome).toBe('failed');

    const after = await countSyncFailedEvents(dbService, fx.factoryId);
    expect(after - before).toBe(1);
  });

  it('3 — terminal push failure publishes event', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('sf-push-term');
    const before = await countSyncFailedEvents(dbService, fx.factoryId);

    await integrationRepository.markFailedWithRetry(
      delivery.id,
      fx.factoryId,
      'Almost max',
      {
        retryCount: MAX_PUSH_DELIVERY_ATTEMPTS - 1,
        nextRetryAt: new Date(Date.now() - 60_000),
      },
    );

    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: false,
      code: 'server_error',
      message: 'Permanent outage',
      retryable: true,
    }));

    await pushRetryService.retryDelivery(
      (await integrationRepository.findDelivery(
        fx.factoryId,
        delivery.connection_id,
        delivery.inventory_transaction_id,
      ))!,
    );

    const after = await countSyncFailedEvents(dbService, fx.factoryId);
    expect(after - before).toBe(1);

    const event = (
      await dbService.sqlService.DomainEvent.findAll({
        where: {
          event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
          aggregate_type: SYNC_FAILED_AGGREGATE_TYPE.PUSH_DELIVERY,
          aggregate_id: String(delivery.id),
        },
      })
    )[0];
    expect(event).toBeDefined();
    const payload = event.payload as Record<string, unknown>;
    expect(payload.direction).toBe('push');
    expect(payload.delivery_id).toBe(delivery.id);
  });

  it('4 — successful retry does not publish sync failure event', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('sf-retry-ok');
    const before = await countSyncFailedEvents(dbService, fx.factoryId);

    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: true,
      externalReference: 'recovered-1',
    }));

    await pushRetryService.retryDelivery(delivery);

    const after = await countSyncFailedEvents(dbService, fx.factoryId);
    expect(after - before).toBe(0);

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
  });

  it('5 — dedup produces single event per sync_run_id', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sf-dedup',
    );
    const connection = await createConnection(fx);

    const syncRunId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    await syncFailedPublisher.publishPullSyncFailure({
      factoryId: fx.factoryId,
      connectionId: connection.id,
      syncRunId,
      errorSummary: 'Once only',
    });
    await syncFailedPublisher.publishPullSyncFailure({
      factoryId: fx.factoryId,
      connectionId: connection.id,
      syncRunId,
      errorSummary: 'Duplicate attempt',
    });

    const rows = await dbService.sqlService.DomainEvent.findAll({
      where: {
        event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
        aggregate_type: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
        aggregate_id: String(syncRunId),
      },
    });
    expect(rows.length).toBe(1);
  });

  it('6 — handler sends WhatsApp to owner', async () => {
    requireDb(dbUp);
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      'sf-wa',
    );
    const connection = await createConnection(fx);
    const sendSpy = jest
      .spyOn(messagingService, 'sendText')
      .mockResolvedValue(undefined);

    const syncRunId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    await syncFailedPublisher.publishPullSyncFailure({
      factoryId: fx.factoryId,
      connectionId: connection.id,
      syncRunId,
      errorSummary: 'Token expired',
    });

    const event = await dbService.sqlService.DomainEvent.findOne({
      where: {
        event_type: DOMAIN_EVENT_TYPE.INTEGRATION_SYNC_FAILED,
        aggregate_type: SYNC_FAILED_AGGREGATE_TYPE.SYNC_RUN,
        aggregate_id: String(syncRunId),
      },
      order: [['id', 'DESC']],
    });
    expect(event).toBeTruthy();
    await syncFailedAlertHandler.handle(event!);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [, message] = sendSpy.mock.calls[0];
    expect(message).toContain('Integration Sync Failed');
    expect(message).toContain('Token expired');
    expect(message).toContain('Please reconnect integration');
  });
});
