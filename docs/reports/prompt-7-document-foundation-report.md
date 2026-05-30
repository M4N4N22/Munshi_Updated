# Prompt 7 — Document Processing Foundation Report

**Date:** 2026-05-29  
**Scope:** Backend document registry, entities, migrations, REST API (no parsing, no LLM)

---

## SECTION A — Backend Implementation

### Overview

Prompt 7 introduces a **Document Processing Foundation** that lets future LLM parsers submit structured JSON. The backend stores documents, extractions, and suggestions. **No OCR, PDF, CSV, Excel parsing, or LLM code was implemented.**

### Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| `Document` | `documents` | Uploaded document metadata (factory-scoped) |
| `DocumentProcessingJob` | `document_processing_jobs` | Async job tracking for future parsers |
| `DocumentExtraction` | `document_extractions` | Structured LLM/parser output (JSONB) |
| `DocumentSuggestion` | `document_suggestions` | Action suggestions awaiting approval |

### Enums

**Document types:** `PURCHASE_INVOICE`, `GOODS_RECEIPT`, `STOCK_REGISTER`, `INVENTORY_IMPORT`, `LEDGER_EXPORT`, `BANK_STATEMENT`, `UNKNOWN`

**Document status:** `UPLOADED` → `PROCESSING` → `EXTRACTED` → `SUGGESTED` → `APPROVED` / `REJECTED` / `FAILED`

**Suggestion status:** `PENDING`, `APPROVED`, `REJECTED`, `EXECUTED`, `FAILED`

### Module layout

```
src/services/documents/
├── documents.module.ts
├── documents.controller.ts
├── documents.service.ts
├── documents.repository.ts
├── documents.schema.ts
├── documents.interfaces.ts
├── documents.constants.ts
├── documents.dto.ts
├── document-registry.ts
├── document-extraction-contract.service.ts
├── inventory-suggestion.processor.ts
├── suggestion-engine.service.ts
└── suggestion-execution.service.ts
```

### REST API (`/documents`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/documents/registry/types` | List document type contracts |
| GET | `/documents?factory_id=` | List documents |
| GET | `/documents/:id?factory_id=` | Get document |
| POST | `/documents` | Register metadata |
| POST | `/documents/:id/extractions` | Store structured extraction |
| POST | `/documents/:id/extractions/:extractionId/suggestions` | Generate suggestions |
| GET | `/documents/:id/suggestions?factory_id=` | List suggestions |
| POST | `/documents/suggestions/:id/approve-workflow` | Start YES/NO workflow |
| POST | `/documents/suggestions/:id/reject` | Reject via REST |

### Extraction contract (store only)

Example payload accepted by `POST .../extractions`:

```json
{
  "document_type": "INVENTORY_IMPORT",
  "items": [
    { "name": "Cement", "quantity": 500 },
    { "name": "Steel Rod", "quantity": 200 }
  ]
}
```

Validated by `DocumentExtractionContractService` — **validates shape, does not parse files.**

### Document registry

`DocumentRegistry` registers contracts per document type with:

- `expectedFields`
- `suggestedActions`

No parser implementations — registry only.

### Migration

**File:** `migrations/005_document_processing.sql`

Creates four tables with factory-scoped indexes. Apply after `004_inventory_master.sql`.

### Factory isolation

All queries filter by `factory_id`. Document creation validates factory exists.

### Regression

- WhatsApp flows unchanged (except new workflow type registered)
- Inventory, vendor, worker onboarding, tasks, attendance unaffected
- ML integration untouched
- **95 tests passing** (15 new document/workflow tests)

---

## SECTION B — LLM Integration Specification

### Parser responsibilities (future)

The LLM/parser system MUST:

1. Accept raw document bytes (out of scope for backend Prompt 7)
2. Output JSON matching the extraction contract
3. POST to `POST /documents/:id/extractions`

The LLM MUST NOT call inventory CRUD, vendor CRUD, or ledger APIs directly.

### Contract: INVENTORY_IMPORT

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_type` | string | yes | `INVENTORY_IMPORT` |
| `items[]` | array | yes | Line items |
| `items[].name` | string | yes | Item name |
| `items[].quantity` | number | no | Opening quantity |
| `items[].sku` | string | no | SKU if known |
| `items[].unit` | string | no | Unit of measure |

**Example output:**

```json
{
  "document_type": "INVENTORY_IMPORT",
  "items": [
    { "name": "Cement", "quantity": 500 },
    { "name": "Steel Rod", "quantity": 200 }
  ]
}
```

**Suggested backend actions (generated, not executed by LLM):** `INITIAL_INVENTORY_IMPORT`

### Contract: PURCHASE_INVOICE (future)

| Field | Type | Required |
|-------|------|----------|
| `vendor_name` | string | no |
| `invoice_number` | string | no |
| `invoice_date` | string (ISO date) | no |
| `items[].item_name` | string | yes |
| `items[].quantity` | number | no |
| `items[].unit_price` | number | no |
| `items[].total` | number | no |

**Suggested actions:** `STOCK_IN`, `CREATE_VENDOR`

### Intent specification (document upload — future)

| Intent | Training examples | Expected command |
|--------|-------------------|------------------|
| Upload inventory | "here is my stock list", "inventory sheet" | REST upload + extraction pipeline |
| Confirm inventory | "yes that's correct", "confirm" | Workflow YES (handled by backend) |

---

*Related: [prompt-7-suggestion-engine-report.md](./prompt-7-suggestion-engine-report.md)*
