import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ONBOARDING_SETUP_TOKEN_TTL_MS } from './onboarding-setup.constants';

export type OnboardingSetupTokenPayload = {
  factory_id: number;
  user_id: number;
  phone: string;
  exp: number;
};

@Injectable()
export class OnboardingSetupTokenService {
  private signingKey(): string {
    const key =
      process.env.ONBOARDING_SETUP_SECRET?.trim() ||
      process.env.X_SECRET?.trim() ||
      'dev-onboarding-setup-secret';
    return key;
  }

  createToken(payload: Omit<OnboardingSetupTokenPayload, 'exp'>): string {
    const full: OnboardingSetupTokenPayload = {
      ...payload,
      exp: Date.now() + ONBOARDING_SETUP_TOKEN_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(full)).toString('base64url');
    const sig = this.sign(body);
    return `${body}.${sig}`;
  }

  verifyToken(token: string): OnboardingSetupTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid onboarding setup token.');
    }
    const [body, sig] = parts;
    const expected = this.sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid onboarding setup token.');
    }
    let payload: OnboardingSetupTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as OnboardingSetupTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid onboarding setup token.');
    }
    if (!payload.exp || Date.now() > payload.exp) {
      throw new UnauthorizedException('Onboarding setup session expired.');
    }
    if (
      !payload.factory_id ||
      !payload.user_id ||
      !payload.phone?.trim()
    ) {
      throw new UnauthorizedException('Invalid onboarding setup token.');
    }
    return payload;
  }

  private sign(body: string): string {
    return createHmac('sha256', this.signingKey())
      .update(body)
      .digest('base64url');
  }
}
