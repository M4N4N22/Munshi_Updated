# Database Migrations

Munshi uses **versioned SQL migrations** for TraderOS schema changes. Sequelize models in `src/**/*.schema.ts` must stay aligned with these files.

## Applying migrations

### PostgreSQL (recommended)

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/001_traderos_foundation.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/002_vendors_master.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/003_workflow_sessions.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/004_inventory_master.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/005_document_processing.sql
```

Or with discrete connection params:

```bash
psql -h HOST -p PORT -U USER -d DATABASE -f migrations/001_traderos_foundation.sql
```

### Verification

After applying, confirm tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'vendors',
    'inventory_categories',
    'inventory_locations',
    'inventory_items',
    'inventory_transactions',
    'purchase_requests',
    'approval_requests',
    'workflow_sessions',
    'documents',
    'document_processing_jobs',
    'document_extractions',
    'document_suggestions'
  )
ORDER BY table_name;
```

## Migration index

| File | Description |
|------|-------------|
| `001_traderos_foundation.sql` | Creates all seven new tables + indexes |
| `002_vendors_master.sql` | Vendor phone_number column, required phone, unique indexes per factory |
| `003_workflow_sessions.sql` | Workflow session engine table + one-active-session-per-phone index |
| `004_inventory_master.sql` | Required category/location on items; transaction type documentation |
| `005_document_processing.sql` | Document registry, extractions, suggestions (Prompt 7) |

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` for idempotency.
- **Foreign keys are intentionally omitted** in v001 to avoid breaking existing databases with inconsistent legacy data. Application-level `factory_id` scoping matches existing Munshi patterns. FK constraints can be added in a later migration after data validation.
- The NestJS app does **not** auto-run migrations at startup (`sequelize.sync` remains disabled).
- Existing operational tables are **unchanged** by `001`.

See also: [migration-notes.md](../docs/reports/migration-notes.md)
