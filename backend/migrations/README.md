# Database Migrations

Munshi uses **versioned SQL migrations** tracked in the `schema_migrations` table. Sequelize models in `src/**/*.schema.ts` must stay aligned with these files.

## Automatic execution (default)

| Trigger | Behavior |
|---------|----------|
| `yarn dev` / `yarn start` | Runs pending migrations before NestJS boots (`AUTO_MIGRATE=1` default) |
| Docker container start | `scripts/docker-entrypoint.mjs` migrates then starts app |
| GitHub Actions | Fresh Postgres migration test + EC2 pre-deploy migrate |

Set `AUTO_MIGRATE=0` only if you intentionally manage schema manually — startup **will exit** when pending migrations exist.

## Manual commands

```bash
yarn migrate          # apply pending migrations
yarn migrate:status   # show applied / pending (exit 2 if pending)
DRY_RUN=1 yarn migrate  # list what would run without applying
```

For Supabase, set `POSTGRES_CONNECTION_STRING` in `backend/.env` (include `?sslmode=require`).

Optional single-file helper (local dev):

```bash
node scripts/run-one-migration.mjs 007_p0_finance_foundation.sql
```

## Health endpoint

```
GET /health/migrations
```

Returns applied count, pending count, latest migration file, and status `ok` or `pending`.

## Migration index

| File | Description |
|------|-------------|
| `000_core_foundation.sql` | Core tables: users, factories, tasks, attendance, departments |
| `001_traderos_foundation.sql` | Vendor, inventory, purchase_requests, approval_requests tables |
| `002_vendors_master.sql` | Vendor phone_number column, unique indexes |
| `003_workflow_sessions.sql` | Workflow session engine table |
| `004_inventory_master.sql` | Inventory category/location constraints |
| `005_document_processing.sql` | Document registry and processing tables |
| `006_procurement_foundation.sql` | Purchase request line items and audit trail |
| `007_business_discovery.sql` | Business discovery profiles, readiness scores |
| `007_p0_finance_foundation.sql` | OTP persistence, bank/ledger/match tables, `domain_events` |
| `008_business_discovery_expansion.sql` | Manager/workforce completion columns |
| `009_owner_multi_department_head.sql` | Drop one-head-per-user DB constraint; owners may head multiple teams interim |
| `010_task_inventory_lines.sql` | Task ↔ inventory line items (expected/completed qty, movement_type) |
| `011_integration_foundation.sql` | Integration connections, item mappings, sync run audit (Phase 2.1) |

## Notes

- Migrations use idempotent SQL (`IF NOT EXISTS`, etc.) where possible.
- `sequelize.sync()` remains **disabled** — schema changes must go through SQL migrations.
- Foreign keys are intentionally omitted in early migrations; app enforces `factory_id` scoping.

See `docs/runtime/final-migration-system-report.md` for deployment integration details.
