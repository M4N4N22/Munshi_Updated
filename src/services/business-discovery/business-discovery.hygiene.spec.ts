import { isOperationalCommand, sanitizeBucketData } from './business-discovery.hygiene';

describe('BusinessDiscovery hygiene', () => {
  it('detects operational inventory status commands', () => {
    expect(isOperationalCommand('inventory status batao')).toBe(true);
    expect(isOperationalCommand('purchase request bana do')).toBe(true);
    expect(isOperationalCommand('Sharma Packaging Pvt Ltd')).toBe(false);
  });

  it('strips polluted bucket values', () => {
    const clean = sanitizeBucketData({
      'BUSINESS_IDENTITY.business_name': 'Acme Corp',
      'BUSINESS_IDENTITY.address': 'inventory status batao',
      'BUSINESS_IDENTITY.industry': 'purchase request bana do',
    });
    expect(clean['BUSINESS_IDENTITY.business_name']).toBe('Acme Corp');
    expect(clean['BUSINESS_IDENTITY.address']).toBeUndefined();
    expect(clean['BUSINESS_IDENTITY.industry']).toBeUndefined();
  });
});
