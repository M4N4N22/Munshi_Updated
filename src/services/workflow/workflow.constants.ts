/** Supported multi-step workflow types. */
export const WORKFLOW_TYPE = {
  ONBOARD_VENDOR: 'ONBOARD_VENDOR',
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
} as const;

/** Vendor onboarding step identifiers. */
export const VENDOR_ONBOARDING_STEP = {
  VENDOR_NAME: 'VENDOR_NAME',
  VENDOR_PHONE: 'VENDOR_PHONE',
  VENDOR_GST: 'VENDOR_GST',
  VENDOR_ADDRESS: 'VENDOR_ADDRESS',
} as const;

export type VendorOnboardingStep =
  (typeof VENDOR_ONBOARDING_STEP)[keyof typeof VENDOR_ONBOARDING_STEP];

export const WORKFLOW_SKIP_KEYWORDS = ['skip', 'none', 'na', 'n/a'];
