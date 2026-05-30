import { WorkflowRegistry } from './workflow.registry';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import { InventoryCreateWorkflowHandler } from './handlers/inventory-create.handler';
import {
  WORKFLOW_START_COMMANDS,
  WORKFLOW_TYPE,
} from './workflow.constants';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;

  beforeEach(() => {
    const vendorHandler = {
      workflowType: WORKFLOW_TYPE.ONBOARD_VENDOR,
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_VENDOR,
      firstStep: 'VENDOR_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as VendorOnboardingWorkflowHandler;

    const workerHandler = {
      workflowType: WORKFLOW_TYPE.ONBOARD_WORKER,
      startCommand: WORKFLOW_START_COMMANDS.ONBOARD_WORKER,
      firstStep: 'WORKER_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as WorkerOnboardingWorkflowHandler;

    const inventoryHandler = {
      workflowType: WORKFLOW_TYPE.INVENTORY_CREATE,
      startCommand: WORKFLOW_START_COMMANDS.INVENTORY_CREATE,
      firstStep: 'ITEM_NAME',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as InventoryCreateWorkflowHandler;

    registry = new WorkflowRegistry(
      vendorHandler,
      workerHandler,
      inventoryHandler,
    );
  });

  it('registers all three workflow commands', () => {
    expect(registry.getHandlerByCommand('/onboard_vendor')?.workflowType).toBe(
      WORKFLOW_TYPE.ONBOARD_VENDOR,
    );
    expect(registry.getHandlerByCommand('/onboard_worker')?.workflowType).toBe(
      WORKFLOW_TYPE.ONBOARD_WORKER,
    );
    expect(registry.getHandlerByCommand('/inventory_create')?.workflowType).toBe(
      WORKFLOW_TYPE.INVENTORY_CREATE,
    );
  });

  it('lists three start commands', () => {
    expect(registry.listStartCommands()).toHaveLength(3);
  });
});
