# Phase 1.0 — CSV Inventory Import Analysis

**Run date:** 2026-06-06  
**Scope:** Architecture analysis only — no implementation  
**Prerequisite:** Phase 0 **ACCEPTED** (`99-phase0-signoff.md`)

---

## 1. Existing Architecture

### Layer overview

```text
WhatsApp / REST
       ↓
InventoryController ──→ InventoryService ──→ InventoryRepository
       ↓                        ↓
InventoryTransactionService ────┘
       ↓
PostgreSQL: inventory_categories, inventory_locations,
           inventory_items, inventory_transactions
           (+ task_inventory_lines from Phase 0)
```

**Source-of-truth:** Munshi ledger (`inventory_items.current_quantity` updated only via `InventoryTransactionService.applyMovement()`). Phase 0 validated this path for task-driven STOCK_OUT; CSV import must use the same transaction layer.

**Phase 0 integration point:** Items imported via CSV become valid targets for `/assign_delivery`, task `inventory_lines`, and completion-driven stock movement. No changes to `TaskInventoryLine` or `InventoryTransactionService` core logic are required for Phase 1.

---

## 2. Models

### InventoryCategory

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | SERIAL | auto | PK |
| `factory_id` | INTEGER | yes | FK → factories |
| `name` | STRING | yes | unique per `(factory_id, name)` |
| `description` | TEXT | no | max 2000 via service |
| `is_active` | BOOLEAN | default true | soft deactivate |

**Relationships:** has many `InventoryItem`.

### InventoryLocation

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | SERIAL | auto | PK |
| `factory_id` | INTEGER | yes | FK → factories |
| `name` | STRING | yes | unique per `(factory_id, name)` |
| `code` | STRING | no | |
| `address` | TEXT | no | |
| `is_active` | BOOLEAN | default true | |

**Relationships:** has many `InventoryItem`.

**Repository:** `findLocationByName(factoryId, name)` — case-insensitive (`iLike`).

### InventoryItem

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | SERIAL | auto | PK |
| `factory_id` | INTEGER | yes | scoped |
| `category_id` | INTEGER | yes | NOT NULL (migration 004) |
| `location_id` | INTEGER | yes | NOT NULL |
| `sku` | STRING | yes | **unique per `(factory_id, sku)`** |
| `name` | STRING | yes | max 255 |
| `unit` | STRING | yes | max 64 |
| `current_quantity` | DECIMAL(18,4) | default 0 | updated via transactions only |
| `reorder_threshold` | DECIMAL(18,4) | no | non-negative |
| `is_active` | BOOLEAN | default true | |

**Relationships:** belongs to category, location, factory; has many transactions; referenced by `task_inventory_lines`.

**Create path:** `InventoryService.createItem()` always sets `current_quantity = 0`. Initial stock must use `recordStockIn()` separately (same as document import in `suggestion-execution.service.ts`).

### InventoryTransaction

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `transaction_type` | STRING | yes | `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT` |
| `quantity` | DECIMAL(18,4) | yes | positive magnitude for IN/OUT |
| `reference_type` | STRING | no | e.g. `TASK`, `DOCUMENT_SUGGESTION`; **P2 specifies `CSV_IMPORT`** |
| `reference_id` | INTEGER | no | batch/run id or row id |
| `created_by` | INTEGER | no | importer user id |
| `notes` | TEXT | no | max 2000 |

**Immutability:** append-only ledger; no updated_at.

### TaskInventoryLine (Phase 0 — read-only for CSV)

Links tasks to items for completion movements. **Not written during CSV import.** Imported SKUs are consumable by existing Phase 0 WhatsApp assign and completion flows once items exist.

| Field | Notes |
|-------|-------|
| `movement_type` | `STOCK_OUT`, `STOCK_IN`, `TRANSFER` |
| `quantity_expected` | used on task complete |

---

## 3. APIs

### REST — `InventoryController` (`/inventory`)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH | `/categories`, `/locations` | Master data CRUD |
| GET/POST/PATCH | `/items`, `/items/by-sku` | Item CRUD + lookup |
| POST | `/transactions/stock-in`, `stock-out`, `adjustment` | Manual movements |

