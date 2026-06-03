import { WorkflowRouterService } from './workflow-engine.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowRegistry } from './workflow.registry';
import { WorkflowSessionService } from './workflow-session.service';
import { UserService } from 'src/services/users/users.service';
import {
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
  WORKER_ONBOARDING_STEP,
} from './workflow.constants';

describe('Workflow hardening — cancel, expiry, recovery', () => {
  let router: WorkflowRouterService;
  let sessionService: jest.Mocked<WorkflowSessionService>;
  let engine: jest.Mocked<WorkflowEngineService>;
  let usersService: jest.Mocked<UserService>;

  const user = {
    id: 1,
    name: 'Owner',
    factory_links: { factory_id: 10, role: 'OWNER' },
  };

  const activeSession = {
    id: 5,
    factory_id: 10,
    phone_number: '919999999999',
    workflow_type: WORKFLOW_TYPE.ONBOARD_WORKER,
    current_step: WORKER_ONBOARDING_STEP.WORKER_NAME,
    session_data: {},
    status: 'ACTIVE' as const,
    created_at: new Date(),
  };

  beforeEach(() => {
    sessionService = {
      resolveActiveSession: jest.fn(),
      cancelSession: jest.fn(),
      expireSession: jest.fn(),
    } as unknown as jest.Mocked<WorkflowSessionService>;

    engine = {
      startWorkflow: jest.fn().mockResolvedValue('What is the worker name?'),
      handleActiveSessionMessage: jest
        .fn()
        .mockResolvedValue('What is the worker phone number?'),
      buildExpiredSessionMessage: jest
        .fn()
        .mockReturnValue('Workflow expired message'),
    } as unknown as jest.Mocked<WorkflowEngineService>;

    usersService = {
      findByPhone: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UserService>;

    router = new WorkflowRouterService(
      engine,
      {} as WorkflowRegistry,
      sessionService,
      usersService,
    );
  });

  it('cancels active workflow', async () => {
    sessionService.resolveActiveSession.mockResolvedValue({
      session: activeSession,
      expiredJustNow: false,
    });

    const msg = await router.cancelWorkflow('919999999999');

    expect(sessionService.cancelSession).toHaveBeenCalledWith(5);
    expect(msg).toContain('cancelled');
  });

  it('returns helpful message when no active workflow to cancel', async () => {
    sessionService.resolveActiveSession.mockResolvedValue({
      session: null,
      expiredJustNow: false,
    });

    const msg = await router.cancelWorkflow('919999999999');
    expect(msg).toContain('No active workflow');
  });

  it('returns expired message when cancelling stale session', async () => {
    sessionService.resolveActiveSession.mockResolvedValue({
      session: null,
      expiredJustNow: true,
    });

    const msg = await router.cancelWorkflow('919999999999');
    expect(msg).toContain('expired');
  });

  it('detects /cancel command', () => {
    expect(router.isCancelCommand('/cancel')).toBe(true);
    expect(router.isCancelCommand('/present')).toBe(false);
  });

  it('routes /cancel during active workflow without calling step handler', async () => {
    sessionService.resolveActiveSession.mockResolvedValue({
      session: activeSession,
      expiredJustNow: false,
    });

    const msg = await router.handleActiveWorkflowMessage(
      '919999999999',
      '/cancel',
    );

    expect(sessionService.cancelSession).toHaveBeenCalledWith(5);
    expect(engine.handleActiveSessionMessage).not.toHaveBeenCalled();
    expect(msg).toContain('cancelled');
  });

  it('starts worker onboarding from slash command', async () => {
    const registry = {
      getHandlerByCommand: jest.fn().mockReturnValue({
        workflowType: WORKFLOW_TYPE.ONBOARD_WORKER,
        startCommand: WORKFLOW_START_COMMANDS.ONBOARD_WORKER,
        firstStep: WORKER_ONBOARDING_STEP.WORKER_NAME,
        getInitialPrompt: () => 'prompt',
        handleStep: jest.fn(),
      }),
    } as unknown as WorkflowRegistry;

    router = new WorkflowRouterService(
      engine,
      registry,
      sessionService,
      usersService,
    );

    const msg = await router.startWorkflowFromCommand(
      '919999999999',
      WORKFLOW_START_COMMANDS.ONBOARD_WORKER,
    );

    expect(engine.startWorkflow).toHaveBeenCalled();
    expect(msg).toContain('worker name');
  });
});
