# Phase 5 — Post-Migration Validation

**Date:** 2026-06-08  
**Database:** Railway staging Postgres

---

## Migration registry

| Metric | Before | After |
|--------|--------|-------|
| Total files | 16 | 16 |
| Applied count | 15 | **16** |
| Pending count | 1 | **0** |
| `up_to_date` | false | **true** |
| Latest applied | `013_push_delivery_retry.sql` | **`014_low_stock_alert_context.sql`** |

`node scripts/migration-status.mjs` exit code: **0**

---

## Table existence

| Object | Status |
|--------|--------|
| `low_stock_alert_contexts` | **EXISTS** |
| Initial row count | **0** (expected — no alerts sent since migration) |

---

## Schema evidence

### Required columns (all present)

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| `phone_number` | character varying | NO |
| `factory_id` | integer | NO |
| `inventory_item_id` | integer | NO |
| `inventory_item_name` | character varying | NO |
| `alert_sent_at` | timestamp with time zone | NO |
| `expires_at` | timestamp with time zone | NO |

Additional columns: `id` (PK), `created_at`, `updated_at` (standard Sequelize timestamps).

### Indexes

- `low_stock_alert_contexts_pkey`
- `idx_low_stock_alert_contexts_phone_expires`
- `idx_low_stock_alert_contexts_factory_item`

---

## Backward compatibility row counts (Phase 7 preview)

No data loss observed on existing tables after migration apply:

| table_name | row_count |
|------------|-----------|
| `workflow_sessions` | 186 |
| `purchase_requests` | 25 |
| `inventory_items` | 115 |
| `inventory_transactions` | 136 |
| `low_stock_alert_contexts` | 0 |

---

## Validation result

| Check | Result |
|-------|--------|
| Migration registered | **YES** |
| Table exists | **YES** |
| Schema correct | **YES** |
| Data integrity on existing tables | **YES** |
