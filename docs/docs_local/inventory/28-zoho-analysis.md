# Phase 2.0 — Zoho Integration Architecture Analysis

**Run date:** 2026-06-06  
**Scope:** Analysis and planning only — no implementation  
**Prerequisite:** Phase 0 **ACCEPTED**, Phase 1 **COMPLETE** (`27-phase1-final-signoff.md`)

---

## 1. Current Inventory Architecture

### 1.1 Data model (Postgres + Sequelize)

| Entity | Table | Key constraints |
|--------|-------|-----------------|
| `InventoryCategory` | `inventory_categories` | `(factory_id, name)` unique |
| `InventoryLocation` | `inventory_locations` | `(factory_id, name)` unique |
| `InventoryItem` | `inventory_items` | `(factory_id, sku)` unique; `category_id`, `location_id` NOT NULL |
| `InventoryTransaction` | `inventory_transactions` | Append-only ledger; `(reference_type, reference_id)` indexed |

**Source of truth for on-hand quantity:** `inventory_items.current_quantity`, updated **only** via `InventoryTransactionService.applyMovement()` (never direct SQL/DTO overwrite).

### 1.2 Services and responsibilities

| Service | Role | Zoho touchpoint |
|---------|------|-----------------|
| `InventoryTransactionService` | `recordStockIn/Out/Adjustment`; row lock + ledger write | **Push target** (async mirror) — do not modify internals |
| `InventoryRepository` | CRUD, lookups, `findCategoryByName`, `findLocationByName` | Pull sync creates/updates via public paths |
| `InventoryService` | REST-facing item/category/location API | Unchanged for Zoho v1 |
| `InventoryImportService` | CSV upsert + `CSV_IMPORT` STOCK_IN | Coexists with Zoho bootstrap |
| `InventoryImportUploadService` | File gate → parser → import | REST only |
| `InventoryBulkImportService` | WhatsApp CSV orchestration | Coexists with Zoho |
| `executeTaskInventoryMovements` | Task complete → `TASK` reference STOCK_IN/OUT | **Primary ops path**; triggers push queue |

### 1.3 Current source of truth

```text
Munshi inventory_transactions (immutable ledger)
        ↓
InventoryTransactionService.applyMovement()
        ↓
inventory_items.current_quantity (derived cache)
```

**Operational truth:** Munshi ledger after Phase 0 task integration and Phase 1 CSV import. External systems are downstream mirrors in P2 design.

### 1.4 Stock movement lifecycle

| Path | Trigger | `reference_type` | Notes |
|------|---------|------------------|-------|
| Task completion | `executeTaskInventoryMovements` | `TASK` | STOCK_IN / STOCK_OUT; blocks on insufficient stock |
| CSV import | `InventoryImportService` | `CSV_IMPORT` | Additive qty via `recordStockIn` only (R-D01) |
| REST admin | `InventoryController` | Caller-provided or null | Direct stock-in/out/adjustment |
| Document suggestions | `suggestion-execution.service` | Document path | Separate from CSV/Zoho |

### 1.5 Inventory import lifecycle (Phase 1)

```text
CSV bytes (WhatsApp / REST)
  → parseInventoryCsvText()
  → InventoryImportService.processImport(factoryId, userId, rows, batchId)
  → per row: upsert metadata + optional recordStockIn(CSV_IMPORT, batchId)
  → summary (added/updated/failed/skipped)
```

Category/location resolved by **name** (must pre-exist). Re-import adds ledger rows; never overwrites `current_quantity` from CSV.

### 1.6 Transaction references in production use

| `reference_type` | Writer | `reference_id` |
|------------------|--------|----------------|
| `TASK` | Task inventory helper | `task.id` |
| `CSV_IMPORT` | Import service | `batchId` |
| (REST) | Ad-hoc | Optional |

Index: `(reference_type, reference_id)` on `inventory_transactions`.

### 1.7 Multi-tenant constraints

- All inventory queries scoped by `factory_id`.
- SKU uniqueness per factory, not global.
- OAuth connections must be **one active connection per factory per provider** (recommended).
- Workers cannot connect integrations (owner/manager only per P2 UX).

### 1.8 Ownership boundaries

| Layer | Owns |
|-------|------|
| Munshi ledger | Task ops, CSV import, manual REST adjustments |
| Zoho (Phase 2) | Bootstrap catalog + optional qty mirror |
| Mappings table | Links `zoho_item_id` ↔ `inventory_item_id` per connection |

---

## 2. Existing Integration Infrastructure

### 2.1 OAuth / tokens

| Finding | Detail |
|---------|--------|
| **No OAuth implementation** | No `access_token`, `refresh_token`, or OAuth callback routes in repo |
| **No token encryption utility** | P2 mentions encrypt-at-rest; must be built in Phase 2.2 |
| **Web onboarding OTP** | Phone OTP via MSG91 — not reusable for Zoho OAuth |
| **Guards** | `X_SECRET` header pattern exists; not OAuth |

### 2.2 External API clients

| Client | Usage |
|--------|-------|
| `axios` | ML classify, OLLI media, messaging |
| `OlliMediaService` | WhatsApp media download with retry fallbacks |
| **No Zoho SDK** | Greenfield |

**Reusable pattern:** Injectable HTTP client service with timeout, structured logging, idempotent retries at job level (not inside `InventoryTransactionService`).

### 2.3 Cron / scheduling

| Job | File | Schedule |
|-----|------|----------|
| Domain events outbox | `domain-events.processor.cron.ts` | Every minute |
| Workflow expiry | `workflow-expiry.cron.ts` | Hourly |
| Task deadlines | `task-deadline.cron.ts` | Hourly :10 IST |
| Attendance reminders | `whatsapp.service.ts` | Daily 9 AM IST |
| Business discovery | `business-discovery-reminder.cron.ts` | Hourly |
| Onboarding OTP cleanup | `onboarding-otp.cron.ts` | Hourly |

