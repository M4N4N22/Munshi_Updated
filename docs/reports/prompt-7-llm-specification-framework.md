# Prompt 7 — LLM Specification Documentation Framework

**Date:** 2026-05-29  
**Purpose:** Enable a separate Cursor instance to build Intent Classification and Document Parsing using reports only.

---

## Framework rules

Starting Prompt 7, every Munshi feature report contains:

1. **SECTION A — Backend Implementation** (what exists in NestJS)
2. **SECTION B — LLM Integration Specification** (what a future LLM system must do)

### Critical architectural boundary

| LLM MAY | LLM MUST NOT |
|---------|--------------|
| Classify user intent | Create/update inventory |
| Parse documents to JSON | Create vendors |
| Return structured extraction | Approve suggestions |
| | Perform any CRUD |

All business actions execute in backend services after user approval.

---

## Document type specification template

Use this template for each new document type:

```markdown
### Document Type: {TYPE_NAME}

**Description:** {one line}

**Expected fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|

**Example output:**

```json
{ ... }
```

**Suggested actions:** {SUGGESTION_TYPE list}

**Validation rules:** {backend contract rules}
```

---

## Registered document types (Prompt 7)

### PURCHASE_INVOICE

| Field | Type | Required |
|-------|------|----------|
| `vendor_name` | string | no |
| `invoice_number` | string | no |
| `invoice_date` | string | no |
| `items[].item_name` | string | yes |
| `items[].quantity` | number | no |
| `items[].unit_price` | number | no |
| `items[].total` | number | no |

**Suggested actions:** `STOCK_IN`, `CREATE_VENDOR`

**Example:**

```json
{
  "document_type": "PURCHASE_INVOICE",
  "vendor_name": "ABC Steel",
  "invoice_number": "INV-2026-001",
  "items": [
    { "item_name": "Steel Rod", "quantity": 100, "unit_price": 50, "total": 5000 }
  ]
}
```

### GOODS_RECEIPT

| Field | Type | Required |
|-------|------|----------|
| `vendor_name` | string | no |
| `items[].name` | string | yes |
| `items[].quantity` | number | no |

**Suggested actions:** `STOCK_IN`

### STOCK_REGISTER

| Field | Type | Required |
|-------|------|----------|
| `items[].name` | string | yes |
| `items[].quantity` | number | no |

**Suggested actions:** `STOCK_IN`, `STOCK_OUT`, `INVENTORY_ADJUSTMENT`

### INVENTORY_IMPORT

| Field | Type | Required |
|-------|------|----------|
| `items[].name` | string | yes |
| `items[].quantity` | number | no |
| `items[].sku` | string | no |
| `items[].unit` | string | no |

**Suggested actions:** `INITIAL_INVENTORY_IMPORT`

### LEDGER_EXPORT / BANK_STATEMENT

Reserved — contracts registered; execution not implemented in Prompt 7.

**Suggested actions:** `CREATE_LEDGER_ENTRY`

---

## Intent specification template

```markdown
### Intent: {Name}

**Training examples:**
- {example 1}
- {example 2}

**Expected command / route:** {/slash or REST pipeline}

**Must NOT:** {forbidden LLM actions}
```

---

## Document-related intents (future)

### Intent: Upload inventory document

**Training examples:**

- "Here is my inventory list"
- "Upload stock register"
- "This Excel has all my items"

**Expected route:** Document upload REST pipeline (not direct CRUD)

**Must NOT:** Parse and create items in one LLM step

### Intent: Confirm document suggestion

**Training examples:**

- "Yes"
- "Confirm"
- "That's correct"

**Expected behavior:** Handled by active `SUGGESTION_APPROVAL` workflow — backend executes on YES

**Must NOT:** LLM calling inventory APIs

### Intent: Reject document suggestion

**Training examples:**

- "No"
- "That's wrong"
- "Reject"

**Expected behavior:** Workflow NO → backend marks suggestion rejected

---

## API integration checklist for LLM team

1. `POST /documents` — register file metadata
2. `POST /documents/:id/extractions` — submit parser JSON
3. `POST /documents/:id/extractions/:extractionId/suggestions` — trigger suggestion engine
4. `POST /documents/suggestions/:id/approve-workflow` — start WhatsApp YES/NO
5. User replies YES/NO on WhatsApp — workflow handler executes

---

## SECTION A — Backend Implementation

Framework artifacts:

- `DocumentRegistry` — type contracts
- `DocumentExtractionContractService` — payload validation
- `documents.interfaces.ts` — TypeScript contracts
- Reports with dual sections (this document + all Prompt 7 reports)

---

## SECTION B — LLM Integration Specification

A future LLM project should:

1. Read all `docs/reports/prompt-7-*.md` files
2. Implement parsers that output JSON matching contracts
3. Implement intent classifier that routes to upload/confirm flows — never CRUD
4. POST extractions to backend REST — never bypass suggestion engine

---

*Related: [prompt-7-next-steps.md](./prompt-7-next-steps.md)*
