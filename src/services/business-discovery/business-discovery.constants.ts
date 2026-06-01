/** Profile lifecycle — discovery never blocks app usage. */
export const BUSINESS_DISCOVERY_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
} as const;

export type BusinessDiscoveryStatus =
  (typeof BUSINESS_DISCOVERY_STATUS)[keyof typeof BUSINESS_DISCOVERY_STATUS];

/** Extensible discovery buckets (future: BOOKKEEPING, LEDGER, BANKING). */
export const DISCOVERY_BUCKET = {
  BUSINESS_IDENTITY: 'BUSINESS_IDENTITY',
  ORGANIZATION: 'ORGANIZATION',
  INVENTORY: 'INVENTORY',
  VENDORS: 'VENDORS',
} as const;

export type DiscoveryBucket =
  (typeof DISCOVERY_BUCKET)[keyof typeof DISCOVERY_BUCKET];

export const FUTURE_DISCOVERY_BUCKETS = [
  'BOOKKEEPING',
  'LEDGER',
  'BANKING',
] as const;

export const DISCOVERY_BUCKET_ORDER: DiscoveryBucket[] = [
  DISCOVERY_BUCKET.BUSINESS_IDENTITY,
  DISCOVERY_BUCKET.ORGANIZATION,
  DISCOVERY_BUCKET.INVENTORY,
  DISCOVERY_BUCKET.VENDORS,
];

export const DISCOVERY_BUCKET_LABELS: Record<DiscoveryBucket, string> = {
  BUSINESS_IDENTITY: 'Business Identity',
  ORGANIZATION: 'Organization',
  INVENTORY: 'Inventory',
  VENDORS: 'Vendors',
};

/** Reminder schedule (hours). */
export const DISCOVERY_REMINDER_HOURS = {
  FIRST: 24,
  FINAL: 24 * 7,
} as const;

export const DISCOVERY_REMINDER_STAGE = {
  NONE: 0,
  FIRST_SENT: 1,
  FINAL_SENT: 2,
  PAUSED: 3,
} as const;

/** Document type → bucket contribution (reuse existing document registry). */
export const DOCUMENT_DISCOVERY_BUCKET_MAP: Record<string, DiscoveryBucket> = {
  PURCHASE_INVOICE: DISCOVERY_BUCKET.VENDORS,
  GOODS_RECEIPT: DISCOVERY_BUCKET.VENDORS,
  INVENTORY_IMPORT: DISCOVERY_BUCKET.INVENTORY,
  STOCK_REGISTER: DISCOVERY_BUCKET.INVENTORY,
  LEDGER_EXPORT: 'BOOKKEEPING' as DiscoveryBucket,
  BANK_STATEMENT: 'BANKING' as DiscoveryBucket,
};

/** Suggestion types that contribute to buckets when executed. */
export const SUGGESTION_DISCOVERY_BUCKET_MAP: Record<string, DiscoveryBucket> = {
  INITIAL_INVENTORY_IMPORT: DISCOVERY_BUCKET.INVENTORY,
  NEW_INVENTORY_ITEM: DISCOVERY_BUCKET.INVENTORY,
  CREATE_VENDOR: DISCOVERY_BUCKET.VENDORS,
};

export const BUSINESS_DISCOVERY_WORKFLOW_COMMAND = '/business_discovery';
