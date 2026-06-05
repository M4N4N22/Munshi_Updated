# Phase 0.3 Preparation — Completion Path Impact Analysis

Documentation-only impact assessment for introducing **task completion → inventory movement**.

---

## 1. Potentially Affected Files

### Must change (HIGH)

| File | Why |
|------|-----|
| `backend/src/services/tasks/tasks.service.ts` | All completion paths; load `task_inventory_lines`; invoke transaction service; update `quantity_completed` (if adopted) |
| `backend/src/services/tasks/tasks.module.ts` | `imports: [InventoryModule]`; inject `InventoryTransactionService` |

### May change (MEDIUM / LOW)

| File | Why | Risk |
|------|-----|------|
| New helper e.g. `tasks.inventory-completion.ts` | Map lines → movements; idempotency | LOW |
| New `tasks.inventory.constants.ts` | `REFERENCE_TYPE_TASK`, movement enums | LOW |
| `*.spec.ts` under tasks or inventory | Integration tests per p2 AC | MEDIUM |
| `docs/docs_local/inventory/07-*` | Post-implementation reports | LOW |

### Should not change in minimal Phase 0.3 (per p2 §0.4)

| File | Why |
|------|-----|
| `backend/migrations/*` | Table exists |
| `backend/src/modules/whatsapp/*` | Already calls `completeTask` |
| `backend/src/services/inventory/inventory-transaction.service.ts` | Consume public API |
| `backend/src/services/workflow/*` | No task completion today |

**NOT VERIFIED IN CODEBASE:** Whether Phase 0.3 includes notification changes (p2 §0.6) or only movement hook (§0.4).

---

## 2. Direct Dependencies

| Dependency | Direction | Verified |
|------------|-----------|----------|
| `InventoryTransactionService` | Tasks → Inventory | Exported from `InventoryModule` |
| `TaskInventoryLine` model | Tasks → DB | Phase 0.1 |
| `task_inventory_lines` rows | Read at completion | Phase 0.2 persist |
| `InventoryItem` | Validated inside `applyMovement` | Item must exist, active, factory-scoped |

**No current dependency** from Tasks to Inventory — **new coupling in 0.3**.

---

## 3. Indirect Dependencies

| System | Impact |
|--------|--------|
| **WhatsApp UX** | Completion errors (insufficient stock) surface via `completeTask` return message — **NOT VERIFIED IN CODEBASE** Hindi copy in 0.3 |
| **REST admin** | `adminComplete` / `adminUpdate` may or may not move stock — behavior depends on ownership decision |
| **Low stock alerts** | P2 Layer 3 — after STOCK_OUT; **not in minimal 0.3** per p2 phasing |
| **Domain events** | P2 mentions publish from complete — `dispatch()` is no-op today (**verified in prior analysis docs**) |
| **Reports** | Read completed tasks; stock reports read ledger — indirect consistency dependency |
| **ML / contracts** | `/complete` intent unchanged |

---

## 4. High-Risk Areas

| Area | Risk | Corruption mechanism |
|------|------|----------------------|
| **Duplicate movement** | HIGH | `adminComplete` without idempotency; reopen + re-complete |
| **assignToAll + lines** | HIGH | N tasks × same line × N completions |
| **Split transactions** | HIGH | Task marked complete, stock not moved (or vice versa) |
| **Multi-line partial failure** | HIGH | Line 1 STOCK_OUT succeeds, line 2 fails — task state vs stock |
| **Wrong movement_type** | MEDIUM | `TRANSFER` unmapped → runtime error or wrong method |
| **Wrong quantity field** | MEDIUM | `quantity_expected` vs remaining (`expected - completed`) |
| **REST vs WhatsApp parity** | MEDIUM | Stock moves on one path only |

---

## 5. Inventory Corruption Risks

| Scenario | Outcome | Verified? |
|----------|---------|-----------|
| Double STOCK_OUT same task | `current_quantity` too low | Risk **verified**; no idempotency |
| assignToAll 3 workers complete | 3× expected consumption | **Verified** code path |
| Complete with qty > stock | Blocked by `applyMovement` | **Verified** — task may still complete if hook after update |
| Complete with invalid item id | `NotFoundException` from inventory | **Verified** |
| Reopen after complete | Stock not restored | **Verified** — no reversal |
| Hook after `task.update` on failure | Task complete, stock unchanged | **Verified** ordering risk if not transactional |

**Ordering note:** P2 says "after mark complete" and "block completion on insufficient stock" — **requires hook BEFORE or within same transaction as** `is_completed = true` to satisfy both. **NOT VERIFIED IN CODEBASE** as implemented.

---

## 6. Rollback Considerations

| Layer | Rollback |
|-------|----------|
| **Code rollback** | Revert `tasks.service.ts` + `tasks.module.ts` — tasks complete without stock (current behavior) |
| **Data** | Ledger rows with `reference_type='TASK'` remain — manual adjustment or compensating transactions |
| **`quantity_completed`** | If updated in 0.3, rollback leaves inconsistent vs ledger — **NOT VERIFIED** cleanup script |
| **Partial deploy** | Old code + new lines in DB — lines ignored on complete until hook deployed |

**No verified automated rollback** for mistaken TASK-linked movements.

---

## 7. Recommended Phase 0.3 Scope Boundaries

Boundaries derived from **verified p2 Phase 0.4–0.5** and codebase gaps — **product team must confirm**.

### In scope (minimal, p2-aligned)

1. Hook stock movement when a task with `task_inventory_lines` transitions to complete.
2. Use `reference_type: 'TASK'`, `reference_id: task.id`, `created_by` from completer.
3. Map `STOCK_IN` / `STOCK_OUT` lines to `recordStockIn` / `recordStockOut`.
4. Block completion when insufficient stock (p2 design decision #2).
5. Import `InventoryModule` in `TasksModule`.

### Explicitly out of scope (verified not required for first movement PR)

| Item | Evidence |
|------|----------|
| WhatsApp stock assign (p2 §0.7) | Separate phase |
| Hindi stock notification (p2 §0.6) | Separate phase |
| Low-stock events (Layer 3) | Separate phase |
| Zoho / CSV integration | P2 Layer 1 |
| Partial delivery (`quantity_completed` partial) | P2 decision #3 Phase 2 |
| `task_kind` column | P2 optional 0.1 |
| Reversal on reopen | **NOT VERIFIED IN CODEBASE** |

### Decisions required before coding (from analysis)

1. **All completion paths vs `completeTask` only** — code/p2 gap documented in §3 of analysis doc.
2. **Idempotency** — required before enabling admin paths.
3. **`assignToAll` policy** — block lines on batch assign or accept N× risk.
4. **`TRANSFER` handling** — map or reject.
5. **Transaction boundary** — pre-update vs post-update hook vs wrapped transaction.

---

## NEXT IMPLEMENTATION TARGETS

1. Product sign-off on scope boundaries above.
2. Phase 0.3 implementation PR limited to movement hook + insufficient-stock block.
3. Phase 0.4+ notifications, WhatsApp assign, assignToAll policy in separate PRs.
