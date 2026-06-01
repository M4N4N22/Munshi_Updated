# Migration History Report

**Date:** 2026-06-01

## Per-migration record

| # | File | Git commit date | Purpose | Auto-executed (pre-fix) | Manual execution |
|---|------|-----------------|---------|-------------------------|------------------|
| 001 | `001_traderos_foundation.sql` | 2026-05-29 | Vendor, inventory, purchase_requests, approval_requests | **No** | Yes — runtime sprint |
| 002 | `002_vendors_master.sql` | 2026-05-29 | Vendor phone_number, unique indexes | **No** | Yes |
| 003 | `003_workflow_sessions.sql` | 2026-05-29 | Workflow session table | **No** | Yes |
| 004 | `004_inventory_master.sql` | 2026-05-30 | Inventory constraints | **No** | Yes |
| 005 | `005_document_processing.sql` | 2026-05-30 | Document processing tables | **No** | Yes |
| 006 | `006_procurement_foundation.sql` | 2026-06-01 | PR items + audit trail | **No** | Yes |

## Why manual execution was required

1. **No integration point** — migrations existed as SQL files but nothing in `package.json`, `main.ts`, Dockerfile, or CI invoked them.
2. **Sequelize sync disabled by design** — `db.service.ts` line 29; `migrations/README.md` line 62 documents intentional non-auto-sync.
3. **Health check insufficient** — `/health` only calls `sequelize.authenticate()`; connectivity ≠ schema version.
4. **Remediation script added late** — `apply-migrations.mjs` created during Prompt 9 runtime sprint but never wired to deployment.

## Evidence: pre-migration database

From `docs/runtime/database-validation-report.md`:

- Only **9 legacy tables** existed before manual apply
- **`schema_migrations` table did not exist**
- Vendor/inventory/document APIs returned `relation "vendors" does not exist`

## Evidence: post-manual-apply

After `node scripts/apply-migrations.mjs`:

- All expected tables created
- `schema_migrations` contains 6 rows (001–006)
- APIs functional (vendor, inventory, document, workflow, procurement)

## Tracking table

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Populated by `migration-runner.mjs` on each applied file.
