/**
 * Phase 2.3 — Zoho pull sync integration tests (mocked Zoho API).
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
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
import { ZohoInventoryItemRecord } from 'src/services/integrations/zoho/zoho-inventory.types';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
  ITEM_MAPPING_SYNC_STATUS,
  SYNC_DIRECTION,
  SYNC_STATUS,
  SYNC_TRIGGER,
} from 'src/services/integrations/integration.constants';
import { INVENTORY_REFERENCE_TYPE } from 'src/services/inventory/inventory.constants';
import { USER_ROLE } from 'src/services/users/users.constants';
import { seedPhase0Fixture } from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';
import { formatZohoPullSummaryMessage } from 'src/services/integrations/zoho/zoho-pull-sync.messages';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Phase 2.3 Zoho pull sync', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let zohoInventoryClient: ZohoInventoryClient;
  let tokenCrypto: TokenCryptoService;
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
    zohoInventoryClient = module.get(ZohoInventoryClient);
    tokenCrypto = module.get(TokenCryptoService);
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
    const connection = await dbService.sqlService.IntegrationConnection.findOne({
      where: {
        factory_id: factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      },
    });
    return connection!;
  }

  async function seedWorker(factoryId: number) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const user = await dbService.sqlService.User.create({
      phone_number: `+9188${suffix.slice(-8)}`,
      name: 'Pull Worker',
    } as any);
    await dbService.sqlService.FactoryUser.create({
      factory_id: factoryId,
      user_id: user.id,
      role: USER_ROLE.WORKER,
    } as any);
    return user.id as number;
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

  it('creates inventory, mapping, and ZOHO_PULL ledger for new Zoho item', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-new');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem(
        { item_id: 'z-100', sku: 'NEW-PULL-1', available_stock: 12 },
        fx,
      ),
    ];

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
    expect(summary.mappingCount).toBe(1);
    expect(summary.syncRunId).toBeGreaterThan(0);

    const mapping = await dbService.sqlService.IntegrationItemMapping.findOne({
      where: {
        connection_id: connection.id,
        external_id: 'z-100',
        factory_id: fx.factoryId,
      },
    });
    expect(mapping).not.toBeNull();
    expect(mapping!.sync_status).toBe(ITEM_MAPPING_SYNC_STATUS.OK);

    const item = await dbService.sqlService.InventoryItem.findByPk(
      mapping!.inventory_item_id,
    );
    expect(item!.sku).toBe('NEW-PULL-1');
    expect(Number(item!.current_quantity)).toBe(12);

    const ledger = await dbService.sqlService.InventoryTransaction.findOne({
      where: {
        inventory_item_id: item!.id,
        reference_type: INVENTORY_REFERENCE_TYPE.ZOHO_PULL,
        reference_id: summary.syncRunId,
      },
    });
    expect(ledger).not.toBeNull();
    expect(Number(ledger!.quantity)).toBe(12);
  });

  it('updates metadata for existing mapped item without stock ledger', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-update');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem(
        { item_id: 'z-200', sku: 'MAP-UPD-1', name: 'Original Name', available_stock: 5 },
        fx,
      ),
    ];

    await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    mockItems = [
      zohoItem(
        {
          item_id: 'z-200',
          sku: 'MAP-UPD-1',
          name: 'Updated Zoho Name',
          available_stock: 99,
        },
        fx,
      ),
    ];

    const res = await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const summary = res.body.data ?? res.body;
    expect(summary.updatedCount).toBe(1);

    const mapping = await dbService.sqlService.IntegrationItemMapping.findOne({
      where: { external_id: 'z-200', factory_id: fx.factoryId },
    });
    const item = await dbService.sqlService.InventoryItem.findByPk(
      mapping!.inventory_item_id,
    );
    expect(item!.name).toBe('Updated Zoho Name');
    expect(Number(item!.current_quantity)).toBe(5);

    const ledgerCount = await dbService.sqlService.InventoryTransaction.count({
      where: {
        inventory_item_id: item!.id,
        reference_type: INVENTORY_REFERENCE_TYPE.ZOHO_PULL,
      },
    });
    expect(ledgerCount).toBe(1);
  });

  it('uses ledger only for quantity — never direct overwrite on re-sync', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-qty');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem(
        { item_id: 'z-300', sku: 'QTY-1', available_stock: 7 },
        fx,
      ),
    ];

    const first = await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);
    const firstSummary = first.body.data ?? first.body;

    mockItems = [
      zohoItem(
        { item_id: 'z-300', sku: 'QTY-1', available_stock: 50 },
        fx,
      ),
    ];

    await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const mapping = await dbService.sqlService.IntegrationItemMapping.findOne({
      where: { external_id: 'z-300', factory_id: fx.factoryId },
    });
    const item = await dbService.sqlService.InventoryItem.findByPk(
      mapping!.inventory_item_id,
    );
    expect(Number(item!.current_quantity)).toBe(7);

    const ledgerCount = await dbService.sqlService.InventoryTransaction.count({
      where: {
        inventory_item_id: item!.id,
        reference_type: INVENTORY_REFERENCE_TYPE.ZOHO_PULL,
        reference_id: firstSummary.syncRunId,
      },
    });
    expect(ledgerCount).toBe(1);
  });

  it('fails item when category missing and continues sync', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-cat');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem(
        {
          item_id: 'z-400',
          sku: 'BAD-CAT',
          category_name: 'Nonexistent Category XYZ',
        },
        fx,
      ),
      zohoItem({ item_id: 'z-401', sku: 'GOOD-1', available_stock: 1 }, fx),
    ];

    const res = await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const summary = res.body.data ?? res.body;
    expect(summary.failedCount).toBe(1);
    expect(summary.addedCount).toBe(1);
  });

  it('fails item when location missing and continues sync', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-loc');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem(
        {
          item_id: 'z-500',
          sku: 'BAD-LOC',
          location_name: 'Nonexistent Location XYZ',
        },
        fx,
      ),
    ];

    const res = await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const summary = res.body.data ?? res.body;
    expect(summary.failedCount).toBe(1);
    expect(summary.addedCount).toBe(0);
  });

  it('records partial sync run audit for mixed success', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-partial');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    mockItems = [
      zohoItem({ item_id: 'z-601', sku: 'MIX-OK', available_stock: 2 }, fx),
      zohoItem(
        { item_id: 'z-602', sku: 'MIX-FAIL', category_name: 'Missing Cat' },
        fx,
      ),
    ];

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
    expect(summary.failedCount).toBe(1);

    const run = await dbService.sqlService.IntegrationSyncRun.findByPk(
      summary.syncRunId,
    );
    expect(run!.direction).toBe(SYNC_DIRECTION.PULL);
    expect(run!.trigger).toBe(SYNC_TRIGGER.MANUAL);
    expect(run!.status).toBe(SYNC_STATUS.PARTIAL);
    expect(run!.items_processed).toBe(2);
    expect(run!.finished_at).not.toBeNull();
  });

  it('enforces factory isolation on pull sync', async () => {
    requireDb(dbUp);
    const fxA = await seedFx('pull-iso-a');
    const fxB = await seedFx('pull-iso-b');
    const connection = await createActiveConnection(fxA.factoryId, fxA.ownerId);

    mockItems = [
      zohoItem({ item_id: 'z-700', sku: 'ISO-1', available_stock: 1 }, fxA),
    ];

    await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fxB.factoryId,
        user_id: fxB.ownerId,
        connection_id: connection.id,
      })
      .expect(404);
  });

  it('forbids workers from triggering pull sync', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-worker');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);
    const workerId = await seedWorker(fx.factoryId);

    mockItems = [
      zohoItem({ item_id: 'z-800', sku: 'WRK-1' }, fx),
    ];

    await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: workerId,
        connection_id: connection.id,
      })
      .expect(403);
  });

  it('refreshes token before pull when expired', async () => {
    requireDb(dbUp);
    const fx = await seedFx('pull-refresh');
    const connection = await createActiveConnection(fx.factoryId, fx.ownerId);

    await dbService.sqlService.IntegrationConnection.update(
      {
        expires_at: new Date(Date.now() - 60_000),
        access_token: tokenCrypto.encrypt('stale-token'),
      },
      { where: { id: connection.id } },
    );

    mockItems = [
      zohoItem({ item_id: 'z-900', sku: 'REF-1', available_stock: 3 }, fx),
    ];

    await request(app.getHttpServer())
      .post('/integrations/zoho/sync/pull')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: connection.id,
      })
      .expect(200);

    const row = await dbService.sqlService.IntegrationConnection.findByPk(
      connection.id,
    );
    expect(tokenCrypto.decrypt(row!.access_token!)).toBe(
      'mock-access-token-refreshed',
    );
  });

  it('formats WhatsApp-style summary message', () => {
    const msg = formatZohoPullSummaryMessage({
      addedCount: 12,
      updatedCount: 5,
      failedCount: 1,
      mappingCount: 17,
      syncRunId: 123,
      failures: [{ externalId: 'z-1', sku: 'X', detail: 'fail' }],
    });
    expect(msg).toContain('Zoho sync complete');
    expect(msg).toContain('Added: 12');
    expect(msg).toContain('#123');
  });
});
