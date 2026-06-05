import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isZohoSyncEnabled } from './zoho-scheduled-sync.constants';
import { ZohoScheduledSyncService } from './zoho-scheduled-sync.service';

@Injectable()
export class ZohoScheduledSyncCron {
  private readonly logger = new Logger(ZohoScheduledSyncCron.name);

  constructor(private readonly scheduledSync: ZohoScheduledSyncService) {}

  /** Tick every 10 minutes; per-connection interval enforced in service. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async tickScheduledPullSync(): Promise<void> {
    if (!isZohoSyncEnabled()) {
      return;
    }
    const result = await this.scheduledSync.runScheduledSyncIfDue();
    if (result.synced > 0 || result.failed > 0) {
      this.logger.log(
        `Scheduled sync tick: synced=${result.synced} skipped=${result.skipped} failed=${result.failed}`,
      );
    }
  }
}
