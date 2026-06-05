import { parseInventoryCsvText } from './inventory-csv.parse';
import { INVENTORY_CSV_TEMPLATE_SAMPLE } from './inventory-csv.constants';

describe('parseInventoryCsvText', () => {
  it('parses valid CSV with normalized fields', () => {
    const result = parseInventoryCsvText(INVENTORY_CSV_TEMPLATE_SAMPLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        line: 2,
        sku: 'CEMENT_50KG',
        name: 'Cement 50kg',
        category: 'Building Materials',
        location: 'Main Warehouse',
        unit: 'bag',
        quantity: '100.0000',
        reorder_threshold: '10.0000',
      });
      expect(result.rows[1].sku).toBe('STEEL_12MM');
      expect(result.rows[1].reorder_threshold).toBeNull();
    }
  });

  it('rejects missing required header', () => {
    const csv = `sku,name,category,location,unit
CEMENT_50KG,Cement,Cat,Loc,bag`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Missing: quantity');
    }
  });

  it('rejects empty file', () => {
    const result = parseInventoryCsvText('   \n  ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('File khali hai.');
    }
  });

  it('rejects duplicate SKU (case-insensitive)', () => {
    const csv = `sku,name,category,location,unit,quantity
CEMENT_50KG,Cement A,Building,Main,bag,10
cement_50kg,Cement B,Building,Main,bag,5`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Duplicate SKU "CEMENT_50KG"');
      expect(result.error).toContain('Line 3');
      expect(result.error).toContain('line 2');
    }
  });

  it('rejects invalid quantity', () => {
    const csv = `sku,name,category,location,unit,quantity
CEMENT_50KG,Cement,Building,Main,bag,abc`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Line 2');
      expect(result.error).toMatch(/positive number|required/i);
    }
  });

  it('rejects negative quantity', () => {
    const csv = `sku,name,category,location,unit,quantity
CEMENT_50KG,Cement,Building,Main,bag,-5`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Line 2');
      expect(result.error).toContain('zero or a positive number');
    }
  });

  it('strips UTF-8 BOM and parses', () => {
    const csv = `\uFEFFsku,name,category,location,unit,quantity
CEMENT_50KG,Cement,Building,Main,bag,0`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].quantity).toBe('0.0000');
    }
  });

  it('handles quoted commas in name field', () => {
    const csv = `sku,name,category,location,unit,quantity
CEMENT_50KG,"Cement, 50kg bag",Building,Main,bag,10`;
    const result = parseInventoryCsvText(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].name).toBe('Cement, 50kg bag');
    }
  });
});
