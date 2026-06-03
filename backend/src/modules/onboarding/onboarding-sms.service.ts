import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OnboardingSmsService {
  private readonly logger = new Logger(OnboardingSmsService.name);

  async sendOtp(phoneE164: string, code: string): Promise<void> {
    const message = `Your Munshi verification code is ${code}. Valid for 10 minutes.`;

    const authKey = process.env.ONBOARDING_MSG91_AUTH_KEY?.trim();
    const templateId = process.env.ONBOARDING_MSG91_TEMPLATE_ID?.trim();

    if (authKey && templateId) {
      await this.sendViaMsg91(phoneE164, code, authKey, templateId);
      return;
    }

    this.logger.log(`[OTP dev] ${phoneE164} → ${code}`);
  }

  shouldExposeOtpInResponse(): boolean {
    return (
      process.env.ONBOARDING_OTP_EXPOSE_IN_RESPONSE === 'true' ||
      process.env.NODE_ENV !== 'production'
    );
  }

  private async sendViaMsg91(
    phoneE164: string,
    code: string,
    authKey: string,
    templateId: string,
  ): Promise<void> {
    const mobile = phoneE164.startsWith('91') ? phoneE164.slice(2) : phoneE164;
    try {
      await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: templateId,
          mobile: `91${mobile}`,
          otp: code,
        },
        {
          headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      );
    } catch (error: any) {
      this.logger.error(
        `MSG91 OTP failed: ${error?.response?.data ?? error?.message}`,
      );
      throw error;
    }
  }
}
