import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingSmsService } from './onboarding-sms.service';
import { OnboardingOtpStoreService } from './onboarding-otp.store.service';
import { OnboardingOtpCleanupCron } from './onboarding-otp.cron';
import { OnboardingSetupService } from './onboarding-setup.service';
import { OnboardingSetupTokenService } from './onboarding-setup-token.service';
import { FactoryModule } from 'src/services/factories/factories.module';
import { DomainEventsModule } from 'src/services/domain-events/domain-events.module';
import { DepartmentsModule } from 'src/services/departments/departments.module';
import { InventoryModule } from 'src/services/inventory/inventory.module';
import { TeamImportModule } from 'src/services/team-import/team-import.module';
import { WorkflowModule } from 'src/services/workflow/workflow.module';
import { IntegrationModule } from 'src/services/integrations/integration.module';

@Module({
  imports: [
    FactoryModule,
    DomainEventsModule,
    DepartmentsModule,
    InventoryModule,
    TeamImportModule,
    WorkflowModule,
    IntegrationModule,
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    OnboardingSmsService,
    OnboardingOtpStoreService,
    OnboardingOtpCleanupCron,
    OnboardingSetupService,
    OnboardingSetupTokenService,
  ],
  exports: [OnboardingService, OnboardingSetupService],
})
export class OnboardingModule {}
