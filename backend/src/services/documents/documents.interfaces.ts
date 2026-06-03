import { DocumentStatus, DocumentType, SuggestionStatus, SuggestionType } from './documents.constants';

export interface IDocumentRecord {
  id: number;
  factory_id: number;
  uploaded_by?: number | null;
  document_type: DocumentType | string;
  status: DocumentStatus | string;
  file_name?: string | null;
  storage_ref?: string | null;
  mime_type?: string | null;
  metadata: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

export interface IDocumentProcessingJobRecord {
  id: number;
  document_id: number;
  factory_id: number;
  job_type: string;
  status: string;
  error_message?: string | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IDocumentExtractionRecord {
  id: number;
  document_id: number;
  factory_id: number;
  extraction_version: string;
  document_type_detected?: string | null;
  payload: Record<string, unknown>;
  created_at?: Date;
}

export interface IDocumentSuggestionRecord {
  id: number;
  document_id: number;
  factory_id: number;
  extraction_id: number;
  suggestion_type: SuggestionType | string;
  status: SuggestionStatus | string;
  payload: Record<string, unknown>;
  workflow_session_id?: number | null;
  rejection_reason?: string | null;
  executed_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

/** LLM extraction contract — inventory import item line. */
export interface IExtractionInventoryItem {
  name: string;
  quantity?: number;
  sku?: string;
  unit?: string;
  category_name?: string;
  location_name?: string;
}

/** LLM extraction contract — top-level inventory import payload. */
export interface IInventoryImportExtractionPayload {
  document_type?: string;
  items: IExtractionInventoryItem[];
}

/** LLM extraction contract — purchase invoice (future). */
export interface IPurchaseInvoiceExtractionPayload {
  document_type?: string;
  vendor_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  items?: Array<{
    item_name?: string;
    name?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
}

export type DocumentExtractionPayload =
  | IInventoryImportExtractionPayload
  | IPurchaseInvoiceExtractionPayload
  | Record<string, unknown>;

export interface ISuggestionPayload {
  summary: string;
  items?: Array<Record<string, unknown>>;
  item?: Record<string, unknown>;
  document_id: number;
  extraction_id: number;
  [key: string]: unknown;
}

export interface IDocumentTypeContract {
  documentType: string;
  description: string;
  expectedFields: string[];
  suggestedActions: string[];
}

export interface ISuggestionGenerationResult {
  suggestions: IDocumentSuggestionRecord[];
  documentStatus: string;
}