**Auth:** No global guard on controller in current code; internal callers may use `X-Secret` elsewhere. Phase 1 REST upload should follow existing admin patterns.

**Gap:** No bulk import or multipart CSV endpoint today.

### WhatsApp

| Flow | Entry | Status |
|------|-------|--------|
| Single item | `/inventory_create` workflow | **Exists** |
| Status | `/inventory_status` | **Exists** |
| Delivery assign | `/assign_delivery` | **Exists** (Phase 0.7) |
| Team CSV | Owner home → CSV bulk add → document | **Exists** (`TeamBulkImportService`) |
| **Inventory CSV** | P2: owner menu *Maal CSV se import* | **Not implemented** |

### Document pipeline (parallel, not Phase 1 target)

- `POST /documents/upload` — multipart file
- ML `InventoryImportParser` — flexible column names (CSV/XLS/XLSX)
- `SuggestionExecutionService.executeInitialImport()` — create-only, default category/location, `reference_type: DOCUMENT_SUGGESTION`

Phase 1 CSV should **not** depend on ML; use deterministic Nest parser like team CSV.

---

## 4. Validation Rules

Centralized in `inventory.validation.ts`:

| Function | Rule |
|----------|------|
| `normalizeSku` | trim, uppercase, max 64, required |
| `normalizeInventoryName` | trim, collapse spaces, max 255 |
| `normalizeUnit` | trim, max 64, required |
| `parsePositiveQuantity` | finite, > 0 (stock-in) |
| `parseNonNegativeThreshold` | ≥ 0 or null |
| `resolveNamedSelection` | match category/location by id or exact/partial name |
| `assertFactoryId` | positive integer |

**Service-level:**

- `createItem`: rejects duplicate SKU (`ConflictException`)
- Category/location names unique per factory (case-insensitive on create)
- `recordStockOut`: insufficient stock blocked
- Inactive items cannot transact

**CSV import must reuse these helpers** — do not duplicate validation logic.

---

## 5. File Infrastructure

### Existing capabilities

| Component | Location | Capability |
|-----------|----------|------------|
| **Team CSV parser** | `team-csv.parse.ts` | RFC-style CSV (quoted commas), BOM strip, header validation |
| **Team bulk import** | `team-bulk-import.service.ts` | Pending state by phone, size/row limits, row-by-row import, Hinglish summary |
| **WhatsApp document ingest** | `whatsapp.service.handleIncomingDocument` | Olli media download → team CSV only today |
| **Olli media** | `olli-media.service.ts` | Download WABA attachments |
| **Document upload** | `documents.controller.ts` | `FileInterceptor`, multipart REST |
| **ML tabular reader** | `ml/parsers/common.py` | CSV, TSV, XLS, XLSX; flexible column aliases |
| **ML inventory parser** | `inventory_import_parser.py` | Produces `InventoryImportExtraction` JSON |
| **Contract schema** | `inventory-import-extraction.json` | name required; sku, unit, qty, category, location optional |
| **Web template** | `web/public/team-import/munshi-team-template.csv` | Static download pattern |
| **Document execution** | `suggestion-execution.service.ts` | createItem + recordStockIn pattern |

### Gaps for Phase 1

- No `inventory-csv.parse.ts` or constants
- No `InventoryBulkImportService`
- No owner-home action for inventory CSV (only `HOME_ADD_STOCK` → single-item workflow)
- No `web/public/inventory-import/munshi-inventory-template.csv`
- No `CSV_IMPORT` reference_type constant (P2 only; code uses `DOCUMENT_SUGGESTION`, `TASK`, `ACCEPTANCE_TEST`, etc.)

---

## 6. CSV Feasibility

### Recommended CSV structure (aligned with P2 + baseline)

| Column | Required | Maps to |
|--------|----------|---------|
| `sku` | **yes** | `inventory_items.sku` (normalized uppercase) |
| `name` | **yes** | `inventory_items.name` |
| `category` | **yes** | resolve → `category_id` |
| `location` | **yes** | resolve → `location_id` |
| `unit` | **yes** | `inventory_items.unit` |
| `quantity` | **yes** for bootstrap | `recordStockIn` (not direct column write) |
| `reorder_threshold` | optional | `inventory_items.reorder_threshold` |

