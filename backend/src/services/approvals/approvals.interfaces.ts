/** Polymorphic approval request — workflow engine deferred to Prompt 3+. */
export interface IApprovalRequestRecord {
  id: number;
  factory_id: number;
  entity_type: string;
  entity_id: number;
  requester_id: number;
  approver_id?: number | null;
  status: string;
  remarks?: string | null;
  decided_at?: Date | null;
}
