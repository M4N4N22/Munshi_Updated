import { Injectable, NotFoundException } from '@nestjs/common';
import {
  WORKFLOW_TYPE,
  WorkflowType,
} from './workflow.constants';
import { IWorkflowHandler } from './workflow.interfaces';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';

@Injectable()
export class WorkflowRegistry {
  private readonly byCommand = new Map<string, IWorkflowHandler>();
  private readonly byType = new Map<WorkflowType, IWorkflowHandler>();

  constructor(
    private readonly vendorOnboardingHandler: VendorOnboardingWorkflowHandler,
  ) {
    this.registerHandler(vendorOnboardingHandler);
  }

  registerHandler(handler: IWorkflowHandler): void {
    const cmdKey = handler.startCommand.toLowerCase();
    this.byCommand.set(cmdKey, handler);
    this.byType.set(handler.workflowType, handler);
  }

  getHandlerByCommand(command: string): IWorkflowHandler | undefined {
    const normalized = command.startsWith('/')
      ? command.toLowerCase()
      : `/${command}`.toLowerCase();
    return this.byCommand.get(normalized);
  }

  getHandlerByType(type: WorkflowType): IWorkflowHandler {
    const handler = this.byType.get(type);
    if (!handler) {
      throw new NotFoundException(`No workflow handler for type ${type}`);
    }
    return handler;
  }

  isWorkflowStartCommand(message: string): boolean {
    const trimmed = message.trim().toLowerCase();
    for (const cmd of this.byCommand.keys()) {
      if (trimmed === cmd || trimmed.startsWith(`${cmd} `)) {
        return true;
      }
    }
    return false;
  }

  matchWorkflowStartCommand(message: string): string | null {
    const trimmed = message.trim().toLowerCase();
    for (const cmd of this.byCommand.keys()) {
      if (trimmed === cmd || trimmed.startsWith(`${cmd} `)) {
        return cmd;
      }
    }
    return null;
  }

  listStartCommands(): string[] {
    return [...this.byCommand.keys()];
  }
}
