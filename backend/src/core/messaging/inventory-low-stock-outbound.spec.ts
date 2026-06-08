import {
  buildInventoryLowStockAlertOutbound,
  buildInventoryLowStockPurchaseButton,
  WA_LOW_STOCK_PURCHASE_BUTTON_TITLE,
} from './inventory-low-stock-outbound';

describe('inventory-low-stock-outbound', () => {
  it('builds interactive alert with purchase button', () => {
    const outbound = buildInventoryLowStockAlertOutbound({
      itemName: 'Cement 50kg',
      sku: 'CEMENT_50KG',
      currentQuantity: '8.0000',
      reorderThreshold: '10.0000',
      inventoryItemId: 42,
    });

    expect(outbound.type).toBe('interactive_buttons');
    if (outbound.type !== 'interactive_buttons') {
      throw new Error('expected interactive_buttons outbound');
    }
    expect(outbound.body).toContain('Low Stock Alert');
    expect(outbound.body).toContain('Neeche se purchase request shuru karein');
    expect(outbound.buttons).toHaveLength(1);
    expect(outbound.buttons[0].title).toBe(WA_LOW_STOCK_PURCHASE_BUTTON_TITLE);
    expect(outbound.buttons[0].id).toBe('/purchase_request_create?itemId=42');
  });

  it('button id carries itemId for workflow prefill', () => {
    const button = buildInventoryLowStockPurchaseButton(99);
    expect(button.id).toBe('/purchase_request_create?itemId=99');
  });
});
