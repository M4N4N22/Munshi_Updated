# Phase 0.6 — Transaction Safety Audit

**Run date:** 2026-06-05  
**Scope:** Row locking, transaction boundaries, rollback, idempotency, atomicity  
**Runtime evidence:** Integration test output (`_phase06-test-output.txt`)

---

## 1. Locking Strategy Review

| Item | Classification | Evidence |
|------|----------------|----------|
| Row lock on inventory item during movement | **FAIL** | `findItemById(..., transaction)` sets `Transaction.LOCK.UPDATE` but query fails with JOINs (DEF-PROD-001) |
| Lock only on primary table (design intent) | **WARNING** | Includes on locked query cause PostgreSQL rejection — fix should lock `inventory_items` only |
| No lock on task row during completion | **WARNING** | Task update not explicitly `FOR UPDATE`; concurrent completion possible in theory |
| Read paths without lock | **PASS** | `listItems`, `findItem` without transaction — correct |

**Verdict:** Locking strategy is **sound in intent** but **broken in implementation** (DEF-PROD-001).

---

## 2. Transaction Boundary Review

| Item | Classification | Evidence |
|------|----------------|----------|
| Single movement: own transaction | **PASS** | `applyMovement` → `sequelize.transaction(run)` when no parent |
| Propagated transaction from task completion | **PASS** | `completeTaskWithAtomicInventory` passes transaction to `executeTaskInventoryMovements` |
| Propagation to `recordStockIn/Out` | **PASS** | Optional `transaction` param on public methods |
| NestJS service boundaries respected | **PASS** | No nested independent commits inside atomic path |
| Fixture seed transaction | **FAIL** | `createInventoryItemWithStock` → `recordStockIn` fails before task tests run |

**Verdict:** Transaction propagation design **PASS**; runtime execution **FAIL** due to DEF-PROD-001.

---

## 3. Rollback Review

| Item | Classification | Evidence |
|------|----------------|----------|
| Movement failure rolls back item qty + ledger | **PASS** | `applyMovement` run function is atomic within transaction |
| Multi-line failure rolls back all lines + task | **PASS** | `completeTaskWithAtomicInventory` wraps all movements + task update in one transaction |
| Scenario 4 (multi-line rollback) | **FAIL** | Not reached — fixture seed fails |
| Scenario 5 (insufficient stock) | **FAIL** | Not reached — fixture seed fails |
| Task remains incomplete on movement error | **WARNING** | Code path correct; not runtime-verified |

**Verdict:** Rollback design **PASS**; runtime verification **blocked**.

---

## 4. Idempotency Review

| Item | Classification | Evidence |
|------|----------------|----------|
| Duplicate `adminComplete(true)` | **PASS** | Early return at line 1344–1345; no second movement |
| Duplicate `completeTask` worker path | **PASS** | Guard at ~line 930 |
| Scenario 10 duplicate completion | **FAIL** | Not reached — fixture seed fails |
| Ledger duplicate prevention | **WARNING** | No unique constraint on (reference_type, reference_id, line); relies on task-level idempotency |
| Re-completing after reopen (non-inventory) | **PASS** | Scenario 7 PASS — reopen then could complete again |

**Verdict:** Task-level idempotency **PASS** (code + scenario 7); movement idempotency **WARNING** (not fully runtime-tested).

---

## 5. Atomicity Review

| Item | Classification | Evidence |
|------|----------------|----------|
| Atomic multi-line completion | **PASS** | `sequelize.transaction` in `completeTaskWithAtomicInventory` |
| Task update in same transaction as movements | **PASS** | `task.update(..., { transaction })` after movements |
| Tasks without lines: non-atomic simple update | **PASS** | Unchanged legacy behavior |
| Scenario 3 multi-line success | **FAIL** | Not reached |
| Scenario 4 atomic rollback | **FAIL** | Not reached |

**Inventory consistency:** **FAIL** at runtime (movements cannot execute).  
**Task consistency:** **PASS** for non-inventory paths (scenario 7).

---

## 6. Remaining Risks

| Risk | Classification | Impact |
|------|----------------|--------|
| DEF-PROD-001 blocks all stock mutations in transactions | **FAIL** | Critical — production inventory movements may fail same way |
| No task row lock during concurrent complete | **WARNING** | Low probability; task idempotency mitigates |
| Reopen does not reverse ledger | **WARNING** | By design for Phase 0; documented in reopen guard |
| assignToAll + lines rejection not runtime-tested | **WARNING** | Code present; blocked by fixture |
| TRANSFER rejection not runtime-tested | **WARNING** | Code in helper; blocked by fixture |

---

## Summary

| Area | Design | Runtime |
|------|--------|---------|
| Locking | **FAIL** | **FAIL** |
| Transaction boundaries | **PASS** | **FAIL** |
| Rollback | **PASS** | **NOT VERIFIED** |
| Idempotency | **PASS** | **PARTIAL** |
| Atomicity | **PASS** | **NOT VERIFIED** |

**Overall transaction safety:** **NOT READY** — fix DEF-PROD-001 before production sign-off.
