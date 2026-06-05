# Phase 0.5 — Runtime Execution Report

**Run date:** 2026-06-05  
**Operator:** Phase 0.5 runtime verification session  
**Scope:** Environment, Postgres, migrations, integration test execution (no production code changes)

---

## 1. Environment Details

| Component | Version / Value | Status |
|-----------|-----------------|--------|
| Node.js | v22.22.0 | **PASS** |
| Yarn | 1.22.22 | **PASS** |
| Docker | 29.4.1 (build 055a478) | **PASS** |
| Docker Compose | v5.1.3 | **PASS** |
| OS | Windows 10.0.26200 | — |
| Connection string | `postgresql://munshi:***@localhost:5432/munshi_data` (from `backend/.env.local`) | **PASS** |

**Note:** Docker Desktop was not running initially. Started via `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`. Daemon became available within ~5 seconds.

**Note:** Shell had `DRY_RUN=1` set globally. First `yarn migrate` run was a dry run (no schema changes). Cleared with `Remove-Item Env:DRY_RUN` before applying migrations.

---

## 2. Docker Status

**Command used:**

```powershell
Set-Location d:\Munshi_Updated
docker compose -f docker-compose.example.yml up postgres -d
```

**Output:**

```text
Container munshi_updated-postgres-1 Started
```

**Container status:**

```text
NAME                        IMAGE                STATUS         PORTS
munshi_updated-postgres-1   postgres:16-alpine   Up             0.0.0.0:5432->5432/tcp
```

**Result:** **PASS**

---

## 3. Postgres Status

**Health check:**

```powershell
docker compose -f docker-compose.example.yml exec -T postgres pg_isready -U munshi -d munshi_data
```

**Output:**

```text
/var/run/postgresql:5432 - accepting connections
```

**Connectivity from backend (`yarn migrate:status`):** Connected successfully; exit code 2 only because pending migrations existed before apply.

**Result:** **PASS**

---

## 4. Migration Execution

### Pre-apply status

```json
{
  "applied_count": 10,
  "pending_count": 2,
  "pending": [
    "009_owner_multi_department_head.sql",
    "010_task_inventory_lines.sql"
  ],
  "up_to_date": false
}
```

### Apply command

```powershell
Set-Location d:\Munshi_Updated\backend
Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
yarn migrate
```

### Apply results

| Metric | Value |
|--------|-------|
| Total migration files | 12 |
| Already applied (skipped) | 10 |
| Newly applied | 2 |
| Failed | 0 |

**Newly applied:**

- `009_owner_multi_department_head.sql` — status: `applied`
- `010_task_inventory_lines.sql` — status: `applied`

### Post-apply status

```json
{
  "applied_count": 12,
  "pending_count": 0,
  "latest_applied": "010_task_inventory_lines.sql",
  "up_to_date": true
}
```

**Schema verification (manual SQL):**

```text
\d task_inventory_lines
→ id, factory_id, task_id, inventory_item_id, quantity_expected,
  quantity_completed, movement_type, created_at, updated_at
→ PK + indexes on factory_id, inventory_item_id, task_id
```

**Result:** **PASS**

---

## 5. Test Execution

**Command:**

```powershell
Set-Location d:\Munshi_Updated\backend
Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
yarn test:integration
```

**Jest config:** `backend/test/jest-integration.json`  
**Suite:** `task-inventory-phase0.integration.spec.ts` (12 tests)

**Summary:**

```text
Test Suites: 1 failed, 1 total
Tests:       12 failed, 12 total
Time:        ~8–9 s
Exit code:   1
```

**Failure (all 12 tests, identical root cause in `beforeAll`):**

```text
Command failed: node scripts/apply-migrations.mjs
Error: Cannot find module 'D:\Munshi_Updated\backend\test\scripts\apply-migrations.mjs'
  at runMigrations (integration/helpers/db-env.ts:29:11)
  at Object.<anonymous> (integration/task-inventory-phase0.integration.spec.ts:41:18)
```

**Analysis:** `db-env.ts` sets `root = resolve(__dirname, '../..')` which resolves to `backend/test/` instead of `backend/`. Migration scripts live at `backend/scripts/`, not `backend/test/scripts/`.

**Postgres probe:** **PASS** — tests connected to DB (`dbUp = true`) before failing in `runMigrations()`.

**Result:** **FAIL** (harness defect; application scenarios never executed)

---

## 6. Runtime Findings

| Area | Finding | Classification |
|------|---------|----------------|
| Docker / Postgres startup | Works via `docker-compose.example.yml` | **PASS** |
| DB connectivity | `migrate:status`, `pg_isready`, Jest probe all connect | **PASS** |
| Migration 010 | Applied; table exists with expected columns | **PASS** |
| Integration harness `runMigrations` | Wrong `cwd` root (`backend/test` vs `backend`) | **FAIL** |
| NestJS service scenarios (0.2–0.4) | Never reached — `beforeAll` throws | **NOT VERIFIED** |
| Production code defects | None observed (logic not exercised) | — |

---

## 7. Failures Found

| ID | Component | Symptom | Blocks |
|----|-----------|---------|--------|
| DEF-RT-001 | `backend/test/integration/helpers/db-env.ts` | `runMigrations()` uses `cwd: backend/test`; migration script not found | All 12 integration scenarios |
| DEF-RT-002 | `backend/test/integration/setup-env.ts` (related) | Same `../..` root resolves to `backend/test` for `.env` loading | Env file path correctness (non-blocking this run — connection string available) |

No production-code failures were observed.

---

## 8. Evidence

### Environment commands

```text
node -v          → v22.22.0
yarn -v          → 1.22.22
docker --version → Docker version 29.4.1
docker compose version → v5.1.3
```

### Migration apply excerpt

```json
{
  "run": {
    "dry_run": false,
    "success": true,
    "results": [
      { "file": "009_owner_multi_department_head.sql", "status": "applied" },
      { "file": "010_task_inventory_lines.sql", "status": "applied" }
    ]
  },
  "after": { "applied_count": 12, "pending_count": 0, "up_to_date": true }
}
```

### Full test output

Saved at: `docs/docs_local/inventory/_runtime-test-output.txt`

---

## 9. Final Summary

| Criterion | Result |
|-----------|--------|
| Postgres started | **YES** |
| Database connectivity verified | **YES** |
| Migrations executed successfully | **YES** (2 applied, 0 failed) |
| Integration tests executed | **YES** (12 ran, 12 failed at harness) |
| NOT VERIFIED items reduced | **PARTIAL** — infrastructure verified; scenario logic still blocked |
| Production code changes | **NONE** |
| New features / architecture changes | **NONE** |

**Outcome:** Infrastructure runtime validation **PASS**. Integration scenario validation **BLOCKED** by test harness path defect (DEF-RT-001). See `11-runtime-defects-report.md` and `11-runtime-readiness-report.md`.
