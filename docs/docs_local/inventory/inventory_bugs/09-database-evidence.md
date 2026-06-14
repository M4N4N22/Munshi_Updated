# Phase 9 — Database Evidence

**Date:** 2026-06-10  
**Note:** Live DB queries not executed in this investigation. Evidence from Railway deploy logs + code analysis.

---

## Tables relevant to inventory import

| Table | Role in import |
|-------|----------------|
| `inventory_items` | Created/updated per CSV row |
| `inventory_transactions` | Stock-in rows on import |
| `inventory_categories` | Created on CONFIRM path via `ensureMasterData` |
| `inventory_locations` | Created on CONFIRM path |
| `schema_migrations` | Unrelated to import runtime |
| `workflow_sessions` | **Not used** for inventory CSV |
| `low_stock_alert_contexts` | **Not used** for inventory CSV |
| `document_processing_jobs` | **Not used** for WhatsApp CSV |

---

## Expected DB signature of duplicate import

For 100-SKU CSV imported 4 times:

| Execution | `inventory_items` delta | `inventory_transactions` delta |
|-----------|-------------------------|--------------------------------|
| 1st | +100 rows | +100 stock-in (if qty > 0) |
| 2nd–4th | 0 new rows (updates only) | +100 stock-in **each** if qty > 0 |

**Risk:** Repeated stock-in on duplicate imports could **inflate quantities** 4× if each update path records new transactions.

Code (`processRow` existing item branch): calls `recordCsvStockIn` when `hasStockIn` — **duplicate CONFIRM may multiply stock**.

---

## Log-derived timeline (2026-06-10, production)

### Session A — auto-import failures (~10:13 UTC)

| Time | Event | addedCount |
|------|-------|------------|
| 10:13:02 | import_complete | 0 |
| 10:13:11 | import_complete | 0 |
| 10:13:26 | import_complete | 0 |
| 10:13:49 | import_complete | 0 |

4 executions, 0 adds — consistent with category-not-found failures.

### Session B — review flow (~10:19 UTC)

| Time | Event |
|------|-------|
| 10:19:15 | review_ready #1 |
| 10:19:26 | review_ready #2 |

### Session C — CONFIRM duplicates (~10:22–10:23 UTC)

| Time | addedCount | updatedCount |
|------|------------|--------------|
| 10:22:51 | 100 | 0 |
| 10:22:59 | 0 | 100 |
| 10:23:13 | 0 | 100 |
| 10:23:37 | 0 | 100 |

---

## Recommended verification queries (for follow-up)

```sql
-- Stock transactions in import window
SELECT reference_type, COUNT(*), SUM(quantity::numeric)
FROM inventory_transactions
WHERE factory_id = :factory_id
  AND created_at BETWEEN '2026-06-10 10:22:00' AND '2026-06-10 10:24:00'
GROUP BY reference_type;

-- Items created same window
SELECT COUNT(*) FROM inventory_items
WHERE factory_id = :factory_id
  AND created_at BETWEEN '2026-06-10 10:22:00' AND '2026-06-10 10:24:00';
```

---

## `workflow_sessions` / `low_stock_alert_contexts`

No evidence of involvement in import duplication. Included in audit scope per spec — **no correlation found**.

---

## Confidence

**85%** for import re-execution (log proof).  
**70%** for stock quantity inflation on duplicates (requires DB query to confirm).
