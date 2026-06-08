# PostgreSQL Deployment

**Project:** munshi-staging  
**Date:** 2026-06-08

---

## Service

| Field | Value |
|-------|-------|
| **Service Name** | `Postgres` |
| **Service ID** | `4d1374d9-585e-4c55-a236-c4f2b6264ff8` |
| **Status** | **SUCCESS** (healthy) |
| **Private domain** | `postgres.railway.internal` |

**Note:** A duplicate `Postgres-I2eB` was also provisioned via template + CLI. Backend uses `Postgres` reference. Remove duplicate to avoid cost/confusion.

---

## Connection reference

Backend variable:

```
POSTGRES_CONNECTION_STRING=${{Postgres.DATABASE_URL}}
```

Resolved internal URL pattern:

```
postgresql://postgres:***@postgres.railway.internal:5432/railway
```

---

## Migration validation

| Check | Result |
|-------|--------|
| `GET /health` Postgres indicator | **up** |
| `GET /health/migrations` | **ok** — 15/15 applied |
| Pending migrations | **0** |

Applied: `000_core_foundation.sql` through `013_push_delivery_retry.sql`

---

## Backup

Enable automated backups in Railway Postgres dashboard for staging.
