# DEF-PROD-001 Fix Report

**Run date:** 2026-06-05  
**Defect:** FOR UPDATE incompatible with LEFT OUTER JOIN in `findItemById`

---

## 1. Root Cause Summary

`InventoryRepository.findItemById()` always loaded `category` and `location` via Sequelize `include` (LEFT OUTER JOIN) while applying `Transaction.LOCK.UPDATE` when a transaction was passed.

PostgreSQL error:

```text
FOR UPDATE cannot be applied to the nullable side of an outer join
```

Transactional callers (`InventoryTransactionService.applyMovement`) only need base `inventory_items` columns (`id`, `is_active`, `current_quantity`). Joined relations are not required for locking or movement logic.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `backend/src/services/inventory/inventory.repository.ts` | Split locked vs unlocked query paths in `findItemById` |

No other files modified.

---

## 3. Code Changes

**Approach:** Option A — lock query without includes when `transaction` is provided; preserve includes for non-transactional reads.

When `transaction` is set:

- Query `inventory_items` only
- Apply `Transaction.LOCK.UPDATE`
- No `include` joins

When `transaction` is absent (read paths in `InventoryService.findItem`, `updateItem`):

- Query with category/location includes unchanged
- No row lock

---

## 4. Locking Strategy Before

```typescript
return this.itemModel.findOne({
  where: { id, factory_id },
  include: [category, location],  // LEFT OUTER JOIN
  transaction,
  lock: transaction ? Transaction.LOCK.UPDATE : undefined,
});
```

**Generated SQL (transactional):**

```sql
SELECT ... FROM inventory_items
LEFT OUTER JOIN inventory_categories ...
LEFT OUTER JOIN inventory_locations ...
WHERE id = ? AND factory_id = ?
FOR UPDATE;  -- PostgreSQL rejects this
```

---

## 5. Locking Strategy After

```typescript
if (transaction) {
  return this.itemModel.findOne({
    where,
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });
}
return this.itemModel.findOne({ where, include: includes });
```

**Generated SQL (transactional):**

```sql
SELECT ... FROM inventory_items
WHERE id = ? AND factory_id = ?
FOR UPDATE;  -- locks inventory_items row only
```

Row-level exclusivity on `inventory_items` is preserved. Movement atomicity, rollback, and transaction propagation are unchanged — only the SELECT shape changed.

---

## 6. Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Lost lock semantics | **None** | FOR UPDATE still applied on base table |
| Broken read paths | **Low** | Non-transactional calls still get includes |
| Transaction/rollback regression | **None** | No changes to `applyMovement` or task completion |
| Missing category/location in movement path | **None** | Movement code never used joined fields |
| Concurrent update race | **None** | Same lock target (`inventory_items` PK row) |

**Overall:** Minimal, isolated fix. No inventory or task business rule changes.
