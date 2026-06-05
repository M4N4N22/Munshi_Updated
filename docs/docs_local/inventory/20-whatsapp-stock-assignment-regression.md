# Phase 0.7 — WhatsApp Assign With Stock Regression Report

**Run date:** 2026-06-06  
**Change scope:** WhatsApp command orchestration only (no inventory core changes)

---

## Phase Verification

| Phase | Unchanged? | Evidence |
|-------|------------|----------|
| **0.1** Foundation | **YES** | No schema/migration changes; foundation tests PASS |
| **0.2** Persistence | **YES** | Persist/retrieve/delete test PASS |
| **0.3** Movement | **YES** | STOCK_IN/OUT, guards, idempotency tests PASS |
| **0.4** Safety | **YES** | Atomicity, rollback, reopen tests PASS |
| **0.5** Integration harness | **YES** | 12/12 suite PASS; no test file changes |
| **0.6** WhatsApp notifications | **YES** | `notifyTaskCompleted` / templates untouched |

---

## Files Touched vs Forbidden

| Forbidden area | Modified? |
|----------------|-----------|
| `InventoryRepository` | **No** |
| `InventoryTransactionService` | **No** |
| `task_inventory_lines` schema / migrations | **No** |
| `tasks.inventory.helper.ts` | **No** |
| Integration test assertions | **No** |
| `tasks.service.ts` (completion/movement) | **No** |

| Allowed area | Modified? |
|--------------|-----------|
| `whatsapp.constants.ts` | **Yes** |
| `whatsapp.templates.ts` | **Yes** |
| `whatsapp.service.ts` | **Yes** |

---

## Integration Test Evidence

```text
Tests: 12 passed, 12 total
Failures: 0
Exit code: 0
```

All Phase 0 inventory scenarios remain green after assign-with-stock implementation.

---

## Behavioral Checks

| Case | Expected | Verified |
|------|----------|----------|
| `/assign` without inventory | Unchanged | Code path preserved |
| Task completion with lines | STOCK_OUT movement + notification | Integration tests PASS |
| `assignToAll` + inventory guard | Still rejected | Integration scenario PASS |
| Non-inventory task completion notify | English template | Phase 0.6 path unchanged |

---

## Verdict

**No Phase 0 regression detected.** Phase 0.7 adds a new WhatsApp entry point that delegates to existing `assignToUser()` and inventory line persistence. Inventory lifecycle and completion behavior are unchanged.

**Phase 0 (P2 inventory task integration) is complete.**
