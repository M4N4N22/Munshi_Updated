import { Injectable } from '@nestjs/common';
import {
  WORKFLOW_SKIP_KEYWORDS,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
  WORKER_ONBOARDING_STEP,
} from '../workflow.constants';
import {
  IWorkerOnboardingSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';
import { DepartmentsService } from 'src/services/departments/departments.service';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { WorkerOnboardingService } from '../worker-onboarding.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import {
  filterSelectableDepartments,
  formatWorkerPhoneDisplay,
  isInvalidStoredPhone,
  looksLikeDepartmentInput,
  looksLikePhoneInput,
  normalizeWorkerDoj,
  normalizeWorkerName,
  normalizeWorkerPhone,
  parseWorkerRole,
  resolveDepartmentSelection,
  formatDepartmentList,
} from '../worker-onboarding.validation';
import {
  buildDepartmentRetryPrompt,
  buildDepartmentStepPrompt,
  buildExistingPhoneHint,
  buildUnknownTeamMessage,
  formatBusinessErrorMessage,
  formatValidationErrorMessage,
  translateWorkerOnboardingError,
} from '../worker-onboarding.messages';
import { isContactShareNoPhoneMessage } from 'src/modules/whatsapp/whatsapp-contact.extract';
import {
  buildWorkerOnboardingResumeHeader,
  prepareWorkerOnboardingSession,
} from '../worker-onboarding-resume';

