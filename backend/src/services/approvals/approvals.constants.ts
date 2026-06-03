/** Generic approval lifecycle — workflow logic deferred to Prompt 3+. */
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ApprovalStatus =
  (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

/** Polymorphic target types for ApprovalRequest.entity_type */
export const APPROVAL_ENTITY_TYPE = {
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  INVENTORY_ADJUSTMENT: 'INVENTORY_ADJUSTMENT',
  EXPENSE: 'EXPENSE',
  VENDOR: 'VENDOR',
} as const;

export type ApprovalEntityType =
  (typeof APPROVAL_ENTITY_TYPE)[keyof typeof APPROVAL_ENTITY_TYPE];
