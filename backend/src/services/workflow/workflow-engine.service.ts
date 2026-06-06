import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { WorkflowRegistry } from './workflow.registry';
import { WorkflowSessionService } from './workflow-session.service';
import {
  IWorkflowHandler,
  WorkflowSessionResolveResult,
  WorkflowUserContext,
} from './workflow.interfaces';
import {
  WORKFLOW_CANCEL_COMMAND,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from './workflow.constants';
import type { WaOutboundMessage } from 'src/core/messaging/outbound-message.types';
import { textOutbound } from 'src/core/messaging/outbound-message.types';
import { AssignClarifyWorkflowHandler } from './handlers/assign-clarify.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import { PurchaseRequestPrefillService } from 'src/services/purchase-requests/purchase-request-prefill.service';
import {
  buildPurchaseRequestPrefillPrompt,
  buildPurchaseRequestPrefillSessionData,
  parsePurchaseRequestItemIdFromCommand,
} from 'src/services/purchase-requests/purchase-request-prefill.helper';

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly sessionService: WorkflowSessionService,
    private readonly registry: WorkflowRegistry,
  ) {}

  async startWorkflow(
    handler: IWorkflowHandler,
    context: WorkflowUserContext,
  ): Promise<string> {
    await this.sessionService.createSession({
      factory_id: context.factoryId,
      phone_number: context.phone,
      workflow_type: handler.workflowType,
      current_step: handler.firstStep,
      session_data: {},
    });

    return handler.getInitialPrompt();
  }

  async startWorkflowWithSessionData(
    handler: IWorkflowHandler,
    context: WorkflowUserContext,
    sessionData: Record<string, unknown>,
    firstMessage: string,
    outbound?: WaOutboundMessage,
  ): Promise<string | WaOutboundMessage> {
    await this.sessionService.createSession({
      factory_id: context.factoryId,
      phone_number: context.phone,
      workflow_type: handler.workflowType,
      current_step: handler.firstStep,
      session_data: sessionData,
    });

    return outbound ?? firstMessage;
  }

  async handleActiveSessionMessage(
    phone: string,
    message: string,
    context: WorkflowUserContext,
  ): Promise<string | WaOutboundMessage> {
    const resolved = await this.sessionService.resolveActiveSession(phone);
    if (!resolved.session) {
      if (resolved.expiredJustNow) {
        return this.buildExpiredSessionMessage();
      }
      throw new NotFoundException('No active workflow session');
    }

    const session = resolved.session;
    const handler = this.registry.getHandlerByType(session.workflow_type);
    const result = await handler.handleStep(session, message, context);

    if (result.cancelled) {
      await this.sessionService.cancelSession(session.id);
      return result.outbound ?? result.message;
    }

    if (result.completed) {
      await this.sessionService.completeSession(session.id);
      return result.outbound ?? result.message;
    }

    await this.sessionService.updateSession(session.id, {
      current_step: result.nextStep ?? session.current_step,
      session_data: result.sessionData ?? session.session_data,
    });

    return result.outbound ?? result.message;
  }

  buildExpiredSessionMessage(): string {
    return waSection(
      'Workflow expired',
      'Your workflow session has expired.\n\n' +
        'Please send */onboard_vendor*, */onboard_worker*, or */inventory_create* to start again.\n\n' +
        'You can also send */cancel* anytime to exit an active workflow.',
    );
  }
}

@Injectable()
export class WorkflowRouterService {
  constructor(
    private readonly engine: WorkflowEngineService,
    private readonly registry: WorkflowRegistry,
    private readonly sessionService: WorkflowSessionService,
    private readonly usersService: UserService,
    private readonly purchaseRequestPrefillService: PurchaseRequestPrefillService,
  ) {}

  isCancelCommand(message: string): boolean {
    const trimmed = message.trim().toLowerCase();
    return (
      trimmed === WORKFLOW_CANCEL_COMMAND ||
      trimmed.startsWith(`${WORKFLOW_CANCEL_COMMAND} `)
    );
  }

  matchWorkflowStartCommand(message: string): string | null {
    return this.registry.matchWorkflowStartCommand(message);
  }

  async resolveActiveSession(
    phone: string,
  ): Promise<WorkflowSessionResolveResult> {
    return this.sessionService.resolveActiveSession(phone);
  }

  async hasActiveSession(phone: string): Promise<boolean> {
    const resolved = await this.sessionService.resolveActiveSession(phone);
    return !!resolved.session;
  }

  getExpiredSessionMessage(): string {
    return this.engine.buildExpiredSessionMessage();
  }

  async cancelWorkflow(phone: string): Promise<string> {
    const resolved = await this.sessionService.resolveActiveSession(phone);
    if (resolved.expiredJustNow) {
      return this.engine.buildExpiredSessionMessage();
    }
    if (!resolved.session) {
      return waSection(
        'No active workflow',
        'You do not have an active workflow to cancel.\n\n' +
          'Send */onboard_vendor* or */onboard_worker* to start a workflow, or */help* for commands.',
      );
    }

    await this.sessionService.cancelSession(resolved.session.id);
    return waSection(
      'Workflow cancelled',
      'Your workflow has been cancelled.\n\nYou can start again anytime with */onboard_vendor* or */onboard_worker*.',
    );
  }

