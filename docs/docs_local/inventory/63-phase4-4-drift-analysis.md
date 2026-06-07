# Phase 4.4 — Drift Analysis

**Run date:** 2026-06-07

---

## Method

Compared `backend/contracts/` vs `ml/contracts/` for:

- JSON schemas (byte-level equality where mirrored)
- TypeScript `typescript/index.ts` const arrays and interfaces
- Python `python/models.py` and `python/document_types.py`
- Backend runtime constants vs JSON catalogs

---

## TaskInventoryExtraction

| Check | Backend | ML | Status |
|-------|---------|-----|--------|
| JSON schema | `schemas/task-inventory-extraction.json` | Same path | **PASS** (identical) |
| Required fields | 4 keys always present | Same | **PASS** |
| Nullability | All fields `string\|null` or `number\|null` | Same | **PASS** |
| `additionalProperties` | `false` | Same | **PASS** |
| `task_kind` enum | delivery, issue, inventory_count + null | Same | **PASS** |
| TS `TASK_KINDS` | 3 values | 3 values | **PASS** (fixed in 4.4: ML `WORKFLOW_TYPES` was missing `TASK_INVENTORY_CREATION`) |
| Python `TaskInventoryExtraction` | Pydantic model | Identical file | **PASS** |
| Python Literal vs catalog | Matches `task-kinds.json` | Same | **PASS** |

### Remediation applied (4.4)

- **ML TypeScript drift:** `ml/contracts/typescript/index.ts` was missing `TASK_INVENTORY_CREATION` in `WORKFLOW_TYPES` — **fixed**.
- **Python governance:** Added `TASK_KINDS` loaded from `task-kinds.json` in both repos' `document_types.py`.

---

## TaskInventoryResolution

| Check | Status |
|-------|--------|
| Request DTO keys vs extraction schema | **PASS** |
| Response interface vs new JSON schema | **PASS** |
| Disambiguation payload types | **PASS** (`inventory_disambiguation`, `worker_disambiguation`) |
| Resolver status enum | **PASS** (`resolved`, `ambiguous`, `not_found`) |
| ML mirror | N/A — backend-internal contract |

New schemas added (backend only):

- `schemas/task-inventory-resolve-request.json`
- `schemas/task-inventory-resolution.json`

---

## TaskKind Catalog

| Check | Status |
|-------|--------|
| `task-kinds.json` backend vs ML | **PASS** (identical, v1) |
| Catalog vs extraction schema enum | **PASS** |
| Catalog vs TS `TASK_KINDS` | **PASS** |
| Catalog vs Python Literal in models | **PASS** |
| Orchestrator imports `TASK_KINDS` | **PASS** |

---

## Workflow Types

| Check | Status |
|-------|--------|
| `workflow-types.json` backend vs ML | **PASS** (identical) |
| JSON types vs `WORKFLOW_TYPE` constants | **PASS** (8 types) |
| JSON start_commands vs `WORKFLOW_START_COMMANDS` | **PASS** |
| TS `WORKFLOW_TYPES` backend vs ML | **PASS** (after fix) |
| Handler coverage for all types | **PASS** (8 handler files) |
| Orphaned types | **None detected** |

---

## Version Alignment

| File | Backend | ML |
|------|---------|-----|
| `CONTRACT_VERSION` / JSON `version` | v1 | v1 |
| `task-kinds.json` | v1 | v1 |
| `workflow-types.json` | v1 | v1 |

---

## Detected Issues (pre-4.4)

| Issue | Severity | Resolution |
|-------|----------|------------|
| ML TS missing `TASK_INVENTORY_CREATION` | Medium | Fixed |
| No resolution JSON schema | Low | Added backend schemas |
| No Phase 4 drift tests | High | Added `phase4-contract-drift.spec.ts` |
| Python `TASK_KINDS` not loaded from JSON | Low | Fixed |
| CI does not run unit drift tests | Medium | Documented (see validation report) |

---

*End of drift analysis.*
