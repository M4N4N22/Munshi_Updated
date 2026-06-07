import { Injectable } from '@nestjs/common';
import { TASK_KINDS } from '../../../contracts/typescript/index';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import {
  TASK_INVENTORY_CREATION_STEP,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow/workflow.constants';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowRegistry } from '../workflow/workflow.registry';
import { WorkflowUserContext } from '../workflow/workflow.interfaces';
import { TaskInventoryConfirmationService } from './task-inventory-confirmation.service';
import { TaskInventoryResolutionService } from './task-inventory-resolution.service';
import { MlTaskInventoryClient } from './ml-task-inventory.client';
import {
  ResolvedTaskInventoryIntent,
  InventoryCandidate,
  WorkerCandidate,
} from './task-inventory-resolution.interfaces';
import {
  taskKindRequiresInventory,
  taskKindRequiresWorker,
} from './task-inventory-nl.helper';
import { ITaskInventoryCreationSessionData } from '../workflow/workflow.interfaces';

export interface NlWorkflowBootstrap {
  step: string;
  sessionData: ITaskInventoryCreationSessionData;
  prompt: string;
}

@Injectable()
export class TaskInventoryNlOrchestratorService {
  constructor(
    private readonly mlClient: MlTaskInventoryClient,
    private readonly resolutionService: TaskInventoryResolutionService,
    private readonly confirmationService: TaskInventoryConfirmationService,
    private readonly engine: WorkflowEngineService,
    private readonly registry: WorkflowRegistry,
    private readonly usersService: UserService,
  ) {}

  async tryHandleFreeText(
    phone: string,
    message: string,
  ): Promise<string | null> {
    const context = await this.resolveContext(phone);
    if (!context) return null;
    if (context.role === USER_ROLE.WORKER) return null;

    const extraction = await this.mlClient.extract(message);
    if (
      !extraction?.task_kind ||
      !TASK_KINDS.includes(extraction.task_kind as (typeof TASK_KINDS)[number])
    ) {
      return null;
    }

    const resolved = await this.resolutionService.resolveIntent(
      context.factoryId,
      extraction,
    );

    const blockingMessage = this.buildBlockingMessage(
      resolved,
      extraction,
      context,
    );
    if (blockingMessage) {
      return blockingMessage;
    }

    const bootstrap = this.buildBootstrap(resolved, message, context);
    const handler = this.registry.getHandlerByType(
      WORKFLOW_TYPE.TASK_INVENTORY_CREATION,
    );

    const result = await this.engine.startWorkflowWithSessionData(
      handler,
      context,
      bootstrap.sessionData as Record<string, unknown>,
      bootstrap.prompt,
      undefined,
      bootstrap.step,
    );

    return typeof result === 'string' ? result : bootstrap.prompt;
  }

  buildBootstrap(
    resolved: ResolvedTaskInventoryIntent,
    rawMessage: string,
    context: WorkflowUserContext,
  ): NlWorkflowBootstrap {
    const sessionData: ITaskInventoryCreationSessionData = {
      task_kind: resolved.task_kind,
      quantity: resolved.quantity,
      raw_message: rawMessage,
    };

    if (resolved.inventory.status === 'ambiguous' && resolved.inventory.candidates) {
      sessionData.inventory_candidates = resolved.inventory.candidates.map(
        (c) => ({ item_id: c.item_id, sku: c.sku, name: c.name }),
      );
    } else if (resolved.inventory.status === 'resolved') {
      sessionData.inventory_item_id = resolved.inventory.item_id;
      sessionData.inventory_sku = resolved.inventory.sku;
      sessionData.inventory_name = resolved.inventory.name;
    }

    if (resolved.worker.status === 'ambiguous' && resolved.worker.candidates) {
      sessionData.worker_candidates = resolved.worker.candidates.map((c) => ({
        user_id: c.user_id,
        name: c.name,
      }));
    } else if (resolved.worker.status === 'resolved') {
      sessionData.worker_user_id = resolved.worker.user_id;
      sessionData.worker_name = resolved.worker.name;
    } else if (
      resolved.task_kind === 'inventory_count' &&
      resolved.worker.status === 'not_found'
    ) {
      sessionData.worker_user_id = context.userId;
      sessionData.worker_name = context.userName ?? 'You';
    }

    if (sessionData.inventory_candidates?.length) {
      return {
        step: TASK_INVENTORY_CREATION_STEP.WAITING_INVENTORY_SELECTION,
        sessionData,
        prompt: this.confirmationService.buildInventoryDisambiguationPrompt(
          resolved.inventory.candidates!,
        ),
      };
    }

    if (sessionData.worker_candidates?.length) {
      return {
        step: TASK_INVENTORY_CREATION_STEP.WAITING_WORKER_SELECTION,
        sessionData,
        prompt: this.confirmationService.buildWorkerDisambiguationPrompt(
          resolved.worker.candidates!,
        ),
      };
    }

    return {
      step: TASK_INVENTORY_CREATION_STEP.WAITING_CONFIRMATION,
      sessionData,
      prompt: this.confirmationService.buildConfirmationMessage(resolved),
    };
  }

  private buildBlockingMessage(
    resolved: ResolvedTaskInventoryIntent,
    extraction: { item_name_or_sku: string | null; assignee_hint: string | null },
    context: WorkflowUserContext,
  ): string | null {
    if (
      taskKindRequiresInventory(resolved.task_kind) &&
      resolved.inventory.status === 'not_found'
    ) {
      return this.confirmationService.buildUnresolvedInventoryMessage(
        extraction.item_name_or_sku,
      );
    }

    if (
      taskKindRequiresWorker(resolved.task_kind) &&
      resolved.worker.status === 'not_found' &&
      resolved.task_kind !== 'inventory_count'
    ) {
      return this.confirmationService.buildUnresolvedWorkerMessage(
        extraction.assignee_hint,
      );
    }

    if (
      taskKindRequiresInventory(resolved.task_kind) &&
      resolved.quantity == null
    ) {
      return this.confirmationService.buildRecoveryMessage(
        'Quantity required',
        'Please include quantity in your message, e.g. *Ram ko 20 cement deliver kar do*.',
      );
    }

    return null;
  }

  private async resolveContext(
    phone: string,
  ): Promise<WorkflowUserContext | null> {
    try {
      const user = await this.usersService.findByPhone(phone);
      if (!user?.factory_links?.factory_id) return null;
      return {
        userId: user.id,
        factoryId: user.factory_links.factory_id,
        role: user.factory_links.role,
        phone,
        userName: user.name,
      };
    } catch {
      return null;
    }
  }
}

/** Internal registry command — not exposed to users as slash command. */
export const TASK_INVENTORY_NL_START_COMMAND =
  WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION;

export type { InventoryCandidate, WorkerCandidate };
