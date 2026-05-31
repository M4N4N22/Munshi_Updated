export const CONTRACT_VERSION = 'v1';

export const DOCUMENT_TYPES = [
  'PURCHASE_INVOICE',
  'GOODS_RECEIPT',
  'STOCK_REGISTER',
  'INVENTORY_IMPORT',
  'LEDGER_EXPORT',
  'BANK_STATEMENT',
  'UNKNOWN',
] as const;

export const SUGGESTION_TYPES = [
  'INITIAL_INVENTORY_IMPORT',
  'NEW_INVENTORY_ITEM',
  'STOCK_IN',
  'STOCK_OUT',
  'INVENTORY_ADJUSTMENT',
  'CREATE_VENDOR',
  'CREATE_LEDGER_ENTRY',
] as const;

export const WORKFLOW_TYPES = [
  'ONBOARD_VENDOR',
  'ONBOARD_WORKER',
  'INVENTORY_CREATE',
  'SUGGESTION_APPROVAL',
] as const;

export const INTENT_TYPES = [
  '/tasks',
  '/assign',
  '/depart_assign',
  '/mgrassign',
  '/mgrself',
  '/update',
  '/issue',
  '/issues',
  '/resolve',
  '/members',
  '/report',
  '/help',
  '/present',
  '/absent',
  '/complete',
  '/mgrtransfer',
  '/mgrreject',
  '/onboard_vendor',
  '/onboard_worker',
  '/inventory_create',
  'general_chat',
] as const;

export const DEPARTMENT_SLUGS = [
  'operations',
  'sales',
  'purchase',
  'it',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export interface ClassifyResponseContract {
  intent: string;
  id?: number | string | null;
  worker_slug?: string | null;
  depart_slug?: string | null;
  deadline?: string | null;
  reject_reason?: string | null;
  message?: string | null;
}

export interface ExtractionItemContract {
  name: string;
  quantity?: number;
  sku?: string;
  unit?: string;
  category_name?: string;
  location_name?: string;
}

export interface InventoryImportExtractionContract {
  document_type: 'INVENTORY_IMPORT';
  items: ExtractionItemContract[];
}

export interface StockRegisterExtractionContract {
  document_type: 'STOCK_REGISTER';
  as_of_date?: string;
  items: ExtractionItemContract[];
}

export type DocumentExtractionContract =
  | InventoryImportExtractionContract
  | StockRegisterExtractionContract;
