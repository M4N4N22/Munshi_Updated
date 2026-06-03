import { WorkflowRouterService } from './workflow-engine.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowRegistry } from './workflow.registry';
import { WorkflowSessionService } from './workflow-session.service';
import { UserService } from 'src/services/users/users.service';
import { WORKFLOW_START_COMMANDS } from './workflow.constants';

describe('WorkflowRouterService routing', () => {
  let router: WorkflowRouterService;
  let sessionService: jest.Mocked<WorkflowSessionService>;
  let engine: jest.Mocked<WorkflowEngineService>;
  let registry: jest.Mocked<WorkflowRegistry>;
  let usersService: jest.Mocked<UserService>;

  const user = {
    id: 1,
    name: 'Owner',
    factory_links: { factory_id: 10, role: 'OWNER' },
  };

  beforeEach(() => {
    sessionService = {
      getActiveSession: jest.fn(),
      resolveActiveSession: jest.fn(),
      cancelSession: jest.fn(),
    } as unknown as jest.Mocked<WorkflowSessionService>;

    engine = {
      startWorkflow: jest.fn().mockResolvedValue('What is the vendor name?'),
      handleActiveSessionMessage: jest
        .fn()
        .mockResolvedValue('What is the vendor phone number?'),
    } as unknown as jest.Mocked<WorkflowEngineService>;

    registry = {
      matchWorkflowStartCommand: jest.fn(),
      getHandlerByCommand: jest.fn(),
      startWorkflowFromMlCommand: jest.fn(),
    } as unknown as jest.Mocked<WorkflowRegistry>;

    usersService = {
      findByPhone: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UserService>;

    router = new WorkflowRouterService(
      engine,
      registry as unknown as WorkflowRegistry,
      sessionService,
      usersService,
    );
  });

  it('detects active workflow session', async () => {
    sessionService.resolveActiveSession.mockResolvedValue({
      session: {
        id: 1,
        factory_id: 10,
        phone_number: '919999999999',
        workflow_type: 'ONBOARD_VENDOR',
        current_step: 'VENDOR_NAME',
        session_data: {},
        status: 'ACTIVE',
      },
      expiredJustNow: false,
    });

    expect(await router.hasActiveSession('919999999999')).toBe(true);
  });

  it('routes active workflow message to engine', async () => {
    const msg = await router.handleActiveWorkflowMessage(
      '919999999999',
      'ABC Steel',
    );
    expect(engine.handleActiveSessionMessage).toHaveBeenCalled();
    expect(msg).toContain('phone number');
  });

  it('starts workflow from direct slash command', async () => {
    registry.getHandlerByCommand.mockReturnValue({
      workflowType: 'ONBOARD_VENDOR',
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_VENDOR,
      firstStep: 'VENDOR_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    });

    const msg = await router.startWorkflowFromCommand(
      '919999999999',
      WORKFLOW_START_COMMANDS.ONBOARD_VENDOR,
    );

    expect(engine.startWorkflow).toHaveBeenCalled();
    expect(msg).toContain('vendor name');
  });

  it('returns null from ML command when not a workflow command', async () => {
    registry.getHandlerByCommand.mockReturnValue(undefined);
    const result = await router.startWorkflowFromMlCommand(
      '919999999999',
      '/present',
    );
    expect(result).toBeNull();
  });
});
