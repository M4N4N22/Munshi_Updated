import { WorkflowRegistry } from './workflow.registry';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import {
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from './workflow.constants';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;
  let vendorHandler: VendorOnboardingWorkflowHandler;
  let workerHandler: WorkerOnboardingWorkflowHandler;

  beforeEach(() => {
    vendorHandler = {
      workflowType: WORKFLOW_TYPE.ONBOARD_VENDOR,
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_VENDOR,
      firstStep: 'VENDOR_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as VendorOnboardingWorkflowHandler;

    workerHandler = {
      workflowType: WORKFLOW_TYPE.ONBOARD_WORKER,
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_WORKER,
      firstStep: 'WORKER_NAME',
      getInitialPrompt: () => 'worker prompt',
      handleStep: jest.fn(),
    } as unknown as WorkerOnboardingWorkflowHandler;

    registry = new WorkflowRegistry(vendorHandler, workerHandler);
  });

  it('registers vendor onboarding handler by command', () => {
    const handler = registry.getHandlerByCommand('/onboard_vendor');
    expect(handler?.workflowType).toBe(WORKFLOW_TYPE.ONBOARD_VENDOR);
  });

  it('registers worker onboarding handler by command', () => {
    const handler = registry.getHandlerByCommand('/onboard_worker');
    expect(handler?.workflowType).toBe(WORKFLOW_TYPE.ONBOARD_WORKER);
  });

  it('looks up handler by workflow type', () => {
    const vendor = registry.getHandlerByType(WORKFLOW_TYPE.ONBOARD_VENDOR);
    const worker = registry.getHandlerByType(WORKFLOW_TYPE.ONBOARD_WORKER);
    expect(vendor.startCommand).toBe('/onboard_vendor');
    expect(worker.startCommand).toBe('/onboard_worker');
  });

  it('matches workflow start command in message', () => {
    expect(registry.matchWorkflowStartCommand('/onboard_vendor')).toBe(
      '/onboard_vendor',
    );
    expect(registry.matchWorkflowStartCommand('/onboard_worker')).toBe(
      '/onboard_worker',
    );
    expect(registry.matchWorkflowStartCommand('/present')).toBeNull();
  });

  it('lists registered start commands', () => {
    const commands = registry.listStartCommands();
    expect(commands).toContain('/onboard_vendor');
    expect(commands).toContain('/onboard_worker');
  });
});
