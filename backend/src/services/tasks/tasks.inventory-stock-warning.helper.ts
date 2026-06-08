import { Op } from 'sequelize';
import { Task, TaskInventoryLine } from './tasks.schema';
import { InventoryItem } from '../inventory/inventory.schema';
import {
  formatQuantity,
  roundQuantity,
} from '../inventory/inventory.validation';
import { TASK_INVENTORY_MOVEMENT_TYPE } from './tasks.inventory.constants';

export type StockWarningLineInput = {
  inventory_item_id: number;
  quantity_expected: string;
  movement_type: string;
};

export type PendingDeliveryTaskSummary = {
  taskId: number;
  quantity: string;
};

/**
 * Sum STOCK_OUT quantities on open tasks for an item (soft reservation for warnings).
 */
export async function sumPendingStockOutForItem(
  factoryId: number,
  inventoryItemId: number,
  taskInventoryLineModel: typeof TaskInventoryLine,
  taskModel: typeof Task,
): Promise<number> {
  const lines = await taskInventoryLineModel.findAll({
    attributes: ['quantity_expected', 'task_id'],
    where: {
      factory_id: factoryId,
      inventory_item_id: inventoryItemId,
      movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
    },
    include: [
      {
        model: taskModel,
        as: 'task',
        attributes: ['id', 'is_completed'],
        required: true,
        where: { factory_id: factoryId, is_completed: false },
      },
    ],
  });

  let total = 0;
  for (const line of lines) {
    total += Number(line.quantity_expected ?? 0);
  }
  return roundQuantity(total);
}

export async function listPendingDeliveryTasksForItem(
  factoryId: number,
  inventoryItemId: number,
  taskInventoryLineModel: typeof TaskInventoryLine,
  taskModel: typeof Task,
  excludeTaskId?: number,
): Promise<PendingDeliveryTaskSummary[]> {
  const lines = await taskInventoryLineModel.findAll({
    attributes: ['quantity_expected', 'task_id'],
    where: {
      factory_id: factoryId,
      inventory_item_id: inventoryItemId,
      movement_type: TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT,
      ...(excludeTaskId != null ? { task_id: { [Op.ne]: excludeTaskId } } : {}),
    },
    include: [
      {
        model: taskModel,
        as: 'task',
        attributes: ['id', 'is_completed'],
        required: true,
        where: { factory_id: factoryId, is_completed: false },
      },
    ],
    order: [['task_id', 'ASC']],
  });

  return lines.map((line) => ({
    taskId: line.task_id,
    quantity: formatQuantity(Number(line.quantity_expected ?? 0)),
  }));
}

/**
 * Builds a non-blocking warning when delivery/issue qty exceeds on-hand stock
 * or open delivery tasks already account for most of the stock.
 */
export async function buildInventoryStockWarning(
  factoryId: number,
  lines: StockWarningLineInput[],
  taskInventoryLineModel: typeof TaskInventoryLine,
  taskModel: typeof Task,
  inventoryItemModel: typeof InventoryItem,
): Promise<string | null> {
  const warnings: string[] = [];

  for (const line of lines) {
    const movementType = String(line.movement_type).trim().toUpperCase();
    if (movementType !== TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT) continue;

    const requested = Number(line.quantity_expected);
    if (!Number.isFinite(requested) || requested <= 0) continue;

    const item = await inventoryItemModel.findOne({
      where: { id: line.inventory_item_id, factory_id: factoryId },
      attributes: ['id', 'name', 'sku', 'current_quantity'],
    });
    if (!item) continue;

    const onHand = Number(item.current_quantity ?? 0);
    const pendingOut = await sumPendingStockOutForItem(
      factoryId,
      item.id,
      taskInventoryLineModel,
      taskModel,
    );
    const totalNeeded = roundQuantity(pendingOut + requested);

    if (totalNeeded > onHand || requested > onHand) {
      const label = item.sku ? `${item.name} (${item.sku})` : item.name;
      warnings.push(
        `*${label}*: available ${formatQuantity(onHand)}, ` +
          `this task ${formatQuantity(requested)}` +
          (pendingOut > 0
            ? `, ${formatQuantity(pendingOut)} already on open delivery tasks`
            : '') +
          `. Stock kam hai — kindly stock update karein.`,
      );
    }
  }

  if (!warnings.length) return null;
  return `⚠️ *Low stock warning*\n${warnings.join('\n')}`;
}

export function buildInsufficientStockCompletionMessage(
  baseMessage: string,
  pendingTasks: PendingDeliveryTaskSummary[],
): string {
  if (!pendingTasks.length) return baseMessage;

  const taskList = pendingTasks
    .map((t) => `Task #${t.taskId} (${t.quantity})`)
    .join(', ');

  return (
    `${baseMessage}\n\n` +
    `Other open delivery tasks for this item: ${taskList}.\n` +
    `Pehle stock update karein, ya pending tasks complete karein jab stock available ho.`
  );
}
