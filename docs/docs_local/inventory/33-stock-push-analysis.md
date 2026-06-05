# Phase 2.5A — Async Stock Push Analysis

**Run date:** 2026-06-04  
**Scope:** Architecture analysis only — no implementation  
**Prerequisite:** Phases 2.1–2.4 validated (`32-scheduled-sync-validation.md`)

---

## 1. Current Inventory Movement Architecture

### 1.1 Source of truth

```text
inventory_transactions (append-only ledger)
        ↓
InventoryTransactionService.applyMovement()
        ↓
inventory_items.current_quantity (derived cache, row-locked)
```

**Munshi ledger is authoritative.** Zoho is a downstream consumer after Phases 2.3–2.4 pull bootstrap. Outbound push must never write back to Munshi quantity from Zoho responses.

### 1.2 Core service — `InventoryTransactionService`

All quantity mutations funnel through three public methods, each delegating to private `applyMovement()`:

| Method | Transaction type | Delta sign |
|--------|------------------|------------|
| `recordStockIn()` | `STOCK_IN` | +qty |
| `recordStockOut()` | `STOCK_OUT` | −qty |
| `recordAdjustment()` | `ADJUSTMENT` | signed delta |

`applyMovement()` enforces:

- Row lock via `findItemById(..., transaction)`
- Active item check
- Non-negative stock after movement
- Append-only `inventory_transactions` row
- Update `current_quantity` cache in same DB transaction

**Push must not modify this service.** Capture happens *after* ledger commit.

### 1.3 Every inventory movement entry point

| # | Entry point | Path | Transaction types | `reference_type` |
|---|-------------|------|-------------------|------------------|
| 1 | **Task completion** | `TasksService.completeTaskWithAtomicInventory()` → `executeTaskInventoryMovements()` | STOCK_IN, STOCK_OUT | `TASK` |
| 2 | **CSV import** | `InventoryImportService.processImport()` → `recordCsvStockIn()` | STOCK_IN | `CSV_IMPORT` |
| 3 | **Zoho pull sync** | `ZohoPullSyncService.processItem()` (new items only) | STOCK_IN | `ZOHO_PULL` |
| 4 | **REST admin** | `InventoryController` POST `/inventory/transactions/*` | IN/OUT/ADJ | caller-provided or null |
| 5 | **Document suggestions** | `SuggestionExecutionService.executeStockIn()` | STOCK_IN | `DOCUMENT_SUGGESTION` |
| 6 | **WhatsApp inventory create** | `InventoryCreateHandler` — creates item metadata; stock via separate flows | (item create only) | — |

Task completion is **atomic**: inventory movements and `tasks.is_completed = true` share one Sequelize transaction (`tasks.service.ts` lines 142–152).

### 1.4 Reference types (constants)

| Constant | Value | Writer |
|----------|-------|--------|
| `TASK_INVENTORY_REFERENCE_TYPE` | `TASK` | Task inventory helper |
| `INVENTORY_REFERENCE_TYPE.CSV_IMPORT` | `CSV_IMPORT` | Import service |
| `INVENTORY_REFERENCE_TYPE.ZOHO_PULL` | `ZOHO_PULL` | Pull sync service |
| `INVENTORY_REFERENCE_TYPE.ZOHO_PUSH` | `ZOHO_PUSH` | **Reserved** — not yet written |
| Ad hoc | `DOCUMENT_SUGGESTION`, REST null/custom | Documents / admin |

`ZOHO_PUSH` was added in Phase 2.1 as a constant only. **Recommended use in 2.5:** audit metadata on push delivery records or `integration_sync_runs.error_summary` — **not** as a new Munshi ledger row (push mirrors existing ledger rows).

### 1.5 Task inventory completion flow

```text
Owner/Worker completes task (WhatsApp or REST)
    ↓
TasksService.completeTaskWithAtomicInventory()
    ↓
BEGIN TRANSACTION
    executeTaskInventoryMovements()  — per line STOCK_IN or STOCK_OUT
    task.update({ is_completed: true })
COMMIT
    ↓
(no domain event today — dispatch is no-op)
```

Supported line types: `STOCK_IN`, `STOCK_OUT`. `TRANSFER` rejected at completion.

### 1.6 CSV_IMPORT flow (R-D01 discipline)

```text
CSV row → upsert item metadata (qty=0 on create)
    → if qty > 0: recordStockIn(CSV_IMPORT, batchId)
```

Never sets `current_quantity` from CSV directly. Re-import is additive.

### 1.7 ZOHO_PULL flow (R-Z06 discipline)

```text
Zoho item (unmapped) → create item (qty=0)
    → if stock > 0: recordStockIn(ZOHO_PULL, syncRunId)
Mapped item re-sync → metadata only, no additional stock
```

Scheduled cron (Phase 2.4) reuses same pull service with `trigger=cron`.

### 1.8 Ownership boundaries

| Layer | Owns | Must not own |
|-------|------|--------------|
| `InventoryTransactionService` | Ledger + cache update | External API calls |
| Task inventory helper | Task-scoped movements | Zoho mapping |
| Import / pull services | Bootstrap paths | Push to Zoho |
| Integration layer (2.1–2.4) | Connections, mappings, sync audit | Quantity semantics |
| **Phase 2.5 (proposed)** | Outbound mirror + retry | Munshi quantity changes |

---

## 2. Outbound Sync Candidates

