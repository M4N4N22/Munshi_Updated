import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEventsService } from './domain-events.service';

@Injectable()
export class DomainEventsProcessorCron {
  private readonly logger = new Logger(DomainEventsProcessorCron.name);

  constructor(private readonly domainEvents: DomainEventsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processOutbox(): Promise<void> {
    const count = await this.domainEvents.processPendingBatch();
    if (count > 0) {
      this.logger.log(`Processed ${count} domain event(s)`);
    }
  }
}
