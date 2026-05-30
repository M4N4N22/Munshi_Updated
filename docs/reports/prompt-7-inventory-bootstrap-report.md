# Prompt 7 — Inventory Bootstrap & Document Integration Report

**Date:** 2026-05-29

---

## SECTION A — Backend Implementation

### Scenario 1 — First-time inventory (bootstrap)

**Precondition:** Factory has zero active inventory items.

**Flow:**

1. Owner uploads document metadata (`POST /documents`)
2. Future parser posts extraction:

```json
{
  "document_type": "INVENTORY_IMPORT",
  "items": [
    { "name": "Cement", "quantity": 500 },
    { "name": "Steel Rod", "quantity": 200 }
  ]
}
```

3. `POST /documents/:id/extractions` → status `EXTRACTED`
4. `POST /documents/:id/extractions/:extractionId/suggestions` → one suggestion:

   **Type:** `INITIAL_INVENTORY_IMPORT`

5. Start approval workflow → Munshi asks:

   > We detected the following inventory:
   > • Cement — 500
   > • Steel Rod — 200
   > Is this your inventory? Reply YES or NO.

6. **YES:** Backend creates items + `STOCK_IN` transactions (via `InventoryTransactionService`)
7. **NO:** Suggestion rejected; document → `REJECTED` if all suggestions rejected

### Scenario 2 — Existing inventory + new item

**Precondition:** Inventory contains Cement, Steel Rod.

**Extraction items:** Cement, Steel Rod, Aluminium Sheet

**Suggestions generated:**

| Item | Suggestion |
|------|------------|
| Cement (qty 10) | `STOCK_IN` |
| Steel Rod | none (no qty) |
| Aluminium Sheet | `NEW_INVENTORY_ITEM` |

**NEW_INVENTORY_ITEM prompt:**

> New inventory item detected: Aluminium Sheet — qty 5
> Create inventory item? Reply YES or NO.

### Quantity strategy preserved

All quantities written through `InventoryTransactionService` — **Option B cache** from Prompt 6 unchanged.

### Reference linking

Stock-in transactions include:

- `reference_type: DOCUMENT_SUGGESTION`
- `reference_id: <suggestion_id>`

### Default master data

Bootstrap creates if missing:

- Category: **Imported**
- Location: **Default**

SKU auto-derived from item name when not provided in extraction.

### Integration with existing inventory flows

| Flow | Status |
|------|--------|
| Manual REST item create | Unchanged |
| `/inventory_create` workflow | Unchanged |
| `/inventory_status` | Unchanged |
| Direct quantity updates | Still blocked (transactions only) |

---

## SECTION B — LLM Integration Specification

### Document type: INVENTORY_IMPORT

**When to use:** Opening stock sheet, CSV/Excel export of inventory (parsed externally).

**Required fields:**

```json
{
  "document_type": "INVENTORY_IMPORT",
  "items": [{ "name": "string", "quantity": "number?" }]
}
```

**Field definitions:**

| Field | Definition |
|-------|------------|
| `name` | Human-readable item name; matched case-insensitively against existing inventory |
| `quantity` | Opening balance; if omitted, item created at zero |
| `sku` | Optional; if present, used for matching before name |
| `unit` | Optional; defaults to `units` on create |

### Document type: STOCK_REGISTER

Same item array shape. Backend treats similarly for suggestion generation when inventory exists.

### Training examples (intent — future)

| User message | Expected behavior |
|--------------|-------------------|
| "This is my full inventory" | Classify as document upload intent; route to upload pipeline |
| "Yes that's my stock" | Workflow YES — **not** LLM CRUD |
| "No that's wrong" | Workflow NO |

### Example parser output (bootstrap)

```json
{
  "document_type": "INVENTORY_IMPORT",
  "items": [
    { "name": "Cement", "quantity": 500, "unit": "bags" },
    { "name": "Steel Rod", "quantity": 200, "unit": "pcs" }
  ]
}
```

**Expected backend suggestion:** `INITIAL_INVENTORY_IMPORT` (when inventory empty)

---

*Related: [prompt-7-llm-specification-framework.md](./prompt-7-llm-specification-framework.md)*
