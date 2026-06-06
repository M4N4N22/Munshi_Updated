import { Module, forwardRef } from '@nestjs/common';
import { DomainEventsProcessorCron } from './domain-events.processor.cron';
import { DomainEventsService } from './domain-events.service';
import { IntegrationModule } from '../integrations/integration.module';

@Module({
  imports: [forwardRef(() => IntegrationModule)],
  providers: [DomainEventsService, DomainEventsProcessorCron],
  exports: [DomainEventsService],
})
export class DomainEventsModule {}
