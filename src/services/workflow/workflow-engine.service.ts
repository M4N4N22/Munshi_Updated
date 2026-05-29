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
import { WORKFLOW_CANCEL_COMMAND } from './workflow.constants';

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

  async handleActiveSessionMessage(
    phone: string,
    message: string,
    context: WorkflowUserContext,
  ): Promise<string> {
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
      return result.message;
    }

    if (result.completed) {
      await this.sessionService.completeSession(session.id);
      return result.message;
    }

    await this.sessionService.updateSession(session.id, {
      current_step: result.nextStep ?? session.current_step,
      session_data: result.sessionData ?? session.session_data,
    });

    return result.message;
  }

  buildExpiredSessionMessage(): string {
    return waSection(
      'Workflow expired',
      'Your workflow session has expired.\n\n' +
        'Please send */onboard_vendor* or */onboard_worker* to start again.\n\n' +
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

  async handleActiveWorkflowMessage(
    phone: string,
    message: string,
  ): Promise<string> {
    if (this.isCancelCommand(message)) {
      return this.cancelWorkflow(phone);
    }

    const context = await this.resolveUserContext(phone);
    this.ensureCanRunWorkflow(context.role);
    return this.engine.handleActiveSessionMessage(phone, message, context);
  }

  async startWorkflowFromCommand(
    phone: string,
    command: string,
  ): Promise<string> {
    const context = await this.resolveUserContext(phone);
    this.ensureCanRunWorkflow(context.role);

    const handler = this.registry.getHandlerByCommand(command);
    if (!handler) {
      throw new NotFoundException(`Unknown workflow command: ${command}`);
    }

    return this.engine.startWorkflow(handler, context);
  }

  async startWorkflowFromMlCommand(
    phone: string,
    command: string,
  ): Promise<string | null> {
    const handler = this.registry.getHandlerByCommand(command);
    if (!handler) {
      return null;
    }
    return this.startWorkflowFromCommand(phone, command);
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
