import {
  DisambiguationPayload,
  InventoryCandidate,
  InventoryMatchResult,
  WorkerCandidate,
  WorkerMatchResult,
} from './task-inventory-resolution.interfaces';

export function buildInventoryDisambiguation(
  candidates: InventoryCandidate[],
): DisambiguationPayload {
  return {
    type: 'inventory_disambiguation',
    candidates: candidates.map((c) => c.name),
  };
}

export function buildWorkerDisambiguation(
  candidates: WorkerCandidate[],
): DisambiguationPayload {
  return {
    type: 'worker_disambiguation',
    candidates: candidates.map((c) => c.name),
  };
}

export function collectDisambiguationPayloads(
  inventory: InventoryMatchResult,
  worker: WorkerMatchResult,
): DisambiguationPayload[] {
  const payloads: DisambiguationPayload[] = [];
  if (inventory.status === 'ambiguous' && inventory.candidates?.length) {
    payloads.push(buildInventoryDisambiguation(inventory.candidates));
  }
  if (worker.status === 'ambiguous' && worker.candidates?.length) {
    payloads.push(buildWorkerDisambiguation(worker.candidates));
  }
  return payloads;
}
