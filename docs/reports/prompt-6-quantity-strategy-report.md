# Prompt 6 — Quantity Strategy Report

**Date:** 2026-05-29  
**Decision:** **Option B — Transaction-backed cache**

---

## 1. Options analyzed

### Option A — Calculate entirely from transactions

Every read runs:

```sql
SELECT SUM(signed_quantity) FROM inventory_transactions WHERE item_id = ?
```

| Pros | Cons |
|------|------|
| Single source of truth | Slow for status lists, low-stock scans, reports |
| No cache drift possible | Heavy at 1000 factories × many SKUs |
| Pure audit model | WhatsApp `/inventory_status` latency grows with history |

### Option B — Maintain `current_quantity` updated only via transactions

Write path:

```text
INSERT transaction + UPDATE current_quantity (same DB transaction)
```

Read path:

```text
getCurrentQuantity() → read inventory_items.current_quantity
```

| Pros | Cons |
|------|------|
| O(1) reads for status/low-stock | Requires disciplined write path |
| Scales to 1000 factories | Theoretical cache/ledger drift if bypassed |
| Supports future procurement hooks | Needs reconciliation tooling at scale |

---

## 2. Decision: Option B

**Chosen approach:** `inventory_items.current_quantity` is a **derived cache** updated **exclusively** inside `InventoryTransactionService.applyMovement()` within the same Sequelize transaction as the ledger insert.

### Why for 30 factories now

- Low-stock detection and `/inventory_status` need fast reads today
- Item creation sets quantity to `0`; no direct quantity API on create/update
- Minimal code change from Prompt 2 schema (column already exists)

### Why for 1000 factories in 12 months

- Listing low-stock across a factory must not aggregate millions of transaction rows
- Future reporting dashboards will query item snapshots frequently
- Transaction table remains append-only audit trail for compliance

### Audit requirements

- Every quantity change has an `inventory_transactions` row
- `calculateQuantityFromTransactions()` verifies cache vs ledger in tests
- Future: nightly reconciliation job comparing cache to sum (Prompt 7+)

### Procurement requirements (future)

- `reference_type` / `reference_id` on transactions ready for PO/GRN linkage
- Stock-out can gate on approval without changing quantity model

---

## 3. Implementation rules enforced

| Rule | Enforcement |
|------|-------------|
| No direct quantity update | `createItem` always sets `0`; no quantity in update DTO |
| All changes via transactions | Only `InventoryTransactionService` calls `updateItemQuantity` |
| Atomic write | Single DB transaction wraps insert + cache update |
| Negative stock blocked | Validated before commit |

---

## 4. ADJUSTMENT semantics

- Signed quantity stored in `inventory_transactions.quantity` (e.g. `-2.0000`)
- Cache updated by delta
- Ledger sum: `STOCK_IN +`, `STOCK_OUT -`, `ADJUSTMENT +signed`

---

## 5. Recommendation for Prompt 7

Add optional **reconciliation cron**:

```text
For each active item: if sum(transactions) != current_quantity → alert + auto-fix
```

Not required for Prompt 6 MVP.

---

*This satisfies the mandatory rule: quantities are never updated directly by application code outside the transaction engine.*
