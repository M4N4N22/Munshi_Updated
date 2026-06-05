# Phase 1.0 — CSV Import Roadmap

**Run date:** 2026-06-06  
**Scope:** Implementation plan for Phase 1 — no code in this task

---

## Overview

```text
Phase 1.1 Upload Endpoint
        ↓
Phase 1.2 Validation Engine  ← can start in parallel with 1.1 parser skeleton
        ↓
Phase 1.3 Import Processing
        ↓
Phase 1.4 Import Reporting
        ↓
Phase 1.5 Acceptance Testing
```

**Dependency rule:** 1.3 requires 1.1 + 1.2. 1.4 is embedded in 1.3 service but hardened in 1.4. 1.5 validates all.

---

## Phase 1.1 — CSV Upload Endpoint

**Goal:** Accept inventory CSV via REST (and wire file bytes into import pipeline).

### Deliverables

| Item | Detail |
|------|--------|
| REST endpoint | `POST /inventory/import/csv` (or `/inventory/import`) — multipart `file`, query `factory_id`, body/header `created_by` |
| Auth | Align with existing admin pattern (`X-Secret` or future JWT) |
| File limits | 2 MB, `.csv` only for REST v1 |
| Response | `{ batch_id, status: 'parsed' \| 'failed', errors? }` or defer full processing to 1.3 — minimum: accept + return parse preview |

### Acceptance criteria

- Valid CSV returns 200 with parse success payload
- Invalid extension returns 400
- Oversized file returns 400
- No DB writes required in 1.1 if processing deferred — **prefer** thin controller calling parser only for AC isolation

### Dependencies

- None (can stub `InventoryImportService`)

### Estimated touch

- New controller method or module
- `FileInterceptor` pattern from `documents.controller.ts`

---

## Phase 1.2 — CSV Validation Engine

**Goal:** Deterministic parser + row validator with unit tests (no DB).

### Deliverables

| Item | Detail |
|------|--------|
| `inventory-csv.constants.ts` | Headers: `sku`, `name`, `category`, `location`, `unit`, `quantity`, optional `reorder_threshold` |
| `inventory-csv.parse.ts` | Clone mechanics from `team-csv.parse.ts` |
| Row type | `InventoryCsvRow { line, sku, name, category, location, unit, quantity, reorder_threshold? }` |
| Intra-file dedupe | Detect duplicate SKUs after normalization |
| Unit tests | Valid file, missing headers, empty file, duplicate SKU, bad quantity, Hindi/UTF-8 BOM |

### Acceptance criteria (P2)

- Parser unit tests with valid/invalid rows — **green**
- No Nest bootstrap required for parser tests

### Dependencies

- None

### Key decisions to lock

| Decision | Recommendation |
|----------|----------------|
| Category/location missing | Fail row with Hinglish message (strict v1); auto-create in 1.3 optional flag |
| Quantity empty | Treat as 0 (metadata-only upsert) |
| Quantity negative | Fail row |

---

## Phase 1.3 — CSV Import Processing

**Goal:** Upsert items by SKU; initial/additional qty via `recordStockIn` with `CSV_IMPORT` reference.

### Deliverables

| Item | Detail |
|------|--------|
| `inventory-import.service.ts` | `processImport(factoryId, userId, rows, batchId)` |
| Upsert logic | New → `createItem` + optional `recordStockIn`; Existing → `updateItem` + optional `recordStockIn` |
| Category/location resolution | `findCategoryByName` / `findLocationByName` (case-insensitive) |
| Reference | `reference_type: 'CSV_IMPORT'`, `reference_id: batchId` |
| Per-row transaction | Sequelize transaction per row |
| Constant | `INVENTORY_REFERENCE_TYPE.CSV_IMPORT` in `inventory.constants.ts` |

### Acceptance criteria (P2)

- Import 10 rows → 10 items + 10 STOCK_IN transactions (new SKUs, qty > 0)
- Re-import same SKU → update metadata + additional STOCK_IN if qty > 0
- Failed row does not undo prior rows

### Dependencies

- **1.2** parser
- **1.1** optional (REST triggers this service)

### Integration points

- Must not modify `InventoryTransactionService.applyMovement` internals
- Reuse `InventoryService` public methods only

---

## Phase 1.4 — Import Reporting

**Goal:** Owner-facing summary (WhatsApp + REST JSON).

