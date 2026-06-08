# Phase 1 — Migration Audit

**File:** `backend/migrations/014_low_stock_alert_context.sql`  
**Date:** 2026-06-08

## Location

Confirmed at `backend/migrations/014_low_stock_alert_context.sql` (16th file in sorted migration directory).

## SQL review

```sql
CREATE TABLE IF NOT EXISTS low_stock_alert_contexts ( ... );
CREATE INDEX IF NOT EXISTS idx_low_stock_alert_contexts_phone_expires ...;
CREATE INDEX IF NOT EXISTS idx_low_stock_alert_contexts_factory_item ...;
```

## Verification checklist

| Check | Result | Notes |
|-------|--------|-------|
| 1. Syntax valid | **PASS** | Applied successfully on Railway Postgres |
| 2. Follows project conventions | **PASS with minor note** | Uses `CREATE IF NOT EXISTS` like other migrations; does not wrap in `BEGIN/COMMIT` (013 does — non-blocking) |
| 3. Idempotent | **PASS** | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`; runner skips if already in `schema_migrations` |
| 4. Safe on existing staging DB | **PASS** | Additive only; FKs to existing `factories` and `inventory_items` |
| 5. No destructive operations | **PASS** | No `DROP`, `ALTER` on existing tables, no `TRUNCATE`, no data migration |

## Schema design

| Column | Type | Nullable |
|--------|------|----------|
| `id` | SERIAL PK | NO |
| `phone_number` | VARCHAR(32) | NO |
| `factory_id` | INTEGER FK → factories | NO |
| `inventory_item_id` | INTEGER FK → inventory_items | NO |
| `inventory_item_name` | VARCHAR(255) | NO |
| `alert_sent_at` | TIMESTAMPTZ | NO (default NOW) |
| `expires_at` | TIMESTAMPTZ | NO |
| `created_at` | TIMESTAMPTZ | NO (default NOW) |
| `updated_at` | TIMESTAMPTZ | NO (default NOW) |

## Indexes

- `idx_low_stock_alert_contexts_phone_expires` on `(phone_number, expires_at DESC)`
- `idx_low_stock_alert_contexts_factory_item` on `(factory_id, inventory_item_id)`

## Findings

Migration 014 is **safe to apply** and suitable for pre-deployment on staging. No blockers identified.
