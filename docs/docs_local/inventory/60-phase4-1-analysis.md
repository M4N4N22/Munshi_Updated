# Phase 4.1 — Contract Analysis

**Run date:** 2026-06-06  
**Scope:** ML extraction schema for natural-language inventory task creation  
**Out of scope:** Backend resolver (4.2), confirmation workflow (4.3), contract drift tests (4.4)

---

## Objective

Define structured ML output for messages like *"Ram ko 20 cement bags deliver kar do"* without implementing task creation, inventory matching, or WhatsApp confirmation.

---

## Existing ML Response Schemas

| Schema | Location | Purpose |
|--------|----------|---------|
| `classify-response.json` | `backend/contracts/schemas/` | `/classify` intent routing (`intent`, `worker_slug`, `task_description`, etc.) |
| `inventory-import-extraction.json` | same | Document parse — tabular CSV rows |
| `stock-register-extraction.json` | same | Document parse — stock register rows |

**Pattern:** JSON Schema in `contracts/schemas/`, mirrored Pydantic models in `contracts/python/models.py`, TypeScript types in `contracts/typescript/index.ts`. ML service duplicates contracts under `ml/contracts/`.

---

## Current Backend Consumers

| Consumer | Contract used | Notes |
|----------|---------------|-------|
| `WhatsAppService` | `ClassifyResponse` via `POST /classify` | Free-text → intent command; **unchanged in 4.1** |
| `MlParserAdapter` | `ParseResponse` via `POST /parse` | Document CSV extraction; **unchanged** |
| `ContractValidationService` | Document extraction payloads | Validates `INVENTORY_IMPORT` / `STOCK_REGISTER` only |
| `contract-drift.spec.ts` | Enum + schema drift | Existing tests; no Phase 4.1 drift suite (deferred to 4.4) |

**Finding:** No backend consumer yet for task inventory extraction — contract is forward-looking for Phase 4.2 resolver.

---

## Current ML Endpoints

| Endpoint | Input | Output |
|----------|-------|--------|
| `POST /classify?message=` | Plain text | `ClassifyResponse` |
| `POST /convert?message=` | WhatsApp formatted text | `{ message: string }` |
| `POST /parse` | Base64 document | `ParseResponse` |
| **`POST /extract/task-inventory?message=`** | Plain text | **`TaskInventoryExtraction` (new)** |

---

## Current Classify vs Extraction Gap

`/classify` returns routing intent (e.g. `/assign`, `/assign_clarify`) with optional `worker_slug` and `task_description`. It does **not** extract:

- Item name or SKU
- Quantity for stock movement
- Task kind (`delivery`, `issue`, `inventory_count`)

Phase 0 uses structured slash command `/assign_delivery @worker SKU qty`. Phase 4.1 adds a **parallel extraction contract** for NL input without changing classify behaviour.

---

## Task Assignment Flow (Today)

1. **Structured:** `/assign_delivery @ramesh CEMENT_50KG 5` → `WhatsAppService` → `TasksService.createTask` + inventory lines.
2. **NL classify:** `"rahul ko kaam do"` → `/assign` with `worker_slug`; no inventory linkage.
3. **Assign clarify:** `"aaj website banegi"` → `/assign_clarify`; no inventory fields.

Phase 4.1 does not wire extraction into this flow.

---

## Inventory Item Model (Relevant Fields)

From `inventory_items` / REST DTOs:

- `sku` — uppercase identifier (e.g. `CEMENT_50KG`)
- `name` — display name
- `unit`, `reorder_threshold`

Extraction returns **hints** (`item_name_or_sku`), not resolved IDs.

---

## User / Worker Model (Relevant Fields)

- Roles: `OWNER`, `MANAGER`, `WORKER`
- Lookup by phone; display names used in WhatsApp mentions
- Extraction returns **assignee_hint** (e.g. `"Ram"`), not `user_id`

---

## Findings Summary

| # | Finding |
|---|---------|
| 1 | Document extraction contracts are not reusable for NL tasks — different shape (single item + assignee + kind vs item array). |
| 2 | Classify endpoint must remain unchanged for Phase 0–3 UAT compatibility. |
| 3 | New endpoint isolates Phase 4.1 from existing pipelines. |
| 4 | Shared contract in `backend/contracts/` and `ml/contracts/` follows established v1 pattern. |
| 5 | Rule-based extraction preferred over LLM for 4.1 to avoid hallucination; null when uncertain. |

---

*End of analysis.*
