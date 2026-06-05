/** Ledger reference_type for task-driven inventory movements. */
export const TASK_INVENTORY_REFERENCE_TYPE = 'TASK' as const;

/** movement_type values stored on task_inventory_lines (p2 + inventory alignment). */
export const TASK_INVENTORY_MOVEMENT_TYPE = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  TRANSFER: 'TRANSFER',
} as const;

export type TaskInventoryMovementType =
  (typeof TASK_INVENTORY_MOVEMENT_TYPE)[keyof typeof TASK_INVENTORY_MOVEMENT_TYPE];
