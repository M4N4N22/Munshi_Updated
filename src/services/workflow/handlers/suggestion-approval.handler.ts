import { Injectable } from '@nestjs/common';
import {
  SUGGESTION_APPROVAL_STEP,
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import {
  ISuggestionApprovalSessionData,
  IWorkflowHandler,
  IWorkflowSessionRecord,
  WorkflowStepResult,
  WorkflowUserContext,
} from '../workflow.interfaces';
import { SuggestionExecutionService } from 'src/services/documents/suggestion-execution.service';
import {
  SUGGESTION_CONFIRM_NO,
  SUGGESTION_CONFIRM_YES,
} from 'src/services/documents/documents.constants';
import { waSection } from 'src/modules/whatsapp/whatsapp.templates';

@Injectable()
export class SuggestionApprovalWorkflowHandler implements IWorkflowHandler {
  readonly workflowType = WORKFLOW_TYPE.SUGGESTION_APPROVAL;
  readonly startCommand = WORKFLOW_START_COMMANDS.SUGGESTION_APPROVAL;
  readonly firstStep = SUGGESTION_APPROVAL_STEP.CONFIRM;

  constructor(
    private readonly suggestionExecution: SuggestionExecutionService,
  ) {}

  getInitialPrompt(): string {
    return waSection(
      'Suggestion approval',
      'A document suggestion is ready for your review.\n\nReply *YES* or *NO*.',
    );
  }

  async handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult> {
    const data = session.session_data as ISuggestionApprovalSessionData;
    const input = message.trim().toLowerCase();

    if (session.current_step !== SUGGESTION_APPROVAL_STEP.CONFIRM) {
      return {
        message: waSection(
          'Workflow error',
          'This suggestion workflow step is not recognized.',
        ),
        cancelled: true,
      };
    }

    if (!data.suggestion_id) {
      return {
        message: waSection(
          'Workflow error',
          'Suggestion reference is missing. Please contact support.',
        ),
        cancelled: true,
      };
    }

    if (SUGGESTION_CONFIRM_YES.includes(input)) {
      try {
        await this.suggestionExecution.executeApprovedSuggestion({
          suggestionId: data.suggestion_id,
          factoryId: context.factoryId,
          userId: context.userId,
        });

        return {
          message: waSection(
            'Suggestion approved',
            'The suggested action has been applied by the backend.',
          ),
          completed: true,
          sessionData: data as Record<string, unknown>,
        };
      } catch (error: any) {
        return {
          message: waSection(
            'Could not apply suggestion',
            error?.message ?? 'Backend execution failed.',
          ),
          nextStep: session.current_step,
          sessionData: data as Record<string, unknown>,
        };
      }
    }

    if (SUGGESTION_CONFIRM_NO.includes(input)) {
      await this.suggestionExecution.rejectSuggestion(
        data.suggestion_id,
        context.factoryId,
        'Rejected via workflow',
      );

      return {
        message: waSection(
          'Suggestion rejected',
          'No changes were made to your inventory.',
        ),
        completed: true,
        sessionData: data as Record<string, unknown>,
      };
    }

    return {
      message: waSection(
        'Please confirm',
        `${data.summary ?? 'Please confirm this suggestion.'}\n\nReply *YES* or *NO*.`,
      ),
      nextStep: session.current_step,
      sessionData: data as Record<string, unknown>,
    };
  }
}
