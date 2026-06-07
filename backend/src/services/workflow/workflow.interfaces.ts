import type { WaOutboundMessage } from 'src/core/messaging/outbound-message.types';
import type { IPurchaseRequestPrefill } from '../purchase-requests/purchase-requests.interfaces';
import type { TaskKind } from '../../../contracts/typescript/index';
import {
  WorkflowStatus,
  WorkflowType,
  VendorOnboardingStep,
} from './workflow.constants';
import { DiscoveryBucket } from '../business-discovery/business-discovery.constants';

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
  worker_role?: string;
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

export interface IAssignClarifyAssigneeOption {
  index: number;
  userId: number;
  name: string;
  mention: string;
  role: string;
}

export interface IAssignClarifySessionData {
  description?: string;
  deadline?: string | null;
  assignable_options?: IAssignClarifyAssigneeOption[];
}

export interface IAssignClarifyPromptResult {
  message: string;
  assignable_options: IAssignClarifyAssigneeOption[];
  /** When set (e.g. empty team), send buttons instead of plain text only. */
  outbound?: WaOutboundMessage;
}

export interface IPurchaseRequestCreateSessionData {
  title?: string;
  description?: string | null;
  item_name?: string;
  item_quantity?: string;
  item_unit?: string;
  inventory_item_id?: number | null;
  items?: Array<{
    item_name: string;
    requested_quantity: string;
    unit: string;
    inventory_item_id?: number | null;
  }>;
  purchase_request_id?: number;
  adding_more?: boolean;
  prefill_source?: 'low_stock_alert';
  prefill_pending_confirm?: boolean;
  prefill_context?: IPurchaseRequestPrefill;
}

export interface IBusinessDiscoverySessionData {
  current_bucket?: string;
  field_index?: number;
  /** For MANAGER_DISCOVERY / WORKFORCE_DISCOVERY — tracks worker #4 as index 3 */
  entity_index?: number;
  /** After completing one manager/worker entity, awaiting yes/skip */
  awaiting_more?: boolean;
}

export interface ITaskInventoryCreationSessionData {
  task_kind?: TaskKind | null;
  quantity?: number | null;
  raw_message?: string;
  inventory_item_id?: number;
  inventory_sku?: string;
  inventory_name?: string;
  worker_user_id?: number;
  worker_name?: string;
  inventory_candidates?: Array<{
    item_id: number;
    sku: string;
    name: string;
  }>;
  worker_candidates?: Array<{
    user_id: number;
    name: string;
  }>;
  task_created_id?: number;
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
  outbound?: WaOutboundMessage;
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
