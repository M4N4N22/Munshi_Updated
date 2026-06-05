import { TaskInventoryLine } from './tasks.schema';
import { InventoryItem } from '../inventory/inventory.schema';
import {
  formatQuantity,
  roundQuantity,
} from '../inventory/inventory.validation';
import { TASK_INVENTORY_MOVEMENT_TYPE } from './tasks.inventory.constants';

export type TaskInventoryNotifyLine = {
  itemName: string;
  unit: string;
  movementType: string;
  quantityMoved: string;
  previousQty: string;
  currentQty: string;
};

/**
 * Builds per-line stock summaries for owner notification after task completion.
 * Reads post-movement item quantities and derives previous qty from movement type.
 */
export async function loadInventoryCompletionNotifyLines(
  taskId: number,
  factoryId: number,
  taskInventoryLineModel: typeof TaskInventoryLine,
  inventoryItemModel: typeof InventoryItem,
): Promise<TaskInventoryNotifyLine[]> {
  const lines = await taskInventoryLineModel.findAll({
    where: { task_id: taskId, factory_id: factoryId },
    order: [['id', 'ASC']],
    include: [
      {
        model: inventoryItemModel,
        as: 'inventory_item',
        attributes: ['id', 'name', 'unit', 'current_quantity'],
        required: true,
      },
    ],
  });

  const result: TaskInventoryNotifyLine[] = [];

  for (const line of lines) {
    const item = (line as any).inventory_item as InventoryItem | undefined;
    if (!item) continue;

    const moved = Number(line.quantity_expected);
    const current = Number(item.current_quantity ?? 0);
    const movementType = String(line.movement_type).trim().toUpperCase();

    let previous = current;
    if (movementType === TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT) {
      previous = roundQuantity(current + moved);
    } else if (movementType === TASK_INVENTORY_MOVEMENT_TYPE.STOCK_IN) {
      previous = roundQuantity(current - moved);
    }

    result.push({
      itemName: item.name,
      unit: item.unit,
      movementType,
      quantityMoved: formatQuantity(moved),
      previousQty: formatQuantity(previous),
      currentQty: formatQuantity(current),
    });
  }

  return result;
}
