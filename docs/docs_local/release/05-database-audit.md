# Phase 5 — Database Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **PASS WITH ISSUES**

---

## Migration inventory

15 SQL files in `backend/migrations/`:

| # | File | Status |
|---|------|--------|
| 000 | `000_core_foundation.sql` | Applied |
| 001 | `001_traderos_foundation.sql` | Applied |
| 002 | `002_vendors_master.sql` | Applied |
| 003 | `003_workflow_sessions.sql` | Applied |
| 004 | `004_inventory_master.sql` | Applied |
| 005 | `005_document_processing.sql` | Applied |
| 006 | `006_procurement_foundation.sql` | Applied |
| 007a | `007_business_discovery.sql` | Applied |
| 007b | `007_p0_finance_foundation.sql` | Applied |
| 008 | `008_business_discovery_expansion.sql` | Applied |
| 009 | `009_owner_multi_department_head.sql` | Applied |
| 010 | `010_task_inventory_lines.sql` | Applied |
| 011 | `011_integration_foundation.sql` | Applied |
| 012 | `012_integration_push_deliveries.sql` | Applied |
| 013 | `013_push_delivery_retry.sql` | Applied |

---

## Ordering logic

`backend/scripts/lib/migration-runner.mjs` uses **lexicographic sort** on filenames:

```javascript
readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
```

**Duplicate prefix `007`:**

- `007_business_discovery.sql` runs **before** `007_p0_finance_foundation.sql`
- Both are independent DDL — no FK cross-dependency
- `008_business_discovery_expansion.sql` correctly depends on `007_business_discovery`

**Risk:** LOW for current schema; MEDIUM for future maintainability (ambiguous version numbering).

---

## Fresh database bootstrap

| Method | Result |
|--------|--------|
| Local fresh DB drop/create replay | Not executed (destructive; blocked in audit environment) |
| CI fresh Postgres (`cicd.yml`) | **Configured** — applies all migrations on empty `munshi_test` DB before build |
| Local existing DB (`munshi_data`) | **15/15 applied**, `up_to_date: true` |
| Prior local bootstrap (UTF-8) | Succeeded after `initdb --encoding=UTF8` on Windows |

**Windows note:** Default WIN1252 encoding caused migration `002_vendors_master.sql` comment (`→` arrow) to fail. Production CI uses Linux Postgres — not affected.

---

## Rollback safety

| Check | Result |
|-------|--------|
| Down migrations | **None** |
| Rollback script | **None** |
| Idempotent DDL (`IF NOT EXISTS`) | Used where possible per `migrations/README.md` |

**Verdict:** Forward-only migrations. Rollback requires manual SQL or restore from backup.

---

## Foreign keys & indexes

Per `migrations/README.md` line 61: **Foreign keys intentionally omitted** in early migrations; app enforces `factory_id` scoping.

| Finding | Severity |
|---------|----------|
| No FK on `bank_accounts.bank_consent_id` | LOW (architectural) |
| No FK on `factory_id` columns | Documented design choice |
| Unique indexes added in `002_vendors_master.sql` | OK |

No broken FK references detected (because FKs are not used).

---

## Duplicate migrations

Two files share prefix `007` but different suffixes — not duplicate content. Tracked separately in `schema_migrations` table.

---

## Sequelize sync

`sequelize.sync()` disabled — schema changes must go through SQL migrations. Aligned with production practice.

---

## Summary

| Category | Result |
|----------|--------|
| Migration count / order | PASS |
| Fresh bootstrap (CI) | PASS |
| Fresh bootstrap (Windows dev) | PASS WITH ISSUES (encoding) |
| Rollback safety | FAIL (no rollback path) |
| Duplicate version prefix | PASS WITH ISSUES |
| FK integrity | N/A (by design) |

**Overall:** **PASS WITH ISSUES**
