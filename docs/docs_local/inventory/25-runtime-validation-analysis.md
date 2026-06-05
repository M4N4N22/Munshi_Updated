# Phase 1.3 — Runtime Validation Analysis

**Run date:** 2026-06-06  
**Scope:** End-to-end runtime validation for Phase 1.3 REST CSV upload (validation only — no feature changes)

---

## 1. Initial Blocker

| Issue | Detail |
|-------|--------|
| Symptom | All integration tests failed with `NOT VERIFIED: Postgres unavailable` |
| Root cause (layer 1) | Docker Desktop daemon not running |
| Root cause (layer 2) | After Docker start, existing `munshi-postgres` container mapped **host 5431 → container 5432**, while `backend/.env` specifies **localhost:5432** |

---

## 2. Environment Resolution

### Step 1 — Start Docker Desktop

```text
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Docker daemon ready: ~0 s (already warming)
```

### Step 2 — Start existing Postgres container

```text
docker start munshi-postgres
Status: Up — 0.0.0.0:5431->5432/tcp
Credentials: munshi / munshi / munshi_data
```

### Step 3 — Verify connectivity (port 5431)

```text
POSTGRES_CONNECTION_STRING=postgresql://munshi:munshi@localhost:5431/munshi_data
SELECT 1 → PG_OK
```

### Step 4 — Apply migrations (5431 instance)

```text
pending_count: 12 → 0
up_to_date: true
```

### Step 5 — Align with `.env` for `nest start`

Host port **5432** was free. Started dedicated validation container:

```text
docker run -d --name munshi-pg-valid \
  -e POSTGRES_USER=munshi -e POSTGRES_PASSWORD=munshi -e POSTGRES_DB=munshi_data \
  -p 5432:5432 postgres:16-alpine
```

Applied 12 migrations on fresh 5432 instance. Default `.env` connection string works without override.

---

## 3. Validation Matrix

| Layer | Command | Dependency |
|-------|---------|------------|
| Build | `npx nest build` | None |
| Startup | `npx nest start` | Postgres on `:5432`, migrations |
| Phase 1.1 | `yarn test inventory-csv.parse.spec.ts` | None (unit) |
| Phase 1.2 | `yarn test:integration inventory-csv-import.integration.spec.ts` | Postgres |
| Phase 1.3 | `yarn test:integration inventory-csv-upload.integration.spec.ts` | Postgres + HTTP |
| Phase 0 | `yarn test:integration task-inventory-phase0.integration.spec.ts` | Postgres |
| Full suite | `yarn test:integration` | Postgres |

---

## 4. Architecture Under Test

```text
POST /inventory/import/csv
  → InventoryImportUploadService (file gate)
  → parseInventoryCsvText()
  → InventoryImportService.processImport()
  → JSON InventoryImportSummary
```

Startup log confirms route registration:

```text
Mapped {/inventory/import/csv, POST} route
```

---

## 5. Environment Notes

| Container | Host port | Used for |
|-----------|-----------|----------|
| `munshi-postgres` | 5431 | Initial integration validation |
| `munshi-pg-valid` | 5432 | `.env` default + `nest start` + final full suite |

Both use identical credentials. Developers with legacy `munshi-postgres` on 5431 must set `POSTGRES_CONNECTION_STRING` explicitly or remap ports.

---

## 6. Out of Scope

- WhatsApp import
- Owner-home integration
- Template download
- Code changes (none required — all tests green)
