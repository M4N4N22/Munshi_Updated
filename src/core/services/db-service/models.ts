import { Attendance } from 'src/services/attendance/attendance.schema';
import { ApprovalRequest } from 'src/services/approvals/approvals.schema';
import {
  Department,
  DepartmentWorker,
} from 'src/services/departments/departments.schema';
import { Factory, FactoryUser } from 'src/services/factories/factories.schema';
import {
  InventoryCategory,
  InventoryItem,
  InventoryLocation,
  InventoryTransaction,
} from 'src/services/inventory/inventory.schema';
import {
  Document,
  DocumentExtraction,
  DocumentProcessingJob,
  DocumentSuggestion,
} from 'src/services/documents/documents.schema';
import { Issue } from 'src/services/issues/issues.schema';
import {
  PurchaseRequest,
  PurchaseRequestAudit,
  PurchaseRequestItem,
} from 'src/services/purchase-requests/purchase-requests.schema';
import { Task, TaskUpdate } from 'src/services/tasks/tasks.schema';
import { User } from 'src/services/users/users.schema';
import { Vendor } from 'src/services/vendors/vendors.schema';
import { WorkflowSession } from 'src/services/workflow/workflow.schema';

export const MONGOOSE_MODELS = {};

export const SQL_MODELS = {
  ApprovalRequest: ApprovalRequest.setup,
  Attendance: Attendance.setup,
  Department: Department.setup,
  DepartmentWorker: DepartmentWorker.setup,
  Document: Document.setup,
  DocumentExtraction: DocumentExtraction.setup,
  DocumentProcessingJob: DocumentProcessingJob.setup,
  DocumentSuggestion: DocumentSuggestion.setup,
  Factory: Factory.setup,
  FactoryUser: FactoryUser.setup,
  InventoryCategory: InventoryCategory.setup,
  InventoryItem: InventoryItem.setup,
  InventoryLocation: InventoryLocation.setup,
  InventoryTransaction: InventoryTransaction.setup,
  Issue: Issue.setup,
  PurchaseRequest: PurchaseRequest.setup,
  PurchaseRequestItem: PurchaseRequestItem.setup,
  PurchaseRequestAudit: PurchaseRequestAudit.setup,
  Task: Task.setup,
  TaskUpdate: TaskUpdate.setup,
  User: User.setup,
  Vendor: Vendor.setup,
  WorkflowSession: WorkflowSession.setup,
};
