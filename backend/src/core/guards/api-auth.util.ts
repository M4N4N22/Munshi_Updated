import { UnauthorizedException } from '@nestjs/common';
import { EXTERNAL_CALL_NOT_ALLOWED } from './guards.constants';

const MISSING_SECRET_MESSAGE =
  'API auth is not configured (X_SECRET missing in server env)';

/** When true, REST handlers require a matching `x-secret` header unless marked @Public(). */
export function isRestApiAuthRequired(): boolean {
  const flag = process.env.REST_API_REQUIRE_X_SECRET?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function assertValidXSecret(headerValue: string | undefined): void {
  const expected = process.env.X_SECRET?.trim();
  if (!expected) {
    throw new UnauthorizedException(MISSING_SECRET_MESSAGE);
  }
  if (headerValue !== expected) {
    throw new UnauthorizedException(EXTERNAL_CALL_NOT_ALLOWED);
  }
}
