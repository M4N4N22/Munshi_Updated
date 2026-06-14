import {
  normalizeInventoryCsvHeader,
  resolveInventoryCsvHeaders,
  toCanonicalInventoryCsvHeader,
} from './inventory-csv-header-aliases';

describe('inventory CSV header aliases', () => {
  it('maps common English export headers to canonical fields', () => {
    const result = resolveInventoryCsvHeaders([
      'Item Code',
      'Product Name',
      'Category',
      'Godown',
      'UOM',
      'Qty',
      'Min Stock',
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idx.sku).toBe(0);
      expect(result.idx.name).toBe(1);
      expect(result.idx.quantity).toBe(5);
      expect(result.idx.reorder_threshold).toBe(6);
    }
  });

  it('maps Hinglish / Hindi romanized headers', () => {
    const result = resolveInventoryCsvHeaders([
      'code',
      'maal',
      'shreni',
      'godown',
      'ikai',
      'matra',
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idx.sku).toBe(0);
      expect(result.idx.name).toBe(1);
      expect(result.idx.category).toBe(2);
      expect(result.idx.location).toBe(3);
      expect(result.idx.unit).toBe(4);
      expect(result.idx.quantity).toBe(5);
    }
  });

  it('accepts canonical Munshi headers unchanged', () => {
    const result = resolveInventoryCsvHeaders([
      'sku',
      'name',
      'category',
      'location',
      'unit',
      'quantity',
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects duplicate columns mapping to the same field', () => {
    const result = resolveInventoryCsvHeaders([
      'sku',
      'item_code',
      'name',
      'category',
      'location',
      'unit',
      'quantity',
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Duplicate columns');
    }
  });

  it('reports missing fields with alias hint', () => {
    const result = resolveInventoryCsvHeaders([
      'item_code',
      'product_name',
      'category',
      'location',
      'unit',
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Missing: quantity');
      expect(result.error).toContain('qty→quantity');
    }
  });

  it('normalizes header punctuation and spacing', () => {
    expect(normalizeInventoryCsvHeader('  Stock On Hand ')).toBe(
      'stock_on_hand',
    );
    expect(toCanonicalInventoryCsvHeader('stock_on_hand')).toBe('quantity');
  });
});
