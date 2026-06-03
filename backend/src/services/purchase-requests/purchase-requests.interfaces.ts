import {
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from './purchase-requests.constants';

export interface IPurchaseRequestItemRecord {
  id: number;
  purchase_request_id: number;
  inventory_item_id: number | null;
  item_name: string;
  requested_quantity: string;
  unit: string;
  notes: string | null;
}

export interface IPurchaseRequestAuditRecord {
  id: number;
  purchase_request_id: number;
  event_type: string;
  performed_by: number | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface IPurchaseRequestRecord {
  id: number;
  factory_id: number;
  request_number: string | null;
  title: string;
  description: string | null;
  status: PurchaseRequestStatus;
  requested_by: number;
  approved_by: number | null;
  assigned_vendor_id: number | null;
  priority: PurchaseRequestPriority;
  requested_at: Date | null;
  approved_at: Date | null;
  closed_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  items?: IPurchaseRequestItemRecord[];
}

export interface IPurchaseRequestItemInput {
  inventory_item_id?: number | null;
  item_name: string;
  requested_quantity: string;
  unit?: string;
  notes?: string | null;
}

export interface IPurchaseRequestCreateInput {
  factory_id: number;
  requested_by: number;
  title: string;
  description?: string | null;
  priority?: PurchaseRequestPriority;
  notes?: string | null;
  items?: IPurchaseRequestItemInput[];
  submit?: boolean;
}

export interface IPurchaseRequestUpdateInput {
  title?: string;
  description?: string | null;
  priority?: PurchaseRequestPriority;
  notes?: string | null;
  items?: IPurchaseRequestItemInput[];
}

export interface IPurchaseRequestListOptions {
  page?: number;
  limit?: number;
  status?: PurchaseRequestStatus;
}

export interface IPurchaseRequestSuggestion {
  suggestion_key: string;
  inventory_item_id: number;
  item_name: string;
  sku: string;
  current_quantity: string;
  reorder_threshold: string | null;
  suggested_quantity: string;
  unit: string;
  reason: string;
}
