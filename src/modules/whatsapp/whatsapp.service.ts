import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceService } from 'src/services/attendance/attendance.service';
import { UserService } from 'src/services/users/users.service';
import {
  WhatsAppIncomingDto,
  WhatsAppIncomingServiceDto,
} from './whatsapp.dto';
import { IssueService } from 'src/services/issues/issues.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TasksService } from 'src/services/tasks/tasks.service';
import { COMMAND_HINTS, COMMANDS } from './whatsapp.constants';
import { FactoryService } from 'src/services/factories/factories.service';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportService } from 'src/services/reports/reports.service';
import { MessagingService } from 'src/core/messaging/messaging.service';
import {
  normalizeOutbound,
  textOutbound,
  type WaOutboundMessage,
} from 'src/core/messaging/outbound-message.types';
import {
  buildTeamSetupLinkReply,
  getOnboardWorkerGoogleFormUrl,
  getTeamDashboardUrl,
} from 'src/core/messaging/team-setup-outbound';
import {
  resolveTeamSetupActionId,
  WA_INTERACTIVE_ID,
} from 'src/core/messaging/whatsapp-interactive.constants';
import { WORKFLOW_START_COMMANDS } from 'src/services/workflow/workflow.constants';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { WorkflowRouterService } from 'src/services/workflow/workflow-engine.service';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { IInventoryStatusRecord } from 'src/services/inventory/inventory.interfaces';
import { getHourIST, INDIA_TIMEZONE } from 'src/core/time/india-defaults';
import {
  WA_DIVIDER,
  waDepartmentAssignSent,
  waErrorDepartmentNotFound,
  waErrorDescriptionRequired,
  waErrorInvalidFormat,
  waErrorMissingDepartSlug,
  waErrorOwnersOnlyDepartment,
  waErrorTaskIdRequired,
  waErrorWorkerRequired,
  waHelpText,
  waSection,
  waIssueReported,
  waIssueResolved,
  waIssuesEmpty,
  waTaskAssigned,
  waTaskCompleted,
  waTaskUpdated,
  waTasksEmpty,
  waTeamEmpty,
  waUnknownCommand,
} from './whatsapp.templates';

@Injectable()
export class WhatsAppService {
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  constructor(
    private readonly tasksService: TasksService,
    private readonly attendanceService: AttendanceService,
    private readonly issuesService: IssueService,
    private readonly usersService: UserService,
    private readonly factoryService: FactoryService,
    private readonly reportService: ReportService,
    private readonly messagingService: MessagingService,
    private readonly departmentsService: DepartmentsService,
    private readonly workflowRouter: WorkflowRouterService,
    private readonly inventoryService: InventoryService,
  ) {}

  async sendTextMessage(to: string, message: string) {
    await this.messagingService.sendText(to, message);
    return { ok: true };
  }

  async sendOutbound(to: string, outbound: WaOutboundMessage) {
    switch (outbound.type) {
      case 'text':
        await this.messagingService.sendText(to, outbound.body);
        break;
      case 'interactive_buttons':
        await this.messagingService.sendInteractiveButtons(
          to,
          outbound.body,
          outbound.buttons,
        );
        break;
      case 'interactive_cta_url':
        try {
          await this.messagingService.sendInteractiveCtaUrl(
            to,
            outbound.body,
            outbound.displayText,
            outbound.url,
          );
        } catch {
          await this.messagingService.sendText(
            to,
            buildTeamSetupLinkReply(
              outbound.displayText,
              outbound.body,
              outbound.url,
            ),
          );
        }
        break;
    }
    return { ok: true };
  }

  private resolveOutboundFromHandlerResult(result: unknown): WaOutboundMessage {
    if (result && typeof result === 'object' && 'type' in result) {
      const candidate = result as WaOutboundMessage;
      if (
        candidate.type === 'text' ||
        candidate.type === 'interactive_buttons' ||
        candidate.type === 'interactive_cta_url'
      ) {
        return candidate;
      }
    }
    if (typeof result === 'string') {
      return textOutbound(result);
    }
    if (result && typeof result === 'object' && 'message' in result) {
      const msg = (result as { message?: unknown }).message;
      if (typeof msg === 'string') {
        return textOutbound(msg);
      }
    }
    return textOutbound('');
  }

  private async handleTeamSetupInteractive(
    phone: string,
    actionId: string,
  ): Promise<void> {
    switch (actionId) {
      case WA_INTERACTIVE_ID.TEAM_GOOGLE_FORM: {
        const formUrl = getOnboardWorkerGoogleFormUrl();
        if (formUrl) {
          await this.sendTextMessage(
            phone,
            buildTeamSetupLinkReply(
              'Google Form',
              'Naye team members add karne ke liye ye link kholo. Submit ke baad wapas yahan task bhej sakte hain.',
              formUrl,
            ),
          );
        } else {
          await this.sendTextMessage(
            phone,
            waSection(
              'Google Form',
              'Google Form link abhi configure nahi hai.\n\n*WhatsApp par add* button se worker add karein, ya admin se form link maangein.',
            ),
          );
        }
        return;
      }
      case WA_INTERACTIVE_ID.TEAM_DASHBOARD: {
        const dashboardUrl = getTeamDashboardUrl();
        if (dashboardUrl) {
          await this.sendTextMessage(
            phone,
            buildTeamSetupLinkReply(
              'Dashboard',
              'Team manage karne ke liye dashboard kholo. (Kuch features jald aa rahe hain.)',
              dashboardUrl,
            ),
          );
        } else {
          await this.sendTextMessage(
            phone,
            waSection(
              'Dashboard',
              'Dashboard link abhi configure nahi hai.\n\n*WhatsApp par add* se abhi worker add kar sakte hain.',
            ),
          );
        }
        return;
      }
      case WA_INTERACTIVE_ID.TEAM_ONBOARD_WA: {
        const sessionState =
          await this.workflowRouter.resolveActiveSession(phone);
        if (sessionState.session) {
          await this.workflowRouter.cancelWorkflow(phone);
        }
        const workflowMessage =
          await this.workflowRouter.startWorkflowFromCommand(
            phone,
            WORKFLOW_START_COMMANDS.ONBOARD_WORKER,
          );
        await this.sendOutbound(
          phone,
          normalizeOutbound(workflowMessage),
        );
        return;
      }
      default:
        return;
    }
  }
  // export function formatCommandHints(commands: typeof COMMAND_HINTS) {
  //   return commands
  //     .map((c) => `${c.command} - ${c.hint}`)
  //     .join('\n');
  // }

