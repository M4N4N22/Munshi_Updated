import { BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service';
import { TaskInventoryLine } from './tasks.schema';
import {
  TASK_INVENTORY_MOVEMENT_TYPE,
  TASK_INVENTORY_REFERENCE_TYPE,
} from './tasks.inventory.constants';

/** Ledger row created during task completion — used for post-commit stock push events. */
export interface TaskInventoryMovementCaptured {
  inventory_transaction_id: number;
  transaction_type: string;
}

export interface ExecuteTaskInventoryMovementsParams {
  taskInventoryLineModel: typeof TaskInventoryLine;
  inventoryTransactionService: InventoryTransactionService;
  taskId: number;
  factoryId: number;
  completedByUserId: number;
  /** When set, all line movements participate in this outer transaction (atomic multi-line). */
  transaction?: Transaction;
}

/**
 * Executes inventory ledger writes for all lines on a task being completed.
 * Call only when transitioning is_completed false → true.
 * No-op when the task has no inventory lines.
 *
 * When `transaction` is provided, every movement uses that Sequelize transaction
 * so all lines commit or roll back together with the caller's task update.
 */
export async function executeTaskInventoryMovements(
  params: ExecuteTaskInventoryMovementsParams,
): Promise<TaskInventoryMovementCaptured[]> {
  const lines = await params.taskInventoryLineModel.findAll({
    where: { task_id: params.taskId },
    order: [['id', 'ASC']],
    ...(params.transaction ? { transaction: params.transaction } : {}),
  });

  if (!lines.length) return [];

  const captured: TaskInventoryMovementCaptured[] = [];

  for (const line of lines) {
    const movementType = String(line.movement_type).trim().toUpperCase();

    if (movementType === TASK_INVENTORY_MOVEMENT_TYPE.TRANSFER) {
      throw new BadRequestException(
        `Task #${params.taskId} has a TRANSFER inventory line (line #${line.id}). ` +
          'TRANSFER is not supported for task completion.',
      );
    }

    const movementInput = {
      factory_id: params.factoryId,
      inventory_item_id: line.inventory_item_id,
      quantity: String(line.quantity_expected),
      reference_type: TASK_INVENTORY_REFERENCE_TYPE,
      reference_id: params.taskId,
      created_by: params.completedByUserId,
    };

    if (movementType === TASK_INVENTORY_MOVEMENT_TYPE.STOCK_OUT) {
      const record = await params.inventoryTransactionService.recordStockOut(
        movementInput,
        params.transaction,
      );
      captured.push({
        inventory_transaction_id: record.id,
        transaction_type: record.transaction_type,
      });
    } else if (movementType === TASK_INVENTORY_MOVEMENT_TYPE.STOCK_IN) {
      const record = await params.inventoryTransactionService.recordStockIn(
        movementInput,
        params.transaction,
      );
      captured.push({
        inventory_transaction_id: record.id,
        transaction_type: record.transaction_type,
      });
    } else {
      throw new BadRequestException(
        `Task #${params.taskId} has unsupported movement_type "${line.movement_type}" ` +
          `on inventory line #${line.id}. Supported: STOCK_IN, STOCK_OUT.`,
      );
    }
  }

  return captured;
}
