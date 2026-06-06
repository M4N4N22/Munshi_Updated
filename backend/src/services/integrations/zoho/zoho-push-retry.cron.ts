import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isZohoPushRetryEnabled } from './zoho-push-retry.constants';
import { ZohoPushRetryService } from './zoho-push-retry.service';

@Injectable()
export class ZohoPushRetryCron {
  private readonly logger = new Logger(ZohoPushRetryCron.name);

  constructor(private readonly pushRetryService: ZohoPushRetryService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tickPushRetries(): Promise<void> {
    if (!isZohoPushRetryEnabled()) {
      return;
    }
    const result = await this.pushRetryService.runRetryBatch();
    if (result.processed > 0) {
      this.logger.log(
        `Push retry tick: processed=${result.processed} delivered=${result.delivered} failed=${result.failed}`,
      );
    }
  }
}
