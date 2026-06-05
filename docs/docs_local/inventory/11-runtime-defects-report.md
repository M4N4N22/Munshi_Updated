# Phase 0.5 — Runtime Defects Report

**Run date:** 2026-06-05  
**Scope:** Defects discovered during runtime execution (no fixes applied)

---

## DEF-RT-001 — Integration harness migration path incorrect

| Field | Detail |
|-------|--------|
| **Defect ID** | DEF-RT-001 |
| **Phase Introduced** | 0.5 (test authoring) |
| **Failure Symptoms** | All 12 integration tests fail in `beforeAll` with `Cannot find module 'D:\Munshi_Updated\backend\test\scripts\apply-migrations.mjs'` |
| **Root Cause Hypothesis** | `backend/test/integration/helpers/db-env.ts` line 5: `const root = resolve(__dirname, '../..')` resolves to `backend/test/` (two levels up from `helpers/`), but migration scripts live at `backend/scripts/`. Correct path requires three levels: `resolve(__dirname, '../../..')`. |
| **Reproduction Steps** | 1. Start Postgres: `docker compose -f docker-compose.example.yml up postgres -d` 2. Ensure `POSTGRES_CONNECTION_STRING` in `backend/.env.local` 3. `cd backend && yarn test:integration` 4. Observe all tests fail at `runMigrations()` in `beforeAll` |
| **Severity** | **High** — blocks all Phase 0 integration scenario validation |
| **Recommended Fix** | Change `root` in `db-env.ts` to `resolve(__dirname, '../../..')`. Re-run `yarn test:integration` without modifying test assertions. |

**Stack trace (representative):**

```text
Error: Cannot find module 'D:\Munshi_Updated\backend\test\scripts\apply-migrations.mjs'
  at runMigrations (integration/helpers/db-env.ts:29:11)
  at Object.<anonymous> (integration/task-inventory-phase0.integration.spec.ts:41:18)
```

---

## DEF-RT-002 — Integration setup-env root path (related)

| Field | Detail |
|-------|--------|
| **Defect ID** | DEF-RT-002 |
| **Phase Introduced** | 0.5 (test authoring) |
| **Failure Symptoms** | `.env.local` / `.env` loaded from `backend/test/` instead of `backend/` |
| **Root Cause Hypothesis** | `backend/test/integration/setup-env.ts` line 16 uses same `resolve(__dirname, '../..')` → `backend/test/`. Env files are at `backend/.env.local`. |
| **Reproduction Steps** | Inspect `setup-env.ts` path resolution; compare with actual `.env.local` location under `backend/` |
| **Severity** | **Low** (this run) — Postgres probe still succeeded (connection string available via other means); may cause flaky failures in clean environments |
| **Recommended Fix** | Change `root` in `setup-env.ts` to `resolve(__dirname, '../../..')` |

---

## Production Code Defects

**NO RUNTIME PRODUCTION DEFECTS FOUND**

Application logic was not reached. Failures are confined to Phase 0.5 test harness path resolution.

---

## Next Steps

1. Fix DEF-RT-001 (and DEF-RT-002) in test helpers only.
2. Re-run `yarn test:integration` with Postgres up and `DRY_RUN` unset.
3. Update `10-runtime-validation-results.md` with per-scenario PASS/FAIL from live execution.
