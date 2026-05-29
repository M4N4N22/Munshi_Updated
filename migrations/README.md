# Database Migrations

Munshi uses **versioned SQL migrations** for TraderOS schema changes. Sequelize models in `src/**/*.schema.ts` must stay aligned with these files.

## Applying migrations

### PostgreSQL (recommended)

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/001_traderos_foundation.sql
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
    'approval_requests'
  )
ORDER BY table_name;
```

## Migration index

| File | Description |
|------|-------------|
| `001_traderos_foundation.sql` | TraderOS foundation tables (vendors, inventory, purchase requests, approvals) |

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` for idempotency.
- **Foreign keys are intentionally omitted** in v001 to avoid breaking existing databases with inconsistent legacy data. Application-level `factory_id` scoping matches existing Munshi patterns. FK constraints can be added in a later migration after data validation.
- The NestJS app does **not** auto-run migrations at startup (`sequelize.sync` remains disabled).
- Existing operational tables are **unchanged** by `001`.

See also: [migration-notes.md](../docs/reports/migration-notes.md)
