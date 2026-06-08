# Phase 9 — Rollback Plan

**Scope:** Procurement CTA fix + migration 014  
**Date:** 2026-06-08

---

## Scenario A — Backend deployment fails (code rollback)

### Steps

1. **Revert backend deploy** on Railway to previous successful deployment (Railway dashboard → Deployments → Redeploy previous)
2. **Do not rollback migration** unless CTA code caused DB corruption (unlikely — table is append-only)
3. Verify `GET /health` → Postgres up
4. Verify `GET /health/migrations` → 15/15 (old code) while DB remains 16/16 (harmless)

### Data impact

- `low_stock_alert_contexts` may accumulate rows if partial deploy wrote data — safe to leave or truncate
- No impact on `workflow_sessions`, `purchase_requests`, inventory tables

---

## Scenario B — Migration rollback required

Only if migration 014 must be undone (e.g. wrong environment).

### SQL rollback (manual — not in runner)

```sql
BEGIN;

DROP TABLE IF EXISTS low_stock_alert_contexts;

DELETE FROM schema_migrations
WHERE filename = '014_low_stock_alert_context.sql';

COMMIT;
```

### Via psql / Railway query console

```bash
# From backend directory with POSTGRES_CONNECTION_STRING set:
psql "$POSTGRES_CONNECTION_STRING" -c "DROP TABLE IF EXISTS low_stock_alert_contexts;"
psql "$POSTGRES_CONNECTION_STRING" -c "DELETE FROM schema_migrations WHERE filename = '014_low_stock_alert_context.sql';"
```

### Verify rollback

```bash
cd backend
node scripts/migration-status.mjs
# Expect: applied_count 15, pending_count 1, 014 in pending
```

### Data impact

- **All rows in `low_stock_alert_contexts` lost** (currently 0 on staging)
- **No impact** on procurement, workflow, or inventory data
- CTA title-only fallback will fail until migration re-applied

---

## Scenario C — Full code + migration rollback

1. Rollback backend deploy (Scenario A)
2. Run migration rollback SQL (Scenario B)
3. Confirm `migration-status` shows 15/16 pending 014
4. Re-run integration tests if re-deploying later

---

## Scenario D — Git revert (local / branch)

If commit must be reverted before push:

```bash
git log --oneline -5
git revert <cta-fix-commit-sha>
# or
git reset --hard <pre-cta-commit-sha>   # only if not pushed
```

**Note:** Migration already applied on Railway DB — git revert does **not** undo DB changes. Coordinate with Scenario B if full undo needed.

---

## Recovery after rollback

1. Fix issue in code/migration
2. Re-apply: `cd backend && node scripts/apply-migrations.mjs`
3. Verify 16/16 and table schema
4. Redeploy backend
5. Run WhatsApp CTA UAT

---

## Risk matrix

| Action | Risk | Reversibility |
|--------|------|---------------|
| Backend redeploy previous | Low | Immediate |
| Drop `low_stock_alert_contexts` | Low (empty table) | Re-run migration 014 |
| Delete `schema_migrations` row | Low | Re-run `apply-migrations.mjs` |
| Revert git without DB rollback | Medium | DB/code version skew |
