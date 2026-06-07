# Phase 7 — Deployment Readiness

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **FAIL**

---

## Target platforms

| Package | Platform | Config present |
|---------|----------|----------------|
| Backend | EC2/GCP VM via Docker Hub + SSH | `.github/workflows/cicd.yml` |
| ML | EC2/Docker (historical) | `ml/Dockerfile`, orphaned `ml/.github/workflows/cicd.yml` |
| Web | Vercel | `web/README.md` (dashboard config) |
| Railway | Not targeted | No `railway.toml` |

---

## Backend Docker build

**Dockerfile:** `backend/Dockerfile`

| Check | Result |
|-------|--------|
| Multi-stage build | PASS |
| Copies `migrations/`, `scripts/` | PASS |
| `AUTO_MIGRATE=1` on start | PASS |
| Build in CI | PASS (`cicd.yml` migration-validation job) |
| EXPOSE port | **FAIL** — `EXPOSE 4000` vs app `4001` |
| Default PORT in code | **FAIL** — `3000` if env unset |

**Deploy path mismatch:**

- `cicd.yml` `PROJECT_PATH: /home/ubuntu/munshi-dada` — legacy standalone path
- README notes post-monorepo path should be `backend/`

---

## ML Docker build

**Dockerfile:** `ml/Dockerfile`

| Check | Result |
|-------|--------|
| Base image | `python:3.12-slim` |
| Installs requirements | PASS |
| Copies application code | **FAIL** — only `main.py`, `bot_engine.py` |
| Healthcheck | PASS (in-container localhost) |
| CI build/push | **FAIL** — not in root workflow |

**Impact:** Deployed ML container cannot serve `/parse` or `/extract/task-inventory`.

---

## Web deployment (Vercel)

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Root directory `web/` | Documented |
| Serverless API routes | PASS |
| Turso dependency | Requires `TURSO_*` on Vercel |
| CI build gate | **FAIL** — no web job in GitHub Actions |

---

## CI/CD coverage

| Workflow | Triggers | Covers |
|----------|----------|--------|
| `.github/workflows/cicd.yml` | `push: main` | Backend migrate + build + Docker push + VM deploy |
| `.github/workflows/inventory-integration.yml` | `push/PR: main`, `backend/**` | Phase 0 integration tests only |
| `ml/.github/workflows/cicd.yml` | N/A (orphan) | Nothing |

**Gaps:**

- No ML pytest in CI
- No web build in CI
- No full integration suite (`yarn test:integration` — 17 files) in default CI
- Contract drift tests not in CI (documented in Phase 4 signoff)

---

## Localhost / local-file assumptions in production paths

| Finding | Severity | Location |
|---------|----------|----------|
| `ML_URL` defaults to `localhost:8000` | HIGH if unset | Multiple backend services |
| `DOCUMENT_STORAGE_PATH` defaults to local disk | HIGH on multi-instance | `local-storage.provider.ts` |
| `MUNSHI_WEB_URL` defaults to `localhost:3000` | MEDIUM | `zoho-oauth.service.ts` |
| `POST /webhook/test` always available | HIGH | `whatsapp.controller.ts` |
| OTP exposed when `NODE_ENV !== 'production'` | HIGH | `onboarding-sms.service.ts` |

---

## Railway readiness

**Not applicable.** No Railway configuration. Backend would need:

- Postgres plugin or external Supabase URL
- `ML_URL` pointing to deployed ML service
- Port binding via `PORT` env (currently inconsistent defaults)

---

## Docker Compose (local reference)

`docker-compose.example.yml` correctly wires `backend` + `ml` + `postgres` with `ML_URL=http://ml:8000`. Suitable for local/staging; not used in current CI deploy path.

---

## Summary

| Target | Ready? |
|--------|--------|
| Backend VM deploy | PASS WITH ISSUES (port, path) |
| ML container deploy | **FAIL** |
| Vercel web deploy | PASS WITH ISSUES (env docs) |
| Railway | N/A |
| CI gates | **FAIL** (ML, web, full integration) |

**Overall:** **FAIL**
