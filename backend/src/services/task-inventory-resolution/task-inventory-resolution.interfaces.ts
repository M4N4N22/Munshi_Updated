import { TaskKind } from '../../../contracts/typescript/index';

export type ResolverStatus = 'resolved' | 'ambiguous' | 'not_found';

export type InventoryMatchType =
  | 'exact_sku'
  | 'exact_name'
  | 'case_insensitive'
  | 'partial'
  | 'fuzzy';

export type WorkerMatchType =
  | 'exact'
  | 'case_insensitive'
  | 'partial'
  | 'fuzzy';

export interface InventoryCandidate {
  item_id: number;
  sku: string;
  name: string;
  match_type: InventoryMatchType;
  score?: number;
}

export interface InventoryMatchResult {
  status: ResolverStatus;
  item_id?: number;
  sku?: string;
  name?: string;
  match_type?: InventoryMatchType;
  candidates?: InventoryCandidate[];
}

export interface WorkerCandidate {
  user_id: number;
  name: string;
  match_type: WorkerMatchType;
  score?: number;
}

export interface WorkerMatchResult {
  status: ResolverStatus;
  user_id?: number;
  name?: string;
  match_type?: WorkerMatchType;
  candidates?: WorkerCandidate[];
}

export type DisambiguationType =
  | 'inventory_disambiguation'
  | 'worker_disambiguation';

export interface DisambiguationPayload {
  type: DisambiguationType;
  candidates: string[];
}

export interface ResolvedTaskInventoryIntent {
  task_kind: TaskKind | null;
  quantity: number | null;
  inventory: InventoryMatchResult;
  worker: WorkerMatchResult;
  disambiguation: DisambiguationPayload[];
}

export interface InventoryItemSummary {
  id: number;
  sku: string;
  name: string;
}

export interface FactoryMemberSummary {
  user_id: number;
  name: string;
}
