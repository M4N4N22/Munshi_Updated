import {
  buildInventoryStockWarning,
  buildInsufficientStockCompletionMessage,
  sumPendingStockOutForItem,
} from './tasks.inventory-stock-warning.helper';
import { TASK_INVENTORY_MOVEMENT_TYPE } from './tasks.inventory.constants';

describe('tasks.inventory-stock-warning.helper', () => {
  const factoryId = 1;
  const itemId = 10;

  const inventoryItemModel = {
    findOne: jest.fn(),
  };

  const taskInventoryLineModel = {
    findAll: jest.fn(),
  };

  const taskModel = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns warning when requested qty exceeds on-hand stock', async () => {
    inventoryItemModel.findOne.mockResolvedValue({
      id: itemId,
      name: 'Cement',
      sku: 'CEMENT_50KG',
      current_quantity: '68',
    });
    taskInventoryLineModel.findAll.mockResolvedValue([]);

    const warning = await buildInventoryStockWarning(
      factoryId,
      [
        {
          inventory_item_id: itemId,
          quantity_expected: '100',
          movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
        },
      ],
      taskInventoryLineModel as any,
      taskModel as any,
      inventoryItemModel as any,
    );

    expect(warning).toContain('Low stock warning');
    expect(warning).toContain('available 68');
    expect(warning).toContain('kindly stock update karein');
  });

  it('returns warning when pending open tasks plus new qty exceed stock', async () => {
    inventoryItemModel.findOne.mockResolvedValue({
      id: itemId,
      name: 'Cement',
      sku: 'CEMENT_50KG',
      current_quantity: '68',
    });
    taskInventoryLineModel.findAll.mockResolvedValue([
      { quantity_expected: '50', task_id: 1, task: { id: 1, is_completed: false } },
    ]);

    const warning = await buildInventoryStockWarning(
      factoryId,
      [
        {
          inventory_item_id: itemId,
          quantity_expected: '30',
          movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
        },
      ],
      taskInventoryLineModel as any,
      taskModel as any,
      inventoryItemModel as any,
    );

    expect(warning).toContain('already on open delivery tasks');
    expect(warning).toContain('50');
  });

  it('returns null when stock is sufficient', async () => {
    inventoryItemModel.findOne.mockResolvedValue({
      id: itemId,
      name: 'Cement',
      sku: 'CEMENT_50KG',
      current_quantity: '100',
    });
    taskInventoryLineModel.findAll.mockResolvedValue([]);

    const warning = await buildInventoryStockWarning(
      factoryId,
      [
        {
          inventory_item_id: itemId,
          quantity_expected: '10',
          movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
        },
      ],
      taskInventoryLineModel as any,
      taskModel as any,
      inventoryItemModel as any,
    );

    expect(warning).toBeNull();
  });

  it('sums pending stock-out lines', async () => {
    taskInventoryLineModel.findAll.mockResolvedValue([
      { quantity_expected: '20' },
      { quantity_expected: '15.5' },
    ]);

    const total = await sumPendingStockOutForItem(
      factoryId,
      itemId,
      taskInventoryLineModel as any,
      taskModel as any,
    );

    expect(total).toBe(35.5);
  });

  it('enriches insufficient stock completion message with pending tasks', () => {
    const msg = buildInsufficientStockCompletionMessage(
      'Insufficient stock. Current: 18, requested change: -50',
      [
        { taskId: 42, quantity: '50' },
        { taskId: 43, quantity: '30' },
      ],
    );

    expect(msg).toContain('Task #42');
    expect(msg).toContain('stock update karein');
  });
});
