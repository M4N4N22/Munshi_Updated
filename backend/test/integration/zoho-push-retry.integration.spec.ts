/**
 * Phase 2.5.5 — push delivery retry processing integration tests.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { IntegrationRepository } from 'src/services/integrations/integration.repository';
import { ZohoPushRetryService } from 'src/services/integrations/zoho/zoho-push-retry.service';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { ZohoOAuthService } from 'src/services/integrations/zoho/zoho-oauth.service';
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
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
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Phase 2.5.5 push delivery retry', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let integrationRepository: IntegrationRepository;
  let pushRetryService: ZohoPushRetryService;
  let zohoInventoryClient: ZohoInventoryClient;
  let zohoOAuthService: ZohoOAuthService;
  let tokenCrypto: TokenCryptoService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;

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
        InventoryModule,
        IntegrationModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    dbService = module.get(DbService);
    integrationRepository = module.get(IntegrationRepository);
    pushRetryService = module.get(ZohoPushRetryService);
    zohoInventoryClient = module.get(ZohoInventoryClient);
    zohoOAuthService = module.get(ZohoOAuthService);
    tokenCrypto = module.get(TokenCryptoService);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    zohoInventoryClient.setAdjustStockHandler(null);
    jest.restoreAllMocks();
  });

  async function seedFailedDeliverySetup(tag: string, withMapping = true) {
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
    const connection = await integrationRepository.createConnection({
      factory_id: fx.factoryId,
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      access_token: tokenCrypto.encrypt('mock-access-token'),
      refresh_token: tokenCrypto.encrypt('mock-refresh-token'),
      expires_at: new Date(Date.now() + 3600_000),
      metadata: { api_domain: 'https://www.zohoapis.in', org_id: '10234695' },
    });
    if (withMapping) {
      await integrationRepository.createMapping({
        connection_id: connection.id,
        factory_id: fx.factoryId,
        external_id: `zoho-${tag}`,
        inventory_item_id: item.id,
        sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
      });
    }
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
    return { fx, connection, item, ledger, delivery: delivery! };
  }

  it('1 — FAILED delivery retry succeeds → DELIVERED', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-ok');
    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: true,
      externalReference: 'retry-ok-1',
    }));

    const result = await pushRetryService.retryDelivery(delivery);
    expect(result).toBe('delivered');

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
    expect(reloaded!.zoho_reference).toBe('retry-ok-1');
  });

  it('2 — FAILED delivery retry fails → increments retry_count', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-fail');
    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: false,
      code: 'server_error',
      message: 'Still down',
      retryable: true,
    }));

    await pushRetryService.retryDelivery(delivery);

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.status).toBe(PUSH_DELIVERY_STATUS.FAILED);
    expect(reloaded!.retry_count).toBe(2);
    expect(reloaded!.next_retry_at).not.toBeNull();
    expect(reloaded!.last_attempt_at).not.toBeNull();
  });

  it('3 — max retry exceeded is not picked up by batch', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-max');
    await integrationRepository.markFailedWithRetry(
      delivery.id,
      fx.factoryId,
      'Terminal',
      { retryCount: MAX_PUSH_DELIVERY_ATTEMPTS, nextRetryAt: null },
    );

    const due = await integrationRepository.listFailedDeliveriesDueRetry(50);
    expect(due.some((d) => d.id === delivery.id)).toBe(false);
  });

  it('4 — missing mapping on retry → SKIPPED_UNMAPPED', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-unmap', false);

    const result = await pushRetryService.retryDelivery(delivery);
    expect(result).toBe('skipped');

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.status).toBe(PUSH_DELIVERY_STATUS.SKIPPED_UNMAPPED);
  });

  it('5 — inactive connection leaves delivery FAILED', async () => {
    requireDb(dbUp);
    const { fx, connection, delivery } = await seedFailedDeliverySetup('rt-inact');
    await integrationRepository.updateConnection(connection.id, fx.factoryId, {
      status: INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
    });

    const result = await pushRetryService.retryDelivery(delivery);
    expect(result).toBe('failed');

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.status).toBe(PUSH_DELIVERY_STATUS.FAILED);
    expect(reloaded!.retry_count).toBe(1);
  });

  it('6 — token refresh failure leaves delivery FAILED', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-token');
    jest
      .spyOn(zohoOAuthService, 'refreshConnectionIfNeeded')
      .mockRejectedValue(new Error('Refresh denied'));

    const result = await pushRetryService.retryDelivery(delivery);
    expect(result).toBe('failed');

    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );
    expect(reloaded!.last_error).toContain('Token refresh failed');
  });

  it('7 — already DELIVERED delivery is unchanged', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-del');
    await integrationRepository.markDelivered(delivery.id, fx.factoryId, 'done-1');
    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );

    let calls = 0;
    zohoInventoryClient.setAdjustStockHandler(async () => {
      calls += 1;
      return { success: true, externalReference: 'x' };
    });

    const result = await pushRetryService.retryDelivery(reloaded!);
    expect(result).toBe('unchanged');
    expect(calls).toBe(0);
  });

  it('8 — SKIPPED_UNMAPPED delivery is unchanged', async () => {
    requireDb(dbUp);
    const { fx, delivery } = await seedFailedDeliverySetup('rt-skip');
    await integrationRepository.markSkippedUnmapped(
      delivery.id,
      fx.factoryId,
      'Unmapped',
    );
    const reloaded = await integrationRepository.findDelivery(
      fx.factoryId,
      delivery.connection_id,
      delivery.inventory_transaction_id,
    );

    let calls = 0;
    zohoInventoryClient.setAdjustStockHandler(async () => {
      calls += 1;
      return { success: true, externalReference: 'x' };
    });

    const result = await pushRetryService.retryDelivery(reloaded!);
    expect(result).toBe('unchanged');
    expect(calls).toBe(0);
  });
});
