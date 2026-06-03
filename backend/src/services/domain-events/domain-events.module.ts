import { Module } from '@nestjs/common';
import { DomainEventsProcessorCron } from './domain-events.processor.cron';
import { DomainEventsService } from './domain-events.service';

@Module({
  providers: [DomainEventsService, DomainEventsProcessorCron],
  exports: [DomainEventsService],
})
export class DomainEventsModule {}
