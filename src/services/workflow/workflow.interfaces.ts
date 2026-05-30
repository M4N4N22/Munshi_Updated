import {
  WorkflowStatus,
  WorkflowType,
  VendorOnboardingStep,
} from './workflow.constants';

export interface IWorkflowSessionRecord {
  id: number;
  factory_id: number;
  phone_number: string;
  workflow_type: WorkflowType;
  current_step: string;
  session_data: Record<string, unknown>;
  status: WorkflowStatus;
  created_at?: Date;
  updated_at?: Date;
}

export interface IVendorOnboardingSessionData {
  name?: string;
  phone_number?: string;
  gst_number?: string | null;
  address?: string | null;
}

export interface IWorkerOnboardingSessionData {
  name?: string;
  phone_number?: string;
  department_id?: number;
  doj?: string | null;
}

export interface IInventoryCreateSessionData {
  name?: string;
  sku?: string;
  category_id?: number;
  location_id?: number;
  unit?: string;
  reorder_threshold?: string | null;
}

export interface ISuggestionApprovalSessionData {
  suggestion_id?: number;
  document_id?: number;
  summary?: string;
}

export interface WorkflowSessionResolveResult {
  session: IWorkflowSessionRecord | null;
  expiredJustNow: boolean;
}

export interface WorkflowUserContext {
  userId: number;
  factoryId: number;
  role: string;
  phone: string;
  userName?: string;
}

export interface WorkflowStepResult {
  message: string;
  completed?: boolean;
  cancelled?: boolean;
  nextStep?: string;
  sessionData?: Record<string, unknown>;
}

export interface IWorkflowHandler {
  readonly workflowType: WorkflowType;
  readonly startCommand: string;
  readonly firstStep: string;
  getInitialPrompt(): string;
  handleStep(
    session: IWorkflowSessionRecord,
    message: string,
    context: WorkflowUserContext,
  ): Promise<WorkflowStepResult>;
}
