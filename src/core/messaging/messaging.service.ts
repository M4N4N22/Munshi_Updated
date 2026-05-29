import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { Op } from 'sequelize';
import axios from 'axios';
import { INDIA_TIMEZONE } from 'src/core/time/india-defaults';

export type MessagingWorkerLine = {
  id: number;
  name: string;
  phone_number?: string | null;
  departmentName?: string | null;
};

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly dbService: DbService) {}

  async sendText(to: string, message: string): Promise<void> {
    const url = `${process.env.OLLI_URL}/external/waba/send`;
    try {
      await axios.post(
        url,
        {
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'X-API-Key': process.env.OLLI_KEY!,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      this.logger.warn(
        `WhatsApp send failed for ${to}: ${error?.response?.data ?? error?.message}`,
      );
      throw error;
    }
  }

  /** WhatsApp Cloud template via Olli (utility templates with optional body vars). */
  async sendTemplate(
    to: string,
    templateName: string,
    options?: {
      languageCode?: string;
      body?: (string | number)[];
    },
  ): Promise<void> {
    const url = `${process.env.OLLI_URL}/external/waba/send`;
    const components: { type: string; parameters: unknown[] }[] = [];
    if (options?.body?.length) {
      components.push({
        type: 'body',
        parameters: options.body.map((val) => ({
          type: 'text',
          text: String(val),
        })),
      });
    }
    try {
      await axios.post(
        url,
        {
          to,
          type: 'template',
          template: {
            name: templateName,
            language: options?.languageCode || 'en',
            components,
          },
        },
        {
          headers: {
            'X-API-Key': process.env.OLLI_KEY!,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      this.logger.warn(
        `WhatsApp template failed for ${to} (${templateName}): ${error?.response?.data ?? error?.message}`,
      );
      throw error;
    }
  }

  /** Owners + managers for a factory (deduped phone numbers). */
  async getOwnerManagerPhones(factoryId: number): Promise<string[]> {
    const rows = await this.dbService.sqlService.FactoryUser.findAll({
      where: {
        factory_id: factoryId,
        role: { [Op.in]: [USER_ROLE.OWNER, USER_ROLE.MANAGER] },
      },
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['phone_number'],
        },
      ],
    });
    const phones = rows
      .map((r: any) => r.user?.phone_number as string | undefined)
      .filter((p): p is string => !!p && String(p).trim().length > 0);
    return [...new Set(phones)];
  }

  async getFactoryName(factoryId: number): Promise<string> {
    const f = await this.dbService.sqlService.Factory.findByPk(factoryId, {
      attributes: ['name'],
    });
    return f?.name ?? `Factory #${factoryId}`;
  }

  async broadcastToOwnersManagers(
    factoryId: number,
    message: string,
  ): Promise<void> {
    const phones = await this.getOwnerManagerPhones(factoryId);
    for (const phone of phones) {
      try {
        await this.sendText(phone, message);
        await this.delay(250);
      } catch {
        /* logged in sendText */
      }
    }
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  fireAndForget(p: Promise<void>, label: string) {
    p.catch((e) =>
      this.logger.warn(`[${label}] ${e?.message ?? e}`),
    );
  }

  formatInstantIST(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private formatPhoneDisplay(phone?: string | null): string {
    if (!phone || !String(phone).trim()) return '—';
    return String(phone).replace(/\s+/g, '');
  }

  formatWorkerListForManager(workers: MessagingWorkerLine[]): string {
    if (!workers.length) {
      return (
        `\n👷 *Workers you can assign*\n` +
        `_No workers available. You may accept the task yourself._\n`
      );
    }

    let block = `\n👷 *Workers you can assign*\n`;
    workers.forEach((w, i) => {
      const dept = w.departmentName
        ? `Dept: *${w.departmentName}*`
        : `Dept: _Not assigned_`;
      const phone = this.formatPhoneDisplay(w.phone_number);
      block +=
        `\n${i + 1}. *${w.name}*\n` +
        `   @${w.id} or @${phone}\n` +
        `   ${dept}\n`;
    });
    return `${block}\n`;
  }

  buildManagerRoutingPromptText(params: {
    factoryName: string;
    taskId: number;
    description: string;
    deadlineIST?: string;
    workers: MessagingWorkerLine[];
  }): string {
    const dueLine = params.deadlineIST
      ? `\n⏳ *Due (IST):* ${params.deadlineIST}\n`
      : '';

    const workerBlock = this.formatWorkerListForManager(params.workers);

    return (
      `━━━━━━━━━━━━━━━━\n` +
      `📋 *New task from owner*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}${dueLine}\n` +
      `Please reply in your own words (natural language).\n\n` +
      `*Option 1 — You will handle it*\n` +
      `Examples:\n` +
      `• "I will do task ${params.taskId}"\n` +
      `• "I'll complete task ${params.taskId} myself"\n\n` +
      `*Option 2 — Assign to a worker*\n` +
      `Examples:\n` +
      `• "@anil will do task ${params.taskId}"\n` +
      `• "Assign task ${params.taskId} to @anil"\n\n` +
      `*Option 3 — Wrong department?*\n` +
      `Transfer to another department:\n` +
      `• "/mgrtransfer ${params.taskId} sales"\n` +
      `• "transfer task ${params.taskId} to it department"\n\n` +
      `*Option 4 — Not sure which department?*\n` +
      `Reject with a reason (owner will be notified):\n` +
      `• "/mgrreject ${params.taskId} not our scope"\n` +
      `• "reject task ${params.taskId} — wrong department"\n` +
      workerBlock +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildTaskAssignedToWorkerText(params: {
    factoryName: string;
    assignerName: string;
    taskId: number;
    description: string;
    deadlineIST?: string;
  }) {
    const dueLine = params.deadlineIST
      ? `⏳ *Due (IST):* ${params.deadlineIST}\n`
      : '';
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `📌 *New task assigned to you*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}\n` +
      dueLine +
      `👤 *Assigned by:* ${params.assignerName}\n\n` +
      `When finished, reply naturally, for example:\n` +
      `• "complete task ${params.taskId}"\n` +
      `• "task ${params.taskId} done"\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildTaskCompletedText(params: {
    factoryName: string;
    completerName: string;
    completerDesignation: string;
    completerPhone?: string;
    taskId: number;
    description: string;
  }) {
    const phoneLine = params.completerPhone
      ? `\n📞 *Phone:* ${this.formatPhoneDisplay(params.completerPhone)}`
      : '';
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `✅ *Task completed*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}\n\n` +
      `✔️ *Completed by:* ${params.completerName}\n` +
      `🎭 *Role:* ${params.completerDesignation}` +
      `${phoneLine}\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildTaskRejectedByManagerText(params: {
    factoryName: string;
    taskId: number;
    description: string;
    reason: string;
    managerName: string;
    managerDesignation: string;
    managerPhone?: string;
  }) {
    const phoneLine = params.managerPhone
      ? `\n📞 *Phone:* ${this.formatPhoneDisplay(params.managerPhone)}`
      : '';
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `❌ *Task rejected by manager*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}\n\n` +
      `*Reason:*\n${params.reason}\n\n` +
      `👔 *Rejected by:* ${params.managerName}\n` +
      `🎭 *Role:* ${params.managerDesignation}` +
      `${phoneLine}\n\n` +
      `You may reassign this work to another department.\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildIssueReportedText(params: {
    factoryName: string;
    reporterName: string;
    issueId: number;
    message: string;
  }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `🚨 *New issue reported*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Issue #${params.issueId}*\n` +
      `👤 *Reported by:* ${params.reporterName}\n\n` +
      `📝 ${params.message}\n\n` +
      `To resolve, reply: "resolve issue ${params.issueId}"\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildIssueResolvedText(params: {
    factoryName: string;
    issueId: number;
    message: string;
  }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `✅ *Issue resolved*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Issue #${params.issueId}*\n\n` +
      `📝 ${params.message}\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildNewUserOnboardedText(params: {
    factoryName: string;
    userName: string;
    userPhone: string;
    role: string;
  }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `👤 *New team member*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `📛 *Name:* ${params.userName}\n` +
      `📞 *Phone:* ${this.formatPhoneDisplay(params.userPhone)}\n` +
      `🎭 *Role:* ${params.role}\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildWorkerWelcomeText(params: { userName: string }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `👋 *Welcome to Munshi*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `Hello *${params.userName || 'there'}*,\n\n` +
      `You have been onboarded successfully.\n` +
      `You can now interact with Munshi on WhatsApp.\n\n` +
      `Try:\n` +
      `• "present" — mark attendance\n` +
      `• "show my tasks" — view your tasks\n` +
      `• /help — see all commands\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildDeadlineMissedWorkerText(params: {
    factoryName: string;
    taskId: number;
    description: string;
    deadlineIST: string;
  }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `⚠️ *Deadline missed*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `This task is still open and past its due time.\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}\n` +
      `⏳ *Was due (IST):* ${params.deadlineIST}\n\n` +
      `Please complete the task or update your manager.\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }

  buildDeadlineMissedAssignerText(params: {
    factoryName: string;
    taskId: number;
    description: string;
    workerName: string;
    deadlineIST: string;
  }) {
    return (
      `━━━━━━━━━━━━━━━━\n` +
      `⚠️ *Deadline missed — task you assigned*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* ${params.factoryName}\n` +
      `🆔 *Task #${params.taskId}*\n` +
      `📝 ${params.description}\n` +
      `👷 *Assignee:* ${params.workerName}\n` +
      `⏳ *Was due (IST):* ${params.deadlineIST}\n\n` +
      `Please follow up with the assignee if needed.\n\n` +
      `━━━━━━━━━━━━━━━━`
    );
  }
}
