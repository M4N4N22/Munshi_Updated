import { SuggestionWorkflowTriggerService } from './suggestion-workflow-trigger.service';
import { DocumentRepository } from './documents.repository';
import { SuggestionQueueService } from './suggestion-queue.service';
import { WorkflowSessionService } from 'src/services/workflow/workflow-session.service';
import { UserService } from 'src/services/users/users.service';
import { MessagingService } from 'src/core/messaging/messaging.service';
import { SUGGESTION_STATUS } from './documents.constants';
import {
  SUGGESTION_APPROVAL_STEP,
  WORKFLOW_TYPE,
} from 'src/services/workflow/workflow.constants';

describe('SuggestionWorkflowTriggerService', () => {
  let service: SuggestionWorkflowTriggerService;
  let repository: jest.Mocked<DocumentRepository>;
  let queueService: jest.Mocked<SuggestionQueueService>;
  let workflowSessionService: jest.Mocked<WorkflowSessionService>;
  let userService: jest.Mocked<UserService>;
  let messagingService: jest.Mocked<MessagingService>;

  beforeEach(() => {
    repository = {
      findDocumentById: jest.fn().mockResolvedValue({
        id: 1,
        factory_id: 1,
        uploaded_by: 42,
      }),
      findSuggestionById: jest.fn().mockResolvedValue({
        id: 7,
        status: SUGGESTION_STATUS.PENDING,
        payload: { summary: 'Approve import?' },
      }),
      updateSuggestion: jest.fn(),
      updateDocument: jest.fn(),
    } as unknown as jest.Mocked<DocumentRepository>;

    queueService = {
      getCurrentSuggestionId: jest.fn().mockResolvedValue(7),
      advanceQueue: jest.fn(),
    } as unknown as jest.Mocked<SuggestionQueueService>;

    workflowSessionService = {
      getActiveSession: jest.fn().mockResolvedValue(null),
      createSession: jest.fn().mockResolvedValue({ id: 100 }),
    } as unknown as jest.Mocked<WorkflowSessionService>;

    userService = {
      findOne: jest.fn().mockResolvedValue({ phone_number: '919876543210' }),
    } as unknown as jest.Mocked<UserService>;

    messagingService = {
      sendText: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessagingService>;

    service = new SuggestionWorkflowTriggerService(
      repository,
      queueService,
      workflowSessionService,
      userService,
      messagingService,
    );
  });

  it('auto-starts workflow for first queued suggestion', async () => {
    const result = await service.startQueueForDocument(1, 1);

    expect(result.started).toBe(true);
    expect(workflowSessionService.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_type: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
        current_step: SUGGESTION_APPROVAL_STEP.CONFIRM,
      }),
    );
    expect(messagingService.sendText).toHaveBeenCalled();
  });
});
