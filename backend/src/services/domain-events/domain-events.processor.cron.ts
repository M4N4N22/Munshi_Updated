import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEventsService } from './domain-events.service';

@Injectable()
export class DomainEventsProcessorCron implements OnModuleInit {
  private readonly logger = new Logger(DomainEventsProcessorCron.name);

  constructor(private readonly domainEvents: DomainEventsService) {}

  /** Drain backlog on boot (e.g. after deploy or when cron was offline). */
  async onModuleInit(): Promise<void> {
    const count = await this.domainEvents.processPendingBatch(100);
    if (count > 0) {
      this.logger.log(`Startup: processed ${count} backlog domain event(s)`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processOutbox(): Promise<void> {
    const count = await this.domainEvents.processPendingBatch();
    if (count > 0) {
      this.logger.log(`Processed ${count} domain event(s)`);
    }
  }
}
