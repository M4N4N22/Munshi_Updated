# Phase 0.4 Preparation — Inventory Safety Hardening Impact Analysis

Documentation-only impact assessment for potential Phase 0.4 hardening work.

---

## 1. Potentially Affected Files

### High likelihood

| File | Potential change |
|------|------------------|
| `tasks.inventory.helper.ts` | Atomic multi-line execution; failure compensation |
| `tasks.service.ts` | Reopen guards/reversal; optional outer transaction |

### Medium likelihood

| File | Potential change |
|------|------------------|
| `inventory-transaction.service.ts` | Optional `Transaction` propagation (**inventory internals**) |
| New integration tests | Close live validation gaps |

### Low likelihood

| File | Potential change |
|------|------------------|
| `tasks.inventory.constants.ts` | Reopen/reversal constants |
| `migrations/*` | Only if TASK reference uniqueness added — **NOT VERIFIED IN CODEBASE** as planned |

### Should remain untouched (typical)

| File | Reason |
|------|--------|
| `whatsapp/*` | Indirect via TasksService |
| `workflow/*` | Unless Option C approval chosen |
| `inventory.schema.ts` | Unless schema hardening required |

---

## 2. Direct Dependencies

| Dependency | Phase 0.4 relevance |
|------------|----------------------|
| `InventoryTransactionService` | Propagation or batch behavior |
| `InventoryRepository.sequelize` | Outer transaction from tasks |
| `TaskInventoryLine` | Reopen policy checks |
| `DbService` shared Sequelize | Single DB for cross-model transactions |

---

## 3. Indirect Dependencies

| System | Impact if hardening deployed |
|--------|------------------------------|
| **Operators** | Reopen blocked or triggers reversal |
| **REST admin** | Reopen/complete behavior changes for linked tasks |
| **Audit** | Fewer orphan TASK ledger rows on partial failure |
| **Support** | Less manual stock correction after failed multi-line complete |

---

## 4. Inventory Corruption Risks (current → post-0.4)

| Risk | Current (0.3) | After 0.4 (if atomicity fixed) |
|------|---------------|--------------------------------|
| Partial multi-line commit | **Active** | Target reduction |
| Reopen + re-complete double stock | **Active** | Needs reopen policy (A or B) |
| Retry after partial failure duplicates | **Active** | Needs idempotency or rollback |
| Insufficient stock on single line | **Mitigated** | Unchanged |

---

## 5. Rollback Considerations

| Change type | Rollback |
|-------------|----------|
| Helper atomicity only | Revert helper — behavior returns to 0.3 |
| Inventory service propagation | Revert service + helper together |
| Block reopen (Option A) | Revert guard — reopen allowed again |
| Reversal on reopen (Option B) | Revert + possible manual ledger cleanup |

**Data:** TASK reference rows from partial failures may exist in production before 0.4 — **NOT VERIFIED** cleanup procedure.

---

## 6. Future Impact

| Downstream phase | Depends on 0.4 hardening |
|------------------|-------------------------|
| Partial delivery (`quantity_completed`) | Safer on atomic base |
| Low-stock alerts | Cleaner ledger if no orphan partial moves |
| WhatsApp stock assign | Reopen policy affects operator UX |
| Finance / domain events | Fewer inconsistent task vs stock states |

---

## NEXT IMPLEMENTATION TARGETS

1. Product sign-off on reopen policy before Phase 0.4 code.
2. Decide if `inventory-transaction.service.ts` changes are in scope for transaction propagation.
3. Prioritize integration tests to eliminate NOT VERIFIED debt from Phases 0.1–0.3.
