# Phase 2–4 — Migration Registry & Application Report

**Date:** 2026-06-08  
**Target:** Railway staging Postgres (`65.1.128.181:5431/munshi_data`)

---

## Phase 2 — Registry check

| Item | Value |
|------|-------|
| Migration runner | `backend/scripts/apply-migrations.mjs` |
| Tracking table | `schema_migrations` |
| Discovery | `readdirSync(migrations/*.sql).sort()` |
| Total migration files (local) | **16** |
| 014 discoverable | **YES** — `014_low_stock_alert_context.sql` sorts after `013_push_delivery_retry.sql` |

### State before apply

| Metric | Value |
|--------|-------|
| Applied | **15/16** |
| Pending | `014_low_stock_alert_context.sql` |
| Latest applied | `013_push_delivery_retry.sql` |
| `up_to_date` | `false` |

### Expected state after apply

| Metric | Value |
|--------|-------|
| Applied | **16/16** |
| Pending | `[]` |
| Latest applied | `014_low_stock_alert_context.sql` |
| `up_to_date` | `true` |

---

## Phase 3 — Pre-apply inspection (read-only)

| Check | Result |
|-------|--------|
| Database reachable | **YES** |
| `schema_migrations` reachable | **YES** |
| Applied migrations (000–013) | **15 rows confirmed** |
| 014 in `schema_migrations` | **NO** (expected pending) |

---

## Phase 4 — Application

**Command:** `node scripts/apply-migrations.mjs` (project standard mechanism)

| Field | Value |
|-------|-------|
| Exit code | **0** |
| Duration | **~1763 ms** |
| Dry run | `false` |
| `run.success` | **true** |

### Runner output summary

```json
{
  "before": { "applied_count": 15, "pending_count": 1 },
  "run": {
    "results": [
      { "file": "000_core_foundation.sql", "status": "already_applied" },
      "...",
      { "file": "013_push_delivery_retry.sql", "status": "already_applied" },
      { "file": "014_low_stock_alert_context.sql", "status": "applied" }
    ]
  },
  "after": { "applied_count": 16, "pending_count": 0, "up_to_date": true }
}
```

### `schema_migrations` entry

| filename | applied_at |
|----------|------------|
| `014_low_stock_alert_context.sql` | `2026-06-08T20:55:13.172Z` |

## Conclusion

Migration 014 **applied successfully** via the standard migration runner. No manual table edits performed.