**Derived fields:** `factory_id` from authenticated user; `current_quantity` always via ledger; `reference_type = CSV_IMPORT`; `reference_id` = import batch id.

**Optional future columns:** `description`, `location_code`, `category_description` — defer to Phase 1.2+.

### Duplicate detection

| Layer | Strategy |
|-------|----------|
| **Within file** | Reject duplicate SKU rows after normalization (report line numbers) |
| **Against DB** | Upsert key = `(factory_id, sku)` per P2 |
| **Inactive SKU** | Policy: reactivate + update vs skip — recommend update + optional STOCK_IN |

### Error reporting

Mirror `TeamBulkImportService.formatSummary()`:

- Per-row: `added` | `updated` | `skipped` | `failed`
- Line number + SKU + Hinglish detail (max ~120 chars)
- Cap failed rows shown (e.g. 8) with overflow count

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Category/location not found | Row failures | Pre-flight list in template docs; optional auto-create (roadmap decision) |
| Duplicate SKU in CSV | Data confusion | Pre-parse dedupe validation |
| Qty on existing SKU | Wrong stock level | Upsert policy: **additive STOCK_IN** only, never overwrite balance |
| Large files | Timeouts / memory | Row cap (200 like team), 2 MB limit |
| OLLI 401 (Phase 0 DEF-ACC-001) | User sees error after import | Import logic before outbound send; or configure `OLLI_KEY` |
| Bypassing transaction layer | Ledger drift | Always `createItem` + `recordStockIn`, never set `current_quantity` directly |
| XLSX scope creep | Complexity | Phase 1.1–1.3 **CSV only**; ML parser exists for documents later |
| Task-linked items mid-import | Race with completion | Factory-scoped transactions per row; no global lock needed for v1 |

---

## 8. Recommendations

### Import strategy — **Option C: Upsert by SKU** (recommended)

| Case | Behavior |
|------|----------|
| New SKU | `createItem` + `recordStockIn(qty)` with `reference_type: CSV_IMPORT` |
| Existing SKU | `updateItem` (name, unit, category, location, threshold) + if qty > 0, **additional** `recordStockIn` |
| Duplicate row in file | Fail row 2+ with clear message |

**Why not A (create-only)?** Re-import would fail on every existing SKU — poor MSME UX for template corrections.

**Why not B (create-or-update without qty rules)?** Ambiguous quantity semantics; upsert with explicit additive stock matches ledger model.

### Transaction strategy — **B: Partial success** (recommended)

Process row-by-row in a loop (same as team CSV). Each row in its own DB transaction. Failed rows do not roll back successful rows.

**Why not A (full rollback)?** One bad category name would reject entire file — harsh for 200-row sheets.

**Why not C (configurable)?** Defer to Phase 1.4+; partial success matches WhatsApp summary UX and team import precedent.

### Implementation alignment

1. **Mirror team CSV architecture** — constants, parse module, bulk service, owner-home hook, document handler branch.
2. **Reuse inventory service APIs** — no new repository methods required for v1.
3. **Add `CSV_IMPORT` reference constant** in `inventory.constants.ts` (Phase 1.3).
4. **Static template on web** — P2 path `web/public/inventory-import/munshi-inventory-template.csv`.
5. **Do not modify** `InventoryTransactionService`, `InventoryRepository` core movement logic, or Phase 0 task paths.

### Phase 0 carry-forward

- Imported items immediately usable with `/assign_delivery` and task completion STOCK_OUT.
- DEF-ACC-001/002: configure OLLI for live WhatsApp import summary delivery.

---

## References

- `docs/p2-inventory-task-integrations.md` — Phase 1 spec
- `99-phase0-signoff.md` — Phase 0 accepted
- `team-bulk-import.service.ts` — reference implementation
- `suggestion-execution.service.ts` — createItem + recordStockIn pattern
