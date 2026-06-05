import { ZohoInventoryClient } from './zoho-inventory.client';
import { TokenCryptoService } from '../token-crypto.service';
import { ZohoOAuthService } from './zoho-oauth.service';
import { IntegrationConnection } from '../integration.schema';

describe('ZohoInventoryClient.resolveSignedQuantity', () => {
  const client = new ZohoInventoryClient(
    {} as ZohoOAuthService,
    {} as TokenCryptoService,
  );

  it('negates STOCK_OUT quantity', () => {
    expect(client.resolveSignedQuantity('STOCK_OUT', '4')).toBe('-4');
  });

  it('keeps STOCK_IN quantity positive', () => {
    expect(client.resolveSignedQuantity('stock_in', 2)).toBe('2');
  });

  it('rejects unsupported transaction types', () => {
    expect(client.resolveSignedQuantity('ADJUSTMENT', '1')).toBeNull();
  });
});

function minimalConnection(id = 1): IntegrationConnection {
  return {
    id,
    factory_id: 10,
    provider: 'zoho_inventory',
    metadata: { org_id: 'org-1', api_domain: 'https://www.zohoapis.in' },
  } as unknown as IntegrationConnection;
}

describe('ZohoInventoryClient configuration errors', () => {
  it('returns configuration_error when org_id missing', async () => {
    const oauth = {
      refreshConnectionIfNeeded: jest.fn(async () => ({
        id: 1,
        access_token: 'enc-token',
        metadata: { api_domain: 'https://www.zohoapis.in' },
      })),
    } as unknown as ZohoOAuthService;
    const crypto = {
      decrypt: jest.fn(() => 'plain-token'),
    } as unknown as TokenCryptoService;
    const client = new ZohoInventoryClient(oauth, crypto);

    const result = await client.adjustStock({
      connection: { ...minimalConnection(), metadata: {} } as unknown as IntegrationConnection,
      externalItemId: '1',
      quantity: '1',
      transactionType: 'STOCK_OUT',
      referenceId: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('configuration_error');
    }
  });
});
