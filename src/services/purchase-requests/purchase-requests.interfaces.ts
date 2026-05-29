/** Purchase request foundation shape — line items and PO flows deferred. */
export interface IPurchaseRequestRecord {
  id: number;
  factory_id: number;
  requester_id: number;
  vendor_id?: number | null;
  title: string;
  description?: string | null;
  status: string;
  notes?: string | null;
}
