/**
 * Phase 2.2 — Zoho OAuth connect/disconnect integration tests.
 * Zoho HTTP is mocked — no live API calls.
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
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
import {
  INTEGRATION_CONNECTION_STATUS,
  INTEGRATION_PROVIDER,
} from 'src/services/integrations/integration.constants';
import { USER_ROLE } from 'src/services/users/users.constants';
import {
  seedPhase0Fixture,
} from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

describe('Phase 2.2 Zoho OAuth', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let zohoClient: ZohoOAuthClient;
  let stateService: ZohoOAuthStateService;
  let tokenCrypto: TokenCryptoService;

  beforeAll(async () => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY =
      process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
      'test-integration-encryption-key-32chars-min';
    process.env.ZOHO_CLIENT_ID = 'test-zoho-client-id';
    process.env.ZOHO_CLIENT_SECRET = 'test-zoho-client-secret';
    process.env.ZOHO_REDIRECT_URI =
      'http://localhost:4001/integrations/zoho/callback';
    process.env.ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.in';
    process.env.MUNSHI_WEB_URL = 'http://localhost:3000';

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
    zohoClient = module.get(ZohoOAuthClient);
    stateService = module.get(ZohoOAuthStateService);
    tokenCrypto = module.get(TokenCryptoService);

    zohoClient.setExchangeHandler(async () => ({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      api_domain: 'https://www.zohoapis.in',
    }));
    zohoClient.setRefreshHandler(async () => ({
      access_token: 'mock-access-token-refreshed',
      expires_in: 3600,
      api_domain: 'https://www.zohoapis.in',
    }));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    stateService.resetForTests();
  });

  async function seedOwner(tag: string) {
    return seedPhase0Fixture(
      dbService,
      inventoryService,
      inventoryTransactionService,
      tag,
    );
  }

  async function seedWorker(factoryId: number, ownerId: number) {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const user = await dbService.sqlService.User.create({
      phone_number: `+9199${suffix.slice(-8)}`,
      name: 'Worker OAuth',
    } as any);
    await dbService.sqlService.FactoryUser.create({
      factory_id: factoryId,
      user_id: user.id,
      role: USER_ROLE.WORKER,
    } as any);
    return user.id as number;
  }

  it('authorize redirects to Zoho with signed state', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-authz');
    const res = await request(app.getHttpServer())
      .get('/integrations/zoho/authorize')
      .query({ factory_id: fx.factoryId, user_id: fx.ownerId })
      .expect(302);

    expect(res.headers.location).toContain('accounts.zoho.in/oauth/v2/auth');
    expect(res.headers.location).toContain('state=');
    expect(res.headers.location).toContain('client_id=test-zoho-client-id');
  });

  it('OAuth callback persists encrypted active connection', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-callback');
    const state = stateService.createState(fx.factoryId, fx.ownerId);

    const res = await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    expect(res.headers.location).toContain('/integrations?');
    expect(res.headers.location).toContain('status=connected');

    const row = await dbService.sqlService.IntegrationConnection.findOne({
      where: {
        factory_id: fx.factoryId,
        provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
        status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
      },
    });
    expect(row).not.toBeNull();
    expect(row!.access_token).not.toBe('mock-access-token');
    expect(tokenCrypto.decrypt(row!.access_token!)).toBe('mock-access-token');
    expect(tokenCrypto.decrypt(row!.refresh_token!)).toBe('mock-refresh-token');
  });

  it('rejects OAuth callback replay', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-replay');
    const state = stateService.createState(fx.factoryId, fx.ownerId);

    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(401);
  });

  it('rejects cross-factory authorize for non-member user', async () => {
    requireDb(dbUp);
    const fxA = await seedOwner('oauth-factory-a');
    const fxB = await seedOwner('oauth-factory-b');

    await request(app.getHttpServer())
      .get('/integrations/zoho/authorize')
      .query({ factory_id: fxA.factoryId, user_id: fxB.ownerId })
      .expect(403);
  });

  it('rejects worker from managing integrations', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-worker');
    const workerId = await seedWorker(fx.factoryId, fx.ownerId);

    await request(app.getHttpServer())
      .get('/integrations/connections')
      .query({ factory_id: fx.factoryId, user_id: workerId })
      .expect(403);
  });

  it('lists connections without exposing tokens', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-list');
    const state = stateService.createState(fx.factoryId, fx.ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    const res = await request(app.getHttpServer())
      .get('/integrations/connections')
      .query({ factory_id: fx.factoryId, user_id: fx.ownerId })
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      provider: INTEGRATION_PROVIDER.ZOHO_INVENTORY,
      status: INTEGRATION_CONNECTION_STATUS.ACTIVE,
    });
    expect(body[0].access_token).toBeUndefined();
    expect(body[0].refresh_token).toBeUndefined();
  });

  it('disconnect soft-disconnects without deleting history', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-disconnect');
    const state = stateService.createState(fx.factoryId, fx.ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    const active = await dbService.sqlService.IntegrationConnection.findOne({
      where: { factory_id: fx.factoryId, status: INTEGRATION_CONNECTION_STATUS.ACTIVE },
    });

    await request(app.getHttpServer())
      .post('/integrations/zoho/disconnect')
      .send({
        factory_id: fx.factoryId,
        user_id: fx.ownerId,
        connection_id: active!.id,
      })
      .expect(200);

    const row = await dbService.sqlService.IntegrationConnection.findByPk(
      active!.id,
    );
    expect(row!.status).toBe(INTEGRATION_CONNECTION_STATUS.DISCONNECTED);
    expect(row!.access_token).toBeNull();
    expect(row!.refresh_token).toBeNull();
  });

  it('refreshConnectionIfNeeded refreshes expired tokens', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-refresh');
    const state = stateService.createState(fx.factoryId, fx.ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    const connection = await dbService.sqlService.IntegrationConnection.findOne({
      where: { factory_id: fx.factoryId, status: INTEGRATION_CONNECTION_STATUS.ACTIVE },
    });
    await connection!.update({
      expires_at: new Date(Date.now() - 60_000),
    });

    const { ZohoOAuthService } = await import(
      'src/services/integrations/zoho/zoho-oauth.service'
    );
    const oauthService = app.get(ZohoOAuthService);
    const refreshed = await oauthService.refreshConnectionIfNeeded(connection!.id);
    expect(tokenCrypto.decrypt(refreshed.access_token!)).toBe(
      'mock-access-token-refreshed',
    );
  });

  it('enforces factory isolation on connection list', async () => {
    requireDb(dbUp);
    const fx = await seedOwner('oauth-isolation');
    const state = stateService.createState(fx.factoryId, fx.ownerId);
    await request(app.getHttpServer())
      .get('/integrations/zoho/callback')
      .query({ code: 'mock-auth-code', state })
      .expect(302);

    const other = await seedOwner('oauth-isolation-other');
    const res = await request(app.getHttpServer())
      .get('/integrations/connections')
      .query({ factory_id: other.factoryId, user_id: other.ownerId })
      .expect(200);

    const body = res.body.data ?? res.body;
    const zohoRows = body.filter(
      (c: { provider: string }) => c.provider === INTEGRATION_PROVIDER.ZOHO_INVENTORY,
    );
    expect(zohoRows.every((c: { status: string }) => c.status !== INTEGRATION_CONNECTION_STATUS.ACTIVE)).toBe(true);
  });
});
