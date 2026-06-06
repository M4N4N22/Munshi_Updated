/**
 * Phase 2.5.2 — push delivery idempotency integration tests.
 * Persistence only — no Zoho API, handlers, or event processing.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UniqueConstraintError } from 'sequelize';
import { DbModule } from 'src/core/services/db-service/db.module';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserModule } from 'src/services/users/users.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';
import { IntegrationRepository } from 'src/services/integrations/integration.repository';
import { ensurePushDelivery } from 'src/services/integrations/integration-push-delivery.helper';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  PUSH_DELIVERY_STATUS,
} from 'src/services/integrations/integration.constants';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
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

describe('Phase 2.5.2 push delivery idempotency', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let integrationRepository: IntegrationRepository;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;

  beforeAll(async () => {
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
    await app.init();

    dbService = module.get(DbService);
    integrationRepository = module.get(IntegrationRepository);
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedConnectionAndTxn(tag: string) {
    const fx = await seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
    const connection = await integrationRepository.createConnection({
      factory_id: fx.factoryId,
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
    });
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
    return { fx, connection, ledgerId: ledger.id };
  }

  it('1 — migration creates integration_push_deliveries table and model', async () => {
    requireDb(dbUp);
    const sequelize = dbService.sqlService.Factory.sequelize!;
    const [rows] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'integration_push_deliveries'
      ORDER BY ordinal_position
    `);
    const cols = (rows as { column_name: string }[]).map((r) => r.column_name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'connection_id',
        'factory_id',
        'inventory_transaction_id',
        'status',
        'zoho_reference',
        'last_error',
        'retry_count',
        'last_attempt_at',
        'next_retry_at',
        'delivered_at',
        'created_at',
        'updated_at',
      ]),
    );

    const [indexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'integration_push_deliveries'
    `);
    const indexNames = (indexes as { indexname: string }[]).map((r) => r.indexname);
    expect(
      indexNames.some((n) => n.includes('connection_inventory_txn')),
    ).toBe(true);

    expect(dbService.sqlService.IntegrationPushDelivery).toBeDefined();
  });

  it('2 — createDelivery persists PENDING row', async () => {
    requireDb(dbUp);
    const { fx, connection, ledgerId } = await seedConnectionAndTxn('pd2');

    const delivery = await integrationRepository.createDelivery({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      inventory_transaction_id: ledgerId,
    });

    expect(delivery.id).toBeGreaterThan(0);
    expect(delivery.status).toBe(PUSH_DELIVERY_STATUS.PENDING);
    expect(delivery.connection_id).toBe(connection.id);
    expect(delivery.inventory_transaction_id).toBe(ledgerId);
    expect(delivery.zoho_reference).toBeNull();
    expect(delivery.delivered_at).toBeNull();
  });

  it('3 — ensurePushDelivery returns existing row on duplicate attempt', async () => {
    requireDb(dbUp);
    const { fx, connection, ledgerId } = await seedConnectionAndTxn('pd3');

    const first = await ensurePushDelivery(integrationRepository, {
      factoryId: fx.factoryId,
      connectionId: connection.id,
      inventoryTransactionId: ledgerId,
    });
    expect(first.created).toBe(true);

    const second = await ensurePushDelivery(integrationRepository, {
      factoryId: fx.factoryId,
      connectionId: connection.id,
      inventoryTransactionId: ledgerId,
    });
    expect(second.created).toBe(false);
    expect(second.delivery.id).toBe(first.delivery.id);
  });

  it('4 — unique constraint blocks duplicate createDelivery', async () => {
    requireDb(dbUp);
    const { fx, connection, ledgerId } = await seedConnectionAndTxn('pd4');

    await integrationRepository.createDelivery({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      inventory_transaction_id: ledgerId,
    });

    await expect(
      integrationRepository.createDelivery({
        connection_id: connection.id,
        factory_id: fx.factoryId,
        inventory_transaction_id: ledgerId,
      }),
    ).rejects.toBeInstanceOf(UniqueConstraintError);
  });

  it('5 — delivery queries are factory-scoped', async () => {
    requireDb(dbUp);
    const a = await seedConnectionAndTxn('pd5a');
    const b = await seedConnectionAndTxn('pd5b');

    const delivery = await integrationRepository.createDelivery({
      connection_id: a.connection.id,
      factory_id: a.fx.factoryId,
      inventory_transaction_id: a.ledgerId,
    });

    const found = await integrationRepository.findDelivery(
      a.fx.factoryId,
      a.connection.id,
      a.ledgerId,
    );
    expect(found!.id).toBe(delivery.id);

    const wrongFactory = await integrationRepository.findDelivery(
      b.fx.factoryId,
      a.connection.id,
      a.ledgerId,
    );
    expect(wrongFactory).toBeNull();

    const listedA = await integrationRepository.listDeliveries(a.fx.factoryId, {
      connectionId: a.connection.id,
    });
    expect(listedA.some((row) => row.id === delivery.id)).toBe(true);

    const listedB = await integrationRepository.listDeliveries(b.fx.factoryId, {
      connectionId: a.connection.id,
    });
    expect(listedB).toHaveLength(0);
  });

  it('6 — markDelivered sets status, zoho_reference, and delivered_at', async () => {
    requireDb(dbUp);
    const { fx, connection, ledgerId } = await seedConnectionAndTxn('pd6');

    const pending = await integrationRepository.createDelivery({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      inventory_transaction_id: ledgerId,
    });

    const delivered = await integrationRepository.markDelivered(
      pending.id,
      fx.factoryId,
      'zoho-adj-12345',
    );
    expect(delivered!.status).toBe(PUSH_DELIVERY_STATUS.DELIVERED);
    expect(delivered!.zoho_reference).toBe('zoho-adj-12345');
    expect(delivered!.delivered_at).not.toBeNull();
    expect(delivered!.last_error).toBeNull();
  });

  it('7 — markFailed sets status and last_error', async () => {
    requireDb(dbUp);
    const { fx, connection, ledgerId } = await seedConnectionAndTxn('pd7');

    const pending = await integrationRepository.createDelivery({
      connection_id: connection.id,
      factory_id: fx.factoryId,
      inventory_transaction_id: ledgerId,
    });

    const failed = await integrationRepository.markFailed(
      pending.id,
      fx.factoryId,
      'Zoho API timeout',
    );
    expect(failed!.status).toBe(PUSH_DELIVERY_STATUS.FAILED);
    expect(failed!.last_error).toBe('Zoho API timeout');
  });
});
