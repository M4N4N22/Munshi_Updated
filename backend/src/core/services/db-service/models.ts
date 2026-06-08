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
import { LowStockAlertContext } from 'src/services/inventory/low-stock-alert-context.schema';
import {
  Document,
  DocumentExtraction,
  DocumentProcessingJob,
  DocumentSuggestion,
} from 'src/services/documents/documents.schema';
import { Issue } from 'src/services/issues/issues.schema';
import {
  BusinessDiscoveryProfile,
} from 'src/services/business-discovery/business-discovery.schema';
import {
  PurchaseRequest,
  PurchaseRequestAudit,
  PurchaseRequestItem,
} from 'src/services/purchase-requests/purchase-requests.schema';
import {
  Task,
  TaskInventoryLine,
  TaskUpdate,
} from 'src/services/tasks/tasks.schema';
import { User } from 'src/services/users/users.schema';
import { Vendor } from 'src/services/vendors/vendors.schema';
import { WorkflowSession } from 'src/services/workflow/workflow.schema';
import {
  BankAccount,
  BankConsent,
  BankTransaction,
  JournalEntry,
  JournalLine,
  LedgerAccount,
  MatchSuggestion,
} from 'src/services/finance/finance.schema';
import { DomainEvent } from 'src/services/domain-events/domain-events.schema';
import {
  OnboardingOtpChallenge,
  OnboardingPhoneVerification,
} from 'src/modules/onboarding/onboarding-otp.schema';
import {
  IntegrationConnection,
  IntegrationItemMapping,
  IntegrationPushDelivery,
  IntegrationSyncRun,
} from 'src/services/integrations/integration.schema';

export const MONGOOSE_MODELS = {};

export const SQL_MODELS = {
  OnboardingOtpChallenge: OnboardingOtpChallenge.setup,
  OnboardingPhoneVerification: OnboardingPhoneVerification.setup,
  BankConsent: BankConsent.setup,
  BankAccount: BankAccount.setup,
  BankTransaction: BankTransaction.setup,
  LedgerAccount: LedgerAccount.setup,
  JournalEntry: JournalEntry.setup,
  JournalLine: JournalLine.setup,
  MatchSuggestion: MatchSuggestion.setup,
  DomainEvent: DomainEvent.setup,
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
  LowStockAlertContext: LowStockAlertContext.setup,
  IntegrationConnection: IntegrationConnection.setup,
  IntegrationItemMapping: IntegrationItemMapping.setup,
  IntegrationPushDelivery: IntegrationPushDelivery.setup,
  IntegrationSyncRun: IntegrationSyncRun.setup,
  Issue: Issue.setup,
  BusinessDiscoveryProfile: BusinessDiscoveryProfile.setup,
  PurchaseRequest: PurchaseRequest.setup,
  PurchaseRequestItem: PurchaseRequestItem.setup,
  PurchaseRequestAudit: PurchaseRequestAudit.setup,
  Task: Task.setup,
  TaskUpdate: TaskUpdate.setup,
  TaskInventoryLine: TaskInventoryLine.setup,
  User: User.setup,
  Vendor: Vendor.setup,
  WorkflowSession: WorkflowSession.setup,
};
