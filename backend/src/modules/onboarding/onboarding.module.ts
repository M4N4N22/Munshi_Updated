import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingSmsService } from './onboarding-sms.service';
import { OnboardingOtpStoreService } from './onboarding-otp.store.service';
import { OnboardingOtpCleanupCron } from './onboarding-otp.cron';
import { FactoryModule } from 'src/services/factories/factories.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';

@Module({
  imports: [FactoryModule, DomainEventsModule, DepartmentsModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    OnboardingSmsService,
    OnboardingOtpStoreService,
    OnboardingOtpCleanupCron,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
