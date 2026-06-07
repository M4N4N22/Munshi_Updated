import { WorkflowRegistry } from './workflow.registry';
import { VendorOnboardingWorkflowHandler } from './handlers/vendor-onboarding.handler';
import { WorkerOnboardingWorkflowHandler } from './handlers/worker-onboarding.handler';
import { InventoryCreateWorkflowHandler } from './handlers/inventory-create.handler';
import { PurchaseRequestCreateWorkflowHandler } from './handlers/purchase-request-create.handler';
import { BusinessDiscoveryWorkflowHandler } from './handlers/business-discovery.handler';
import { AssignClarifyWorkflowHandler } from './handlers/assign-clarify.handler';
import { TaskInventoryCreationWorkflowHandler } from './handlers/task-inventory-creation.handler';
import { SuggestionApprovalWorkflowHandler } from './handlers/suggestion-approval.handler';
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

    const suggestionHandler = {
      workflowType: WORKFLOW_TYPE.SUGGESTION_APPROVAL,
      startCommand: WORKFLOW_START_COMMANDS.SUGGESTION_APPROVAL,
      firstStep: 'CONFIRM',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as SuggestionApprovalWorkflowHandler;

    const purchaseRequestHandler = {
      workflowType: WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE,
      startCommand: WORKFLOW_START_COMMANDS.PURCHASE_REQUEST_CREATE,
      firstStep: 'REQUEST_CREATION',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as PurchaseRequestCreateWorkflowHandler;

    const businessDiscoveryHandler = {
      workflowType: WORKFLOW_TYPE.BUSINESS_DISCOVERY,
      startCommand: WORKFLOW_START_COMMANDS.BUSINESS_DISCOVERY,
      firstStep: 'MENU',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as BusinessDiscoveryWorkflowHandler;

    const assignClarifyHandler = {
      workflowType: WORKFLOW_TYPE.ASSIGN_CLARIFY,
      startCommand: WORKFLOW_START_COMMANDS.ASSIGN_CLARIFY,
      firstStep: 'ASSIGNEE',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as AssignClarifyWorkflowHandler;

    const taskInventoryCreationHandler = {
      workflowType: WORKFLOW_TYPE.TASK_INVENTORY_CREATION,
      startCommand: WORKFLOW_START_COMMANDS.TASK_INVENTORY_CREATION,
      firstStep: 'STARTED',
      getInitialPrompt: () => 'prompt',
      handleStep: jest.fn(),
    } as unknown as TaskInventoryCreationWorkflowHandler;

    registry = new WorkflowRegistry(
      vendorHandler,
      workerHandler,
      inventoryHandler,
      suggestionHandler,
      purchaseRequestHandler,
      businessDiscoveryHandler,
      assignClarifyHandler,
      taskInventoryCreationHandler,
    );
  });

  it('registers all workflow commands', () => {
    expect(registry.getHandlerByCommand('/onboard_vendor')?.workflowType).toBe(
      WORKFLOW_TYPE.ONBOARD_VENDOR,
    );
    expect(registry.getHandlerByCommand('/onboard_worker')?.workflowType).toBe(
      WORKFLOW_TYPE.ONBOARD_WORKER,
    );
    expect(registry.getHandlerByCommand('/inventory_create')?.workflowType).toBe(
      WORKFLOW_TYPE.INVENTORY_CREATE,
    );
    expect(registry.getHandlerByCommand('/suggestion_approve')?.workflowType).toBe(
      WORKFLOW_TYPE.SUGGESTION_APPROVAL,
    );
    expect(
      registry.getHandlerByCommand('/purchase_request_create')?.workflowType,
    ).toBe(WORKFLOW_TYPE.PURCHASE_REQUEST_CREATE);
    expect(
      registry.getHandlerByCommand('/business_discovery')?.workflowType,
    ).toBe(WORKFLOW_TYPE.BUSINESS_DISCOVERY);
    expect(
      registry.getHandlerByCommand('/continue_discovery')?.workflowType,
    ).toBe(WORKFLOW_TYPE.BUSINESS_DISCOVERY);
    expect(registry.getHandlerByCommand('/assign_clarify')?.workflowType).toBe(
      WORKFLOW_TYPE.ASSIGN_CLARIFY,
    );
    expect(registry.getHandlerByCommand('/task_inventory_nl')?.workflowType).toBe(
      WORKFLOW_TYPE.TASK_INVENTORY_CREATION,
    );
  });

  it('lists registered start commands including discovery aliases', () => {
    expect(registry.listStartCommands()).toHaveLength(9);
  });
});
