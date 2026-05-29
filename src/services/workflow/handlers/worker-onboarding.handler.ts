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
import {
  formatDepartmentList,
  normalizeWorkerDoj,
  normalizeWorkerName,
  normalizeWorkerPhone,
  resolveDepartmentSelection,
} from '../worker-onboarding.validation';

@Injectable()
export class WorkerOnboardingWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.ONBOARD_WORKER;
  readonly startCommand = WORKFLOW_START_COMMANDS.ONBOARD_WORKER;
  readonly firstStep = WORKER_ONBOARDING_STEP.WORKER_NAME;

  constructor(
    private readonly workerOnboardingService: WorkerOnboardingService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  getInitialPrompt(): string {
    return waSection(
      'Worker onboarding',
      'What is the *worker name*?',
    );
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const input = message.trim();
    const data = session.session_data as IWorkerOnboardingSessionData;

    switch (session.current_step) {
      case WORKER_ONBOARDING_STEP.WORKER_NAME:
        return this.handleNameStep(session, input, data);
      case WORKER_ONBOARDING_STEP.WORKER_PHONE:
        return this.handlePhoneStep(session, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT:
        return this.handleDepartmentStep(session, input, data, context);
      case WORKER_ONBOARDING_STEP.WORKER_DOJ:
        return this.handleDojStep(session, input, data, context);
      default:
        return {
          message: waSection(
            'Workflow error',
            'This workflow step is not recognized. Please send /onboard_worker to start again.',
          ),
          cancelled: true,
        };
    }
  }

  private handleNameStep(
    session: IWorkflowSessionRecord,
    input: string,
    data: IWorkerOnboardingSessionData,
  ): WorkflowStepResult {
    try {
      const name = normalizeWorkerName(input);
      return {
        message: 'What is the *worker phone number*?',
        nextStep: WORKER_ONBOARDING_STEP.WORKER_PHONE,
        sessionData: { ...data, name } as Record<string, unknown>,
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'What is the *worker name*?',
          error?.message,
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
    try {
      const phone_number = normalizeWorkerPhone(input);
      const departments = await this.departmentsService.listByFactory(
        context.factoryId,
      );
      const deptList = formatDepartmentList(
        departments.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
        })),
      );

      if (departments.length === 0) {
        return {
          message: waSection(
            'No departments',
            `${deptList}\n\nSend /onboard_worker again after creating a department.`,
          ),
          cancelled: true,
        };
      }

      return {
        message: waSection(
          'Department selection',
          `What is the *department* for this worker?\n\n${deptList}\n\nReply with department *name* or *ID*.`,
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_DEPARTMENT,
        sessionData: { ...data, phone_number } as Record<string, unknown>,
      };
    } catch (error: any) {
      return {
        message: this.formatValidationError(
          'What is the *worker phone number*?',
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
    try {
      const departments = await this.departmentsService.listByFactory(
        context.factoryId,
      );
      const selected = resolveDepartmentSelection(
        input,
        departments.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
        })),
      );

      return {
        message: waSection(
          'Date of joining',
          'What is the *date of joining*?\n\nUse *YYYY-MM-DD* (e.g. 2026-05-29) or reply *SKIP* if unavailable.',
        ),
        nextStep: WORKER_ONBOARDING_STEP.WORKER_DOJ,
        sessionData: {
          ...data,
          department_id: selected.id,
        } as Record<string, unknown>,
      };
    } catch (error: any) {
      const departments = await this.departmentsService.listByFactory(
        context.factoryId,
      );
      const deptList = formatDepartmentList(
        departments.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
        })),
      );
      return {
        message: this.formatValidationError(
          `Please select a department:\n\n${deptList}`,
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
            'What is the *date of joining*? Use YYYY-MM-DD or reply SKIP.',
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
        doj,
      });

      return {
        message: waSection(
          'Worker onboarded successfully',
          `*${finalData.name}* has been added to your factory.\n\n` +
            `🆔 User #${result.userId}\n` +
            `📞 ${finalData.phone_number}` +
            (department ? `\n🏢 Department: ${department.name}` : '') +
            (finalData.doj ? `\n📅 DOJ: ${finalData.doj}` : '') +
            `\n\nA welcome message has been sent to the worker on WhatsApp.`,
        ),
        completed: true,
        sessionData: finalData as Record<string, unknown>,
      };
    } catch (error: any) {
      const msg = error?.message ?? 'Could not onboard worker';

      if (msg.includes('phone') || msg.includes('Phone')) {
        return {
          message: waSection(
            'Could not onboard worker',
            `${msg}\n\nPlease send the *worker phone number* again.`,
          ),
          nextStep: WORKER_ONBOARDING_STEP.WORKER_PHONE,
          sessionData: {
            ...finalData,
            phone_number: undefined,
          } as Record<string, unknown>,
        };
      }

      if (msg.includes('department') || msg.includes('Department')) {
        return {
          message: waSection(
            'Could not onboard worker',
            `${msg}\n\nPlease select the *department* again.`,
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
            'Could not onboard worker',
            `${msg}\n\nPlease send the *worker name* again.`,
          ),
          nextStep: WORKER_ONBOARDING_STEP.WORKER_NAME,
          sessionData: { ...data, name: undefined } as Record<string, unknown>,
        };
      }

      return {
        message: waSection('Could not onboard worker', msg),
        nextStep: session.current_step,
        sessionData: finalData as Record<string, unknown>,
      };
    }
  }

  private formatValidationError(prompt: string, errorMessage?: string): string {
    return waSection(
      'Invalid input',
      `${errorMessage ?? 'Please check your input and try again.'}\n\n${prompt}`,
    );
  }
}
