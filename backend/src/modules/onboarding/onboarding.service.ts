import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OnboardingOtpStoreService } from './onboarding-otp.store.service';
import { OnboardingSmsService } from './onboarding-sms.service';
import { DomainEventsService } from 'src/services/domain-events/domain-events.service';
import { DOMAIN_EVENT_TYPE } from 'src/services/domain-events/domain-events.constants';
import {
  RegisterOnboardingDto,
  SendOtpDto,
  VerifyOtpDto,
} from './onboarding.dto';
import { FactoryService } from 'src/services/factories/factories.service';
import { UserService } from 'src/services/users/users.service';
import { USER_ROLE } from 'src/services/users/users.constants';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly store: OnboardingOtpStoreService,
    private readonly sms: OnboardingSmsService,
    private readonly factoryService: FactoryService,
    private readonly usersService: UserService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = dto.phone_number;

    const cooldown = await this.store.canSend(phone);
    if (!cooldown.ok) {
      throw new HttpException(
        `Wait ${cooldown.retryAfterSec}s before requesting another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.store.saveOtp(phone, code);
    await this.sms.sendOtp(phone, code);

    const payload: {
      phone_number: string;
      expires_in_seconds: number;
      dev_otp?: string;
    } = {
      phone_number: phone,
      expires_in_seconds: 600,
    };

    if (this.sms.shouldExposeOtpInResponse()) {
      payload.dev_otp = code;
    }

    return payload;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const result = await this.store.verifyOtp(dto.phone_number, dto.code);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }

    return {
      phone_number: dto.phone_number,
      verified: true,
    };
  }

  async register(dto: RegisterOnboardingDto): Promise<{
    phone_number: string;
    user_id: number;
    factory_id: number;
    already_registered: boolean;
  }> {
    const phone = dto.phone_number;

    if (!(await this.store.isVerified(phone))) {
      throw new UnauthorizedException(
        'Complete phone verification before registering.',
      );
    }

    const existing = await this.usersService.findByPhone(phone);
    const factoryLink = existing?.factory_links as
      | { factory_id?: number }
      | undefined;

    if (existing?.id && factoryLink?.factory_id) {
      await this.publishRegisteredEvent(
        factoryLink.factory_id,
        existing.id,
        phone,
        true,
      );
      return {
        phone_number: phone,
        user_id: existing.id,
        factory_id: factoryLink.factory_id,
        already_registered: true,
      };
    }

    const factoryName = dto.factory_name?.trim() || 'My Factory';
    const factory = await this.factoryService.createFactory({
      name: factoryName,
    });

    if (existing?.id) {
      const link = await this.factoryService.assignMember({
        factory_id: String(factory.id),
        user_id: String(existing.id),
        role: USER_ROLE.OWNER,
      });
      const result = {
        phone_number: phone,
        user_id: link.user_id,
        factory_id: factory.id,
        already_registered: false,
      };
      await this.publishRegisteredEvent(factory.id, link.user_id, phone, false);
      return result;
    }

    const link = await this.factoryService.assignMember({
      factory_id: String(factory.id),
      phone_number: phone,
      name: dto.name?.trim() || undefined,
      role: USER_ROLE.OWNER,
    });

    const result = {
      phone_number: phone,
      user_id: link.user_id,
      factory_id: factory.id,
      already_registered: false,
    };
    await this.publishRegisteredEvent(factory.id, link.user_id, phone, false);
    return result;
  }

  private async publishRegisteredEvent(
    factoryId: number,
    userId: number,
    phone: string,
    alreadyRegistered: boolean,
  ): Promise<void> {
    await this.domainEvents.publish({
      factory_id: factoryId,
      event_type: DOMAIN_EVENT_TYPE.ONBOARDING_REGISTERED,
      aggregate_type: 'user',
      aggregate_id: String(userId),
      payload: { phone_number: phone, already_registered: alreadyRegistered },
    });
  }
}
