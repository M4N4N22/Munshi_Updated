# Phase 0.6 — CI Workflow Report

**Run date:** 2026-06-05  
**Scope:** GitHub Actions workflow for task ↔ inventory Phase 0 regression protection

---

## 1. Executive Summary

A dedicated CI workflow **`Inventory Integration (Phase 0)`** was added at `.github/workflows/inventory-integration.yml`. It runs on every push/PR to `main` that touches `backend/**`, provisioning Postgres 16, applying SQL migrations, verifying migration status, and executing the full `yarn test:integration` suite.

The pipeline is designed to **fail closed**: pending migrations, database unavailability, or any integration test failure blocks the job.

**Current expected CI outcome:** **FAIL** until DEF-PROD-001 is resolved (10/12 integration tests fail locally; same failure will occur in CI).

---

## 2. Workflow Design

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separate workflow | `inventory-integration.yml` | Isolates Phase 0 regression from deploy/build pipeline; faster feedback on inventory changes |
| Trigger scope | `paths: backend/**` | Avoids running on unrelated web/ml-only changes |
| Postgres image | `postgres:16-alpine` | Matches `docker-compose.example.yml` and existing `cicd.yml` migration job |
| Database name | `munshi_test` | Consistent with existing `migration-validation` job in `cicd.yml` |
| Node version | 20 | Matches existing CI; backend targets Node 20+ |
| Working directory | `backend/` | Monorepo has no root `package.json`; all yarn commands run in backend |
| Connection string | Workflow `env` | Integration tests read `POSTGRES_CONNECTION_STRING`; no `.env.local` required in CI |
| Migration order | `migrate` then `migrate:status` | Apply first on fresh DB; status exits 2 if any pending |
| Test runner | `--runInBand` (via script) | Serial execution avoids Postgres contention in single-container CI |

---

## 3. CI Execution Flow

```text
push/PR (backend/**)
  │
  ▼
Checkout + Node 20 + yarn install --frozen-lockfile
  │
  ▼
Postgres 16 service (health: pg_isready)
  │
  ▼
yarn migrate                    → apply all SQL migrations
  │
  ▼
yarn migrate:status             → exit 2 if pending_count > 0
  │
  ▼
yarn test:integration           → 12 Phase 0 scenarios; exit 1 on any failure
  │
  ▼
PASS / FAIL
```

### Failure conditions (enforced)

| Condition | Mechanism |
|-----------|-----------|
| Pending migrations | `migrate:status` exit code 2 |
| Migration apply error | `migrate` exit code 1 |
| Database unavailable | Postgres health check + probe failure in tests |
| Integration test failure | Jest exit code 1 |

---

## 4. Files Added

| File | Purpose |
|------|---------|
| `.github/workflows/inventory-integration.yml` | CI job definition |

No production code modified in this phase.

---

## 5. Validation Results

| Check | Local | CI (expected) |
|-------|-------|---------------|
| Workflow YAML valid | **PASS** | — |
| Matches repo conventions | **PASS** | Aligns with `cicd.yml` postgres service pattern |
| `migrate:status` on current DB | **PASS** | 12/12 applied |
| `test:integration` | **FAIL** | 2 pass / 10 fail (DEF-PROD-001) |

Local commands used for validation:

```powershell
cd backend
yarn migrate:status
yarn test:integration
```

---

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CI red until DEF-PROD-001 fixed | **High** | Expected — defect documented; fix in separate prompt |
| Path-filtered triggers miss cross-cutting changes | Low | Workflow file itself is in path filter |
| Jest open-handles warning | Low | Non-blocking; `--forceExit` could be added to test script later if needed |
| No `.env.local` in CI | Low | `POSTGRES_CONNECTION_STRING` set at workflow level |

---

## 7. Future Improvements

1. Fix DEF-PROD-001 → CI should turn green (12/12).
2. Add workflow badge to backend README or main docs.
3. Consider merging into `cicd.yml` as a `needs` gate before `build-and-push` once green.
4. Optional: `--forceExit` on Jest to eliminate open-handle warnings in CI logs.
5. Optional: run on `workflow_dispatch` for manual re-validation.
