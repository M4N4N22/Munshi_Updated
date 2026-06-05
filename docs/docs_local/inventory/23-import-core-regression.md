# Phase 1.2 — Import Processing Core Regression Report

**Run date:** 2026-06-06  
**Change scope:** New `InventoryImportService` + module wiring + constants only

---

## Phase Verification

| Phase | Unchanged? | Evidence |
|-------|------------|----------|
| **0.1** Foundation | **YES** | Schema/migrations untouched; foundation test PASS |
| **0.2** Persistence | **YES** | Persist/retrieve/delete test PASS |
| **0.3** Movement | **YES** | STOCK_IN/OUT, guards, idempotency tests PASS |
| **0.4** Safety | **YES** | Atomicity, rollback, reopen tests PASS |
| **0.5** Integration harness | **YES** | Phase 0 suite 12/12 PASS; assertions unchanged |
| **0.6** WhatsApp notifications | **YES** | Notification templates/handlers untouched |
| **0.7** Assign with stock | **YES** | WhatsApp assign_delivery path untouched |

---

## Files Touched vs Forbidden

| Forbidden area | Modified? |
|----------------|-----------|
| `InventoryTransactionService` internals | **No** |
| `InventoryRepository` transaction/movement logic | **No** |
| `task_inventory_lines` schema / migrations | **No** |
| `tasks.inventory.helper.ts` | **No** |
| `tasks.service.ts` (completion/movement) | **No** |
| Phase 0 integration test assertions | **No** |
| WhatsApp module / owner home | **No** |

| Allowed area | Modified? |
|--------------|-----------|
| `inventory.constants.ts` | **Yes** — `CSV_IMPORT` reference type |
| `inventory.module.ts` | **Yes** — register/export import service |
| `inventory-import.service.ts` | **Yes** — new file |
| `inventory-csv-import.integration.spec.ts` | **Yes** — new test file |

---

## Integration Test Evidence

```text
task-inventory-phase0.integration.spec.ts: 12 passed, 0 failed
inventory-csv-import.integration.spec.ts:   7 passed, 0 failed
Total integration:                         19 passed, 0 failed
Exit code: 0
```

All Phase 0 inventory scenarios remain green after Phase 1.2 import core implementation.

---

## Behavioral Checks

| Case | Expected | Verified |
|------|----------|----------|
| Task completion STOCK_OUT | Unchanged ledger path | Phase 0 scenario 1 PASS |
| Multi-line rollback | Unchanged | Phase 0 scenario 4 PASS |
| Insufficient stock guard | Unchanged | Phase 0 scenario 5 PASS |
| Reopen inventory task | Still rejected | Phase 0 scenario 6 PASS |
| assignToAll + inventory lines | Still rejected | Phase 0 scenario 8 PASS |
| Duplicate completion idempotency | Unchanged | Phase 0 scenario 10 PASS |
| CSV import qty semantics | Additive STOCK_IN only | Phase 1.2 scenario 7 PASS |

---

## Phase 1.1 Regression

| Check | Result |
|-------|--------|
| Parser unit tests (8) | **PASS** — no parser file changes in Phase 1.2 |

---

## Verdict

**No Phase 0 regression detected.** Phase 1.2 adds a standalone import processing service that delegates quantity changes exclusively to the existing `recordStockIn()` public API. Task inventory lifecycle, movement guards, and WhatsApp orchestration are unchanged.

**Phase 1.2 (import processing core) is complete.**
