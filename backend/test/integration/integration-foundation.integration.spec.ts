/**
 * Phase 2.1 — integration foundation (persistence only).
 * Requires Postgres with migrations applied.
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
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  ITEM_MAPPING_SYNC_STATUS,
  SYNC_DIRECTION,
  SYNC_STATUS,
  SYNC_TRIGGER,
} from 'src/services/integrations/integration.constants';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import {
  createInventoryItemWithStock,
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error(
      'NOT VERIFIED: Postgres unavailable — start Docker Postgres or set POSTGRES_CONNECTION_STRING',
    );
  }
}

describe('Phase 2.1 integration foundation', () => {
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
      throw new Error(
        `Migrations pending (${status.pending_count}) after apply-migrations`,
      );
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

  describe('Migration', () => {
    it('creates integration_connections, integration_item_mappings, integration_sync_runs', async () => {
      requireDb(dbUp);
      const sequelize = dbService.sqlService.Factory.sequelize!;
      for (const table of [
        'integration_connections',
        'integration_item_mappings',
        'integration_sync_runs',
      ]) {
        const [rows] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);
        expect((rows as { column_name: string }[]).length).toBeGreaterThan(0);
      }

      expect(dbService.sqlService.IntegrationConnection).toBeDefined();
      expect(dbService.sqlService.IntegrationItemMapping).toBeDefined();
      expect(dbService.sqlService.IntegrationSyncRun).toBeDefined();
    });
  });

  describe('IntegrationRepository', () => {
    it('connection CRUD is factory-scoped', async () => {
      requireDb(dbUp);
      const fixture = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        'p21-conn',
      );

      const created = await integrationRepository.createConnection({
        factory_id: fixture.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
        metadata: { org_id: 'test-org' },
      });

      const fetched = await integrationRepository.getConnection(
        created.id,
        fixture.factoryId,
      );
      expect(fetched).not.toBeNull();
      expect(fetched!.provider).toBe(INTEGRATION_PROVIDER.ZOHO_INVENTORY);

      const listed = await integrationRepository.listConnectionsByFactory(
        fixture.factoryId,
      );
      expect(listed.some((c) => c.id === created.id)).toBe(true);

      const wrongFactory = await integrationRepository.getConnection(
        created.id,
        fixture.factoryId + 99999,
      );
      expect(wrongFactory).toBeNull();
    });

    it('enforces unique active connection per factory and provider', async () => {
      requireDb(dbUp);
      const fixture = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        'p21-unique',
      );

      await integrationRepository.createConnection({
        factory_id: fixture.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      });

      await expect(
        integrationRepository.createConnection({
          factory_id: fixture.factoryId,
          provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
          status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
        }),
      ).rejects.toThrow();

      const disconnected = await integrationRepository.createConnection({
        factory_id: fixture.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.DISCONNECTED,
      });
      expect(disconnected.id).toBeGreaterThan(0);
    });

    it('mapping CRUD is factory-scoped', async () => {
      requireDb(dbUp);
      const fixture = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        'p21-map',
      );

      const connection = await integrationRepository.createConnection({
        factory_id: fixture.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      });

      const item = await createInventoryItemWithStock(
        inventoryService,
        inventoryTransactionService,
        fixture,
        'EXT-SKU-1',
        '0',
        fixture.ownerId,
      );

      const mapping = await integrationRepository.createMapping({
        connection_id: connection.id,
        factory_id: fixture.factoryId,
        external_id: 'zoho-item-100',
        external_sku: 'EXT-SKU-1',
        inventory_item_id: item.id,
        sync_status: ITEM_MAPPING_SYNC_STATUS.OK,
      });

      const byExternal = await integrationRepository.findMapping(fixture.factoryId, {
        connectionId: connection.id,
        externalId: 'zoho-item-100',
      });
      expect(byExternal!.id).toBe(mapping.id);

      const wrongFactory = await integrationRepository.findMapping(
        fixture.factoryId + 99999,
        { connectionId: connection.id, externalId: 'zoho-item-100' },
      );
      expect(wrongFactory).toBeNull();
    });

    it('sync run CRUD is factory-scoped', async () => {
      requireDb(dbUp);
      const fixture = await seedPhase0Fixture(
        dbService,
        inventoryService,
        inventoryTransactionService,
        'p21-sync',
      );

      const connection = await integrationRepository.createConnection({
        factory_id: fixture.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      });

      const run = await integrationRepository.createSyncRun({
        connection_id: connection.id,
        factory_id: fixture.factoryId,
        direction: SYNC_DIRECTION.PULL,
        trigger: SYNC_TRIGGER.MANUAL,
        status: SYNC_STATUS.RUNNING,
      });
      expect(run.status).toBe(SYNC_STATUS.RUNNING);

      const updated = await integrationRepository.updateSyncRun(
        run.id,
        fixture.factoryId,
        {
          status: SYNC_STATUS.COMPLETED,
          items_processed: 5,
          finished_at: new Date(),
        },
      );
      expect(updated!.status).toBe(SYNC_STATUS.COMPLETED);
      expect(updated!.items_processed).toBe(5);

      const wrongFactoryUpdate = await integrationRepository.updateSyncRun(
        run.id,
        fixture.factoryId + 99999,
        { status: SYNC_STATUS.FAILED },
      );
      expect(wrongFactoryUpdate).toBeNull();
    });
  });
});
