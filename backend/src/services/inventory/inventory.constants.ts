/** Inventory transaction types — all quantity changes use these. */
export const INVENTORY_TRANSACTION_TYPE = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type InventoryTransactionType =
  (typeof INVENTORY_TRANSACTION_TYPE)[keyof typeof INVENTORY_TRANSACTION_TYPE];

export const INVENTORY_FIELD_LIMITS = {
  NAME_MAX: 255,
  SKU_MAX: 64,
  UNIT_MAX: 64,
  NOTES_MAX: 2000,
} as const;

export const INVENTORY_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

export const INVENTORY_QUANTITY_SCALE = 4;

/** Ledger reference_type values for non-task inventory movements. */
export const INVENTORY_REFERENCE_TYPE = {
  CSV_IMPORT: 'CSV_IMPORT',
  ZOHO_PULL: 'ZOHO_PULL',
  ZOHO_PUSH: 'ZOHO_PUSH',
} as const;

export type InventoryReferenceType =
  (typeof INVENTORY_REFERENCE_TYPE)[keyof typeof INVENTORY_REFERENCE_TYPE];

/** WhatsApp / REST query command (foundation). */
export const INVENTORY_COMMANDS = {
  INVENTORY_CREATE: '/inventory_create',
  INVENTORY_STATUS: '/inventory_status',
} as const;
