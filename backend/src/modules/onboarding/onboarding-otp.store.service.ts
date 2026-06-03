import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';
import {
  MAX_VERIFY_ATTEMPTS,
  OTP_TTL_MS,
  SEND_COOLDOWN_MS,
  VERIFIED_TTL_MS,
} from './onboarding-otp.constants';
import { hashOtpCode, verifyOtpCode } from './onboarding-otp.crypto';
import {
  OnboardingOtpChallenge,
  OnboardingPhoneVerification,
} from './onboarding-otp.schema';

@Injectable()
export class OnboardingOtpStoreService {
  private readonly challengeModel: typeof OnboardingOtpChallenge;
  private readonly verificationModel: typeof OnboardingPhoneVerification;

  constructor(private readonly dbService: DbService) {
    this.challengeModel = this.dbService.sqlService.OnboardingOtpChallenge;
    this.verificationModel = this.dbService.sqlService.OnboardingPhoneVerification;
  }

  async canSend(
    phone: string,
  ): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
    const row = await this.challengeModel.findByPk(phone);
    if (!row) return { ok: true };
    const elapsed = Date.now() - row.last_sent_at.getTime();
    if (elapsed >= SEND_COOLDOWN_MS) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000),
    };
  }

  async saveOtp(phone: string, code: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.challengeModel.upsert({
      phone_number: phone,
      code_hash: hashOtpCode(code),
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: now,
    } as any);
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const record = await this.challengeModel.findByPk(phone);
    if (!record) {
      return {
        ok: false,
        reason: 'No OTP sent for this number. Request a new code.',
      };
    }
    if (Date.now() > record.expires_at.getTime()) {
      await record.destroy();
      return { ok: false, reason: 'OTP expired. Request a new code.' };
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await record.destroy();
      return {
        ok: false,
        reason: 'Too many attempts. Request a new code.',
      };
    }
    await record.update({ attempts: record.attempts + 1 });
    if (!verifyOtpCode(code, record.code_hash)) {
      return { ok: false, reason: 'Invalid code. Try again.' };
    }
    await record.destroy();
    const verifiedAt = new Date();
    await this.verificationModel.upsert({
      phone_number: phone,
      verified_at: verifiedAt,
      expires_at: new Date(Date.now() + VERIFIED_TTL_MS),
    } as any);
    return { ok: true };
  }

  async isVerified(phone: string): Promise<boolean> {
    const record = await this.verificationModel.findByPk(phone);
    if (!record) return false;
    if (Date.now() > record.expires_at.getTime()) {
      await record.destroy();
      return false;
    }
    return true;
  }

  /** Remove expired OTP / verification rows (cron). */
  async purgeExpired(): Promise<{ challenges: number; verifications: number }> {
    const now = new Date();
    const challenges = await this.challengeModel.destroy({
      where: { expires_at: { [Op.lt]: now } },
    });
    const verifications = await this.verificationModel.destroy({
      where: { expires_at: { [Op.lt]: now } },
    });
    return { challenges, verifications };
  }
}