### Deliverables

| Item | Detail |
|------|--------|
| `inventory-bulk-import.service.ts` | Mirror `TeamBulkImportService` pending TTL, `formatSummary()` |
| WhatsApp: owner home action | `HOME_INVENTORY_CSV` → start awaiting + template CTA |
| WhatsApp: document handler | Branch in `handleIncomingDocument` when inventory CSV pending |
| Hinglish templates | `waSection('CSV import complete', ...)` — added/updated/skipped/failed counts |
| REST report | Same counts + row details array |
| Web template | `web/public/inventory-import/munshi-inventory-template.csv` |
| Env | `MUNSHI_INVENTORY_CSV_TEMPLATE_URL` in `.env.example` |

### Acceptance criteria (P2)

- WhatsApp flow: start → upload → summary with counts
- Template URL documented and downloadable
- Failed rows list first 8 errors (team pattern)

### Dependencies

- **1.3** processing service
- OLLI configured for live WhatsApp (see DEF-ACC-001)

### UX copy (draft)

```text
✅ 8 add hue
🔄 2 update hue
⏭️ 1 skip
❌ 1 fail

• Line 12 (CEMENT_X): Category "Roofing" nahi mila
```

---

## Phase 1.5 — Acceptance Testing

**Goal:** Validate Phase 1 same rigor as Phase 0 acceptance.

### Deliverables

| Item | Detail |
|------|--------|
| Integration tests | `inventory-csv-import.integration.spec.ts` — 10-row import, upsert, partial failure, duplicate SKU in file |
| CI | Extend `.github/workflows/inventory-integration.yml` or new job |
| Manual scenarios | REST upload + WhatsApp `/webhook/test` document simulation |
| Reports | `22-csv-import-validation.md`, signoff doc |

### Test scenarios

1. Fresh factory — import 3 items — verify items + STOCK_IN + quantities
2. Re-import — update name + add qty — verify ledger has 2 STOCK_IN per SKU
3. Bad category row — verify partial success + stock unchanged for failed row
4. Duplicate SKU in CSV — verify second row failed
5. Regression — Phase 0 integration **12/12** still PASS
6. Imported SKU — `/assign_delivery` + complete — STOCK_OUT works (Phase 0 linkage)

### Dependencies

- **1.1–1.4** complete

---

## Implementation order summary

| Order | Phase | PR suggestion | Blocks |
|-------|-------|---------------|--------|
| 1 | **1.2** Validation engine + tests | `feat/inventory-csv-parser` | — |
| 2 | **1.3** Import processing + integration tests | `feat/inventory-csv-import-core` | 1.2 |
| 3 | **1.1** REST upload endpoint | `feat/inventory-csv-upload-api` | 1.2, 1.3 |
| 4 | **1.4** WhatsApp + template + reporting | `feat/inventory-csv-whatsapp` | 1.3 |
| 5 | **1.5** Acceptance + CI + docs | `feat/inventory-csv-acceptance` | 1.1–1.4 |

**Note:** P2 doc orders 1.1 parser → 1.2 service → 1.3 WhatsApp. This roadmap puts **parser first (1.2)** then **core import (1.3)** because service depends on validated rows — equivalent to P2 1.1+1.2 combined.

---

## Phase 0 prerequisites (verified)

| Prerequisite | Status |
|--------------|--------|
| Inventory master tables | ✅ |
| Transaction ledger | ✅ |
| Task-linked stock | ✅ Phase 0 accepted |
| Team CSV pattern | ✅ Reference impl |
| CI Postgres + migrate | ✅ |

---

## Out of scope (later phases)

| Item | Phase |
|------|-------|
| XLS/XLSX via Nest | Defer — ML parser exists for documents |
| Zoho sync | Phase 2 |
| Auto-create category/location | Optional 1.3 enhancement |
| Import history table | Phase 1.4+ if audit needed |
| Domain events on import | Phase 3 |

---

## Agent prompt (when implementing)

```text
Implement Phase 1.2–1.3 from docs/docs_local/inventory/21-csv-import-*.md:
inventory-csv.parse (mirror team-csv), upsert by SKU via InventoryService +
recordStockIn(CSV_IMPORT). Partial success per row. Do not modify
InventoryTransactionService internals. Add parser unit tests and integration
test for 10-row import.
```
