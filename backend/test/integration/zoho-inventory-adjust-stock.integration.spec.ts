/**
 * Phase 2.5.3 — ZohoInventoryClient.adjustStock integration tests.
 * Outbound client only — no handlers, no Munshi inventory writes.
 */
import { AxiosError } from 'axios';
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
} from 'src/services/integrations/integration.constants';
import { TokenCryptoService } from 'src/services/integrations/token-crypto.service';
import { ZohoInventoryClient } from 'src/services/integrations/zoho/zoho-inventory.client';
import { ZohoOAuthClient } from 'src/services/integrations/zoho/zoho-oauth.client';
import { ZohoOAuthService } from 'src/services/integrations/zoho/zoho-oauth.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { InventoryTransactionService } from 'src/services/inventory/inventory-transaction.service';
import { seedPhase0Fixture } from './helpers/phase0-fixtures';
import { migrationStatusJson, probePostgres, runMigrations } from './helpers/db-env';

function requireDb(dbUp: boolean): void {
  if (!dbUp) {
    throw new Error('NOT VERIFIED: Postgres unavailable');
  }
}

function axiosError(status: number, message: string): AxiosError {
  const err = new AxiosError(message, String(status), undefined, undefined, {
    status,
    statusText: String(status),
    data: { message },
    headers: {},
    config: {} as any,
  });
  return err;
}

describe('Phase 2.5.3 Zoho adjustStock client', () => {
  let dbUp = false;
  let app: INestApplication;
  let dbService: DbService;
  let integrationRepository: IntegrationRepository;
  let inventoryService: InventoryService;
  let inventoryTransactionService: InventoryTransactionService;
  let zohoInventoryClient: ZohoInventoryClient;
  let zohoOAuthService: ZohoOAuthService;
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
    inventoryService = module.get(InventoryService);
    inventoryTransactionService = module.get(InventoryTransactionService);
    zohoInventoryClient = module.get(ZohoInventoryClient);
    zohoOAuthService = module.get(ZohoOAuthService);
    tokenCrypto = module.get(TokenCryptoService);

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
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    zohoInventoryClient.setAdjustStockHandler(null);
    jest.restoreAllMocks();
  });

  async function seedConnection(tag: string, options?: { expired?: boolean }) {
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
      access_token: tokenCrypto.encrypt('mock-access-token'),
      refresh_token: tokenCrypto.encrypt('mock-refresh-token'),
      expires_at: options?.expired
        ? new Date(Date.now() - 60_000)
        : new Date(Date.now() + 3600_000),
      metadata: {
        api_domain: 'https://www.zohoapis.in',
        org_id: '10234695',
      },
    });
    return { fx, connection };
  }

  it('1 — STOCK_OUT maps to negative quantity_adjusted', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-out');
    let capturedQty = '';

    zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
      capturedQty = ctx.requestBody.line_items[0].quantity_adjusted;
      return { success: true, externalReference: 'adj-out-1' };
    });

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: '2954987000000641651',
      quantity: '3',
      transactionType: 'STOCK_OUT',
      referenceId: 9001,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.externalReference).toBe('adj-out-1');
    }
    expect(capturedQty).toBe('-3');
  });

  it('2 — STOCK_IN maps to positive quantity_adjusted', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-in');
    let capturedQty = '';

    zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
      capturedQty = ctx.requestBody.line_items[0].quantity_adjusted;
      return { success: true, externalReference: 'adj-in-1' };
    });

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: '2954987000000641651',
      quantity: 5,
      transactionType: 'STOCK_IN',
      referenceId: 9002,
    });

    expect(result.success).toBe(true);
    expect(capturedQty).toBe('5');
  });

  it('3 — 401 response returns structured unauthorized error', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-401');
    const http = (zohoInventoryClient as any).http;
    jest
      .spyOn(http, 'post')
      .mockRejectedValue(axiosError(401, 'Unauthorized'));

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: 'item-1',
      quantity: '1',
      transactionType: 'STOCK_OUT',
      referenceId: 9003,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('unauthorized');
      expect(result.httpStatus).toBe(401);
      expect(result.retryable).toBe(true);
    }
  });

  it('4 — 429 response returns structured rate_limited error', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-429');
    const http = (zohoInventoryClient as any).http;
    jest
      .spyOn(http, 'post')
      .mockRejectedValue(axiosError(429, 'Too Many Requests'));

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: 'item-1',
      quantity: '1',
      transactionType: 'STOCK_OUT',
      referenceId: 9004,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('rate_limited');
      expect(result.httpStatus).toBe(429);
      expect(result.retryable).toBe(true);
    }
  });

  it('5 — 5xx response returns structured server_error', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-5xx');
    const http = (zohoInventoryClient as any).http;
    jest
      .spyOn(http, 'post')
      .mockRejectedValue(axiosError(503, 'Service Unavailable'));

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: 'item-1',
      quantity: '1',
      transactionType: 'STOCK_OUT',
      referenceId: 9005,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('server_error');
      expect(result.httpStatus).toBe(503);
      expect(result.retryable).toBe(true);
    }
  });

  it('6 — setAdjustStockHandler bypasses HTTP', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-mock');
    const http = (zohoInventoryClient as any).http;
    const postSpy = jest.spyOn(http, 'post');

    zohoInventoryClient.setAdjustStockHandler(async () => ({
      success: true,
      externalReference: 'mock-ref-6',
    }));

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: 'item-mock',
      quantity: '2',
      transactionType: 'STOCK_OUT',
      referenceId: 9006,
    });

    expect(result).toEqual({ success: true, externalReference: 'mock-ref-6' });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('7 — token refresh integration uses refreshed access token', async () => {
    requireDb(dbUp);
    const { connection } = await seedConnection('adj-refresh', { expired: true });
    let tokenUsed = '';

    zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
      tokenUsed = ctx.accessToken;
      return { success: true, externalReference: 'adj-refresh-1' };
    });

    const result = await zohoInventoryClient.adjustStock({
      connection,
      externalItemId: 'item-refresh',
      quantity: '1',
      transactionType: 'STOCK_IN',
      referenceId: 9007,
    });

    expect(result.success).toBe(true);
    expect(tokenUsed).toBe('mock-access-token-refreshed');

    const reloaded = await integrationRepository.getConnectionById(connection.id);
    expect(tokenCrypto.decrypt(reloaded!.access_token!)).toBe(
      'mock-access-token-refreshed',
    );
  });
});
