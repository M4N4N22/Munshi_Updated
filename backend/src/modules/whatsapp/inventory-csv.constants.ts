/** Canonical CSV headers for WhatsApp / REST inventory bulk import. */
export const INVENTORY_CSV_HEADERS = [
  'sku',
  'name',
  'category',
  'location',
  'unit',
  'quantity',
] as const;

export const INVENTORY_CSV_OPTIONAL_HEADERS = ['reorder_threshold'] as const;

export const INVENTORY_CSV_TEMPLATE_SAMPLE = `sku,name,category,location,unit,quantity,reorder_threshold
CEMENT_50KG,Cement 50kg,Building Materials,Main Warehouse,bag,100,10
STEEL_12MM,Steel 12mm,Building Materials,Main Warehouse,pcs,50,`;

export const INVENTORY_CSV_MAX_ROWS = 200;
export const INVENTORY_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const INVENTORY_CSV_PENDING_TTL_MS = 30 * 60 * 1000;

/** Static file in `web/public` — served from the Vercel web deploy. */
export const INVENTORY_CSV_PUBLIC_TEMPLATE_PATH =
  '/inventory-import/munshi-inventory-template.csv';

/** Default production web host (override with MUNSHI_WEB_URL or MUNSHI_INVENTORY_CSV_TEMPLATE_URL). */
export const INVENTORY_CSV_DEFAULT_WEB_HOST = 'https://munshi-dada.vercel.app';

export const INVENTORY_CSV_PUBLIC_TEMPLATE_URL = `${INVENTORY_CSV_DEFAULT_WEB_HOST}${INVENTORY_CSV_PUBLIC_TEMPLATE_PATH}`;
