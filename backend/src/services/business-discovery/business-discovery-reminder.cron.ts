import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessDiscoveryService } from './business-discovery.service';

@Injectable()
export class BusinessDiscoveryReminderCronService {
  private readonly logger = new Logger(BusinessDiscoveryReminderCronService.name);

  constructor(private readonly discoveryService: BusinessDiscoveryService) {}

  /** Scheduled lookup — no per-session timers. */
  @Cron(CronExpression.EVERY_HOUR)
  async processDueReminders(): Promise<void> {
    const count = await this.discoveryService.processDueReminders();
    if (count > 0) {
      this.logger.log(`Processed ${count} business discovery reminder(s)`);
    }
  }
}
