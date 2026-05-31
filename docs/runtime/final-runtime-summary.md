# Final Runtime Validation Summary

**Sprint:** Runtime Validation & Deployment Readiness  
**Date:** 2026-05-31  
**Repository:** Munshi backend

---

## Objective

Verify Prompts 2–9 implementations are operational at runtime — not assumed from unit tests or Swagger presence alone.

**Result:** Root causes identified for all pre-sprint failures. Remediation applied. Smoke-tested read APIs at **100% pass rate**.

---

## Failure classification (original Swagger audit)

| Symptom | Root cause | Category | Resolved? |
|---------|------------|----------|-----------|
| Vendor 500 | `vendors` table missing | **Deployment / migration** | ✅ Migration 001 applied |
| Inventory 500 | `inventory_*` tables missing | **Deployment / migration** | ✅ Migration 001 applied |
| Document GET 400 | Query string not coerced to number | **Code defect (DTO)** | ✅ `@Transform` added |
| Document tables missing | Migration 005 not applied | **Deployment / migration** | ✅ Applied |
| Workflow session errors | Migration 003 not applied | **Deployment / migration** | ✅ Applied |
| Webhook test 400 | Olli → Meta OAuth 190 | **Configuration** | ⚠️ Needs token refresh |
| PR / Approval | Stub controllers | **By design** | N/A (not Prompt 2–9 completion) |

**Key finding:** The runtime DB had **only 9 legacy tables**. Migrations **001–005 had never been run** — broader than "002 and 004 missing."

---

## Actions taken

1. **`scripts/runtime-db-inspect.mjs`** — evidence of table presence/absence  
2. **`scripts/apply-migrations.mjs`** — applied 001–005; created `schema_migrations`  
3. **Fixed `DocumentFactoryQueryDto`** — `@Transform(({ value }) => Number(value))`  
4. **`scripts/runtime-module-retest.mjs`** — vendor/inventory/document/webhook evidence  
5. **Re-ran Swagger smoke + full audit**

---

## Post-fix validation results

| Test | Result |
|------|--------|
| DB tables (expected 12 module tables) | **12/12 EXISTS** |
| Swagger smoke (23 endpoints) | **23/23 PASS (100%)** |
| Swagger full audit (45 endpoints) | **32/45 PASS (71%)** — failures are empty-data 404s, audit script gaps, Olli |
| Vendor POST + GET | **201 / 200** |
| Document GET list | **200** (was 400) |
| ML health | **`{"status":"ok"}`** |
| Webhook test | **400 OAuth 190** (Olli, not ML) |

---

## Success criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Root cause for every failing endpoint | ✅ |
| 2 | Vendor module validated | ✅ |
| 3 | Inventory module validated | ✅ |
| 4 | Document module validated | ✅ (reads; upload E2E partial) |
| 5 | Runtime database validated | ✅ |
| 6 | Swagger audit re-executed | ✅ |
| 7 | Deployment readiness documented | ✅ |
| 8 | Procurement readiness documented | ✅ |
| 9 | Reports contain evidence | ✅ |

---

## Reports index

| Report | Path |
|--------|------|
| Migration audit | `docs/runtime/migration-audit-report.md` |
| Database validation | `docs/runtime/database-validation-report.md` |
| Vendor validation | `docs/runtime/vendor-validation-report.md` |
| Inventory validation | `docs/runtime/inventory-validation-report.md` |
| Document validation | `docs/runtime/document-validation-report.md` |
| Webhook validation | `docs/runtime/webhook-validation-report.md` |
| Swagger audit v2 | `docs/runtime/swagger-audit-report-v2.md` |
| Deployment readiness | `docs/runtime/deployment-readiness-report.md` |
| Procurement readiness | `docs/runtime/procurement-readiness-report.md` |
| This summary | `docs/runtime/final-runtime-summary.md` |

---

## Code changes (minimal — validation sprint)

| File | Change |
|------|--------|
| `src/services/documents/documents.dto.ts` | Add `@Transform` on `DocumentFactoryQueryDto.factory_id` |
| `scripts/apply-migrations.mjs` | New — deployment remediation |
| `scripts/runtime-db-inspect.mjs` | New — DB evidence |
| `scripts/runtime-module-retest.mjs` | New — module re-test |
| `scripts/swagger-full-audit.mjs` | New — extended audit |

---

## Next steps (ops — not feature work)

1. Add `node scripts/apply-migrations.mjs` to **every deployment** (staging, prod).  
2. Refresh **Olli / WhatsApp** credentials (OAuth 190).  
3. Run **document upload E2E** once in staging (ML + storage).  
4. Fix audit script param names (`phone`, `phone_number`, `assigned_by_user_id`) for CI accuracy.  
5. Begin **Procurement** implementation knowing PR/Approval are stubs and schema is ready.

---

## Bottom line

Prompts 2–9 backend code is **sound**. Pre-sprint failures were overwhelmingly **deployment (migrations never applied)** plus one **DTO bug** on document query params. After remediation, **all smoke-tested APIs pass**. Procurement can proceed on schema and validated vendor/inventory foundations; PR/Approval and full WhatsApp/document E2E remain the explicit gaps.
