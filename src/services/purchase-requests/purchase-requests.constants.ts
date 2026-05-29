/** Purchase request lifecycle — procurement workflows deferred to Prompt 3+. */
export const PURCHASE_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  ORDERED: 'ORDERED',
  RECEIVED: 'RECEIVED',
} as const;

export type PurchaseRequestStatus =
  (typeof PURCHASE_REQUEST_STATUS)[keyof typeof PURCHASE_REQUEST_STATUS];
