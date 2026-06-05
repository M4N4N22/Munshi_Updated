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
