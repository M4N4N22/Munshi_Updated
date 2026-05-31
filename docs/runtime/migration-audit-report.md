# Migration Audit Report

**Date:** 2026-05-31  
**Repository:** Munshi backend (`munshi-dada-AS-sructure`)  
**Runtime DB:** `postgresql://munshi:***@65.1.128.181:5431/munshi_data`

## Executive summary

Initial Swagger failures attributed to "Migration 002 / 004 not applied" were **incomplete**. Runtime inspection proved **migrations 001–005 were never applied at all**. The database contained only 9 legacy tables (pre–Prompt 2 schema). After applying all five migrations in order, all expected Prompt 2–8 tables exist and vendor/inventory/document APIs respond successfully.

**Classification:** Deployment / migration issue — not application code defect for vendor/inventory GET failures.

---

## Migration inventory

| File | Prompt | Purpose | Depends on |
|------|--------|---------|------------|
| `001_traderos_foundation.sql` | 2 | Creates `vendors`, inventory tables, `purchase_requests`, `approval_requests` | Legacy `factories`, `users` |
| `002_vendors_master.sql` | 3 | Renames `phone` → `phone_number`, unique indexes | `001` (`vendors` must exist) |
| `003_workflow_sessions.sql` | 4 | Creates `workflow_sessions` | `001` (logical; no FK) |
| `004_inventory_master.sql` | 6 | `NOT NULL` on `category_id`, `location_id` | `001` (`inventory_items`) |
| `005_document_processing.sql` | 7–8 | `documents`, jobs, extractions, suggestions | `001`–`004` (logical) |

All files exist under `migrations/`. Ordering by numeric prefix is correct.

---

## Pre-migration state (evidence)

Script: `node scripts/runtime-db-inspect.mjs`

```json
{
  "table_count": 9,
  "all_tables": [
    "attendance", "department_workers", "departments", "factories",
    "factory_users", "issues", "task_updates", "tasks", "users"
  ],
  "expected": {
    "vendors": "MISSING",
    "inventory_categories": "MISSING",
    "workflow_sessions": "MISSING",
    "documents": "MISSING",
    "purchase_requests": "MISSING"
  },
  "migration_tracking_table": "NONE"
}
```

**No `schema_migrations` table existed** — migrations had never been run via any tracked process.

---

## Migration application (remediation)

Script: `node scripts/apply-migrations.mjs`

```json
{
  "results": [
    { "file": "001_traderos_foundation.sql", "status": "applied" },
    { "file": "002_vendors_master.sql", "status": "applied" },
    { "file": "003_workflow_sessions.sql", "status": "applied" },
    { "file": "004_inventory_master.sql", "status": "applied" },
    { "file": "005_document_processing.sql", "status": "applied" }
  ]
}
```

All scripts are idempotent (`IF NOT EXISTS`, conditional `DO` blocks). Re-run safe.

---

## Post-migration state

```json
{
  "table_count": 22,
  "expected": {
    "vendors": "EXISTS",
    "inventory_categories": "EXISTS",
    "inventory_locations": "EXISTS",
    "inventory_items": "EXISTS",
    "inventory_transactions": "EXISTS",
    "workflow_sessions": "EXISTS",
    "documents": "EXISTS",
    "document_processing_jobs": "EXISTS",
    "document_extractions": "EXISTS",
    "document_suggestions": "EXISTS",
    "purchase_requests": "EXISTS",
    "approval_requests": "EXISTS"
  },
  "migration_tracking_table": "EXISTS"
}
```

---

## Schema vs code alignment

### Vendors (`vendors.schema.ts`)

| Code field | DB column (post-002) | Match |
|------------|------------------------|-------|
| `phone_number` | `phone_number VARCHAR(32) NOT NULL` | ✅ |
| `factory_id`, `name`, `gst_number`, `is_active` | Present | ✅ |

Note: `001` originally created column `phone`; `002` renames to `phone_number`. Sequelize model expects `phone_number` — aligned after full migration chain.

### Inventory (`inventory.schema.ts`)

| Table | Expected by code | Created by |
|-------|------------------|------------|
| `inventory_categories` | ✅ | 001 |
| `inventory_locations` | ✅ | 001 |
| `inventory_items` | ✅ | 001 + 004 alters |
| `inventory_transactions` | ✅ | 001 |

`category_id` and `location_id` are `NOT NULL` after 004 — matches Prompt 6 business rules.

### Documents (`documents.schema.ts`)

Tables `documents`, `document_processing_jobs`, `document_extractions`, `document_suggestions` created by `005` — match Sequelize models.

---

## Findings by failure category

| Original symptom | Root cause | Category |
|------------------|------------|----------|
| `relation "vendors" does not exist` | 001 never applied | **Deployment / migration** |
| `relation "inventory_*" does not exist` | 001 never applied | **Deployment / migration** |
| `relation "workflow_sessions" does not exist` | 003 never applied | **Deployment / migration** |
| Document tables missing | 005 never applied | **Deployment / migration** |

---

## Recommendations

1. **Run `node scripts/apply-migrations.mjs` on every environment** before enabling Prompt 2–9 modules.
2. Add migration step to CI/CD and deployment checklist.
3. Keep `schema_migrations` as audit trail (created by apply script).
4. Do not run 002/004 in isolation without 001 — they ALTER tables that 001 creates.

---

## Artifacts

- `migrations/001_traderos_foundation.sql` … `005_document_processing.sql`
- `scripts/apply-migrations.mjs`
- `scripts/runtime-db-inspect.mjs`
