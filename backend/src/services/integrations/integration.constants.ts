/** External integration providers (Phase 2.1 foundation). */
export const INTEGRATION_PROVIDER = {
  ZOHO_INVENTORY: 'zoho_inventory',
  ZOHO_BOOKS: 'zoho_books',
  CSV: 'csv',
} as const;

export type IntegrationProvider =
  (typeof INTEGRATION_PROVIDER)[keyof typeof INTEGRATION_PROVIDER];

/** Connection lifecycle status stored on integration_connections.status. */
export const INTEGRATION_CONNECTION_STATUS = {
  ACTIVE: 'active',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

export type IntegrationConnectionStatus =
  (typeof INTEGRATION_CONNECTION_STATUS)[keyof typeof INTEGRATION_CONNECTION_STATUS];

/** Sync run direction stored on integration_sync_runs.direction. */
export const SYNC_DIRECTION = {
  PULL: 'pull',
  PUSH: 'push',
} as const;

export type SyncDirection =
  (typeof SYNC_DIRECTION)[keyof typeof SYNC_DIRECTION];

/** Sync run status stored on integration_sync_runs.status. */
export const SYNC_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

/** Sync run trigger stored on integration_sync_runs.trigger. */
export const SYNC_TRIGGER = {
  MANUAL: 'manual',
  CRON: 'cron',
  TASK_COMPLETE: 'task_complete',
  CSV_IMPORT: 'csv_import',
} as const;

export type SyncTrigger = (typeof SYNC_TRIGGER)[keyof typeof SYNC_TRIGGER];

/** Item mapping sync status stored on integration_item_mappings.sync_status. */
export const ITEM_MAPPING_SYNC_STATUS = {
  OK: 'ok',
  CONFLICT: 'conflict',
  UNMAPPED: 'unmapped',
} as const;

export type ItemMappingSyncStatus =
  (typeof ITEM_MAPPING_SYNC_STATUS)[keyof typeof ITEM_MAPPING_SYNC_STATUS];

/** Push delivery status stored on integration_push_deliveries.status. */
export const PUSH_DELIVERY_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  SKIPPED_UNMAPPED: 'skipped_unmapped',
} as const;

export type PushDeliveryStatus =
  (typeof PUSH_DELIVERY_STATUS)[keyof typeof PUSH_DELIVERY_STATUS];
