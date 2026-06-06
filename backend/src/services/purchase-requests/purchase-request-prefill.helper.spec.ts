import {
  buildPurchaseRequestCreateCommand,
  buildPurchaseRequestPrefillPrompt,
  buildPurchaseRequestPrefillSessionData,
  computeLowStockSuggestedQuantity,
  parsePurchaseRequestItemIdFromCommand,
} from './purchase-request-prefill.helper';

describe('purchase-request-prefill.helper', () => {
  it('parses itemId from query-style command', () => {
    expect(
      parsePurchaseRequestItemIdFromCommand('/purchase_request_create?itemId=42'),
    ).toBe(42);
    expect(
      parsePurchaseRequestItemIdFromCommand('/purchase_request_create?item_id=7'),
    ).toBe(7);
  });

  it('returns null when command has no item id', () => {
    expect(parsePurchaseRequestItemIdFromCommand('/purchase_request_create')).toBeNull();
  });

  it('builds contextual workflow command', () => {
    expect(buildPurchaseRequestCreateCommand(123)).toBe(
      '/purchase_request_create?itemId=123',
    );
    expect(buildPurchaseRequestCreateCommand()).toBe('/purchase_request_create');
  });

  it('computes suggested quantity like suggestion service', () => {
    expect(computeLowStockSuggestedQuantity(8, 10)).toBe('12');
    expect(computeLowStockSuggestedQuantity(5, 10)).toBe('15');
  });

  it('builds session data and prompt without writes', () => {
    const prefill = {
      inventory_item_id: 5,
      item_name: 'Widget',
      sku: 'W-1',
      title: 'Restock Widget',
      suggested_quantity: '12',
      unit: 'pcs',
      current_quantity: '8.0000',
      reorder_threshold: '10.0000',
    };
    const session = buildPurchaseRequestPrefillSessionData(prefill);
    expect(session.prefill_pending_confirm).toBe(true);
    expect(session.inventory_item_id).toBe(5);
    expect(session.item_quantity).toBe('12');

    const prompt = buildPurchaseRequestPrefillPrompt(prefill);
    expect(prompt).toContain('Restock Widget');
    expect(prompt).toContain('12 pcs');
  });
});
