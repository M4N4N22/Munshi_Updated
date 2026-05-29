import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_ROLE } from 'src/services/users/users.constants';
import { UserService } from 'src/services/users/users.service';
import { WorkflowRegistry } from './workflow.registry';
import { WorkflowSessionService } from './workflow-session.service';
import {
  IWorkflowHandler,
  WorkflowUserContext,
} from './workflow.interfaces';

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
    const session = await this.sessionService.createSession({
      factory_id: context.factoryId,
      phone_number: context.phone,
      workflow_type: handler.workflowType,
      current_step: handler.firstStep,
      session_data: {},
    });

    void session;
    return handler.getInitialPrompt();
  }

  async handleActiveSessionMessage(
    phone: string,
    message: string,
    context: WorkflowUserContext,
  ): Promise<string> {
    const session = await this.sessionService.getActiveSession(phone);
    if (!session) {
      throw new NotFoundException('No active workflow session');
    }

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
}

@Injectable()
export class WorkflowRouterService {
  constructor(
    private readonly engine: WorkflowEngineService,
    private readonly registry: WorkflowRegistry,
    private readonly sessionService: WorkflowSessionService,
    private readonly usersService: UserService,
  ) {}

  matchWorkflowStartCommand(message: string): string | null {
    return this.registry.matchWorkflowStartCommand(message);
  }

  async hasActiveSession(phone: string): Promise<boolean> {
    const session = await this.sessionService.getActiveSession(phone);
    return !!session;
  }

  async handleActiveWorkflowMessage(
    phone: string,
    message: string,
  ): Promise<string> {
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
