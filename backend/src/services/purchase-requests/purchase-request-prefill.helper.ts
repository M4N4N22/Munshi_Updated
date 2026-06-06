import { waSection } from 'src/modules/whatsapp/whatsapp.templates';
import { IPurchaseRequestPrefill } from './purchase-requests.interfaces';
import { IPurchaseRequestCreateSessionData } from '../workflow/workflow.interfaces';

/** Parse inventory item id from a purchase-request workflow command message. */
export function parsePurchaseRequestItemIdFromCommand(
  message: string,
): number | null {
  const trimmed = message.trim();
  const match = trimmed.match(/(?:\?|&|\s)(?:itemId|item_id)=(\d+)/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Build slash command with optional low-stock item context. */
export function buildPurchaseRequestCreateCommand(
  inventoryItemId?: number,
): string {
  if (inventoryItemId != null && inventoryItemId > 0) {
    return `/purchase_request_create?itemId=${inventoryItemId}`;
  }
  return '/purchase_request_create';
}

/** Same formula as PurchaseRequestSuggestionService.generateLowStockSuggestions. */
export function computeLowStockSuggestedQuantity(
  currentQuantity: number,
  reorderThreshold: number | null,
): string {
  const threshold = Number(reorderThreshold ?? 0);
  const current = Number(currentQuantity);
  const suggested = Math.max(threshold * 2 - current, threshold, 1);
  return String(suggested);
}

export function buildPurchaseRequestPrefillSessionData(
  prefill: IPurchaseRequestPrefill,
): IPurchaseRequestCreateSessionData {
  const thresholdLabel = prefill.reorder_threshold ?? 'N/A';
  return {
    prefill_source: 'low_stock_alert',
    prefill_pending_confirm: true,
    prefill_context: prefill,
    title: prefill.title,
    description: `Low stock: ${prefill.item_name} (${prefill.current_quantity} ${prefill.unit}, reorder at ${thresholdLabel})`,
    item_name: prefill.item_name,
    item_quantity: prefill.suggested_quantity,
    item_unit: prefill.unit,
    inventory_item_id: prefill.inventory_item_id,
  };
}

export function buildPurchaseRequestPrefillPrompt(
  prefill: IPurchaseRequestPrefill,
): string {
  const skuLine = prefill.sku ? `\n*SKU:* ${prefill.sku}` : '';
  const thresholdLabel = prefill.reorder_threshold ?? 'N/A';
  return waSection(
    'Purchase request (prefilled)',
    `Low stock alert se prefill kiya gaya hai.\n\n` +
      `*Title:* ${prefill.title}\n` +
      `*Item:* ${prefill.item_name}${skuLine}\n` +
      `*Quantity:* ${prefill.suggested_quantity} ${prefill.unit}\n` +
      `*Current:* ${prefill.current_quantity} | *Threshold:* ${thresholdLabel}\n\n` +
      `Reply *YES* to submit for approval.\n` +
      `Reply *NO* to start over manually.\n` +
      `Or send a new *quantity* to adjust before submitting.`,
  );
}
