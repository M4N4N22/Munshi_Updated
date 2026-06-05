# Local Runtime Execution Report

**Run date:** 2026-06-05  
**Scope:** Local validation only — no code changes  
**Machine:** Windows 10.0.26200

---

## 1. Environment Details

| Component | Value | Source |
|-----------|-------|--------|
| OS | Microsoft Windows NT 10.0.26200.0 | `$PSVersionTable` / system |
| Node.js | v22.22.0 | `node -v` |
| Yarn | 1.22.22 | `yarn -v` |
| Docker | 29.4.1 (build 055a478) | `docker --version` |
| Docker Compose | v5.1.3 | `docker compose version` |
| Postgres | 16.14 (Alpine) | `SELECT version()` in container |
| Connection string | `postgresql://munshi:***@localhost:5432/munshi_data` | `backend/.env.local` |

**Commands used:**

```powershell
node -v
yarn -v
docker --version
docker compose version
docker compose -f docker-compose.example.yml exec -T postgres psql -U munshi -d munshi_data -c "SELECT version();"
```

---

## 2. Startup Validation

**Procedure:** Repository convention — `cd backend && yarn install && yarn dev`  
(`yarn dev` → `env-cmd -f .env.local nest start --watch`)

| Step | Result | Evidence |
|------|--------|----------|
| `yarn install --frozen-lockfile` | **PASS** | Done in 18.53s; peer dependency warnings only |
| TypeScript compilation | **PASS** | `Found 0 errors. Watching for file changes.` |
| Auto-migrate on boot | **PASS** | `[Migrations] Database schema is up to date` |
| DB authentication | **PASS** | `Authenticating database connection (host: localhost:5432)...` |
| Model initialization | **PASS** | `All models initialized and associated.` |
| NestJS application listen | **FAIL** | `UnknownDependenciesException` during bootstrap |

### Startup failure

```text
Nest can't resolve dependencies of the WhatsAppService (...).
Please make sure that the argument OwnerHomeService at index [10]
is available in the WhatsAppModule context.
```

**Log excerpt:** Nest boot reached module wiring; process did not reach `Nest application successfully started` / HTTP listen.

**Warnings during install:**

```text
sequelize-typescript — unmet peer dependency @types/validator@*
ts-loader — unmet peer dependency webpack@^5.0.0
```

Full startup log: terminal session `yarn dev` (2026-06-05 ~22:50 IST).

---

## 3. Database Validation

**Postgres start:**

```powershell
docker compose -f docker-compose.example.yml up postgres -d
→ Container munshi_updated-postgres-1 Running
```

| Check | Result | Evidence |
|-------|--------|----------|
| Container health | **PASS** | Running on `0.0.0.0:5432` |
| `yarn migrate:status` | **PASS** | exit 0, `up_to_date: true` |
| `yarn migrate` | **PASS** | 12 already applied, 0 failed |

### Migration summary

| Metric | Value |
|--------|-------|
| Total migration files | 12 |
| Applied | 12 |
| Pending | 0 |
| Latest applied | `010_task_inventory_lines.sql` |
| Errors | None |

---

## 4. Integration Test Results

**Command:**

```powershell
cd backend
Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
yarn test:integration
```

| Metric | Value |
|--------|-------|
| Test suites | 1 failed |
| Tests passed | **2** |
| Tests failed | **10** |
| Total | 12 |
| Execution time | **19.155 s** |
| Exit code | 1 |

### Per-scenario results (runtime)

| Scenario | Result | Time |
|----------|--------|------|
| 0.1 Foundation | **PASS** | 56 ms |
| 1 STOCK_OUT completion | **FAIL** | 224 ms |
| 2 STOCK_IN completion | **FAIL** | 80 ms |
| 3 Multi-line success | **FAIL** | 81 ms |
| 4 Multi-line rollback | **FAIL** | 74 ms |
| 5 Insufficient stock | **FAIL** | 71 ms |
| 6 Reopen inventory-linked | **FAIL** | 68 ms |
| 7 Reopen non-inventory | **PASS** | 239 ms |
| 8 assignToAll + lines | **FAIL** | 106 ms |
| 9 TRANSFER rejection | **FAIL** | 84 ms |
| 10 Duplicate completion | **FAIL** | 86 ms |
| 0.2 Persist / retrieve / delete | **FAIL** | 82 ms |

### Full failure list

All 10 failures share the same stack origin:

```text
inventory-transaction.service.ts:126 → repository.findItemById(...)
  at createInventoryItemWithStock (phase0-fixtures.ts:134)
```

**Warning after suite:**

```text
Jest did not exit one second after the test run has completed.
```

Full output: `docs/docs_local/inventory/_local-runtime-test-output.txt`

---

## 5. Runtime Findings

| Area | Finding |
|------|---------|
| Postgres + migrations | Operational; schema current through 010 |
| Full backend (`yarn dev`) | **Does not start** — WhatsAppModule DI error |
| Integration harness | Operational; NestJS test app boots |
| Phase 0.1 schema/model | **Verified at runtime** (test PASS) |
| Inventory stock movements | **Broken at runtime** — all movement scenarios fail |
| Non-inventory task reopen | **Verified at runtime** (scenario 7 PASS) |
| Task creation with inventory lines | **NOT VERIFIED** — blocked at fixture seed |
| Task retrieval with lines | **NOT VERIFIED** |
| STOCK_OUT / STOCK_IN completion | **FAIL** |
| Multi-line / rollback / insufficient stock | **FAIL** (not reached) |
| TRANSFER / assignToAll / duplicate protection | **FAIL** (not reached) |
| Reopen protection (inventory-linked) | **FAIL** (not reached) |

---

## 6. Failures Found

| ID | Component | Impact |
|----|-----------|--------|
| DEF-PROD-001 | `InventoryRepository.findItemById` | All transactional stock movements fail |
| DEF-LOCAL-001 | `WhatsAppModule` / full app bootstrap | `yarn dev` cannot start HTTP server |

PostgreSQL confirmation of DEF-PROD-001:

```text
ERROR: FOR UPDATE cannot be applied to the nullable side of an outer join
```

(Reproduced via direct `psql` with LEFT JOIN + FOR UPDATE.)

---

## 7. Evidence

| Artifact | Path |
|----------|------|
| Integration test output | `docs/docs_local/inventory/_local-runtime-test-output.txt` |
| Defect details | `docs/docs_local/inventory/16-local-runtime-defects.md` |
| Status summary | `docs/docs_local/inventory/16-local-runtime-status.md` |
| Startup log | `yarn dev` terminal output (2026-06-05) |

---

## 8. Summary

| Criterion | Result |
|-----------|--------|
| Environment documented | **YES** |
| Backend startup attempted | **YES** — **FAIL** (DI error) |
| Postgres running | **YES** |
| Migrations current | **YES** |
| Integration tests executed | **YES** — 2/12 PASS |
| Inventory runtime validated | **NO** — 10/12 FAIL on DEF-PROD-001 |
| Code changes made | **NONE** |

**Conclusion:** The codebase **does not fully work** in the current state. Database and Phase 0.1 foundation pass runtime checks. Full application startup fails. Inventory movement paths fail due to DEF-PROD-001. See defect report for recommended fixes (not applied in this task).
