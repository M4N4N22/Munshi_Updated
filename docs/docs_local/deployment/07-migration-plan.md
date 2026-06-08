# Migration Execution Plan

**Status:** Plan only — migrations not executed against Railway  
**Date:** 2026-06-07

---

## Overview

Munshi uses **forward-only SQL migrations** in `backend/migrations/`. There are no down/rollback migration scripts.

---

## When migrations should run

| Trigger | Run migrations? |
|---------|-----------------|
| Backend container start (Railway deploy/restart) | **Yes** (default) |
| ML deploy | No |
| Web deploy | No |
| Manual `yarn migrate` | Only for break-glass / local ops |

**Default production behavior:** Every Backend deployment applies any pending migrations before NestJS accepts traffic.

---

## How migrations should run

### Automatic path (Railway — recommended)

```
Railway starts Backend
  → node scripts/docker-entrypoint.mjs
    → node scripts/migration-bootstrap.mjs
      → reads backend/migrations/*.sql in order
      → tracks applied files in schema_migrations
    → node dist/main.js (SKIP_MIGRATION_BOOTSTRAP=1)
```

### Environment controls

| Variable | Default | Effect |
|----------|---------|--------|
| `AUTO_MIGRATE` | `1` (unset = on) | `0` skips applying migrations |
| `SKIP_MIGRATION_BOOTSTRAP` | unset | `1` skips bootstrap in `main.ts` (set by entrypoint for child) |
| `POSTGRES_CONNECTION_STRING` | required | Target database |

### Idempotency

- Migration runner tracks applied files in `schema_migrations`.
- Re-deploying Backend with no new migration files is a no-op.
- Failed migration **blocks startup** (container exits non-zero).

---

## Deploy-time sequence

| Step | Action |
|------|--------|
| 1 | Provision Railway Postgres (empty database) |
| 2 | Set `POSTGRES_CONNECTION_STRING` on Backend |
| 3 | Deploy Backend — all 15 migrations apply on first start |
| 4 | Verify `GET /health` and `GET /health/migrations` |
| 5 | Subsequent deploys apply only new `0xx_*.sql` files |

### Expected first-deploy logs

```
[migrate] Applied N: 000_core_foundation.sql, 001_...
```

or

```
[migrate] Database schema is up to date
```

---

## Verification

### Health endpoints

```http
GET /health
```

**PASS:** Postgres `status: up`

```http
GET /health/migrations
```

**PASS:**

```json
{
  "status": "ok",
  "up_to_date": true,
  "pending": []
}
```

### CLI (optional)

```bash
POSTGRES_CONNECTION_STRING="..." node scripts/migration-status.mjs
```

---

## Rollback strategy

### Schema rollback

**Not supported.** No `down` migrations exist.

| Scenario | Action |
|----------|--------|
| Bad migration shipped | Fix forward with a new corrective `0xx_*.sql` |
| Catastrophic schema state | Restore Postgres from Railway backup/PITR to pre-deploy state |
| Code regression | Railway redeploy previous Backend deployment (schema must match) |

### Application rollback

| Service | Method |
|---------|--------|
| Backend | Railway → redeploy previous successful deployment |
| ML | Railway → redeploy previous deployment |
| Postgres | Railway backup restore (point-in-time if available) |
| Web | Vercel instant rollback |

### Safe rollback rules

1. **Never** roll back Backend code to a version that expects an older schema if newer migrations already applied — restore DB first or deploy forward fix.
2. Before risky migrations, take a **manual Postgres backup**.
3. Test migrations on a **staging** Railway Postgres instance before production.

---

## Baseline / existing database

If connecting to a database that already has schema but no `schema_migrations` tracking:

```bash
node scripts/apply-migrations.mjs --baseline
```

Not expected for fresh Railway Postgres provisioning.

---

## What NOT to do

- Do not run migrations from ML or Web services.
- Do not set `AUTO_MIGRATE=0` unless debugging with manual migration control.
- Do not delete rows from `schema_migrations` in production.
- Do not execute migrations manually against production without a backup.

---

## Future improvement (optional, not blocking)

- One-off Railway **pre-deploy** job for migrations (separate from app start) — not required today; current entrypoint pattern is production-validated via `Dockerfile`.
