import { Test } from '@nestjs/testing';
import { TokenCryptoService } from './token-crypto.service';

describe('TokenCryptoService', () => {
  const prevKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY =
      'test-integration-encryption-key-32chars-min';
  });

  afterAll(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = prevKey;
  });

  it('encrypts and decrypts tokens', async () => {
    const module = await Test.createTestingModule({
      providers: [TokenCryptoService],
    }).compile();
    const crypto = module.get(TokenCryptoService);

    const plain = 'zoho-access-token-secret-value';
    const encrypted = crypto.encrypt(plain);
    expect(encrypted).not.toContain(plain);
    expect(crypto.decrypt(encrypted)).toBe(plain);
  });

  it('produces distinct ciphertext for the same plaintext', async () => {
    const module = await Test.createTestingModule({
      providers: [TokenCryptoService],
    }).compile();
    const crypto = module.get(TokenCryptoService);
    const a = crypto.encrypt('same-token');
    const b = crypto.encrypt('same-token');
    expect(a).not.toBe(b);
    expect(crypto.decrypt(a)).toBe('same-token');
    expect(crypto.decrypt(b)).toBe('same-token');
  });
});
