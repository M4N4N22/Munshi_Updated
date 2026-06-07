# Phase 4.4 — Contract Inventory

**Run date:** 2026-06-07  
**Scope:** Governance inventory for Phase 4 NL task-inventory contracts

---

## Backend Contracts (`backend/contracts/`)

| Contract Name | Location | Producer | Consumer | Version |
|---------------|----------|----------|----------|---------|
| TaskInventoryExtraction (JSON) | `schemas/task-inventory-extraction.json` | ML `/extract/task-inventory` | Backend NL orchestrator, resolver DTO | v1 |
| TaskInventoryExtraction (TS) | `typescript/index.ts` → `TaskInventoryExtractionContract` | Shared contract | Backend DTO, orchestrator | v1 |
| TaskInventoryExtraction (Python) | `python/models.py` → `TaskInventoryExtraction` | ML extractor | ML endpoint | v1 |
| TaskKind catalog | `task-kinds.json` | Shared contract | ML schema enum, TS `TASK_KINDS`, Python `TASK_KINDS` | v1 |
| ResolveTaskInventoryRequest | `schemas/task-inventory-resolve-request.json` | Backend API design | `TaskInventoryResolutionController` | v1 |
| ResolvedTaskInventoryIntent | `schemas/task-inventory-resolution.json` | `TaskInventoryResolutionService` | NL orchestrator, workflow handler | v1 |
| Workflow types | `workflow-types.json` | Shared contract | Workflow registry, constants | v1 |
| Workflow types (TS) | `typescript/index.ts` → `WORKFLOW_TYPES` | Shared contract | Backend workflow module | v1 |
| Workflow types (Python) | `python/document_types.py` → `WORKFLOW_TYPES` | Shared contract | ML drift eval | v1 |
| Document types | `document-types.json` | Shared contract | Document ingestion | v1 |
| Suggestion types | `suggestion-types.json` | Shared contract | Document suggestions | v1 |
| Intent types | `intent-types.json` | Shared contract | ML `/classify` | v1 |
| Inventory import schema | `schemas/inventory-import-extraction.json` | ML `/parse` | Document orchestrator | v1 |
| Stock register schema | `schemas/stock-register-extraction.json` | ML `/parse` | Document orchestrator | v1 |
| Classify response schema | `schemas/classify-response.json` | ML `/classify` | WhatsApp classify path | v1 |

---

## ML Contracts (`ml/contracts/`)

| Contract Name | Location | Producer | Consumer | Version |
|---------------|----------|----------|----------|---------|
| TaskInventoryExtraction (JSON) | `schemas/task-inventory-extraction.json` | ML extractor | ML endpoint response validation | v1 |
| TaskInventoryExtraction (Python) | `python/models.py` | ML extractor | `/extract/task-inventory` | v1 |
| TaskInventoryExtraction (TS) | `typescript/index.ts` | Mirror of backend | Drift tests / tooling | v1 |
| TaskKind catalog | `task-kinds.json` | Mirror of backend | ML schema, Python `TASK_KINDS` | v1 |
| Workflow types | `workflow-types.json` | Mirror of backend | ML drift eval | v1 |
| Document / suggestion / intent | Same filenames as backend | ML service | Classify, parse, discovery | v1 |

**Note:** Resolution request/response schemas are **backend-only** (Phase 4.2 resolver is not mirrored to ML — by design).

---

## Backend Runtime Consumers (Phase 4)

| Component | Contracts consumed |
|-----------|-------------------|
| `MlTaskInventoryClient` | `TaskInventoryExtraction` |
| `TaskInventoryResolutionService` | Extraction + resolution interfaces |
| `TaskInventoryNlOrchestratorService` | `TASK_KINDS`, resolution intent |
| `TaskInventoryCreationWorkflowHandler` | `WORKFLOW_TYPE.TASK_INVENTORY_CREATION`, disambiguation payloads |
| `WorkflowRegistry` | All `WORKFLOW_TYPE` values |
| `ContractValidationService` | Document extraction contracts (unchanged) |

---

## Single Source of Truth

| Domain | Canonical file |
|--------|----------------|
| Task kinds | `task-kinds.json` (both repos) |
| Workflow types | `workflow-types.json` (both repos) |
| NL extraction shape | `schemas/task-inventory-extraction.json` (both repos) |
| Resolver response shape | `schemas/task-inventory-resolution.json` (backend only) |

---

*End of contract inventory.*
