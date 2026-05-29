# Migration Notes — TraderOS Foundation (Prompt 2)

**Migration file:** `migrations/001_traderos_foundation.sql`  
**Date:** 2026-05-29

---

## What this migration does

Creates **seven new tables** for TraderOS foundation modules. It does **not**:

- Alter existing tables (`users`, `factories`, `tasks`, etc.)
- Drop or rename any legacy objects
- Enable foreign key constraints (deferred to a future migration)

---

## Tables created

| Table | Purpose |
|-------|---------|
| `vendors` | Factory-scoped supplier master data |
| `inventory_categories` | Item grouping per factory |
| `inventory_locations` | Warehouses / storage locations per factory |
| `inventory_items` | SKU master with quantity fields (no mutation logic yet) |
| `inventory_transactions` | Append-only movement audit log |
| `purchase_requests` | Procurement request header (no line items yet) |
| `approval_requests` | Polymorphic approval records |

---

## How to apply

### Local development

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/001_traderos_foundation.sql
psql "$POSTGRES_CONNECTION_STRING" -f migrations/002_vendors_master.sql
```

### Production

1. Take a database backup (`pg_dump`) before applying.
2. Apply during a maintenance window if using shared Postgres.
3. Verify tables with the query in `migrations/README.md`.
4. Deploy application code **after** migration succeeds.

---

## Rollback strategy

Because this migration only **creates** new tables with `IF NOT EXISTS`, rollback is:

```sql
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS inventory_locations;
DROP TABLE IF EXISTS inventory_categories;
DROP TABLE IF EXISTS vendors;
```

**Warning:** Rollback destroys any data written to these tables after creation.

---

## Sequelize alignment

Each table has a matching Sequelize model registered in `src/core/services/db-service/models.ts`. Model field names use `underscored: true` to match SQL column names.

| SQL table | Sequelize model | Module path |
|-----------|-----------------|-------------|
| vendors | `Vendor` | `src/services/vendors/vendors.schema.ts` |
| inventory_categories | `InventoryCategory` | `src/services/inventory/inventory.schema.ts` |
| inventory_locations | `InventoryLocation` | same |
| inventory_items | `InventoryItem` | same |
| inventory_transactions | `InventoryTransaction` | same (no `updated_at`) |
| purchase_requests | `PurchaseRequest` | `src/services/purchase-requests/` |
| approval_requests | `ApprovalRequest` | `src/services/approvals/` |

---

## Why foreign keys are deferred

Existing Munshi databases may contain legacy rows without strict referential integrity. Adding FK constraints in v001 could fail on existing data. Application code continues to scope by `factory_id` consistent with tasks/issues/attendance patterns.

**Recommended for Prompt 3+:** Add FK migration after data audit:

- `vendors.factory_id` → `factories.id`
- `inventory_*.factory_id` → `factories.id`
- `purchase_requests.requester_id` → `users.id`
- etc.

---

## Environment separation

| Environment | Expected state |
|-------------|----------------|
| Local | Apply migration to dev Postgres; use `.env.local` connection string |
| Staging | Apply before first TraderOS feature test (staging DB recommended — currently absent) |
| Production | Apply once; no app auto-migration |

---

## Compatibility with running app

- **Before migration:** App starts normally; new Sequelize models register but queries to new tables fail if accessed.
- **After migration:** App starts normally; skeleton endpoints return `"Not Implemented Yet"` without touching new tables.
- **Existing WhatsApp/workflows:** Unaffected — no code paths changed.

---

*See [prompt-2-foundation-schema-report.md](./prompt-2-foundation-schema-report.md) for full implementation summary.*

---

## Migration 002 — Vendor Master (Prompt 3)

**File:** `migrations/002_vendors_master.sql`

### Changes

- Renames `vendors.phone` → `vendors.phone_number` (if legacy column exists)
- Sets `phone_number NOT NULL`
- Adds case-insensitive unique indexes:
  - `(factory_id, LOWER(TRIM(name)))`
  - `(factory_id, LOWER(TRIM(phone_number)))`
- Adds `(factory_id, is_active)` index for active vendor lists

### Apply after 001

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/002_vendors_master.sql
```

### Compatibility

- Vendor REST API requires `002` before create/list operations
- Existing Munshi operational tables unchanged
- Legacy vendor rows with null phone receive placeholder `UNKNOWN-{id}` during migration (review in production)

*See [prompt-3-vendor-management-report.md](./prompt-3-vendor-management-report.md).*
