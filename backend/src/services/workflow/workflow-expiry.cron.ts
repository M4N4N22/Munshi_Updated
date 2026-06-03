import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowSessionService } from './workflow-session.service';

@Injectable()
export class WorkflowExpiryCronService {
  private readonly logger = new Logger(WorkflowExpiryCronService.name);

  constructor(private readonly sessionService: WorkflowSessionService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleSessions(): Promise<void> {
    const count = await this.sessionService.expireStaleActiveSessions();
    if (count > 0) {
      this.logger.log(`Expired ${count} stale workflow session(s)`);
    }
  }
}