P2 v1 scope per `p2-inventory-task-integrations.md` and `28-zoho-risk-register.md`: **task completion first**; CSV push deferred.

| Event | Movement | Push to Zoho? | Recommendation | Justification |
|-------|----------|---------------|----------------|---------------|
| **Task complete — STOCK_OUT** | Consumption / issue | **SYNC** | **Primary P2.5 target** | Operational truth leaves Munshi on task completion; Zoho must reflect consumption |
| **Task complete — STOCK_IN** | Production / receive | **SYNC (v1.1 optional)** | Include if Zoho supports adjustment-in; same capture point | Same atomic completion; lower priority than STOCK_OUT |
| **REST STOCK_OUT / ADJUSTMENT** | Admin correction | **IGNORE (v1)** | No product workflow; risk of double-count vs tasks | Defer to Phase 3+ policy |
| **REST STOCK_IN** | Admin add | **IGNORE (v1)** | Same | Defer |
| **CSV_IMPORT STOCK_IN** | Bootstrap | **IGNORE (v1)** | Risk register Q3: task-only v1; CSV already Munshi-side import | Optional 2.5+ |
| **ZOHO_PULL STOCK_IN** | Inbound bootstrap | **IGNORE** | **Critical — prevents feedback loop** | Zoho is source for pull; pushing pull qty back corrupts Zoho |
| **DOCUMENT_SUGGESTION STOCK_IN** | ML/doc path | **IGNORE (v1)** | Low volume; mapping often missing | Phase 3+ |
| **Future: purchase receive** | GRN | **SYNC (future)** | Not in codebase yet | New event type when built |
| **Future: transfer between locations** | TRANSFER | **IGNORE** | Task TRANSFER unsupported; multi-warehouse out of P2 scope | 28-zoho-roadmap out of scope |

**Capture granularity:** one domain event per **inventory transaction row** (not per task), keyed by `inventory_transaction_id`, so partial line failures and idempotency are per-movement.

---

## 3. Source Of Truth Review

### 3.1 Model validation

| Principle | Outbound push compliance |
|-----------|-------------------------|
| Munshi ledger authoritative | Push reads ledger row; never writes `current_quantity` |
| Zoho is mirror | Zoho API adjustment is best-effort async |
| Task commit succeeds even if push fails | Event after DB commit; failure → retry queue |
| Pull ≠ push | Never push movements with `reference_type = ZOHO_PULL` |
| Mapping required | Skip unmapped items; log + observability |

### 3.2 Risks to source-of-truth

| Risk | Description | Severity |
|------|-------------|----------|
| **R-ST-01** | Push handler writes Munshi qty from Zoho response | **Critical** — forbidden |
| **R-ST-02** | Push before ledger commit | **Critical** — event must fire after transaction commit |
| **R-ST-03** | Pushing ZOHO_PULL / CSV_IMPORT rows | **High** — double-count in Zoho |
| **R-ST-04** | Zoho failure blocks task completion | **High** — must stay async |
| **R-ST-05** | Duplicate push inflates/deflates Zoho | **High** — idempotency required (R-Z10) |

---

## 4. Risks (summary)

| ID | Risk | Phase owner |
|----|------|-------------|
| R-Z10 | Double push on replay | 2.5 |
| R-Z09 | Unmapped item on push | 2.5 |
| R-O01 | Domain event dispatch no-op | 2.5 (first real handler) |
| R-ST-02 | Event before commit | 2.5.1 |
| R-ST-03 | Loop from inbound rows | 2.5.1 filter |
| R-Z02 | Token expiry during push | Reuse `refreshConnectionIfNeeded` |
| R-Z08 | Rate limits | Backoff in processor |

---

## 5. Recommendations

1. **Scope v1 push to `reference_type = TASK` movements only** (STOCK_OUT required; STOCK_IN optional same PR or fast follow).

2. **Use existing `domain_events` outbox** (Option C — see `33-stock-push-options.md`) rather than new queue infrastructure.

3. **Add idempotency store** — small `integration_push_deliveries` table OR unique constraint on `(connection_id, inventory_transaction_id)`; required for R-Z10.

4. **Reuse `integration_sync_runs`** with `direction=push`, `trigger=task_complete` for batch audit; per-transaction detail in push deliveries table or event payload.

5. **Minimal touch to `tasks.inventory.helper`:** publish event(s) only **after** outer transaction commits — implement in `TasksService` post-commit hook, not inside helper loop.

6. **Do not use `ZOHO_PUSH` as a ledger reference_type** for outbound mirror; reserve for optional future audit row or sync metadata only.

7. **Filter exclusions explicitly:** never enqueue `ZOHO_PULL`, `CSV_IMPORT`, `DOCUMENT_SUGGESTION`.

8. **Mock Zoho HTTP in all CI tests** — same pattern as Phases 2.2–2.4.

---

## 6. Existing integration assets (ready for 2.5)

| Asset | Status | Push use |
|-------|--------|----------|
| `integration_connections` | Live | Token + factory scope |
| `integration_item_mappings` | Live | `external_id` for Zoho item |
| `integration_sync_runs` | Live | Push batch audit |
| `ZohoOAuthService.refreshConnectionIfNeeded` | Live | Pre-push token |
| `DomainEventsService.publish` | Live | Event capture |
| `DomainEventsProcessorCron` | Live (no-op dispatch) | Retry worker shell |
| `ZOHO_PUSH` constant | Defined unused | Audit naming only |
