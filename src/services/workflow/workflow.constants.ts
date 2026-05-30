/** Supported multi-step workflow types. */
export const WORKFLOW_TYPE = {
  ONBOARD_VENDOR: 'ONBOARD_VENDOR',
  ONBOARD_WORKER: 'ONBOARD_WORKER',
  INVENTORY_CREATE: 'INVENTORY_CREATE',
} as const;

export type WorkflowType =
  (typeof WORKFLOW_TYPE)[keyof typeof WORKFLOW_TYPE];

/** Workflow session lifecycle. */
export const WORKFLOW_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

/** Canonical slash commands that start a workflow (registry keys). */
export const WORKFLOW_START_COMMANDS = {
  ONBOARD_VENDOR: '/onboard_vendor',
  ONBOARD_WORKER: '/onboard_worker',
  INVENTORY_CREATE: '/inventory_create',
} as const;

/** Cancels the active workflow session for the sender. */
export const WORKFLOW_CANCEL_COMMAND = '/cancel';

/** Default ACTIVE session TTL when env is unset (hours). */
export const WORKFLOW_DEFAULT_TTL_HOURS = 24;

/** Env key: WORKFLOW_SESSION_TTL_HOURS */
export function getWorkflowSessionTtlMs(): number {
  const raw = process.env.WORKFLOW_SESSION_TTL_HOURS;
  const hours = raw != null && raw !== '' ? Number(raw) : WORKFLOW_DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    return WORKFLOW_DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  }
  return hours * 60 * 60 * 1000;
}

/** Vendor onboarding step identifiers. */
export const VENDOR_ONBOARDING_STEP = {
  VENDOR_NAME: 'VENDOR_NAME',
  VENDOR_PHONE: 'VENDOR_PHONE',
  VENDOR_GST: 'VENDOR_GST',
  VENDOR_ADDRESS: 'VENDOR_ADDRESS',
} as const;

export type VendorOnboardingStep =
  (typeof VENDOR_ONBOARDING_STEP)[keyof typeof VENDOR_ONBOARDING_STEP];

/** Worker onboarding step identifiers. */
export const WORKER_ONBOARDING_STEP = {
  WORKER_NAME: 'WORKER_NAME',
  WORKER_PHONE: 'WORKER_PHONE',
  WORKER_DEPARTMENT: 'WORKER_DEPARTMENT',
  WORKER_DOJ: 'WORKER_DOJ',
} as const;

export type WorkerOnboardingStep =
  (typeof WORKER_ONBOARDING_STEP)[keyof typeof WORKER_ONBOARDING_STEP];

/** Inventory item creation workflow steps. */
export const INVENTORY_CREATE_STEP = {
  ITEM_NAME: 'ITEM_NAME',
  ITEM_SKU: 'ITEM_SKU',
  ITEM_CATEGORY: 'ITEM_CATEGORY',
  ITEM_LOCATION: 'ITEM_LOCATION',
  ITEM_UNIT: 'ITEM_UNIT',
  ITEM_REORDER_THRESHOLD: 'ITEM_REORDER_THRESHOLD',
} as const;

export type InventoryCreateStep =
  (typeof INVENTORY_CREATE_STEP)[keyof typeof INVENTORY_CREATE_STEP];

export const WORKFLOW_SKIP_KEYWORDS = ['skip', 'none', 'na', 'n/a'];
