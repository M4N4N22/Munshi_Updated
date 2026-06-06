import { Injectable } from '@nestjs/common';
import { InventoryService } from 'src/services/inventory/inventory.service';
import { IPurchaseRequestPrefill } from './purchase-requests.interfaces';
import { computeLowStockSuggestedQuantity } from './purchase-request-prefill.helper';

/** Read-only prefill builder — no purchase request or inventory writes. */
@Injectable()
export class PurchaseRequestPrefillService {
  constructor(private readonly inventoryService: InventoryService) {}

  async buildLowStockPrefill(
    factoryId: number,
    inventoryItemId: number,
  ): Promise<IPurchaseRequestPrefill | null> {
    try {
      const item = await this.inventoryService.findItem(
        inventoryItemId,
        factoryId,
      );
      const currentQty = await this.inventoryService.getCurrentQuantity(
        inventoryItemId,
        factoryId,
      );
      const current = Number(currentQty);
      const threshold =
        item.reorder_threshold != null
          ? Number(item.reorder_threshold)
          : null;
      const suggested = computeLowStockSuggestedQuantity(current, threshold);

      return {
        inventory_item_id: inventoryItemId,
        item_name: item.name,
        sku: item.sku,
        title: `Restock ${item.name}`,
        suggested_quantity: suggested,
        unit: item.unit,
        current_quantity: currentQty,
        reorder_threshold: item.reorder_threshold ?? null,
      };
    } catch {
      return null;
    }
  }
}
