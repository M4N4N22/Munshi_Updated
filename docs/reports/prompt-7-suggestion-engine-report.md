# Prompt 7 — Suggestion Engine Report

**Date:** 2026-05-29

---

## SECTION A — Backend Implementation

### Architecture

```
DocumentExtraction (JSONB)
        ↓
DocumentExtractionContractService (validate shape)
        ↓
SuggestionEngineService
        ↓
InventorySuggestionProcessor (domain rules)
        ↓
document_suggestions rows (PENDING)
        ↓
SuggestionApprovalWorkflowHandler (YES/NO)
        ↓
SuggestionExecutionService (backend CRUD only)
```

### Suggestion types

| Type | Trigger | User prompt |
|------|---------|-------------|
| `INITIAL_INVENTORY_IMPORT` | Factory inventory empty + items in extraction | "We detected the following inventory… YES/NO" |
| `NEW_INVENTORY_ITEM` | Item in extraction not in inventory | "New inventory item detected… YES/NO" |
| `STOCK_IN` | Known item + positive quantity | "Stock-in suggested… YES/NO" |
| `STOCK_OUT` | Reserved for future | — |
| `INVENTORY_ADJUSTMENT` | Reserved for future | — |
| `CREATE_VENDOR` | Reserved for purchase invoice flow | — |
| `CREATE_LEDGER_ENTRY` | Reserved for ledger/finance | — |

### Key rule

**Suggestions never auto-execute.** Only `SuggestionExecutionService` performs business actions after approval.

### SuggestionEngineService

- Input: `extraction_id`, `factory_id`
- Output: created `document_suggestions` rows + document status `SUGGESTED`
- Delegates inventory logic to `InventorySuggestionProcessor`

### InventorySuggestionProcessor

- Loads active inventory items (up to 500)
- Matches by SKU (case-insensitive) or name (case-insensitive)
- Empty inventory → single `INITIAL_INVENTORY_IMPORT` suggestion
- Existing inventory → per-line `NEW_INVENTORY_ITEM` or `STOCK_IN`

### Workflow integration

`SuggestionApprovalWorkflowHandler`:

- Type: `SUGGESTION_APPROVAL`
- Step: `CONFIRM`
- YES → `SuggestionExecutionService.executeApprovedSuggestion()`
- NO → `SuggestionExecutionService.rejectSuggestion()`

Started via `POST /documents/suggestions/:id/approve-workflow` with `phone_number`. Active session intercepts WhatsApp messages (same as vendor/worker workflows).

### Execution paths

| Suggestion type | Backend services used |
|-----------------|----------------------|
| `INITIAL_INVENTORY_IMPORT` | `InventoryService.createItem` + `InventoryTransactionService.recordStockIn` |
| `NEW_INVENTORY_ITEM` | Same (optional stock-in if qty present) |
| `STOCK_IN` | `InventoryTransactionService.recordStockIn` only |

Default category **Imported** and location **Default** are auto-created if missing.

### Tests

- `inventory-suggestion.processor.spec.ts` — bootstrap + new item detection
- `suggestion-execution.service.spec.ts` — execution + rejection guards
- `suggestion-approval.handler.spec.ts` — YES/NO workflow

---

## SECTION B — LLM Integration Specification

### Parser → suggestion pipeline

1. LLM outputs structured JSON (see document foundation report)
2. Backend stores extraction
3. Backend generates suggestions — **LLM does not choose suggestion types**
4. Munshi presents `payload.summary` to user
5. User YES/NO → backend executes

### LLM must not

- Create inventory items
- Record stock movements
- Approve or reject suggestions
- Update document status directly

### Expected LLM output quality

| Field quality | Backend behavior |
|---------------|------------------|
| Missing `items[]` | Validation error — no suggestions |
| Duplicate names in extraction | Multiple suggestions generated |
| Wrong quantities | User sees quantities in summary before approval |

### Future expansion

When purchase invoice parsing is added, extend `InventorySuggestionProcessor` or add `ProcurementSuggestionProcessor` registered by document type — same `SuggestionEngineService` orchestration pattern.

---

*Related: [prompt-7-inventory-bootstrap-report.md](./prompt-7-inventory-bootstrap-report.md)*
