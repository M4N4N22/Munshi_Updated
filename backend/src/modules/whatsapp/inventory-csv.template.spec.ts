import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseInventoryCsvText } from './inventory-csv.parse';
import {
  INVENTORY_CSV_HEADERS,
  INVENTORY_CSV_OPTIONAL_HEADERS,
  INVENTORY_CSV_PUBLIC_TEMPLATE_PATH,
  INVENTORY_CSV_PUBLIC_TEMPLATE_URL,
} from './inventory-csv.constants';

describe('inventory static template', () => {
  const templatePath = resolve(
    __dirname,
    '../../../../web/public/inventory-import/munshi-inventory-template.csv',
  );

  it('exports public template path and default URL', () => {
    expect(INVENTORY_CSV_PUBLIC_TEMPLATE_PATH).toBe(
      '/inventory-import/munshi-inventory-template.csv',
    );
    expect(INVENTORY_CSV_PUBLIC_TEMPLATE_URL).toContain(
      '/inventory-import/munshi-inventory-template.csv',
    );
  });

  it('web template file exists and matches required headers', () => {
    const raw = readFileSync(templatePath, 'utf8');
    const headerLine = raw.split(/\r?\n/)[0].trim();
    const cells = headerLine.split(',').map((h) => h.trim().toLowerCase());

    for (const h of INVENTORY_CSV_HEADERS) {
      expect(cells).toContain(h);
    }
    for (const h of INVENTORY_CSV_OPTIONAL_HEADERS) {
      expect(cells).toContain(h);
    }
  });

  it('web template rows pass parseInventoryCsvText validation', () => {
    const raw = readFileSync(templatePath, 'utf8');
    const result = parseInventoryCsvText(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].sku).toBe('CEMENT_50KG');
      expect(result.rows[1].sku).toBe('SHIRT_MED');
      expect(result.rows[2].sku).toBe('BOLT_M10');
    }
  });
});
