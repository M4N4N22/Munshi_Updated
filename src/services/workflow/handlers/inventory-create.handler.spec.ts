import { InventoryCreateWorkflowHandler } from './inventory-create.handler';
import { InventoryService } from 'src/services/inventory/inventory.service';
import {
  INVENTORY_CREATE_STEP,
  WORKFLOW_TYPE,
} from '../workflow.constants';
import { IWorkflowSessionRecord, WorkflowUserContext } from '../workflow.interfaces';

describe('InventoryCreateWorkflowHandler', () => {
  let handler: InventoryCreateWorkflowHandler;
  let inventoryService: jest.Mocked<InventoryService>;

  const context: WorkflowUserContext = {
    userId: 1,
    factoryId: 10,
    role: 'OWNER',
    phone: '919999999999',
  };

  const session = (
    step: string,
    data: Record<string, unknown> = {},
  ): IWorkflowSessionRecord => ({
    id: 1,
    factory_id: 10,
    phone_number: '919999999999',
    workflow_type: WORKFLOW_TYPE.INVENTORY_CREATE,
    current_step: step,
    session_data: data,
    status: 'ACTIVE',
  });

  beforeEach(() => {
    inventoryService = {
      listCategories: jest
        .fn()
        .mockResolvedValue([{ id: 2, name: 'Raw Material', is_active: true }]),
      listLocations: jest
        .fn()
        .mockResolvedValue([{ id: 3, name: 'Warehouse A', is_active: true }]),
      createItem: jest.fn().mockResolvedValue({
        id: 10,
        name: 'Cement',
        sku: 'CEM001',
        unit: 'bags',
        current_quantity: '0.0000',
        reorder_threshold: '50.0000',
      }),
    } as unknown as jest.Mocked<InventoryService>;

    handler = new InventoryCreateWorkflowHandler(inventoryService);
  });

  it('happy path creates inventory item', async () => {
    const name = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_NAME),
      'Cement',
      context,
    );
    const sku = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_SKU, name.sessionData!),
      'CEM001',
      context,
    );
    const cat = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_CATEGORY, sku.sessionData!),
      'Raw Material',
      context,
    );
    const loc = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_LOCATION, cat.sessionData!),
      'Warehouse A',
      context,
    );
    const unit = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_UNIT, loc.sessionData!),
      'bags',
      context,
    );
    const done = await handler.handleStep(
      session(INVENTORY_CREATE_STEP.ITEM_REORDER_THRESHOLD, unit.sessionData!),
      '50',
      context,
    );

    expect(done.completed).toBe(true);
    expect(inventoryService.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        factory_id: 10,
        sku: 'CEM001',
        name: 'Cement',
      }),
    );
  });
});
