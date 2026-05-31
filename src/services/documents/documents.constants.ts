/** Canonical document types — extensible without schema changes. */
export const DOCUMENT_TYPE = {
  PURCHASE_INVOICE: 'PURCHASE_INVOICE',
  GOODS_RECEIPT: 'GOODS_RECEIPT',
  STOCK_REGISTER: 'STOCK_REGISTER',
  INVENTORY_IMPORT: 'INVENTORY_IMPORT',
  LEDGER_EXPORT: 'LEDGER_EXPORT',
  BANK_STATEMENT: 'BANK_STATEMENT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DocumentType =
  (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

/** Document lifecycle status. */
export const DOCUMENT_STATUS = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  EXTRACTED: 'EXTRACTED',
  SUGGESTED: 'SUGGESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

/** Processing job status. */
export const DOCUMENT_JOB_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

/** Suggestion types — backend actions are never auto-executed. */
export const SUGGESTION_TYPE = {
  INITIAL_INVENTORY_IMPORT: 'INITIAL_INVENTORY_IMPORT',
  NEW_INVENTORY_ITEM: 'NEW_INVENTORY_ITEM',
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  INVENTORY_ADJUSTMENT: 'INVENTORY_ADJUSTMENT',
  CREATE_VENDOR: 'CREATE_VENDOR',
  CREATE_LEDGER_ENTRY: 'CREATE_LEDGER_ENTRY',
  CREATE_PURCHASE_REQUEST: 'CREATE_PURCHASE_REQUEST',
} as const;

export type SuggestionType =
  (typeof SUGGESTION_TYPE)[keyof typeof SUGGESTION_TYPE];

/** Suggestion approval lifecycle. */
export const SUGGESTION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXECUTED: 'EXECUTED',
  FAILED: 'FAILED',
} as const;

export type SuggestionStatus =
  (typeof SUGGESTION_STATUS)[keyof typeof SUGGESTION_STATUS];

export const EXTRACTION_CONTRACT_VERSION = 'v1';

export const SUGGESTION_APPROVAL_COMMAND = '/suggestion_approve';

export const SUGGESTION_CONFIRM_YES = ['yes', 'y', 'confirm', 'approve'];
export const SUGGESTION_CONFIRM_NO = ['no', 'n', 'reject', 'cancel'];
