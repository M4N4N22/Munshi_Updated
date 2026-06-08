import type { WaOutboundMessage, WaReplyButton } from './outbound-message.types';
import { buildPurchaseRequestCreateCommand } from 'src/services/purchase-requests/purchase-request-prefill.helper';

const WA_DIVIDER_WIDE = '━━━━━━━━━━━━━━━━';

/** WhatsApp reply button title (max 20 chars) — matches owner-home button style. */
export const WA_LOW_STOCK_PURCHASE_BUTTON_TITLE = 'Purchase karein';

export type InventoryLowStockAlertParams = {
  itemName: string;
  sku: string;
  currentQuantity: string;
  reorderThreshold: string;
  inventoryItemId: number;
};

export function buildInventoryLowStockAlertBody(
  params: InventoryLowStockAlertParams,
): string {
  const skuLine = params.sku ? `\n*SKU:* ${params.sku}` : '';
  return (
    `${WA_DIVIDER_WIDE}\n` +
    `⚠️ *Low Stock Alert*\n` +
    `${WA_DIVIDER_WIDE}\n\n` +
    `*Item:*\n${params.itemName}${skuLine}\n\n` +
    `*Current:*\n${params.currentQuantity}\n\n` +
    `*Threshold:*\n${params.reorderThreshold}\n\n` +
    `Inventory low ho gaya hai.\n\n` +
    `Neeche se purchase request shuru karein 👇`
  );
}

export function buildInventoryLowStockPurchaseButton(
  inventoryItemId: number,
): WaReplyButton {
  return {
    id: buildPurchaseRequestCreateCommand(inventoryItemId),
    title: WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
  };
}

export function buildInventoryLowStockAlertOutbound(
  params: InventoryLowStockAlertParams,
): WaOutboundMessage {
  return {
    type: 'interactive_buttons',
    body: buildInventoryLowStockAlertBody(params),
    buttons: [buildInventoryLowStockPurchaseButton(params.inventoryItemId)],
  };
}