  async sendTemplate(
    to: string,
    templateName: string,
    options?: {
      languageCode?: string;
      body?: (string | number)[];
    },
  ) {
    await this.messagingService.sendTemplate(to, templateName, options);
    return { ok: true };
  }
  async handleIncomingMessage(body: WhatsAppIncomingDto) {
    console.log({ body });
    const finish = async (result: unknown) => {
      await this.sendOutbound(
        body.from,
        this.resolveOutboundFromHandlerResult(result),
      );
      return 'ok';
    };

    try {
      const msgTrim = (body.message || '').trim();

      const teamActionId = resolveTeamSetupActionId(msgTrim);
      if (teamActionId) {
        try {
          await this.handleTeamSetupInteractive(body.from, teamActionId);
        } catch (error) {
          console.log(error);
          await this.sendTextMessage(
            body.from,
            waSection(
              'Could not complete',
              'Abhi ye action complete nahi ho paya. Neeche diye link se try karein ya *WhatsApp par add* button dabayein.',
            ),
          );
        }
        return 'ok';
      }

      if (this.workflowRouter.isCancelCommand(msgTrim)) {
        const cancelResult = await this.workflowRouter.cancelWorkflow(
          body.from,
        );
        return finish(cancelResult);
      }

      const sessionState = await this.workflowRouter.resolveActiveSession(
        body.from,
      );
      if (sessionState.expiredJustNow) {
        return finish(this.workflowRouter.getExpiredSessionMessage());
      } else if (sessionState.session) {
        const workflowResult =
          await this.workflowRouter.handleActiveWorkflowMessage(
            body.from,
            msgTrim,
          );
        return finish(workflowResult);
      }

      const slashBypass = msgTrim.match(
        /^\/(mgrself|mgrassign|mgrtransfer|mgrreject)\b/i,
      );

      const workflowStartCmd =
        this.workflowRouter.matchWorkflowStartCommand(msgTrim);

      let result: any;
      if (slashBypass) {
        const command = `/${slashBypass[1].toLowerCase()}`;
        result = await this.processCommand({
          ...body,
          message: msgTrim,
          command,
          id: undefined,
          date: undefined,
        });
      } else if (workflowStartCmd) {
        result = await this.workflowRouter.startWorkflowFromCommand(
          body.from,
          workflowStartCmd,
        );
      } else {
        const ml_url = process.env.ML_URL || `http://localhost:8000`;

        const response = await axios.post(
          `${ml_url}/classify?message=${encodeURIComponent(body.message)}`,
        );

        const ml = this.parseMlClassifyResponse(response.data);
        console.log('ml-classify', ml);

        const intentLc = (ml.intent || '').toLowerCase();
        if (intentLc === 'general_chat') {
          const chatMsg =
            ml.message?.trim() ||
            'Main tasks/attendance mein help kar sakta hoon. /help type karo.';
          await this.sendTextMessage(body.from, chatMsg);
          return 'ok';
        }

        const rawId = ml.id;
        const id =
          rawId != null &&
          rawId !== '' &&
          Number.isFinite(Number(rawId))
            ? Number(rawId)
            : undefined;

        const command = this.normalizeIntentCommand(ml.intent);

        const workflowStarted =
          command &&
          (await this.workflowRouter.startWorkflowIfRegistered(
            body.from,
            command,
            {
              taskDescription:
                ml.task_description?.trim() || msgTrim,
              deadline: ml.deadline ?? undefined,
            },
          ));

        if (workflowStarted !== null) {
          result = workflowStarted;
        } else {
          result = await this.processCommand({
            ...body,
            command: command ?? ml.intent,
            id,
            date: ml.date,
            datetime: ml.datetime ?? undefined,
            time: ml.time ?? undefined,
            deadline: ml.deadline ?? undefined,
            worker_slug: ml.worker_slug ?? undefined,
            depart_slug: ml.depart_slug ?? undefined,
            reject_reason: ml.reject_reason ?? undefined,
          });
        }
      }

      console.log({ result });
      return finish(result);
    } catch (error: any) {
      console.log(error);

      if (error instanceof HttpException) {
        const status = error.getStatus();
        const payload = error.getResponse();
        const errText =
          typeof payload === 'string'
            ? payload
            : Array.isArray((payload as { message?: unknown }).message)
              ? (payload as { message: string[] }).message.join('\n')
              : (payload as { message?: string }).message ||
                error.message ||
                'We could not process your request. Please try again or send /help.';
        try {
          await this.sendTextMessage(body.from, errText);
        } catch (sendErr) {
          console.log(sendErr);
        }
        return status >= 500 ? 'error' : 'ok';
      }

      const errText =
        error?.response?.data?.message ||
        error?.message ||
        'Kuch gadbad ho gayi. Dubara try karein ya */help* bhejein.';
      try {
        await this.sendTextMessage(body.from, errText);
      } catch (sendErr) {
        console.log(sendErr);
      }

      return 'error';
    }
  }