@Injectable()
export class WorkerOnboardingWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.ONBOARD_WORKER;
  readonly startCommand = WORKFLOW_START_COMMANDS.ONBOARD_WORKER;
  readonly firstStep = WORKER_ONBOARDING_STEP.WORKER_NAME;

  constructor(
    private readonly workerOnboardingService: WorkerOnboardingService,
    private readonly departmentsService: DepartmentsService,
    private readonly usersService: UserService,
  ) {}

  getInitialPrompt(): string {
    return waSection(
      'Employee jodiyein',
      'Employee ka *naam* bhejein (jaise Ram Kumar).',
    );
  }

  /** Shown after namaste/home when employee add is still in progress. */
  async buildResumeReminder(
    session: IWorkflowSessionRecord,
    context: WorkflowUserContext,
  ): Promise<string | null> {
    const { step, data } = await prepareWorkerOnboardingSession(
      session,
      this.departmentsService,
      context.factoryId,
    );
    if (!data.name?.trim()) {
      return null;
    }
    const header = await buildWorkerOnboardingResumeHeader(
      data,
      step,
      context.factoryId,
      this.departmentsService,
    );
    return waSection('Employee add adhura', header);
  }

  private formatStepMessage(title: string, body: string): string {
    return waSection(title, body);
  }

  /** Phone/contact input while DB step is ahead (stale session after bad saves). */
  private inputBelongsOnPhoneStep(
    data: IWorkerOnboardingSessionData,
    input: string,
  ): boolean {
    const needsPhone =
      !data.phone_number?.trim() || isInvalidStoredPhone(data.phone_number);
    if (!needsPhone) {
      return false;
    }
    return isContactShareNoPhoneMessage(input) || looksLikePhoneInput(input);
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const { step, data } = await prepareWorkerOnboardingSession(
      session,
      this.departmentsService,
      context.factoryId,
    );
    const effectiveSession: IWorkflowSessionRecord = {
      ...session,
      current_step: step,
      session_data: data as Record<string, unknown>,
    };

    if (this.inputBelongsOnPhoneStep(data, input)) {
      return this.handlePhoneStep(effectiveSession, input, data, context);
    }

    switch (step) {
      case WORKER_ONBOARDING_STEP.WORKER_NAME:
        return this.handleNameStep(effectiveSession, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_PHONE:
        return this.handlePhoneStep(effectiveSession, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT:
        return this.handleDepartmentStep(effectiveSession, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_ROLE:
        return this.handleRoleStep(effectiveSession, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_DOJ:
        return this.handleDojStep(effectiveSession, input, data, context);
      default:
        return {
          message: waSection(
            'Workflow error',
            'Kuch gadbad ho gayi. Dubara *WhatsApp par add* se shuru karein.',
          ),
          cancelled: true,
        };
    }
  }

  private handleNameStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
    _context: WorkflowUserContext,
  ): WorkflowStepResult {
    try {
      const name = normalizeWorkerName(input);
      return {
        message: waSection(
          'Phone number',
          `*${name}* ka WhatsApp number?\n\n` +
            'Contact share kar sakte hain, ya number likhein (10 digit ya 91...).',
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_PHONE,
        sessionData: { ...data, name } as Record<string, unknown>,
      };
    } catch (error: any) {
      return {
        message: waSection(
          'Sahi format nahi',
          `${error?.message ?? 'Dobara try karein.'}\n\nEmployee ka *naam* bhejein.`,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private async handlePhoneStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    if (isContactShareNoPhoneMessage(input)) {
      return {
        message: this.formatStepMessage(
          'Contact mein number nahi mila',
          'Contact share ho gaya, lekin number system tak nahi aaya (GetOlli limitation).\n\n' +
            'Mobile number *likh kar* bhejein — jaise *7247577182* ya *917247577182*.',
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    if (!looksLikePhoneInput(input)) {
      return {
        message: this.formatStepMessage(
          'Number chahiye',
          'Yeh naam lag raha hai, number nahi.\n\n' +
            'Mobile number *likh kar* bhejein (10 digit ya 91...).',
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    try {
      const phone_number = normalizeWorkerPhone(input);
      const withPhone = { ...data, phone_number };
      const departments = await this.departmentsService.listByFactory(
        context.factoryId,
      );
      const selectable = filterSelectableDepartments(
        departments.map((d) => ({ id: d.id, name: d.name, slug: d.slug })),
      );
      const existingHint = await this.buildExistingPhoneHint(
        phone_number,
        context.factoryId,
      );
      return {
        message: this.formatStepMessage(
          'Kaam / team',
          buildDepartmentStepPrompt(
            withPhone.name!,
            phone_number,
            selectable,
            existingHint,
          ),
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
        sessionData: withPhone as Record<string, unknown>,
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'Sahi WhatsApp number bhejein (contact share ya 10 digit).',
          error?.message,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private async handleDepartmentStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const departments = await this.departmentsService.listByFactory(
      context.factoryId,
    );
    const deptOptions = departments.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
    }));
    const selectable = filterSelectableDepartments(deptOptions);
    const deptList = formatDepartmentList(selectable);
    const isOwner =
      (context.role || '').toUpperCase() === USER_ROLE.OWNER;
    const existingHint = data.phone_number
      ? await this.buildExistingPhoneHint(data.phone_number, context.factoryId)
      : '';
    const retryPrompt = buildDepartmentRetryPrompt(selectable, existingHint);

    if (!looksLikeDepartmentInput(input)) {
      return {
        message: this.formatBusinessError(
          'Team ka naam likhein',
          'Yeh number lag raha hai, team ka naam nahi.\n\n' +
            'Jaise: *sales*, *production* — ya list se *ID*.',
          retryPrompt,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }

    try {
      let departmentId: number;
      let departmentName: string;

      if (selectable.length === 0) {
        const created = await this.departmentsService.findOrCreateByName(
          context.factoryId,
          input,
          context.userId,
        );
        departmentId = created.id;
        departmentName = created.name;
      } else {
        try {
          const selected = resolveDepartmentSelection(input, selectable);
          departmentId = selected.id;
          departmentName = selected.name;
        } catch {
          if (!isOwner) {
            throw new Error(buildUnknownTeamMessage(input, deptList));
          }
          const created = await this.departmentsService.findOrCreateByName(
            context.factoryId,
            input,
            context.userId,
          );
          departmentId = created.id;
          departmentName = created.name;
        }
      }

      const withDept = {
        ...data,
        department_id: departmentId,
      };
      const progress = data.phone_number
        ? `📞 ${formatWorkerPhoneDisplay(data.phone_number)}\n🏢 ${departmentName}\n\n`
        : '';
      return {
        message: this.formatStepMessage(
          'Role',
          progress + this.buildRolePromptBody(withDept, departmentName),
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_ROLE,
        sessionData: withDept as Record<string, unknown>,
      };
    } catch (error: any) {
      const raw =
        error?.message ??
        error?.parent?.message ??
        String(error);
      const errName = String(error?.name ?? '');
      if (
        errName.includes('UniqueConstraint') ||
        raw.toLowerCase().includes('validation error')
      ) {
        const translated = translateWorkerOnboardingError(raw, {
          departmentList: deptList,
        });
        return {
          message: this.formatBusinessError(
            translated.title,
            translated.detail,
            retryPrompt,
          ),
          nextStep: session.current_step,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
      if (raw.includes('system mein match nahi')) {
        return {
          message: this.formatBusinessError(
            'Team nahi mili',
            raw,
            retryPrompt,
          ),
          nextStep: session.current_step,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
      const translated = translateWorkerOnboardingError(raw, {
        typedTeam: input,
        departmentList: deptList,
      });
      return {
        message: this.formatBusinessError(
          translated.title,
          translated.detail,
          retryPrompt,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private buildRolePromptBody(
    data: IWorkerOnboardingSessionData,
    departmentName: string,
  ): string {
    const who = data.name?.trim() || 'Employee';
    return (
      `*${departmentName}* ke liye role?\n\n` +
      `• *Worker* — *${who}* sirf team member (owner interim head rahenge)\n` +
      `• *Manager* — *${who}* *${departmentName}* ka head banega\n\n` +
      `_*Manager* likhne par hi head banega — *Worker* par nahi._`
    );
  }

  private async handleRoleStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    try {
      const worker_role = parseWorkerRole(input);
      const withRole = { ...data, worker_role };
      return {
        message: this.formatStepMessage(
          'Joining date',
          'Joining date? *YYYY-MM-DD* (2026-06-04)\n' +
            'Ya *SKIP* agar abhi nahi pata.',
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_DOJ,
        sessionData: withRole as Record<string, unknown>,
      };
    } catch (error: any) {
      const deptName =
        (await this.departmentsService.listByFactory(context.factoryId)).find(
          (d) => d.id === data.department_id,
        )?.name ?? '—';
      return {
        message: this.formatValidationError(
          this.buildRolePromptBody(data, deptName),
          error?.message,
        ),
        nextStep: session.current_step,
        sessionData: { ...data } as Record<string, unknown>,
      };
    }
  }

  private async handleDojStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    let doj: Date | null = null;

    if (!WORKFLOW_SKIP_KEYWORDS.includes(input.trim().toLowerCase())) {
      try {
        doj = normalizeWorkerDoj(input);
      } catch (error: any) {
        return {
          message: this.formatValidationError(
            'Date *YYYY-MM-DD* ya *SKIP* bhejein.',
            error?.message,
          ),
          nextStep: session.current_step,
          sessionData: { ...data } as Record<string, unknown>,
        };
      }
    }

    const finalData: IWorkerOnboardingSessionData = {
      ...data,
      doj: doj ? doj.toISOString().slice(0, 10) : null,
    };

    const role =
      (finalData.worker_role as USER_ROLE.WORKER | USER_ROLE.MANAGER) ??
      USER_ROLE.WORKER;

    try {
      const departments = await this.departmentsService.listByFactory(
        context.factoryId,
      );
      const department = departments.find(
        (d) => d.id === finalData.department_id,
      );

      const result = await this.workerOnboardingService.onboardWorker({
        factoryId: context.factoryId,
        name: finalData.name!,
        phoneNumber: finalData.phone_number!,
        departmentId: finalData.department_id!,
        role,
        doj,
      });

      const roleLabel = role === USER_ROLE.MANAGER ? 'Manager' : 'Worker';
      const headNote =
        role === USER_ROLE.MANAGER && department
          ? `\nAb *${finalData.name}* *${department.name}* ke head hain.`
          : '';

      return {
        message: waSection(
          'Employee add ho gaya',
          `*${finalData.name}* jud gaye.\n\n` +
            `📞 ${formatWorkerPhoneDisplay(finalData.phone_number!)}\n` +
            (department ? `🏢 ${department.name}\n` : '') +
            `👤 ${roleLabel}` +
            (finalData.doj ? `\n📅 ${finalData.doj}` : '') +
            headNote +
            '\n\nUnhe WhatsApp par welcome message bhej diya gaya.',
        ),
        completed: true,
        sessionData: finalData as Record<string, unknown>,
      };
    } catch (error: any) {
      const msg = error?.message ?? 'Could not onboard worker';
      const translated = translateWorkerOnboardingError(msg);

      if (msg.includes('phone') || msg.includes('Phone')) {
        return {
          message: waSection(
            translated.title,
            `${translated.detail}\n\nSahi number dubara bhejein.`,
          ),
          nextStep: WORKER_ONBOARDING_STEP.WORKER_PHONE,
          sessionData: {
            ...finalData,
            phone_number: undefined,
          } as Record<string, unknown>,
        };
      }

      if (
        msg.includes('department') ||
        msg.includes('Department') ||
        msg.includes('attached to another')
      ) {
        return {
          message: waSection(
            translated.title,
            `${translated.detail}\n\nTeam / department dubara bhejein.`,
          ),
          nextStep: WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
          sessionData: {
            ...finalData,
            department_id: undefined,
          } as Record<string, unknown>,
        };
      }

      if (msg.includes('name') || msg.includes('Name')) {
        return {
          message: waSection(
            'Naam issue',
            `${msg}\n\nNaam dubara bhejein.`,
          ),
          nextStep: WORKER_ONBOARDING_STEP.WORKER_NAME,
          sessionData: { ...data, name: undefined } as Record<string, unknown>,
        };
      }

      return {
        message: waSection(translated.title, translated.detail),
        nextStep: session.current_step,
        sessionData: finalData as Record<string, unknown>,
      };
    }
  }

  private async buildExistingPhoneHint(
    phone: string,
    factoryId: number,
  ): Promise<string> {
    try {
      const user = await this.usersService.findByPhone(phone);
      if (!user?.id) {
        return '';
      }
      const link = user.factory_links as
        | { factory_id?: number; role?: string }
        | undefined;
      if (link?.factory_id && link.factory_id !== factoryId) {
        return `ℹ️ Yeh number kisi *aur business* mein registered hai — yahan naya add confirm karein.`;
      }
      const headed = await this.departmentsService.findDepartmentHeadedByUser(
        factoryId,
        user.id,
      );
      return buildExistingPhoneHint(
        user.name ?? '',
        link?.role ?? '',
        headed?.name ?? null,
      );
    } catch {
      return '';
    }
  }

  private formatValidationError(
    prompt: string,
    errorMessage?: string,
  ): string {
    const { title, body } = formatValidationErrorMessage(prompt, errorMessage);
    return this.formatStepMessage(title, body);
  }

  private formatBusinessError(
    title: string,
    detail: string,
    prompt?: string,
  ): string {
    const { body } = formatBusinessErrorMessage(title, detail, prompt);
    return this.formatStepMessage(title, body);
  }
}
