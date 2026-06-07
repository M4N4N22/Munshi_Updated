import { Injectable } from '@nestjs/common';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import {
  TASK_INVENTORY_CREATION_STEP,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  ITaskInventoryCreationSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';
import { TaskInventoryConfirmationService } from 'src/services/task-inventory-resolution/task-inventory-confirmation.service';
import { TaskInventoryCreationService } from 'src/services/task-inventory-resolution/task-inventory-creation.service';
import {
  isCancelReply,
  isConfirmReply,
  parseSelectionIndex,
  taskKindRequiresInventory,
} from 'src/services/task-inventory-resolution/task-inventory-nl.helper';
import { ResolvedTaskInventoryIntent } from 'src/services/task-inventory-resolution/task-inventory-resolution.interfaces';

@Injectable()
export class TaskInventoryCreationWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.TASK_INVENTORY_CREATION;
  readonly startCommand = WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION;
  readonly firstStep = TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION;

  constructor(
    private readonly confirmationService: TaskInventoryConfirmationService,
    private readonly creationService: TaskInventoryCreationService,
  ) {}

  getInitialPrompt(): string {
    return this.confirmationService.buildRepromptConfirmation();
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const data = {
      ...(session.session_data as ITaskInventoryCreationSessionData),
    };

    const step = session.current_step;

    if (step === TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION) {
      return this.handleInventorySelection(session, message, data, context);
    }

    if (step === TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION) {
      return this.handleWorkerSelection(session, message, data, context);
    }

    if (isCancelReply(message)) {
      return {
        message: waSection(
          'Cancelled',
          'Task creation cancelled. Send a new message anytime.',
        ),
        cancelled: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    return this.handleConfirmation(session, message, data, context);
  }

  private async handleInventorySelection(
    session: IWorkflowSessionRecord,
    message: string,
    data: ITaskInventoryCreationSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const candidates = data.inventory_candidates ?? [];
    if (
      isCancelReply(message) &&
      parseSelectionIndex(message, candidates.length) == null
    ) {
      return {
        message: waSection(
          'Cancelled',
          'Task creation cancelled. Send a new message anytime.',
        ),
        cancelled: true,
        sessionData: data as Record<string, unknown>,
      };
    }
    const index = parseSelectionIndex(message, candidates.length);
    if (index == null) {
      return {
        message: this.confirmationService.buildInvalidSelectionMessage(
          candidates.length,
        ),
        nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
        sessionData: data as Record<string, unknown>,
      };
    }

    const selected = candidates[index - 1];
    data.inventory_item_id = selected.item_id;
    data.inventory_sku = selected.sku;
    data.inventory_name = selected.name;
    delete data.inventory_candidates;

    if (data.worker_candidates?.length) {
      return {
        message: this.confirmationService.buildWorkerDisambiguationPrompt(
          data.worker_candidates.map((c) => ({
            user_id: c.user_id,
            name: c.name,
            match_type: 'partial',
          })),
        ),
        nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
        sessionData: data as Record<string, unknown>,
      };
    }

    if (!data.worker_user_id) {
      return {
        message: this.confirmationService.buildUnresolvedWorkerMessage(null),
        cancelled: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    return {
      message: this.confirmationService.buildConfirmationMessage(
        this.toResolvedIntent(data),
      ),
      nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
      sessionData: data as Record<string, unknown>,
    };
  }

  private async handleWorkerSelection(
    session: IWorkflowSessionRecord,
    message: string,
    data: ITaskInventoryCreationSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const candidates = data.worker_candidates ?? [];
    if (
      isCancelReply(message) &&
      parseSelectionIndex(message, candidates.length) == null
    ) {
      return {
        message: waSection(
          'Cancelled',
          'Task creation cancelled. Send a new message anytime.',
        ),
        cancelled: true,
        sessionData: data as Record<string, unknown>,
      };
    }
    const index = parseSelectionIndex(message, candidates.length);
    if (index == null) {
      return {
        message: this.confirmationService.buildInvalidSelectionMessage(
          candidates.length,
        ),
        nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
        sessionData: data as Record<string, unknown>,
      };
    }

    const selected = candidates[index - 1];
    data.worker_user_id = selected.user_id;
    data.worker_name = selected.name;
    delete data.worker_candidates;

    if (
      taskKindRequiresInventory(data.task_kind ?? null) &&
      !data.inventory_item_id
    ) {
      return {
        message: this.confirmationService.buildUnresolvedInventoryMessage(null),
        cancelled: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    return {
      message: this.confirmationService.buildConfirmationMessage(
        this.toResolvedIntent(data),
      ),
      nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
      sessionData: data as Record<string, unknown>,
    };
  }

  private async handleConfirmation(
    session: IWorkflowSessionRecord,
    message: string,
    data: ITaskInventoryCreationSessionData,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    if (data.task_created_id) {
      return {
        message: this.confirmationService.buildAlreadyCreatedMessage(
          data.task_created_id,
        ),
        completed: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    if (!isConfirmReply(message)) {
      return {
        message: this.confirmationService.buildRepromptConfirmation(),
        nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
        sessionData: data as Record<string, unknown>,
      };
    }

    try {
      const created = await this.creationService.createFromSession(
        data,
        context.userId,
        context.factoryId,
      );
      data.task_created_id = created.taskId;

      return {
        message: created.message,
        completed: true,
        sessionData: data as Record<string, unknown>,
      };
    } catch (error: any) {
      const detail =
        typeof error?.message === 'string'
          ? error.message
          : 'Task could not be created. Please try again.';
      return {
        message:
          detail.startsWith('*') || detail.includes('\n')
            ? detail
            : this.confirmationService.buildRecoveryMessage(
                'Could not create task',
                detail,
              ),
        nextStep: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
        sessionData: data as Record<string, unknown>,
      };
    }
  }

  private toResolvedIntent(
    data: ITaskInventoryCreationSessionData,
  ): ResolvedTaskInventoryIntent {
    return {
      task_kind: data.task_kind ?? null,
      quantity: data.quantity ?? null,
      inventory: data.inventory_item_id
        ? {
            status: 'resolved',
            item_id: data.inventory_item_id,
            sku: data.inventory_sku,
            name: data.inventory_name,
          }
        : { status: 'not_found' },
      worker: data.worker_user_id
        ? {
            status: 'resolved',
            user_id: data.worker_user_id,
            name: data.worker_name,
          }
        : { status: 'not_found' },
      disambiguation: [],
    };
  }
}
