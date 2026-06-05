# Phase 0.3 — Task Completion → Inventory Movement — Impact Analysis

## 1. Files Modified

| File | Change |
|------|--------|
| `tasks.inventory.constants.ts` | **New** — reference + movement literals |
| `tasks.inventory.helper.ts` | **New** — single movement execution path |
| `tasks.module.ts` | Import `InventoryModule` |
| `tasks.service.ts` | Inject service, completion hooks, assignToAll guard |

**Untouched:** migrations, inventory transaction service/schema, WhatsApp, workflow, documents, purchase-requests.

---

## 2. Direct Dependencies

| Dependency | Relationship |
|------------|--------------|
| `InventoryModule` | Imported by `TasksModule` |
| `InventoryTransactionService` | Injected into `TasksService` |
| `TaskInventoryLine` model | Read at completion via helper |
| `InventoryTransactionService.recordStockIn/Out` | Public API only |

**Dependency direction:** `TasksModule` → `InventoryModule` (one-way, mirrors purchase-requests).

---

## 3. Indirect Dependencies

| Consumer | Impact |
|----------|--------|
| **WhatsApp** | `completeTask` may throw on insufficient stock / TRANSFER — error surfaces to user |
| **REST admin** | `PATCH .../complete` and `PATCH ...` now move stock when lines exist |
| **Inventory balances** | `current_quantity` changes on task complete with lines |
| **Ledger audit** | New rows with `reference_type='TASK'` |
| **Reports** | Stock reports reflect task-driven movements |

---

## 4. Modules Affected

| Module | Change |
|--------|--------|
| `TasksModule` | Imports inventory; completion side effects |
| `InventoryModule` | No code change — consumed only |
| `WhatsAppModule` | Unchanged — uses `TasksService` |
| `WorkflowModule` | Unchanged |

---

## 5. Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Duplicate movement | LOW | Transition guards on all paths |
| assignToAll over-consumption | LOW | Blocked at create time |
| TRANSFER accidental execution | LOW | Rejected explicitly |
| Insufficient stock | LOW | Blocks completion (movement-first) |
| Multi-line partial ledger | MEDIUM | Line 1 may commit before line 2 fails |
| Reopen + re-complete double stock | MEDIUM | Out of scope — no reversal |
| Breaking generic tasks | LOW | No lines = no-op |

---

## 6. Rollback Strategy

1. **Code revert:** Remove helper, module import, completion hooks — tasks complete without stock (pre-0.3).
2. **Data:** Ledger rows with `reference_type='TASK'` remain; manual adjustment if needed.
3. **assignToAll:** Revert restores ability to pass lines (unsafe) — keep block if re-deploying partial rollback.

---

## 7. Future Impact

| Phase | Builds on 0.3 |
|-------|----------------|
| 0.5 Hindi stock errors | Catch `BadRequestException` in WhatsApp layer |
| 0.6 Notifications | Read ledger / item qty after helper runs |
| 0.7 WhatsApp assign + lines | Single-worker assign only (assignToAll blocked) |
| Partial delivery | Update `quantity_completed` + partial movement |
| Reopen reversal | Compensating STOCK_IN/OUT — not in 0.3 |

---

## NEXT IMPLEMENTATION TARGETS

1. Monitor production for `reference_type='TASK'` volume after deploy.
2. Add integration tests before enabling WhatsApp inventory assign widely.
