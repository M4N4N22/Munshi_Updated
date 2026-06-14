import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { ZOHO_OAUTH_STATE_TTL_MS } from './zoho-oauth.constants';

export interface ZohoOAuthStatePayload {
  factoryId: number;
  userId: number;
  nonce: string;
  exp: number;
  returnTo?: string;
}

interface StoredNonce {
  exp: number;
  used: boolean;
}

@Injectable()
export class ZohoOAuthStateService {
  private readonly nonces = new Map<string, StoredNonce>();

  createState(factoryId: number, userId: number, returnTo?: string): string {
    const nonce = randomBytes(16).toString('hex');
    const exp = Date.now() + ZOHO_OAUTH_STATE_TTL_MS;
    const payload: ZohoOAuthStatePayload = {
      factoryId,
      userId,
      nonce,
      exp,
      ...(returnTo ? { returnTo } : {}),
    };
    this.nonces.set(nonce, { exp, used: false });
    return this.sign(payload);
  }

  validateState(state: string, options?: { markUsed?: boolean }): ZohoOAuthStatePayload {
    const markUsed = options?.markUsed ?? true;
    const payload = this.verifySignature(state);
    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('OAuth state expired');
    }
    const record = this.nonces.get(payload.nonce);
    if (!record) {
      throw new UnauthorizedException('OAuth state nonce unknown or expired');
    }
    if (record.used) {
      throw new UnauthorizedException('OAuth state already used');
    }
    if (record.exp < Date.now()) {
      this.nonces.delete(payload.nonce);
      throw new UnauthorizedException('OAuth state expired');
    }
    if (markUsed) {
      record.used = true;
    }
    return payload;
  }

  /** Test helper — clears in-memory nonce registry. */
  resetForTests(): void {
    this.nonces.clear();
  }

  private sign(payload: ZohoOAuthStatePayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.signingKey())
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifySignature(state: string): ZohoOAuthStatePayload {
    const parts = state.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid OAuth state');
    }
    const [encoded, signature] = parts;
    const expected = createHmac('sha256', this.signingKey())
      .update(encoded)
      .digest('base64url');
    try {
      const sigOk = timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
      if (!sigOk) {
        throw new UnauthorizedException('Invalid OAuth state signature');
      }
    } catch {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }
    let payload: ZohoOAuthStatePayload;
    try {
      payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as ZohoOAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid OAuth state payload');
    }
    if (
      !Number.isFinite(payload.factoryId) ||
      !Number.isFinite(payload.userId) ||
      !payload.nonce ||
      !Number.isFinite(payload.exp)
    ) {
      throw new BadRequestException('Invalid OAuth state payload');
    }
    return payload;
  }

  private signingKey(): string {
    const key = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
    if (!key) {
      throw new InternalServerErrorException(
        'INTEGRATION_TOKEN_ENCRYPTION_KEY is not configured',
      );
    }
    return createHmac('sha256', key).update('zoho-oauth-state-v1').digest('hex');
  }
}
