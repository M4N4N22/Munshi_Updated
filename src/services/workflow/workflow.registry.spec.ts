import { WorkflowRegistry } from './workflow.registry';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WORKFLOW_START_COMMANDS, WORKFLOW_TYPE } from './workflow.constants';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;
  let vendorHandler: VendorOnboardingWorkflowHandler;

  beforeEach(() => {
    vendorHandler = {
      workflowType: WORKFLOW_TYPE.ONBOARD_VENDOR,
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_VENDOR,
      firstStep: 'VENDOR_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as VendorOnboardingWorkflowHandler;

    registry = new WorkflowRegistry(vendorHandler);
  });

  it('registers vendor onboarding handler by command', () => {
    const handler = registry.getHandlerByCommand('/onboard_vendor');
    expect(handler?.workflowType).toBe(WORKFLOW_TYPE.ONBOARD_VENDOR);
  });

  it('looks up handler by workflow type', () => {
    const handler = registry.getHandlerByType(WORKFLOW_TYPE.ONBOARD_VENDOR);
    expect(handler.startCommand).toBe('/onboard_vendor');
  });

  it('matches workflow start command in message', () => {
    expect(registry.matchWorkflowStartCommand('/onboard_vendor')).toBe(
      '/onboard_vendor',
    );
    expect(registry.matchWorkflowStartCommand('/onboard_vendor extra')).toBe(
      '/onboard_vendor',
    );
    expect(registry.matchWorkflowStartCommand('/present')).toBeNull();
  });

  it('lists registered start commands', () => {
    expect(registry.listStartCommands()).toContain('/onboard_vendor');
  });
});
