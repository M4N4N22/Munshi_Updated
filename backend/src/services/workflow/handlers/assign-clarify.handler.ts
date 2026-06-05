import { Injectable } from '@nestjs/common';
import { FactoryService } from 'src/services/factories/factories.service';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TasksService } from 'src/services/tasks/tasks.service';
import {
  waErrorInvalidFormat,
  waSection,
  waTaskAssigned,
} from 'src/modules/whatsapp/whatsapp.templates';
import { buildEmptyTeamSetupOutbound } from 'src/core/messaging/team-setup-outbound';
import {
  ASSIGN_CLARIFY_STEP,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  IAssignClarifyAssigneeOption,
  IAssignClarifyPromptResult,
  IAssignClarifySessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';

const MAX_ASSIGNEE_LIST = 8;

type FactoryMemberRow = {
  user_id?: number;
  role?: string;
  user?: { id?: number; name?: string; phone_number?: string | null };
};

@Injectable()
export class AssignClarifyWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.ASSIGN_CLARIFY;
  readonly startCommand = WORKFLOW_START_COMMANDS.ASSIGN_CLARIFY;
  readonly firstStep = ASSIGN_CLARIFY_STEP.ASSIGNEE;

  constructor(
    private readonly tasksService: TasksService,
    private readonly factoryService: FactoryService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  getInitialPrompt(): string {
    return waSection(
      'Task assignment',
      'Kya kaam assign karna hai? Pehle task likho, phir assignee batayenge.',
    );
  }

  async buildAssigneePrompt(
    context: WorkflowUserContext,
    description: string,
    deadline?: string | null,
  ): Promise<IAssignClarifyPromptResult> {
    const dueLine =
      deadline && String(deadline).trim()
        ? `\n⏳ *Due:* ${deadline}\n`
        : '';

    const options = await this.loadAssignableOptions(context);
    if (!options.length) {
      const bodyText = waSection(
        'Employee chahiye',
        `*Task:* ${description.trim()}${dueLine}\n\n` +
          `Abhi aapke business mein koi employee nahi hai jisko ye kaam diya ja sake.\n\n` +
          `Neeche se employee jodne ka tareeka chuno 👇\n\n` +
          `Log jud jaayein to dubara kaam bhejiye, jaise:\n` +
          `*aaj website banegi*`,
      );
      return {
        message: bodyText,
        assignable_options: [],
        outbound: buildEmptyTeamSetupOutbound(bodyText),
      };
    }

    const listBlock = this.formatAssigneeList(options);
    const moreHint =
      options.length >= MAX_ASSIGNEE_LIST
        ? `\n_Aur log dekhne ke liye:_ *show team*\n`
        : '';

    return {
      message: waSection(
        'Task samajh aa gaya',
        `*Task:* ${description.trim()}${dueLine}\n\n` +
          `*Kisko ye task dena hai?* Inmein se chuno — number ya @name likho:\n\n` +
          `${listBlock}${moreHint}\n` +
          `• Sab workers ko: *@all*\n` +
          `• Cancel: */cancel*`,
      ),
      assignable_options: options,
    };
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const data = session.session_data as IAssignClarifySessionData;
    const description = (data.description || '').trim();
    const options = data.assignable_options ?? [];

    if (!description) {
      return {
        message: waSection(
          'Task missing',
          'Task description nahi mili. Naya message bhejo, jaise: *aaj website banegi*',
        ),
        cancelled: true,
      };
    }

    if (context.role === USER_ROLE.WORKER) {
      return {
        message: waSection(
          'Not allowed',
          'Sirf *owner* ya *manager* task assign kar sakte hain.\n\nApne manager ko boliye ya */help* bhejo.',
        ),
        cancelled: true,
      };
    }

    if (!options.length) {
      const bodyText = waSection(
        'Employee chahiye',
        'Pehle team member add karein, phir dubara task assign karein.\n\nNeeche se option chuno 👇',
      );
      return {
        message: bodyText,
        cancelled: true,
        outbound: buildEmptyTeamSetupOutbound(bodyText),
      };
    }

    const mention = this.resolveAssigneeInput(message, options);
    if (!mention) {
      const listBlock = this.formatAssigneeList(options);
      return {
        message: waSection(
          'Assignee required',
          `Samajh nahi aaya — kisko assign karna hai?\n\n` +
            `${listBlock}\n` +
            `*Example:* @rahul · ya sirf *rahul* · ya list ka number *1*\n\n` +
            `Cancel: */cancel*`,
        ),
        nextStep: ASSIGN_CLARIFY_STEP.ASSIGNEE,
        sessionData: { ...data },
      };
    }

    const deadline = data.deadline ?? null;

    try {
      const result = await this.tasksService.handleAssign(
        context.userId,
        context.factoryId,
        mention,
        description,
        { deadline },
      );

      if (
        result &&
        typeof result === 'object' &&
        'needsDisambiguation' in result &&
        result.needsDisambiguation
      ) {
        return {
          message:
            (result as { message?: string }).message ||
            waErrorInvalidFormat(
              '/assign',
              '@name @id @phone @all',
              '@rahul',
            ),
          nextStep: ASSIGN_CLARIFY_STEP.ASSIGNEE,
          sessionData: { ...data },
        };
      }

      const detail =
        typeof result === 'string'
          ? result
          : (result as { message?: string })?.message || '';

      return {
        message: waTaskAssigned(description, detail),
        completed: true,
      };
    } catch (error: any) {
      return {
        message: waSection(
          'Could not assign',
          error?.message ||
            'Task assign nahi ho paya. Dubara @name ke saath try karo.',
        ),
        nextStep: ASSIGN_CLARIFY_STEP.ASSIGNEE,
        sessionData: { ...data },
      };
    }
  }

  private async loadAssignableOptions(
    context: WorkflowUserContext,
  ): Promise<IAssignClarifyAssigneeOption[]> {
    const eligibleIds = new Set(
      await this.departmentsService.getEligibleAssigneeUserIds(
        context.factoryId,
        context.userId,
      ),
    );

    if (!eligibleIds.size) {
      return [];
    }

    const members = (await this.factoryService.getFactoryUsers(
      context.factoryId,
    )) as FactoryMemberRow[];

    const assignable = members.filter((m) => {
      const uid = Number(m.user_id ?? m.user?.id);
      if (!uid || !eligibleIds.has(uid)) return false;
      if (uid === context.userId) return false;
      const role = (m.role || '').toUpperCase();
      return role === USER_ROLE.WORKER || role === USER_ROLE.MANAGER;
    });

    assignable.sort((a, b) => {
      const roleOrder = (r: string) =>
        r === USER_ROLE.MANAGER ? 0 : r === USER_ROLE.WORKER ? 1 : 2;
      const ra = roleOrder((a.role || '').toUpperCase());
      const rb = roleOrder((b.role || '').toUpperCase());
      if (ra !== rb) return ra - rb;
      return (a.user?.name || '').localeCompare(b.user?.name || '', 'en');
    });

    const options: IAssignClarifyAssigneeOption[] = [];
    for (const m of assignable.slice(0, MAX_ASSIGNEE_LIST)) {
      const userId = Number(m.user_id ?? m.user?.id);
      const name = (m.user?.name || `User ${userId}`).trim();
      const first = name.split(/\s+/)[0] || name;
      const slug = first.toLowerCase().replace(/[^a-z0-9]/g, '');
      options.push({
        index: options.length + 1,
        userId,
        name,
        mention: slug ? `@${slug}` : `@${userId}`,
        role: (m.role || '').toUpperCase(),
      });
    }

    return options;
  }

  private formatAssigneeList(options: IAssignClarifyAssigneeOption[]): string {
    return options
      .map((o) => {
        const roleLabel =
          o.role === USER_ROLE.MANAGER
            ? 'Manager'
            : o.role === USER_ROLE.WORKER
              ? 'Worker'
              : o.role;
        return (
          `*${o.index}.* ${o.name} (${roleLabel})\n` +
          `   Reply *${o.index}* · *${o.mention}* · ya *@${o.userId}*`
        );
      })
      .join('\n\n');
  }

  private resolveAssigneeInput(
    input: string,
    options: IAssignClarifyAssigneeOption[],
  ): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (/^@?all\b/i.test(trimmed)) {
      return '@all';
    }

    const mentionMatch = trimmed.match(/@([^\s]+)/);
    if (mentionMatch) {
      return `@${mentionMatch[1]}`;
    }

    const num = parseInt(trimmed.replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(num) && num >= 1 && num <= options.length) {
      const pick = options.find((o) => o.index === num);
      if (pick) {
        return `@${pick.userId}`;
      }
    }

    const token = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!token) return null;

    const matches = options.filter((o) => {
      const first = (o.name.split(/\s+/)[0] || o.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const full = o.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const slug = o.mention.replace(/^@/, '').toLowerCase();
      return (
        first === token ||
        full.includes(token) ||
        slug === token ||
        slug.startsWith(token)
      );
    });

    if (matches.length === 1) {
      return `@${matches[0].userId}`;
    }

    return null;
  }
}
