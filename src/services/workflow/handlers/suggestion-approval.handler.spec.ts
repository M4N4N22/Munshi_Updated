import { SuggestionApprovalWorkflowHandler } from './suggestion-approval.handler';
import { SuggestionExecutionService } from 'src/services/documents/suggestion-execution.service';
import { SuggestionWorkflowTriggerService } from 'src/services/documents/suggestion-workflow-trigger.service';
import {
  SUGGESTION_APPROVAL_STEP,
  WORKFLOW_TYPE,
} from '../workflow.constants';

describe('SuggestionApprovalWorkflowHandler', () => {
  let handler: SuggestionApprovalWorkflowHandler;
  let execution: jest.Mocked<SuggestionExecutionService>;
  let workflowTrigger: jest.Mocked<SuggestionWorkflowTriggerService>;

  beforeEach(() => {
    execution = {
      executeApprovedSuggestion: jest.fn().mockResolvedValue({ id: 1 }),
      rejectSuggestion: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as jest.Mocked<SuggestionExecutionService>;

    workflowTrigger = {
      onSuggestionResolved: jest.fn().mockResolvedValue({ completed: false }),
    } as unknown as jest.Mocked<SuggestionWorkflowTriggerService>;

    handler = new SuggestionApprovalWorkflowHandler(execution, workflowTrigger);
  });

  it('registers SUGGESTION_APPROVAL workflow type', () => {
    expect(handler.workflowType).toBe(WORKFLOW_TYPE.SUGGESTION_APPROVAL);
    expect(handler.firstStep).toBe(SUGGESTION_APPROVAL_STEP.CONFIRM);
  });

  it('executes backend action on YES', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: '919876543210',
        workflow_type: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
        current_step: SUGGESTION_APPROVAL_STEP.CONFIRM,
        session_data: { suggestion_id: 7, document_id: 3, summary: 'Confirm?' },
        status: 'ACTIVE',
      },
      'yes',
      { userId: 1, factoryId: 1, role: 'OWNER', phone: '919876543210' },
    );

    expect(execution.executeApprovedSuggestion).toHaveBeenCalledWith({
      suggestionId: 7,
      factoryId: 1,
      userId: 1,
    });
    expect(result.completed).toBe(true);
    expect(workflowTrigger.onSuggestionResolved).toHaveBeenCalledWith(
      3,
      1,
      '919876543210',
    );
  });

  it('rejects suggestion on NO', async () => {
    const result = await handler.handleStep(
      {
        id: 1,
        factory_id: 1,
        phone_number: '919876543210',
        workflow_type: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
        current_step: SUGGESTION_APPROVAL_STEP.CONFIRM,
        session_data: { suggestion_id: 7 },
        status: 'ACTIVE',
      },
      'no',
      { userId: 1, factoryId: 1, role: 'OWNER', phone: '919876543210' },
    );

    expect(execution.rejectSuggestion).toHaveBeenCalledWith(
      7,
      1,
      'Rejected via workflow',
    );
    expect(result.completed).toBe(true);
  });
});
