# Phase 4 Live Validation — Database

**Run date:** 2026-06-07  
**Factory ID:** 5 (ABC Manufacturing)

---

## Tasks Created Live

| Task ID | Description | Assigned To | Created |
|---------|-------------|-------------|---------|
| **122** | `[ISSUE] PVC Pipe pcs (PVC_PIPE) x5.0000` | Shyam (41) | 2026-06-07T12:32:49Z |
| **123** | `[INVENTORY_COUNT] Inventory count karwa do` | Priya (37) | 2026-06-07T12:32:54Z |

**Delivery tasks:** **0** created in live run.

---

## Task Inventory Lines

| Line ID | Task ID | Item ID | SKU | Qty Expected | Movement |
|---------|---------|---------|-----|--------------|----------|
| **1** | 122 | 21 | PVC_PIPE | 5.0000 | `STOCK_OUT` |

**Inventory count task #123:** no inventory lines (expected).

---

## Workflow Sessions (sample)

| Session ID | Status | Step | Notes |
|------------|--------|------|-------|
| 135 | COMPLETED | WAITING_CONFIRMATION | Issue flow — success |
| 136 | COMPLETED | WAITING_CONFIRMATION | Count flow — success |
| 137+ | CANCELLED | WAITING_INVENTORY_SELECTION | Delivery disambiguation failures |

Total sessions for `919900000001`: **18**

---

## Inventory Master (seed)

| item_id | sku | name | factory_id |
|---------|-----|------|------------|
| 18 | CEMENT_50KG | Cement 50kg | 5 |
| 19 | CEMENT_PREM | Cement Premium | 5 |
| 20 | WHITE_CEM | White Cement | 5 |
| 21 | PVC_PIPE | PVC Pipe | 5 |
| 22 | PAINT_001 | Paint | 5 |
| 23 | STEEL_ROD | Steel Rod | 5 |

---

## Audit / Transactions

Stock-in seed transactions created for each inventory item (`reference_type: SEED`).

Task #122 should have corresponding `inventory_transactions` on task completion (verify via integration patterns — not re-queried in this pass).

---

## Validation Queries Used

```sql
SELECT id, description, assigned_to FROM tasks WHERE factory_id = 5 ORDER BY id;
SELECT * FROM task_inventory_lines til JOIN tasks t ON t.id = til.task_id WHERE t.factory_id = 5;
SELECT id, workflow_type, status, current_step FROM workflow_sessions
 WHERE phone_number = '919900000001' ORDER BY id DESC LIMIT 10;
```

---

*End of database validation report.*