**Framework:** `@nestjs/schedule` + `ScheduleModule.forRoot()` in `AppModule`.

**Zoho nightly pull:** Can follow `domain-events.processor.cron` or dedicated `ZohoSyncCron` in Phase 2.4.

### 2.4 Domain events (outbox)

| Component | Status |
|-----------|--------|
| Table `domain_events` | **Exists** (migration `007_p0_finance_foundation.sql`) |
| `DomainEventsService.publish()` | **Works** — persists PENDING events |
| `DomainEventsService.dispatch()` | **No-op** — handlers not wired |
| Retry | Up to 5 attempts; FAILED terminal state |
| Cron processor | `processPendingBatch(50)` every minute |

**Zoho fit:** Publish `INTEGRATION_SYNC_FAILED`, `ZOHO_STOCK_PUSH_REQUESTED` from task completion; handler calls Zoho client asynchronously.

### 2.5 Webhook handling

| Webhook | Purpose |
|---------|---------|
| `POST /webhook` | Olli WhatsApp inbound |
| No Zoho webhook | P2 v1: polling/cron pull only |

### 2.6 Document / ML integration (adjacent)

- `DocumentProcessingOrchestrator` + `INVENTORY_IMPORT` document type — ML extraction path separate from Nest CSV parser.
- Zoho pull should **not** reuse ML parser; use Zoho Inventory REST API directly.

---

## 3. Source Of Truth Analysis

### 3.1 P2 decision (validated)

| System | Role |
|--------|------|
| **Munshi ledger** | Primary source of truth for operations |
| **Zoho** | Bootstrap catalog + external mirror (async push) |
| **CSV** | Bootstrap / bulk update (already live) |

### 3.2 Benefits

- Task completion guards and Hindi UX remain authoritative.
- Phase 0/1 investment preserved; no bidirectional sync complexity in v1.
- Failed Zoho push does not block task complete (async queue + retry).

### 3.3 Risks

| Risk | Impact |
|------|--------|
| Zoho qty diverges from Munshi | Owner sees different numbers in Zoho dashboard |
| Pull overwrites metadata | Name/category drift if pull is too aggressive |
| Double bootstrap | CSV + Zoho both add stock for same SKU |

### 3.4 Recommendation

**Confirm P2 v1 decision:** Munshi wins for task-driven movements. Zoho pull:

- **Initial sync:** Create items + mappings + optional STOCK_IN with `reference_type=ZOHO_PULL` (new constant).
- **Periodic pull:** Metadata refresh only, or qty as **additive adjustment** with explicit policy flag — never overwrite ledger silently.
- **Push:** Queue on TASK/CSV movements when connection active; idempotent by `(connection_id, transaction_id)`.

---

## 4. Zoho Fit Assessment

| P2 requirement | Fit with current architecture |
|----------------|------------------------------|
| 2.1 Integration foundation | New migration `011_integration_*.sql`; new module `integrations/` or `zoho/` |
| 2.2 OAuth on web | New web route + backend callback; tokens in `integration_connections` |
| 2.3 Pull sync | Service calls Zoho API → maps to items → `recordStockIn` for bootstrap qty |
| 2.4 Scheduled sync | Nest cron + `integration_sync_runs` audit |
| 2.5 Async stock push | Domain event or dedicated queue table; **after** Munshi ledger commit |

**Extension points (public APIs only):**

- `InventoryImportService`-style upsert pattern for Zoho items (new `ZohoInventorySyncService`, not modification of import service).
- `InventoryTransactionService.recordStockIn/Out` with new reference types `ZOHO_PULL`, `ZOHO_PUSH`.
- `DomainEventsService.publish()` for push jobs.

**Not needed for v1:** Changes to `applyMovement` internals, task helper, or CSV parser.

---

## 5. Risks (summary)

See `28-zoho-risk-register.md` for full matrix. Top items:

1. Token security at rest (no encryption utility today).
2. SKU collision between CSV-imported and Zoho-pulled items.
3. Rate limits / OAuth token expiry during cron pull.
4. Multi-warehouse Zoho vs single Munshi location model.
5. Domain event dispatch still no-op — must wire before push alerts.

---

## 6. Recommendations

1. **New module:** `backend/src/services/integrations/` (connections, mappings, sync runs, Zoho client).
2. **Migration `011_integration_foundation.sql`** — three tables per P2; add `integration_push_queue` optional for Phase 2.5 idempotency.
3. **Reference types:** Add `ZOHO_PULL`, `ZOHO_PUSH` constants alongside `CSV_IMPORT`, `TASK`.
4. **Phase order:** 2.1 tables → 2.2 OAuth → 2.3 pull (manual trigger first) → 2.4 cron → 2.5 push via domain events.
5. **Do not** modify `InventoryTransactionService.applyMovement` — call public `recordStockIn/Out` only.
6. **Web:** Connect/disconnect page under `/onboarding` or new `/settings/integrations` (product decision).
7. **Env:** `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, `ZOHO_INVENTORY_API_BASE` in `backend/.env.example`.
8. **Testing:** Factory-scoped integration tests with mocked Zoho HTTP; Phase 0/1 regression suite unchanged.

---

## 7. Phase 1 baseline (unchanged by this analysis)

| Phase | Status |
|-------|--------|
| 0 Task inventory | Complete — 12/12 integration |
| 1 CSV import stack | Complete — parser, core, REST, WhatsApp, template |
| Zoho | **Not started** — this document begins Phase 2 planning |
