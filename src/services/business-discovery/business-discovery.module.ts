import { Module, forwardRef } from '@nestjs/common';
import { BusinessDiscoveryIntegrationService } from './business-discovery-integration.service';
import { BusinessDiscoveryController } from './business-discovery.controller';
import { BusinessDiscoveryDocumentService } from './business-discovery-document.service';
import { BusinessDiscoveryReminderCronService } from './business-discovery-reminder.cron';
import { BusinessDiscoveryRepository } from './business-discovery.repository';
import { BusinessDiscoveryService } from './business-discovery.service';

@Module({
  controllers: [BusinessDiscoveryController],
  providers: [
    BusinessDiscoveryRepository,
    BusinessDiscoveryService,
    BusinessDiscoveryIntegrationService,
    BusinessDiscoveryDocumentService,
    BusinessDiscoveryReminderCronService,
  ],
  exports: [
    BusinessDiscoveryService,
    BusinessDiscoveryIntegrationService,
    BusinessDiscoveryDocumentService,
  ],
})
export class BusinessDiscoveryModule {}