  async buildInProgressWorkerOnboardingReminder(
    phone: string,
  ): Promise<string | null> {
    const resolved = await this.sessionService.resolveActiveSession(phone);
    if (
      !resolved.session ||
      resolved.session.workflow_type !== WORKFLOW_TYPE.ONBOARD_WORKER
    ) {
      return null;
    }
    try {
      const context = await this.resolveUserContext(phone);
      const handler = this.registry.getHandlerByType(
        WORKFLOW_TYPE.ONBOARD_WORKER,
      );
      if (handler instanceof WorkerOnboardingWorkflowHandler) {
        return handler.buildResumeReminder(resolved.session, context);
      }
    } catch {
      return null;
    }
    return null;
  }

  async handleActiveWorkflowMessage(
    phone: string,
    message: string,
  ): Promise<string | WaOutboundMessage> {
    if (this.isCancelCommand(message)) {
      return this.cancelWorkflow(phone);
    }

    const context = await this.resolveUserContext(phone);
    this.ensureCanRunWorkflow(context.role);
    return this.engine.handleActiveSessionMessage(phone, message, context);
  }

  async startWorkflowFromCommand(
    phone: string,
    commandOrMessage: string,
  ): Promise<string> {
    const trimmed = commandOrMessage.trim();
    const matchedCommand =
      this.registry.matchWorkflowStartCommand(trimmed) ?? trimmed;
    const context = await this.resolveUserContext(phone);
    this.ensureCanRunWorkflow(context.role);

    const handler = this.registry.getHandlerByCommand(matchedCommand);
    if (!handler) {
      throw new NotFoundException(`Unknown workflow command: ${commandOrMessage}`);
    }

    if (handler.workflowType === WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE) {
      const itemId = parsePurchaseRequestItemIdFromCommand(trimmed);
      if (itemId != null) {
        const prefill = await this.purchaseRequestPrefillService.buildLowStockPrefill(
          context.factoryId,
          itemId,
        );
        if (prefill) {
          const sessionData = buildPurchaseRequestPrefillSessionData(prefill);
          const firstMessage = buildPurchaseRequestPrefillPrompt(prefill);
          const result = await this.engine.startWorkflowWithSessionData(
            handler,
            context,
            sessionData as Record<string, unknown>,
            firstMessage,
          );
          return typeof result === 'string' ? result : firstMessage;
        }
      }
    }

    return this.engine.startWorkflow(handler, context);
  }

  /** True when command maps to a registered multi-step workflow (same registry as slash commands). */
  isRegisteredWorkflowCommand(command: string): boolean {
    return !!this.registry.getHandlerByCommand(command);
  }

  /**
   * Start a workflow from a normalized slash intent (ML or slash).
   * Returns null when the intent is not a workflow-start command.
   */
  async startWorkflowIfRegistered(
    phone: string,
    command: string,
    options?: {
      taskDescription?: string;
      deadline?: string | null;
    },
  ): Promise<string | WaOutboundMessage | null> {
    const normalized = command.startsWith('/')
      ? command.toLowerCase()
      : `/${command}`.toLowerCase();

    if (normalized === WORKFLOW_START_COMMANDS.ASSIGN_CLARIFY) {
      return this.startAssignClarifyWorkflow(
        phone,
        options?.taskDescription?.trim() || '',
        options?.deadline,
      );
    }

    if (!this.isRegisteredWorkflowCommand(command)) {
      return null;
    }
    return this.startWorkflowFromCommand(phone, command);
  }

  /** @deprecated Use startWorkflowIfRegistered — kept for callers during transition */
  async startWorkflowFromMlCommand(
    phone: string,
    command: string,
    options?: {
      taskDescription?: string;
      deadline?: string | null;
    },
  ): Promise<string | WaOutboundMessage | null> {
    return this.startWorkflowIfRegistered(phone, command, options);
  }

  async startAssignClarifyWorkflow(
    phone: string,
    taskDescription: string,
    deadline?: string | null,
  ): Promise<string | WaOutboundMessage> {
    const context = await this.resolveUserContext(phone);

    if (context.role === USER_ROLE.WORKER) {
      return waSection(
        'Not allowed',
        'Sirf *owner* ya *manager* task assign kar sakte hain.\n\nApne manager ko boliye ya */help* bhejo.',
      );
    }

    this.ensureCanRunWorkflow(context.role);

    const description = taskDescription.trim();
    if (!description) {
      return waSection(
        'Task required',
        'Kya kaam assign karna hai? Example: *aaj website banegi*',
      );
    }

    const handler = this.registry.getHandlerByType(
      WORKFLOW_TYPE.ASSIGN_CLARIFY,
    ) as AssignClarifyWorkflowHandler;

    const prepared = await handler.buildAssigneePrompt(
      context,
      description,
      deadline ?? null,
    );

    if (!prepared.assignable_options.length && prepared.outbound) {
      return prepared.outbound;
    }

    const firstMessage = prepared.outbound ?? textOutbound(prepared.message);
    const firstText =
      firstMessage.type === 'text' ? firstMessage.body : prepared.message;

    return this.engine.startWorkflowWithSessionData(
      handler,
      context,
      {
        description,
        deadline: deadline ?? null,
        assignable_options: prepared.assignable_options,
      },
      firstText,
      prepared.outbound,
    );
  }

  private async resolveUserContext(
    phone: string,
  ): Promise<WorkflowUserContext> {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    const factoryId = user.factory_links?.factory_id;
    const role = user.factory_links?.role;

    if (!factoryId) {
      throw new NotFoundException('User not assigned to any factory');
    }

    return {
      userId: user.id,
      factoryId,
      role,
      phone,
      userName: user.name,
    };
  }

  private ensureCanRunWorkflow(role: string): void {
    if (role === USER_ROLE.WORKER) {
      throw new ForbiddenException(
        'Only managers and owners can run this workflow',
      );
    }
  }
}
