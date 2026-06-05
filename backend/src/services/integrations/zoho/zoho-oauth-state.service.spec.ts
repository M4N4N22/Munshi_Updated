import { UnauthorizedException } from '@nestjs/common';
import { ZohoOAuthStateService } from './zoho-oauth-state.service';

describe('ZohoOAuthStateService', () => {
  const prevKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  let service: ZohoOAuthStateService;

  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY =
      'test-integration-encryption-key-32chars-min';
    service = new ZohoOAuthStateService();
  });

  afterAll(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = prevKey;
  });

  it('validates OAuth state signature and payload', () => {
    const state = service.createState(10, 20);
    const payload = service.validateState(state, { markUsed: false });
    expect(payload.factoryId).toBe(10);
    expect(payload.userId).toBe(20);
    expect(payload.nonce).toBeTruthy();
  });

  it('rejects expired state', () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const state = service.createState(1, 2);
    now += 11 * 60 * 1000;
    expect(() => service.validateState(state)).toThrow(UnauthorizedException);
    jest.restoreAllMocks();
  });

  it('rejects replay of the same state', () => {
    const state = service.createState(5, 6);
    service.validateState(state, { markUsed: true });
    expect(() => service.validateState(state, { markUsed: true })).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tampered signature (cross-factory attempt)', () => {
    const state = service.createState(1, 1);
    const [encoded] = state.split('.');
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );
    payload.factoryId = 9999;
    const forgedEncoded = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const forged = `${forgedEncoded}.${state.split('.')[1]}`;
    expect(() => service.validateState(forged)).toThrow(UnauthorizedException);
  });
});
