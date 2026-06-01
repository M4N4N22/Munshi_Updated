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

## Health endpoint

```
GET /health/migrations
```

Returns applied count, pending count, latest migration file, and status `ok` or `pending`.

## Migration index

| File | Description |
|------|-------------|
| `001_traderos_foundation.sql` | Vendor, inventory, purchase_requests, approval_requests tables |
| `002_vendors_master.sql` | Vendor phone_number column, unique indexes |
| `003_workflow_sessions.sql` | Workflow session engine table |
| `004_inventory_master.sql` | Inventory category/location constraints |
| `005_document_processing.sql` | Document registry and processing tables |
| `006_procurement_foundation.sql` | Purchase request line items and audit trail |

## Notes

- Migrations use idempotent SQL (`IF NOT EXISTS`, etc.) where possible.
- `sequelize.sync()` remains **disabled** — schema changes must go through SQL migrations.
- Foreign keys are intentionally omitted in early migrations; app enforces `factory_id` scoping.

See `docs/runtime/final-migration-system-report.md` for deployment integration details.
