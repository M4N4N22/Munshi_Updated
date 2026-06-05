# Phase 2.5.1 — Stock Push Event Capture Analysis

**Run date:** 2026-06-04  
**Scope:** Event capture only — no push execution

---

## 1. Task Completion Flow

```text
Owner/Worker completes task (REST or WhatsApp)
    ↓
TasksService.completeTaskWithAtomicInventory()
    ↓
taskHasInventoryLines()?
    ├─ No  → task.update({ is_completed: true }) — no inventory, no events
    └─ Yes → BEGIN Sequelize transaction
                 executeTaskInventoryMovements()  — per line STOCK_IN / STOCK_OUT
                 task.update({ is_completed: true })
               COMMIT
    ↓
publishZohoStockPushRequestedEvents()  — post-commit only (R-P05-02)
    ↓
DomainEventsService.publish() → domain_events row (PENDING)
    ↓
DomainEventsProcessorCron.dispatch() — no-op (unchanged)
```

**Entry points into `completeTaskWithAtomicInventory()`:**

| Caller | Path |
|--------|------|
| `completeTask()` | Worker/owner REST completion |
| `updateTask()` | Patch with `is_completed: true` |
| `adminComplete()` | Admin force-complete |

All inventory-linked completions share the same atomic transaction and post-commit publish path.

---

## 2. Publish Location

**Selected:** `TasksService.completeTaskWithAtomicInventory()` — immediately after `sequelize.transaction()` resolves.

**Rationale:**

| Option | Verdict |
|--------|---------|
| Inside `executeTaskInventoryMovements()` | **Rejected** — runs inside transaction; violates R-P05-02 |
| Inside `InventoryTransactionService.applyMovement()` | **Rejected** — would fire for CSV, ZOHO_PULL, REST, documents |
| Post-commit query by `reference_type=TASK` | **Rejected** — duplicate DB round-trip; IDs already available from movement records |
| Post-commit in `completeTaskWithAtomicInventory()` | **Selected** — TASK-only by construction; IDs returned from helper; zero extra queries |

**R-P05-02 mitigation:** Events are published only when the outer `sequelize.transaction()` promise resolves successfully. Rollback or thrown errors skip the publish block entirely.

---

## 3. Event Payload Design

**Event type:** `zoho.stock_push.requested` (`DOMAIN_EVENT_TYPE.ZOHO_STOCK_PUSH_REQUESTED`)

**Aggregate:** `inventory_transaction:{id}`

**Payload (minimal):**

```json
{
  "factory_id": 123,
  "inventory_transaction_id": 456,
  "task_id": 789,
  "transaction_type": "STOCK_OUT"
}
```

| Field | Source |
|-------|--------|
| `factory_id` | Task row |
| `inventory_transaction_id` | `IInventoryTransactionRecord.id` from `recordStockIn` / `recordStockOut` |
| `task_id` | Task being completed |
| `transaction_type` | Ledger row type (`STOCK_IN` / `STOCK_OUT`) |

**Cardinality:** One event per inventory transaction row. Multi-line tasks with two STOCK_OUT lines produce two events.

**Not included (deferred to 2.5.2+):** Zoho item mapping, external IDs, idempotency keys, push delivery status.

---

## 4. Risks

| ID | Risk | Mitigation in 2.5.1 | Residual |
|----|------|---------------------|----------|
| R-P05-02 | Event before commit → phantom push intent | Publish after transaction resolves | Low — pattern is explicit in service |
| R-P05-03 | Non-TASK paths emit events | Publish only from task completion helper path | Low — CSV/ZOHO_PULL/REST unchanged |
| R-P05-04 | Duplicate events on retry | Not addressed in 2.5.1 | **Open** — idempotency table in 2.5.2 |
| R-P05-05 | Task complete but event publish fails | Task/inventory already committed | **Open** — handler retry + outbox in 2.5.2 |
| R-P05-06 | Multi-line partial failure | Existing atomic transaction rolls back all lines | None — no events on rollback |

---

## 5. Non-Task Paths (No Events)

| Path | `reference_type` | Events in 2.5.1 |
|------|------------------|-----------------|
| Task completion | `TASK` | **Yes** |
| CSV import | `CSV_IMPORT` | No |
| Zoho pull sync | `ZOHO_PULL` | No |
| Document suggestions | `DOCUMENT_SUGGESTION` | No |
| REST admin transactions | caller-provided | No |

Filtering is structural: only `completeTaskWithAtomicInventory()` calls `publishZohoStockPushRequestedEvents()`.
