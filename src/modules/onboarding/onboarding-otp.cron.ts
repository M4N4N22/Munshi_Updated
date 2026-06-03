import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnboardingOtpStoreService } from './onboarding-otp.store.service';

@Injectable()
export class OnboardingOtpCleanupCron {
  private readonly logger = new Logger(OnboardingOtpCleanupCron.name);

  constructor(private readonly otpStore: OnboardingOtpStoreService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<void> {
    const { challenges, verifications } = await this.otpStore.purgeExpired();
    if (challenges > 0 || verifications > 0) {
      this.logger.log(
        `Purged ${challenges} OTP challenge(s), ${verifications} verification(s)`,
      );
    }
  }
}