  async processCommand(body: WhatsAppIncomingServiceDto) {
    const rawMessage = body?.message?.trim();
    const command = body.command?.startsWith('/')
      ? body.command
      : `/${body.command}`;
    const id = body.id;
    const phone = body?.from;

    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    const factoryId = user.factory_links?.factory_id;
    const role = user.factory_links?.role;

    if (!factoryId)
      throw new NotFoundException('User not assigned to any factory');

    // 🟢 Attendance
    //
    //

    if (command === COMMANDS.REPORT) {
      this.ensureManager(role);

      return this.reportService.generateReport(factoryId, body.date);
    }

    if (command === COMMANDS.HELP) return waHelpText(user?.name || 'User');

    const cmdLc = (command || '').toLowerCase();

    if (cmdLc === COMMANDS.INVENTORY_STATUS) {
      this.ensureManager(role);
      return this.handleInventoryStatus(factoryId, rawMessage);
    }

    if (cmdLc === COMMANDS.CANCEL) {
      return this.workflowRouter.cancelWorkflow(phone);
    }

    const deptAssignEarly = await this.tryClassifiedDepartmentAssign(
      body,
      rawMessage,
      user.id,
      factoryId,
      role,
      cmdLc,
    );
    if (deptAssignEarly !== null) {
      return deptAssignEarly;
    }

    if (cmdLc === COMMANDS.MGR_SELF) {
      this.ensureManager(role);
      const taskId = this.resolveManagerTaskId(body.id, rawMessage);
      if (taskId === undefined) {
        return waErrorTaskIdRequired([
          'I will do task 12',
          "I'll handle task 12 myself",
        ]);
      }
      return this.tasksService.applyManagerSelf(user.id, factoryId, taskId);
    }

    if (cmdLc === COMMANDS.MGR_ASSIGN) {
      this.ensureManager(role);
      const taskId = this.resolveManagerTaskId(body.id, rawMessage);
      const mention = this.resolveManagerWorkerMention(body.worker_slug, rawMessage);
      if (taskId === undefined) {
        return waErrorTaskIdRequired([
          '@anil will do task 12',
          'Assign task 12 to @anil',
        ]);
      }
      if (!mention) {
        return waErrorWorkerRequired(taskId);
      }
      return this.tasksService.applyManagerDelegateWorker(
        user.id,
        factoryId,
        taskId,
        mention,
      );
    }

    if (cmdLc === COMMANDS.MGR_TRANSFER) {
      this.ensureManager(role);
      const taskId = this.resolveManagerTaskId(body.id, rawMessage);
      const departSlug = this.resolveManagerDepartSlug(
        body.depart_slug,
        rawMessage,
      );
      if (taskId === undefined) {
        return waErrorTaskIdRequired([
          '/mgrtransfer 12 sales',
          'transfer task 12 to it department',
        ]);
      }
      if (!departSlug) {
        return waSection(
          'Department required',
          `Please specify which department should receive task #${taskId}.\n\n` +
            `*Examples:*\n` +
            `• /mgrtransfer ${taskId} sales\n` +
            `• "transfer task ${taskId} to it department"`,
        );
      }
      return this.tasksService.applyManagerTransferDepartment(
        user.id,
        factoryId,
        taskId,
        departSlug,
      );
    }

    if (cmdLc === COMMANDS.MGR_REJECT) {
      this.ensureManager(role);
      const taskId = this.resolveManagerTaskId(body.id, rawMessage);
      const reason = this.resolveRejectReason(body.reject_reason, rawMessage);
      if (taskId === undefined) {
        return waErrorTaskIdRequired([
          '/mgrreject 12 not our department',
          'reject task 12 — wrong department',
        ]);
      }
      if (!reason) {
        return waSection(
          'Rejection reason required',
          `Please explain why task #${taskId} is being rejected.\n\n` +
            `*Examples:*\n` +
            `• /mgrreject ${taskId} not our scope\n` +
            `• "reject task ${taskId} — belongs to sales, not IT"`,
        );
      }
      return this.tasksService.applyManagerRejectTask(
        user.id,
        factoryId,
        taskId,
        reason,
      );
    }

    if (command === COMMANDS.PRESENT || command === COMMANDS.ABSENT)
      return this.attendanceService.markAttendance(
        user.id,
        factoryId,
        command === COMMANDS.PRESENT,
      );

    if (command === COMMANDS.MEMEBERS) {
      this.ensureManager(role);

      const members = await this.factoryService.getFactoryUsers(factoryId);

      if (!members.length) {
        return waTeamEmpty();
      }

      const departments =
        await this.departmentsService.listByFactory(factoryId);

      type Row = {
        user_id?: number;
        user?: { name?: string };
        role?: string;
      };

      const rows = members as unknown as Row[];

      const departmentHeadIds = new Set<number>(
        departments.map((d: any) => Number(d.manager_user_id)),
      );

      const workerLinkedToDept = new Set<number>();
      for (const dept of departments as any[]) {
        for (const link of dept.department_workers ?? []) {
          workerLinkedToDept.add(Number(link.user_id));
        }
      }

      let body = `*Team overview*\n\n`;

      body += `📂 *Departments*\n`;
      if (!departments.length) {
        body += `_No departments configured yet._\n`;
      } else {
        departments.forEach((deptRaw: any, idx: number) => {
          const headName = deptRaw.manager?.name ?? 'Not assigned';
          const deptWorkers =
            deptRaw.department_workers
              ?.map((dw: any) => dw.user?.name)
              .filter(Boolean) ?? [];
          const workerLine =
            deptWorkers.length > 0
              ? deptWorkers.join(', ')
              : '_No workers linked_';
          body +=
            `\n${idx + 1}. *${deptRaw.name}* (\`${deptRaw.slug}\`)\n` +
            `   👔 Head: ${headName}\n` +
            `   👷 Team: ${workerLine}\n`;
        });
      }

      const workersNoDepartment = rows.filter(
        (m) =>
          m.role === USER_ROLE.WORKER &&
          m.user_id != null &&
          !workerLinkedToDept.has(m.user_id),
      );

      body += `\n👷 *Workers (no department)*\n`;
      if (workersNoDepartment.length === 0) {
        body += `_All workers are assigned to a department._\n`;
      } else {
        workersNoDepartment.forEach((m, idx) => {
          body += `${idx + 1}. ${m.user?.name ?? 'Unknown'}\n`;
        });
      }

      const owners = rows.filter((m) => m.role === USER_ROLE.OWNER);
      body += `\n👑 *Owners*\n`;
      if (owners.length === 0) {
        body += `_None_\n`;
      } else {
        owners.forEach((m, idx) => {
          body += `${idx + 1}. ${m.user?.name ?? 'Unknown'}\n`;
        });
      }

      const managersNotDeptHead = rows.filter(
        (m) =>
          m.role === USER_ROLE.MANAGER &&
          m.user_id != null &&
          !departmentHeadIds.has(m.user_id),
      );

      body += `\n👔 *Managers (not heading a department)*\n`;
      if (managersNotDeptHead.length === 0) {
        body += `_Every manager is a department head, or none listed._\n`;
      } else {
        managersNotDeptHead.forEach((m, idx) => {
          body += `${idx + 1}. ${m.user?.name ?? 'Unknown'}\n`;
        });
      }

      body +=
        `\n${WA_DIVIDER}\n` +
        `*Who can assign work*\n` +
        `• *Owners:* any member or department\n` +
        `• *Department heads:* their team + unassigned workers\n` +
        `• *Other managers:* any worker in the factory`;

      return `${body}`;
    }

    // =========================
    // 📋 TASKS COMMANDS
    // =========================

    // 📋 VIEW TASKS
    if (command === COMMANDS.TASKS) {
      const tasks = await this.tasksService.getTasks(user);

      if (!Array.isArray(tasks) || !tasks.length) {
        return waTasksEmpty();
      }

      const isOwner = role === USER_ROLE.OWNER;
      const isManager = role === USER_ROLE.MANAGER;
      if (isOwner) {
        return this.formatTasksByDepartment(tasks as any[]);
      }
      if (isManager) {
        return this.formatManagerTasks(tasks as any[]);
      }
      return this.formatWorkerTasks(tasks as any[]);
    }

    // ✅ COMPLETE TASK
    if (command === COMMANDS.COMPLETE) {
      if (!id || isNaN(id)) {
        return waErrorInvalidFormat(
          '/complete',
          '/complete [taskId]',
          '/complete 12',
        );
      }

      const result = await this.tasksService.completeTask(
        user.id,
        factoryId,
        id,
      );

      return result?.message
        ? waTaskCompleted(id, result.message)
        : result;
    }

    // 🧑‍🤝‍🧑 ASSIGN TASK (department NL is handled earlier via depart_slug)
    if (cmdLc === COMMANDS.ASSIGN) {
      const deadlineInput = this.classifyDeadlineRawInput(body);

      const mentionMatch = rawMessage.match(/@([^\s]+)/);
      const mlWorkerMention = this.normalizeWorkerSlug(body.worker_slug);

      if (!mentionMatch && mlWorkerMention) {
        const workerToken = mlWorkerMention.replace(/^@/, '');
        const description =
          this.extractAssignTaskDescription(rawMessage) ||
          this.stripAssigneeFromDescription(rawMessage, workerToken) ||
          rawMessage.trim();
        if (!description) {
          return waErrorDescriptionRequired();
        }
        this.ensureManager(role);
        const mention =
          this.resolveAssignMentionForNl(rawMessage, mlWorkerMention) ||
          mlWorkerMention;
        const result = await this.tasksService.handleAssign(
          user.id,
          factoryId,
          mention,
          description,
          { deadline: deadlineInput },
        );
        if (typeof result !== 'string') {
          return result?.message || result;
        }
        return waTaskAssigned(description, result);
      }

      this.ensureManager(role);

      const mention = mentionMatch ? mentionMatch[0] : null;

      let description = rawMessage;
      if (mention) description = description.replace(mention, ' ');
      description = description
        .replace(/^\s*\/?assign\b/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!mention || !description) {
        if (description && !mention && this.canAssignTasks(role)) {
          return this.workflowRouter.startAssignClarifyWorkflow(
            phone,
            description,
            deadlineInput ?? null,
          );
        }
        return waErrorInvalidFormat(
          '/assign',
          '/assign @<name|id|phone> [task description]\n/assign @all [task description]',
          '/assign @anand Fix machine\n/assign @all Clean warehouse',
        );
      }

      const result = await this.tasksService.handleAssign(
        user.id,
        factoryId,
        mention,
        description,
        { deadline: deadlineInput },
      );

      if (typeof result !== 'string') {
        return result?.message || result;
      }

      return waTaskAssigned(description, result);
    }

    if (command === COMMANDS.UPDATE) {
      this.ensureWorker(role);

      const task_id = this.resolveUpdateTaskId(body.id, rawMessage);
      const updateMessage = this.resolveUpdateMessage(rawMessage, task_id);

      if (!task_id || !updateMessage) {
        return waErrorInvalidFormat(
          '/update',
          '/update [taskId] [message]',
          '/update 12 Work in progress\nprogress update task 12',
        );
      }

      const result = await this.tasksService.addUpdate(
        user.id,
        factoryId,
        task_id,
        updateMessage,
      );

      return result?.message
        ? waTaskUpdated(task_id, updateMessage, result.message)
        : result;
    }

    // =========================
    // 🚨 ISSUES COMMANDS
    // =========================

    // 📋 VIEW ACTIVE ISSUES
    if (command === COMMANDS.ISSUES) {
      const issues = await this.issuesService.getActiveIssues(factoryId);

      if (!issues || !issues.length) {
        return waIssuesEmpty();
      }

      let text = `${WA_DIVIDER}\n*Active issues*\n${WA_DIVIDER}\n\n`;

      issues.slice(0, 10).forEach((issue: any, index: number) => {
        const date = new Date(issue.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const reporter = issue.reporter?.name
          ? `👤 ${issue.reporter.name} (#${issue.reporter.id})\n`
          : '';

        text +=
          `${index + 1}. ${issue.message}\n` +
          `🆔 Issue #${issue.id}\n` +
          reporter +
          `📅 ${date}\n\n`;
      });

      text += `${WA_DIVIDER}\n💡 Reply: "resolve issue [id]" to close an issue`;

      return text;
    }

    // 🚨 CREATE ISSUE
    if (command === COMMANDS.ISSUE) {
      const issueMessage = rawMessage.replace(COMMANDS.ISSUE, '').trim();

      if (!issueMessage) {
        return waErrorInvalidFormat(
          '/issue',
          '/issue [description]',
          '/issue Machine not working',
        );
      }

      await this.issuesService.createIssue(user.id, factoryId, issueMessage);

      return waIssueReported(issueMessage);
    }

    // ✅ RESOLVE ISSUE
    if (command === COMMANDS.RESOLVE) {
      this.ensureManager(role);

      if (!id) {
        return waErrorInvalidFormat(
          '/resolve',
          '/resolve [issueId]',
          '/resolve 5',
        );
      }

      const result = await this.issuesService.resolveIssue(String(id));

      return result?.message
        ? waIssueResolved(id, result.message)
        : result;
    }

    return waUnknownCommand();
  }

  /** Normalize ML `/classify` payload (supports nested `data` and slug field aliases). */
  private parseMlClassifyResponse(data: unknown): {
    intent?: string;
    id?: string | number | null;
    worker_slug?: string | null;
    depart_slug?: string | null;
    reject_reason?: string | null;
    deadline?: string | null;
    date?: string;
    datetime?: string | null;
    time?: string | null;
    message?: string | null;
    task_description?: string | null;
  } {
    const root =
      data != null && typeof data === 'object' && 'data' in (data as object)
        ? (data as { data: Record<string, unknown> }).data
        : (data as Record<string, unknown> | null | undefined);

    const r = root ?? {};
    const departSlug =
      r.depart_slug ?? r.department_slug ?? r.department ?? null;

    return {
      intent:
        typeof r.intent === 'string'
          ? r.intent
          : typeof r.command === 'string'
            ? r.command
            : undefined,
      id: (r.id as string | number | null | undefined) ?? null,
      worker_slug: (r.worker_slug as string | null | undefined) ?? null,
      depart_slug:
        departSlug != null && String(departSlug).trim() !== ''
          ? String(departSlug).trim()
          : null,
      reject_reason:
        (r.reject_reason as string | null | undefined) ??
        (r.reason as string | null | undefined) ??
        null,
      deadline: (r.deadline as string | null | undefined) ?? null,
      date: typeof r.date === 'string' ? r.date : undefined,
      datetime: (r.datetime as string | null | undefined) ?? null,
      time: (r.time as string | null | undefined) ?? null,
      message:
        typeof r.message === 'string' ? r.message : undefined,
      task_description:
        typeof r.task_description === 'string'
          ? r.task_description
          : undefined,
    };
  }

  private extractDepartSlug(body: WhatsAppIncomingServiceDto): string | null {
    const raw = body.depart_slug;
    if (raw == null || String(raw).trim() === '') return null;
    const normalized = this.departmentsService.normalizeSlug(String(raw));
    return normalized || null;
  }

  /**
   * ML: `/depart_assign` + `depart_slug`, or `/assign` + `depart_slug` without @mention.
   * Assigns the task to that department's manager (owners only).
   */
  private async tryClassifiedDepartmentAssign(
    body: WhatsAppIncomingServiceDto,
    rawMessage: string | undefined,
    assignerUserId: number,
    factoryId: number,
    role: string,
    cmdLc: string,
  ): Promise<string | null> {
    const departSlug = this.extractDepartSlug(body);
    const isDepartIntent = cmdLc === COMMANDS.DEPART_ASSIGN;
    const hasMentionInText = !!rawMessage?.match(/@([^\s]+)/);
    const mlWorker = this.normalizeWorkerSlug(body.worker_slug);
    const isAssignWithDept =
      cmdLc === COMMANDS.ASSIGN && !hasMentionInText && !mlWorker;

    if (!isDepartIntent && !isAssignWithDept) {
      return null;
    }

    if (role !== USER_ROLE.OWNER) {
      return waErrorOwnersOnlyDepartment();
    }

    if (!departSlug) {
      return waErrorMissingDepartSlug();
    }

    const descNl =
      (rawMessage || '')
        .replace(/^\s*\/?depart_assign\b/i, '')
        .replace(/^\s*\/?assign\b/i, '')
        .trim() || (rawMessage || '').trim();

    if (!descNl) {
      return waErrorDescriptionRequired();
    }

    const deptRow = await this.departmentsService.findDepartmentBySlug(
      factoryId,
      departSlug,
    );
    if (!deptRow) {
      return waErrorDepartmentNotFound(departSlug);
    }

    await this.tasksService.assignToUser(
      deptRow.manager_user_id,
      assignerUserId,
      factoryId,
      descNl,
      {
        slugDepartmentId: deptRow.id,
        deadline: this.classifyDeadlineRawInput(body),
      },
    );

    return waDepartmentAssignSent(descNl, {
      name: deptRow.name,
      slug: deptRow.slug,
    });
  }

  /** Normalize ML intent to lowercase slash command; general_chat → undefined. */
  private normalizeIntentCommand(intent?: string | null): string | undefined {
    if (intent == null || typeof intent !== 'string') return undefined;
    const trimmed = intent.trim();
    if (!trimmed || trimmed === 'general_chat') return undefined;
    return trimmed.startsWith('/') ? trimmed.toLowerCase() : `/${trimmed.toLowerCase()}`;
  }

  /**
   * Parse Hindi assign phrases: "{name} ko {work} do" → "{work}".
   * Handles multi-word names and partial ML worker_slug (e.g. "kumar" only).
   */
  private extractAssignTaskDescription(
    rawMessage: string | undefined,
  ): string | null {
    let msg = (rawMessage || '').trim();
    if (!msg) return null;

    msg = msg.replace(/^\s*\/?assign\b/i, '').replace(/\s+/g, ' ').trim();

    const koDo = msg.match(/^(.+?)\s+ko\s+(.+?)\s+do\s*$/i);
    if (koDo?.[2]) {
      const work = koDo[2].replace(/\s+/g, ' ').trim();
      if (work) return work;
    }

    const koKaamDo = msg.match(/^(.+?)\s+ko\s+(.+?)\s+kaam\s+do\s*$/i);
    if (koKaamDo?.[2]) {
      const work = koKaamDo[2].replace(/\s+/g, ' ').trim();
      if (work) return work ? `${work} kaam` : 'kaam';
    }

    return null;
  }

  /** Full assignee name from NL "{name} ko …" — avoids ambiguous ML slugs like "rahul". */
  private extractAssigneeFromMessage(
    rawMessage: string | undefined,
  ): string | null {
    let msg = (rawMessage || '').trim();
    if (!msg) return null;

    msg = msg.replace(/^\s*\/?assign\b/i, '').replace(/\s+/g, ' ').trim();

    const koDo = msg.match(/^(.+?)\s+ko\s+(.+?)\s+do\s*$/i);
    if (koDo?.[1]) return koDo[1].trim();

    const koKaamDo = msg.match(/^(.+?)\s+ko\s+(.+?)\s+kaam\s+do\s*$/i);
    if (koKaamDo?.[1]) return koKaamDo[1].trim();

    const koPrefix = msg.match(/^(.+?)\s+ko\s+/i);
    if (koPrefix?.[1]) return koPrefix[1].trim();

    return null;
  }

  /** Prefer full NL assignee name; fall back to ML worker_slug. */
  private resolveAssignMentionForNl(
    rawMessage: string | undefined,
    mlWorkerMention: string | null,
  ): string | null {
    const fromMessage = this.extractAssigneeFromMessage(rawMessage);
    if (fromMessage) {
      return fromMessage.startsWith('@') ? fromMessage : `@${fromMessage}`;
    }
    return mlWorkerMention;
  }

  /** Remove Hindi/English assignee prefix from NL assign descriptions. */
  private stripAssigneeFromDescription(
    rawMessage: string | undefined,
    workerToken: string,
  ): string {
    let desc = (rawMessage || '').trim();
    const token = workerToken.replace(/^@/, '').trim();
    if (token) {
      const tokenParts = token.split(/\s+/).filter(Boolean);
      if (tokenParts.length > 1) {
        const multiWordPattern = tokenParts
          .map((part) => this.escapeRegExp(part))
          .join('\\s+');
        desc = desc
          .replace(new RegExp(`^${multiWordPattern}\\s+ko\\s+`, 'i'), '')
          .replace(new RegExp(`\\b${multiWordPattern}\\s+ko\\s+`, 'i'), '');
      }
      desc = desc
        .replace(new RegExp(`^${this.escapeRegExp(token)}\\s+ko\\s+`, 'i'), '')
        .replace(new RegExp(`\\b${this.escapeRegExp(token)}\\s+ko\\s+`, 'i'), '');
    }
    return desc.replace(/^\s*\/?assign\b/i, '').replace(/\s+/g, ' ').trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** ML `id` or parse task id from NL/slash update phrases. */
  private resolveUpdateTaskId(
    bodyId: number | undefined,
    rawMessage: string | undefined,
  ): number | undefined {
    if (bodyId != null && Number.isFinite(Number(bodyId))) {
      return Number(bodyId);
    }
    const msg = (rawMessage || '').trim();
    const patterns = [
      /^\/update\s+(\d+)\b/i,
      /(?:progress\s+)?update\s+task\s+#?(\d+)/i,
      /task\s+#?(\d+)\s+(?:progress\s+)?update/i,
      /task\s+#?(\d+)\s+par\s+kaam/i,
      /(\d+)\s*percent\s+(?:complete|done)/i,
      /task\s+#?(\d+)\s+\d+\s*percent/i,
    ];
    for (const pattern of patterns) {
      const m = msg.match(pattern);
      if (m?.[1]) return Number(m[1]);
    }
    return undefined;
  }

  /** Extract human update text after removing task-id tokens from NL/slash messages. */
  private resolveUpdateMessage(
    rawMessage: string | undefined,
    taskId: number | undefined,
  ): string {
    let msg = (rawMessage || '').trim();
    msg = msg.replace(/^\/update\s+\d+\s*/i, '').trim();
    if (taskId != null) {
      msg = msg
        .replace(new RegExp(`task\\s+#?${taskId}\\b`, 'ig'), '')
        .replace(/(?:progress\s+)?update\s+task\s+#?\d+/gi, '')
        .replace(/^\s*progress\s+update\s*/i, '')
        .trim();
    }
    msg = msg.replace(/\s+/g, ' ').trim();
    if (msg) return msg;
    return taskId != null ? `Progress update on task ${taskId}` : '';
  }

  /** Prefer ML `id`; else parse /mgrself N or /mgrassign N from the message. */
  private resolveManagerTaskId(
    bodyId: number | undefined,
    rawMessage: string | undefined,
  ): number | undefined {
    if (bodyId != null && Number.isFinite(Number(bodyId))) {
      return Number(bodyId);
    }
    const msg = (rawMessage || '').trim();
    const selfSlash = msg.match(/^\/mgrself\s+(\d+)\b/i);
    if (selfSlash) return Number(selfSlash[1]);
    const assignSlash = msg.match(/^\/mgrassign\s+(\d+)\b/i);
    if (assignSlash) return Number(assignSlash[1]);
    const transferSlash = msg.match(/^\/mgrtransfer\s+(\d+)\b/i);
    if (transferSlash) return Number(transferSlash[1]);
    const rejectSlash = msg.match(/^\/mgrreject\s+(\d+)\b/i);
    if (rejectSlash) return Number(rejectSlash[1]);
    return undefined;
  }

  private resolveManagerDepartSlug(
    departSlug: string | null | undefined,
    rawMessage: string | undefined,
  ): string | null {
    const fromMl = departSlug?.trim();
    if (fromMl) {
      return this.departmentsService.normalizeSlug(fromMl) || fromMl;
    }
    const msg = (rawMessage || '').trim();
    const slash = msg.match(/^\/mgrtransfer\s+\d+\s+(\S+)/i);
    if (slash) {
      return this.departmentsService.normalizeSlug(slash[1]) || slash[1];
    }
    return null;
  }

  private resolveRejectReason(
    mlReason: string | null | undefined,
    rawMessage: string | undefined,
  ): string | null {
    if (mlReason != null && String(mlReason).trim() !== '') {
      return String(mlReason).trim();
    }
    const msg = (rawMessage || '').trim();
    const slash = msg.match(/^\/mgrreject\s+\d+\s+(.+)/is);
    if (slash) return slash[1].trim();
    return null;
  }

  /** ML `worker_slug` ("@1" or "1"); else slash /mgrassign id @mention. */
  private resolveManagerWorkerMention(
    workerSlug: string | null | undefined,
    rawMessage: string | undefined,
  ): string | null {
    const fromMl = this.normalizeWorkerSlug(workerSlug);
    if (fromMl) return fromMl;
    const msg = (rawMessage || '').trim();
    const m = msg.match(/^\/mgrassign\s+\d+\s+(@\S+)/i);
    return m ? m[1] : null;
  }

  private normalizeWorkerSlug(slug?: string | null): string | null {
    if (slug == null || String(slug).trim() === '') return null;
    const s = String(slug).trim();
    return s.startsWith('@') ? s : `@${s}`;
  }

  /** Priority: datetime → deadline (ML field) → date+time → date (date-only → end of IST day in TasksService). */
  private classifyDeadlineRawInput(
    body: WhatsAppIncomingServiceDto,
  ): string | undefined {
    const dt =
      body.datetime != null && String(body.datetime).trim() !== ''
        ? String(body.datetime).trim()
        : '';
    if (dt) return dt;
    const deadlineField =
      body.deadline != null && String(body.deadline).trim() !== ''
        ? String(body.deadline).trim()
        : '';
    if (deadlineField) return deadlineField;
    const date =
      body.date != null && String(body.date).trim() !== ''
        ? String(body.date).trim()
        : '';
    const time =
      body.time != null && String(body.time).trim() !== ''
        ? String(body.time).trim()
        : '';
    if (date && time) return `${date}T${time}`;
    if (date) return date;
    return undefined;
  }

  // 🧾 Task list formatters

  private taskBlock(task: any, index: number): string {
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    const isOverdue =
      deadlineDate && !Number.isNaN(deadlineDate.getTime())
        ? deadlineDate < new Date()
        : false;
    const deadline = deadlineDate
      ? `${this.messagingService.formatInstantIST(deadlineDate)}${
          isOverdue ? ' · Overdue' : ''
        }`
      : 'No deadline';

    const assignee = task.assignee
      ? `${task.assignee.name || 'Unknown'} (#${task.assignee.id}${
          task.assignee.phone_number ? ` · ${task.assignee.phone_number}` : ''
        })`
      : 'Unassigned';

    const assigner = task.assigner
      ? `${task.assigner.name || 'Unknown'} (#${task.assigner.id})`
      : 'Unknown';

    let status = task.is_completed ? 'Completed' : 'Pending';
    if (task.routing_status === 'REJECTED_BY_MANAGER') {
      status = 'Rejected by manager';
    }
    let routing =
      task.routing_status &&
      task.routing_status !== 'DONE' &&
      !task.is_completed
        ? `\n🔁 Status: ${String(task.routing_status).replace(/_/g, ' ')}`
        : '';
    if (task.routing_status === 'REJECTED_BY_MANAGER' && task.rejection_reason) {
      routing += `\n❌ Reason: ${task.rejection_reason}`;
    }

    return (
      `*${index}.* ${task.description}\n` +
      `🆔 Task #${task.id}\n` +
      `👤 Assignee: ${assignee}\n` +
      `👔 Assigned by: ${assigner}\n` +
      `⏳ Due: ${deadline}\n` +
      `📌 ${status}${routing}\n`
    );
  }

  /** Task list line — description and ID only (keeps WhatsApp replies short). */
  private compactTaskBlock(task: any, index: number): string {
    const name = (task.description || 'Task').trim();
    return `*${index}.* ${name} — #${task.id}\n`;
  }

  /** Manager view — compact list of tasks routed to them or in their department. */
  private formatManagerTasks(tasks: any[]): string {
    let body = '';
    tasks.slice(0, 20).forEach((t, i) => {
      body += this.compactTaskBlock(t, i + 1);
      if (t.routing_status === 'AWAITING_MANAGER_ACTION') {
        body += `_→ Needs your action — delegate with: task ${t.id} @worker ko do_\n`;
      }
    });
    return (
      `${WA_DIVIDER}\n*Your pending tasks*\n${WA_DIVIDER}\n\n` +
      body +
      `${WA_DIVIDER}\n💡 Reply: "task [id] @name ko do" to delegate to a worker`
    );
  }

  /** Worker view — flat list. */
  private formatWorkerTasks(tasks: any[]): string {
    let body = '';
    tasks.slice(0, 20).forEach((t, i) => {
      body += this.compactTaskBlock(t, i + 1);
    });
    return (
      `${WA_DIVIDER}\n*Your pending tasks*\n${WA_DIVIDER}\n\n` +
      body +
      `${WA_DIVIDER}\n💡 Reply: "complete task [id]" when done`
    );
  }

  /** Manager / owner view — grouped by department, manager info in the header. */
  private formatTasksByDepartment(tasks: any[]): string {
    type Group = {
      key: string;
      title: string;
      tasks: any[];
    };
    const groupsMap = new Map<string, Group>();

    for (const task of tasks.slice(0, 20)) {
      const dept = task.department;
      if (dept) {
        const head = dept.manager
          ? `${dept.manager.name || 'Unknown'} (#${dept.manager.id}${
              dept.manager.phone_number ? ` · ${dept.manager.phone_number}` : ''
            })`
          : 'No manager';
        const key = `dept:${dept.id}`;
        const title =
          `🏢 *${dept.name}* (\`${dept.slug}\`)\n` +
          `👔 Department head: ${head}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, { key, title, tasks: [] });
        }
        groupsMap.get(key)!.tasks.push(task);
      } else {
        // Fallback grouping when a task isn't attached to a department —
        // group by the manager/owner who assigned it.
        const assigner = task.assigner;
        const key = assigner ? `assigner:${assigner.id}` : 'assigner:unknown';
        const headline = assigner
          ? `${assigner.name || 'Unknown'} (#${assigner.id})`
          : 'Unknown assigner';
        const title = `👔 *Direct assignments* — ${headline}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, { key, title, tasks: [] });
        }
        groupsMap.get(key)!.tasks.push(task);
      }
    }

    let total = 0;
    let body = '';
    for (const group of groupsMap.values()) {
      body += `\n${group.title}\n${WA_DIVIDER}\n`;
      group.tasks.forEach((t) => {
        total += 1;
        body += `\n${this.compactTaskBlock(t, total)}`;
      });
    }

    const groupLabel = groupsMap.size === 1 ? 'section' : 'sections';
    return (
      `${WA_DIVIDER}\n*Factory tasks*\n${WA_DIVIDER}\n\n` +
      `📊 ${total} pending · ${groupsMap.size} ${groupLabel}\n` +
      body +
      `\n${WA_DIVIDER}\n💡 Reply: "complete task [id]" to mark done`
    );
  }

  // 📦 Inventory status (Prompt 6 foundation)

  private async handleInventoryStatus(
    factoryId: number,
    rawMessage?: string,
  ): Promise<string> {
    const sku = await this.resolveInventorySku(factoryId, rawMessage);
    if (sku) {
      const status = await this.inventoryService.getInventoryStatusBySku(
        factoryId,
        sku,
      );
      return this.formatInventoryStatusMessage(status);
    }

    const lowStock = await this.inventoryService.listLowStockItems(factoryId);
    if (lowStock.length === 0) {
      return waSection(
        'Inventory status',
        'No low-stock items detected.\n\n' +
          'Send */inventory_status SKU* to check a specific item (e.g. `/inventory_status CEM001`).',
      );
    }

    const lines = lowStock
      .slice(0, 8)
      .map(
        (s) =>
          `• *${s.sku}* — ${s.name}\n  Qty: ${s.current_quantity} ${s.unit} · Threshold: ${s.reorder_threshold ?? '—'} · 📍 ${s.location_name}`,
      )
      .join('\n\n');

    const more =
      lowStock.length > 8
        ? `\n\n_+ ${lowStock.length - 8} more low-stock items — use /inventory_status SKU for details._`
        : '';

    return waSection(
      'Low stock items',
      `${lines}${more}\n\nSend */inventory_status SKU* for full details on one item.`,
    );
  }

  /** Slash SKU, NL product name in message, or inventory name hint lookup. */
  private async resolveInventorySku(
    factoryId: number,
    rawMessage?: string,
  ): Promise<string | null> {
    if (!rawMessage) return null;
    const trimmed = rawMessage.trim();
    const match = trimmed.match(/^\/inventory_status\s+(\S+)/i);
    if (match) return match[1];
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[0].toLowerCase() === '/inventory_status') {
      return parts[1];
    }

    const norm = trimmed.toLowerCase().replace(/\s+/g, ' ');
    return this.inventoryService.findSkuByNameHint(factoryId, norm);
  }

  private formatInventoryStatusMessage(status: IInventoryStatusRecord): string {
    return waSection(
      'Inventory status',
      `*${status.name}* (\`${status.sku}\`)\n\n` +
        `📍 Location: ${status.location_name}\n` +
        `📂 Category: ${status.category_name}\n` +
        `📊 Quantity: ${status.current_quantity} ${status.unit}\n` +
        `⚠️ Reorder threshold: ${status.reorder_threshold ?? 'Not set'}\n` +
        `🔔 Low stock: ${status.is_low_stock ? 'Yes' : 'No'}`,
    );
  }

  // 🔒 Role Guards

  private canAssignTasks(role: string): boolean {
    return role === USER_ROLE.OWNER || role === USER_ROLE.MANAGER;
  }

  private ensureManager(role: string) {
    if (role === USER_ROLE.WORKER) {
      throw new ForbiddenException(
        'Only managers and owners can perform this action',
      );
    }
  }

  private ensureWorker(role: string) {
    if (role !== USER_ROLE.WORKER) {
      throw new ForbiddenException('Only workers can perform this action');
    }
  }

  // 🧠 Parsers

  private parseAssignCommand(message: string) {
    const parts = message.split(' ');

    const assigned_to = parts[1];
    const description = parts.slice(2).join(' ').trim();

    if (!assigned_to || !description) {
      throw new NotFoundException(
        'Format: /assign @<name|id|phone> or @all [task]',
      );
    }

    return { assigned_to, description };
  }

  private parseUpdateCommand(message: string) {
    const parts = message.split(' ');

    const task_id = Number.parseInt(parts[1]);
    const updateMessage = parts.slice(2).join(' ').trim();

    if (!task_id || !updateMessage) {
      throw new NotFoundException('Format: /update <taskId> <message>');
    }

    return { task_id, updateMessage };
  }
}

@Injectable()
export class AttendanceCronService {
  constructor(
    private readonly factoryService: FactoryService,
    private readonly attendanceService: AttendanceService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // 🟢 9 AM IST initial reminder
  @Cron('0 9 * * *', { timeZone: INDIA_TIMEZONE })
  async sendMorningReminder() {
    await this.sendReminder('Morning');
  }

  // 🔁 Every 2 hours retry
  @Cron(CronExpression.EVERY_2_HOURS, { timeZone: INDIA_TIMEZONE })
  async sendRetryReminder() {
    const hour = getHourIST();

    // ❌ Skip before 9 AM
    if (hour < 11) return;

    // ❌ Stop after 7 PM (optional)
    if (hour > 19) return;

    await this.sendReminder('Retry');
  }

  // 🔥 Core Logic
  async sendReminder(type: 'Morning' | 'Retry') {
    const workers: any = await this.factoryService.getAllWorkers(); // implement this

    for (const worker of workers) {
      const w = worker.toJSON();
      const userId = w.user_id;
      const factoryId = w.factory_id;
      const phone = w.user.phone_number;

      // ✅ Check attendance
      const alreadyMarked = await this.attendanceService.isMarkedToday(
        userId,
        factoryId,
      );

      if (alreadyMarked) continue;

      // 🚀 Send template
      await this.whatsappService.sendTemplate(
        phone,
        'factory_attendance_reminder',
        { body: [w.user.name || 'Worker'] },
      );

      // ⏳ small delay (avoid rate limit)
      await this.delay(300);
    }
  }

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
