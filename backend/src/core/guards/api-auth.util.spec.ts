import { UnauthorizedException } from '@nestjs/common';
import {
  assertValidXSecret,
  isRestApiAuthRequired,
} from './api-auth.util';

describe('api-auth.util', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.REST_API_REQUIRE_X_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.X_SECRET;
  });

  afterAll(() => {
    process.env = env;
  });

  describe('isRestApiAuthRequired', () => {
    it('returns true when REST_API_REQUIRE_X_SECRET=true', () => {
      process.env.REST_API_REQUIRE_X_SECRET = 'true';
      expect(isRestApiAuthRequired()).toBe(true);
    });

    it('returns false when REST_API_REQUIRE_X_SECRET=false', () => {
      process.env.NODE_ENV = 'production';
      process.env.REST_API_REQUIRE_X_SECRET = 'false';
      expect(isRestApiAuthRequired()).toBe(false);
    });

    it('defaults to true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isRestApiAuthRequired()).toBe(true);
    });

    it('defaults to false outside production', () => {
      process.env.NODE_ENV = 'development';
      expect(isRestApiAuthRequired()).toBe(false);
    });
  });

  describe('assertValidXSecret', () => {
    it('accepts a matching header', () => {
      process.env.X_SECRET = 'test-secret';
      expect(() => assertValidXSecret('test-secret')).not.toThrow();
    });

    it('rejects a missing or wrong header', () => {
      process.env.X_SECRET = 'test-secret';
      expect(() => assertValidXSecret('wrong')).toThrow(UnauthorizedException);
    });

    it('rejects when X_SECRET is not configured', () => {
      expect(() => assertValidXSecret('anything')).toThrow(UnauthorizedException);
    });
  });
});
