# Railway Readiness Recheck

**Run date:** 2026-06-08  
**Baseline:** `docs/docs_local/release/16-final-merge-readiness.md`, `docs/docs_local/deployment/10-final-deployment-runbook.md`

---

## Backend deployment readiness

| Check | Status | Evidence |
|-------|--------|----------|
| `yarn build` | **PASS** | Re-run 2026-06-08 |
| `start:prod` entrypoint | **PASS** | `docker-entrypoint.mjs` present |
| PORT 4001 | **PASS** | `main.ts`, Dockerfile aligned |
| Health endpoint `/health` | **PASS** | Postgres Terminus check |
| Migration auto-apply | **PASS** | `AUTO_MIGRATE=1`, 15 SQL files |
| Security guards | **PASS** | Webhook test gated; InternalCallGuard on resolve |
| Env documentation | **PASS** | `backend/.env.example` updated |

**Railway settings (unchanged):**

- Root: `backend`
- Build: `yarn install --frozen-lockfile && yarn build`
- Start: `node scripts/docker-entrypoint.mjs`
- Health: `/health`

---

## ML deployment readiness

| Check | Status | Evidence |
|-------|--------|----------|
| `requirements.txt` | **PASS** | Complete |
| `main.py` FastAPI + uvicorn | **PASS** | `/health`, `/classify`, extractors |
| Tests | **PASS** | 56/56 |
| Source tree completeness | **PASS** | `parsers/`, `contracts/`, `extractors/` present |
| OpenAI key in example | **PASS** | Placeholder only |
| Legacy Dockerfile | **DEFERRED** | Not Railway target |

**Railway settings (unchanged):**

- Root: `ml`
- Build: `pip install -r requirements.txt`
- Start: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health: `/health` (300s timeout)
- Networking: private

---

## Environment matrix validity

| Surface | Status | Notes |
|---------|--------|-------|
| Backend required vars | **VALID** | Per `05-env-matrix.md` / `.env.example` |
| ML required vars | **VALID** | `OPENAI_API_KEY` only |
| Web required vars | **VALID** | `NEXT_PUBLIC_API_URL`, Turso, admin key |
| Cross-service refs | **VALID** | `POSTGRES_CONNECTION_STRING`, `ML_URL` patterns |

Deployment runbook docs exist (untracked) — content still accurate.

---

## Migration strategy validity

| Aspect | Status |
|--------|--------|
| Forward-only SQL | **VALID** |
| Auto-migrate on start | **VALID** |
| `schema_migrations` tracking | **VALID** |
| Rollback = redeploy + PG restore | **VALID** (documented) |

---

## Prior signoff applicability

| Prior verdict | Still applies? |
|---------------|--------------|
| READY FOR RAILWAY DEPLOYMENT: YES | **YES** |
| READY FOR RAILWAY EXECUTION: YES | **YES** |

---

## Pre-deploy gates (unchanged, operational)

| Gate | Status |
|------|--------|
| Push branch to GitHub | Pending |
| Rotate OpenAI key | Recommended |
| Configure Railway secrets | Pending |
| Railway MCP configured | **YES** (separate session) |

---

## Verdict

**Railway readiness recheck: PASS**

Previous Railway readiness signoff **still applies** to current codebase.
