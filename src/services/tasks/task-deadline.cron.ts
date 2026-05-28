import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { INDIA_TIMEZONE } from 'src/core/time/india-defaults';

/** Runs in Asia/Kolkata — checks overdue open tasks and sends WhatsApp reminders once per task. */
@Injectable()
export class TaskDeadlineCronService {
  private readonly logger = new Logger(TaskDeadlineCronService.name);

  constructor(private readonly tasksService: TasksService) {}

  @Cron('10 * * * *', { timeZone: INDIA_TIMEZONE })
  async handleMissedDeadlines() {
    try {
      await this.tasksService.processMissedDeadlineReminders();
    } catch (e: any) {
      this.logger.warn(
        `Missed-deadline cron: ${e?.message ?? e} (ensure DB column tasks.deadline_breach_reminded_at exists)`,
      );
    }
  }
}
