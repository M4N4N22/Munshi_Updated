# Phase 1.3 — Runtime Validation Defects

**Run date:** 2026-06-06

---

## Summary

| Severity | Open | Closed |
|----------|------|--------|
| Blocker | 0 | 1 |
| High | 0 | 0 |
| Medium | 1 | 0 |
| Low | 0 | 0 |

**Code defects found:** 0  
**All 31 runtime tests passed** after environment resolution.

---

## DEF-ENV-001 — Postgres port mismatch (legacy container)

| Field | Value |
|-------|-------|
| **Status** | **OPEN** (environment / ops) |
| **Affected phase** | Validation harness (not application logic) |
| **Severity** | **Medium** |
| **Root cause** | Existing Docker container `munshi-postgres` publishes Postgres on host port **5431**, while `backend/.env` defaults to **localhost:5432**. `main.ts` loads `.env` with `override: true`, so shell `POSTGRES_CONNECTION_STRING` is overwritten at Nest boot. |
| **Impact** | Fresh clone + `docker start munshi-postgres` → integration tests and `nest start` fail until port/credential alignment |
| **Reproduction** | 1. Start only `munshi-postgres` (5431 mapping). 2. Run `yarn test:integration` with default `.env`. 3. `probePostgres()` returns false or migration bootstrap fails. |
| **Resolution (validation session)** | Started `munshi-pg-valid` on host `:5432` with matching credentials; applied migrations. |
| **Recommended fix** | Document in README or remap container: `-p 5432:5432`. Not auto-fixed per validation-only scope. |

---

## DEF-ENV-002 — Docker Desktop not running (initial blocker)

| Field | Value |
|-------|-------|
| **Status** | **CLOSED** |
| **Affected phase** | All DB-dependent validation |
| **Severity** | **Blocker** (transient) |
| **Root cause** | Docker daemon stopped (`npipe://dockerDesktopLinuxEngine` unavailable) |
| **Reproduction** | Run integration tests without Docker → all 23 tests fail at `requireDb` |
| **Resolution** | Started Docker Desktop; daemon ready; containers started successfully |

---

## Application Defects

No defects identified in:

- `InventoryImportUploadService`
- `InventoryImportService`
- `parseInventoryCsvText`
- Phase 0 task-inventory integration paths

---

## Jest Open-Handles Warning

| Field | Value |
|-------|-------|
| **Status** | **OPEN** (informational) |
| **Severity** | **Low** |
| **Symptom** | `Jest did not exit one second after the test run has completed` after integration suites |
| **Impact** | None on test pass/fail; may slow CI exit |
| **Action** | Track separately; not a Phase 1.3 functional defect |

---

## Defect Count vs Signoff

Signoff requires **0 FAIL** on functional tests. Environment defect DEF-ENV-001 does not block Phase 1.3 validation when Postgres is correctly reachable on the configured port.
