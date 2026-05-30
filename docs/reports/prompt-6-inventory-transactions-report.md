# Prompt 6 — Inventory Transactions Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Mandatory rule

**Inventory quantities must NEVER be updated directly.**

All changes go through `InventoryTransactionService`:

| Method | Type | Effect |
|--------|------|--------|
| `recordStockIn()` | `STOCK_IN` | Adds quantity |
| `recordStockOut()` | `STOCK_OUT` | Subtracts quantity |
| `recordAdjustment()` | `ADJUSTMENT` | Signed delta (+/-) |

---

## 2. Transaction flow

```text
recordStockIn/Out/Adjustment
        │
        ▼
DB transaction (Sequelize)
        │
        ├── Lock inventory item row
        ├── Validate active item + sufficient stock (OUT/ad negative adj)
        ├── Insert inventory_transactions row
        └── Update inventory_items.current_quantity (cache)
```

---

## 3. Validation

| Check | Behavior |
|-------|----------|
| Positive quantity (IN/OUT) | Required |
| Signed non-zero (ADJUSTMENT) | Required |
| Insufficient stock | `BadRequestException` |
| Inactive item | Rejected |
| Wrong factory | `NotFoundException` |

---

## 4. Audit fields

Each transaction stores:

- `factory_id`, `inventory_item_id`
- `transaction_type`, `quantity`
- Optional: `reference_type`, `reference_id`, `notes`, `created_by`
- `created_at` (append-only)

---

## 5. REST endpoints

```http
POST /inventory/transactions/stock-in
POST /inventory/transactions/stock-out
POST /inventory/transactions/adjustment
```

Body: `RecordInventoryTransactionDto` (`factory_id`, `inventory_item_id`, `quantity`, optional metadata)

---

## 6. Verification helper

`calculateQuantityFromTransactions(itemId, factoryId)` sums ledger:

- `STOCK_IN` → +quantity
- `STOCK_OUT` → −quantity
- `ADJUSTMENT` → +signed quantity

Used in tests to verify cache matches ledger.

---

## 7. What was NOT implemented

- Procurement-linked transactions
- Purchase order references
- Approval gates on stock-out

---

*See [prompt-6-quantity-strategy-report.md](./prompt-6-quantity-strategy-report.md) for cache vs sum design.*
