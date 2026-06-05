# Phase 0.4 — Inventory Safety Hardening — Impact Analysis

## 1. Files Modified

| File | Change |
|------|--------|
| `inventory-transaction.service.ts` | Optional parent transaction propagation |
| `tasks.inventory.helper.ts` | Multi-line tx participation |
| `tasks.service.ts` | Atomic completion + reopen guards |

---

## 2. Direct Dependencies

| Dependency | Impact |
|------------|--------|
| `InventoryTransactionService` | New optional 2nd parameter — backward compatible |
| `InventoryRepository` | Unchanged — already transaction-aware |
| `Task` / `TaskInventoryLine` models | Reopen check via line count |
| Shared Sequelize instance | Outer transaction from `taskModel.sequelize` |

---

## 3. Indirect Dependencies

| Consumer | Impact |
|----------|--------|
| **REST admin** | Reopen on inventory-linked tasks returns 400 |
| **WhatsApp complete** | Atomic completion when lines exist; errors roll back stock |
| **Inventory callers** (documents, REST) | Unchanged — omit optional `transaction` |
| **Operators** | Cannot reopen stock-linked tasks without support intervention |

---

## 4. Inventory Corruption Risks

| Risk | Before 0.4 | After 0.4 |
|------|------------|-----------|
| Partial multi-line commit | HIGH | **LOW** |
| Complete without stock / stock without complete (linked) | MEDIUM | **LOW** |
| Reopen + re-complete double stock | HIGH | **LOW** (reopen blocked) |
| Retry after failed complete with partial ledger | MEDIUM | **LOW** |

---

## 5. Rollback Considerations

| Scenario | Action |
|----------|--------|
| Revert Phase 0.4 code | Returns to Phase 0.3 partial-commit behavior |
| Data from successful 0.4 completes | Valid TASK ledger rows remain |
| Reopen attempts | Blocked in 0.4; revert would allow reopen again (stock inconsistency risk) |

---

## 6. Future Impact

| Phase | Notes |
|-------|-------|
| Partial delivery | Needs `quantity_completed` + atomic partial movement |
| Reversal policy | Would replace block-reopen (Option B from 08 analysis) |
| Integration tests | Should assert outer tx behavior |
| Unique TASK reference index | Optional migration — not in 0.4 |

---

## Transaction Boundary Summary

| Operation | Transaction scope |
|-----------|-------------------|
| Single REST stock in/out (unchanged) | One movement = one `sequelize.transaction` |
| Task complete, no lines | Autocommit `task.update` |
| Task complete, with lines | **One outer tx**: all movements + task row |
| Reopen blocked task | No transaction (throws before writes) |

---

## NEXT IMPLEMENTATION TARGETS

1. Product communication: inventory-linked tasks cannot be reopened.
2. Support runbook for mistaken completes (manual stock adjustment).
3. Integration tests as deployment gate.
