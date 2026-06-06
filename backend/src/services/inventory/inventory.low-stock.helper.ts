import { INVENTORY_TRANSACTION_TYPE } from './inventory.constants';
import { formatQuantity } from './inventory.validation';

/** Mirrors InventoryService.isLowStock — shared for threshold-cross detection. */
export function isItemLowStock(
  currentQuantity: number | string,
  reorderThreshold: string | null | undefined,
): boolean {
  if (reorderThreshold == null || reorderThreshold === '') {
    return false;
  }
  return Number(currentQuantity) < Number(reorderThreshold);
}

/**
 * True when a STOCK_OUT moves quantity from not-low to low (threshold cross only).
 */
export function didCrossLowStockThreshold(params: {
  transactionType: string;
  previousQuantity: number;
  nextQuantity: number;
  reorderThreshold: string | null | undefined;
}): boolean {
  if (params.transactionType !== INVENTORY_TRANSACTION_TYPE.STOCK_OUT) {
    return false;
  }
  if (!isItemLowStock(params.nextQuantity, params.reorderThreshold)) {
    return false;
  }
  if (isItemLowStock(params.previousQuantity, params.reorderThreshold)) {
    return false;
  }
  return true;
}

export type InventoryLowStockEventPayload = {
  factory_id: number;
  inventory_item_id: number;
  sku: string;
  item_name: string;
  current_quantity: string;
  reorder_threshold: string;
  previous_quantity: string;
  reference_type: string | null;
  reference_id: number | null;
};

export function buildInventoryLowStockEventPayload(params: {
  factoryId: number;
  inventoryItemId: number;
  sku: string;
  itemName: string;
  currentQuantity: number;
  previousQuantity: number;
  reorderThreshold: string;
  referenceType?: string | null;
  referenceId?: number | null;
}): InventoryLowStockEventPayload {
  return {
    factory_id: params.factoryId,
    inventory_item_id: params.inventoryItemId,
    sku: params.sku,
    item_name: params.itemName,
    current_quantity: formatQuantity(params.currentQuantity),
    reorder_threshold: formatQuantity(Number(params.reorderThreshold)),
    previous_quantity: formatQuantity(params.previousQuantity),
    reference_type: params.referenceType ?? null,
    reference_id: params.referenceId ?? null,
  };
}
