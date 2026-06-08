# PostgreSQL Deployment Plan (Railway)

**Status:** Plan only — no database provisioned  
**Date:** 2026-06-07

---

## Railway PostgreSQL setup

### Provisioning (manual or MCP — not executed yet)

1. Create Railway project (e.g. `munshi-staging`).
2. Add **PostgreSQL** plugin/template to the project.
3. Wait for Railway to mark the database **Active**.
4. Note the auto-generated service name (e.g. `Postgres`) — used in reference variables.

### What Railway provides

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Full connection string (preferred) |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Decomposed connection parts |

Railway Postgres includes SSL; connection strings typically work with `sslmode=require` or Railway defaults.

---

## Connection string usage

### Backend configuration

Set on the **Backend** service only (ML and Web do not connect to Postgres directly):

```
POSTGRES_CONNECTION_STRING=${{Postgres.DATABASE_URL}}
```

Replace `Postgres` with the actual Railway Postgres service name if different.

### Application wiring

- `backend/src/core/services/db-service/db.service.ts` reads `process.env.POSTGRES_CONNECTION_STRING`
- Sequelize connects at NestJS module init
- `GET /health` fails if Postgres is unreachable

### Web / ML

| Service | Postgres access |
|---------|-----------------|
| Backend | **Yes** — primary application database |
| ML | **No** — stateless inference service |
| Web (Vercel) | **No** for app data — uses Turso (`TURSO_*`) for leads admin only |

---

## Migration execution

### Automatic (recommended for Railway)

| Setting | Value |
|---------|-------|
| `AUTO_MIGRATE` | `1` (default) |
| Trigger | Backend `docker-entrypoint.mjs` on every start |

Flow:

```
Container start
  → migration-bootstrap.mjs
  → apply pending *.sql from backend/migrations/
  → record in schema_migrations
  → start dist/main.js
```

### Migration inventory

| File | Topic |
|------|-------|
| `000_core_foundation.sql` | Core schema |
| `001_traderos_foundation.sql` | TraderOS base |
| `002_vendors_master.sql` | Vendors |
| `003_workflow_sessions.sql` | Workflow sessions |
| `004_inventory_master.sql` | Inventory |
| `005_document_processing.sql` | Documents |
| `006_procurement_foundation.sql` | Procurement |
| `007_business_discovery.sql` | Business discovery |
| `007_p0_finance_foundation.sql` | Finance |
| `008_business_discovery_expansion.sql` | Discovery expansion |
| `009_owner_multi_department_head.sql` | Multi-dept owners |
| `010_task_inventory_lines.sql` | Task inventory lines |
| `011_integration_foundation.sql` | Integrations |
| `012_integration_push_deliveries.sql` | Push deliveries |
| `013_push_delivery_retry.sql` | Retry logic |

### Verification after deploy

```http
GET https://<backend-public-url>/health/migrations
```

**PASS:** `"status": "ok"`, `"up_to_date": true`, `"pending": []`

### Manual migration (break-glass)

If needed with Railway CLI or one-off shell:

```bash
cd backend
POSTGRES_CONNECTION_STRING="<url>" node scripts/apply-migrations.mjs
POSTGRES_CONNECTION_STRING="<url>" node scripts/migration-status.mjs
```

Not required for normal Railway deploys.

---

## Backup considerations

### Railway managed backups

- Enable **automated backups** in Railway Postgres settings (plan-dependent).
- Railway supports **point-in-time recovery** on eligible plans.
- Document backup retention policy in ops runbook after provisioning.

### Pre-deploy snapshot

Before first production migration on a shared database:

1. Trigger manual backup in Railway dashboard, or
2. `pg_dump` via Railway TCP proxy / connection string

### Restore procedure

1. Restore Postgres from Railway backup / PITR.
2. Redeploy Backend at a compatible code version.
3. Verify `GET /health/migrations` — applied migrations must match `schema_migrations` table.

### What is NOT backed up by Postgres alone

| Asset | Backup location |
|-------|-----------------|
| Uploaded documents (`DOCUMENT_STORAGE_PATH`) | Railway volume or external object storage — not in Postgres |
| Turso leads DB | Turso dashboard |
| OAuth tokens (Zoho) | Postgres `integration_*` tables — covered by PG backup |

---

## Security

- Postgres should have **no public networking** — Backend connects via Railway private network + `DATABASE_URL`.
- Do not commit `POSTGRES_CONNECTION_STRING` to git.
- Rotate credentials via Railway dashboard if leaked.

---

## Deploy order

PostgreSQL must be **healthy before Backend deploy**. Backend first deploy will run all pending migrations against an empty database.

**Expected first-deploy duration:** Longer than subsequent deploys (15 migration files).
