# Database Validation Report

**Date:** 2026-05-31  
**Connection:** `65.1.128.181:5431/munshi_data` (via `.env.local`)

## Method

Direct PostgreSQL inspection using `scripts/runtime-db-inspect.mjs` (pg client, no ORM).

---

## Before remediation

| Metric | Value |
|--------|-------|
| Public tables | **9** |
| Prompt 2–8 tables | **0 of 12** present |
| Migration tracking | None |

### Missing tables (all Prompt 2–8 modules)

- `vendors`
- `inventory_categories`, `inventory_locations`, `inventory_items`, `inventory_transactions`
- `workflow_sessions`
- `documents`, `document_processing_jobs`, `document_extractions`, `document_suggestions`
- `purchase_requests`, `approval_requests`

### Present tables (legacy / Prompt 1)

| Table | Status |
|-------|--------|
| `factories` | EXISTS |
| `users` | EXISTS |
| `factory_users` | EXISTS |
| `departments` | EXISTS |
| `department_workers` | EXISTS |
| `issues` | EXISTS |
| `tasks` | EXISTS |
| `task_updates` | EXISTS |
| `attendance` | EXISTS |

---

## After remediation (migrations 001–005 applied)

| Metric | Value |
|--------|-------|
| Public tables | **22** |
| Expected module tables | **12 of 12** present |
| `schema_migrations` | EXISTS (5 rows) |

### Full table list

```
approval_requests, attendance, department_workers, departments,
document_extractions, document_processing_jobs, document_suggestions,
documents, factories, factory_users, inventory_categories,
inventory_items, inventory_locations, inventory_transactions,
issues, purchase_requests, schema_migrations, task_updates,
tasks, users, vendors, workflow_sessions
```

---

## Schema detail: vendors

Post-migration columns match `Vendor` Sequelize model:

```
id, factory_id, name, phone_number, email, address,
gst_number, notes, is_active, created_at, updated_at
```

`phone_number` is `NOT NULL` — consistent with Prompt 3.

---

## Schema detail: inventory_items

Post-migration columns:

```
id, factory_id, category_id (NOT NULL), location_id (NOT NULL),
sku, name, unit, current_quantity, reorder_threshold,
is_active, created_at, updated_at
```

Matches `inventory.schema.ts` and migration 004 constraints.

---

## Schema mismatches

| Item | Expected | Actual | Severity |
|------|----------|--------|----------|
| All Prompt 2–8 tables (pre-fix) | EXISTS | MISSING | **Blocker** — resolved |
| Post-fix column types | Sequelize models | DB columns | **None found** |

---

## API error correlation

Pre-migration API response (evidence):

```json
GET /vendors?factory_id=3
{
  "meta": {
    "success": false,
    "failures": { "message": "relation \"vendors\" does not exist" }
  }
}
```

Post-migration:

```json
GET /vendors?factory_id=3
{ "data": [], "total": 0, "page": 1, "limit": 25 }
```

HTTP 200 — table exists, query succeeds.

---

## Conclusion

| Check | Result |
|-------|--------|
| Expected tables documented | ✅ |
| Actual tables inspected | ✅ |
| Missing tables identified | ✅ (pre-fix) |
| Schema vs code | ✅ aligned post-migration |
| Root cause | **Deployment: migrations not applied** |

---

## Artifacts

- `scripts/runtime-db-inspect.mjs` — re-runnable validation
- `scripts/apply-migrations.mjs` — remediation tool
