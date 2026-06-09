# Final Deployment Runbook

**Status:** Preparation complete — awaiting approval to execute  
**Branch:** `Shantanu`  
**Date:** 2026-06-07  
**Deployment model:** GitHub → Railway source build (not Docker Hub)

---

## Target architecture

```
Vercel
└── Web (www.munshidada.com)

Railway
├── Backend (public HTTPS)
├── ML (private)
└── PostgreSQL (private)
```

---

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 01 | `01-railway-service-inventory.md` | Service catalog |
| 02 | `02-backend-deployment.md` | Backend Railway settings |
| 03 | `03-ml-deployment.md` | ML Railway settings |
| 04 | `04-postgres-plan.md` | Postgres + backups |
| 05 | `05-env-matrix.md` | Full env variable matrix |
| 06 | `06-networking-plan.md` | Public/private networking |
| 07 | `07-migration-plan.md` | Migration timing + rollback |
| 08 | `08-post-deploy-smoke-tests.md` | Post-deploy checklist |
| 09 | `09-railway-mcp-plan.md` | MCP automation vs manual |
| 10 | `10-final-deployment-runbook.md` | This runbook |

---

## Quick reference — Railway settings

### PostgreSQL

| Setting | Value |
|---------|-------|
| Type | Railway PostgreSQL plugin |
| Consumer | Backend via `POSTGRES_CONNECTION_STRING=${{Postgres.DATABASE_URL}}` |

### ML

| Setting | Value |
|---------|-------|
| Root Directory | `ml` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `python -m uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` (timeout **300s**) |
| Networking | **Private** |
| Memory | ≥ 2 GB |

### Backend

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `yarn install --frozen-lockfile && yarn build` |
| Start Command | `node scripts/docker-entrypoint.mjs` |
| Health Check Path | `/health` (timeout 60s) |
| Networking | **Public** |
| Node | `NIXPACKS_NODE_VERSION=20` |

### Web (Vercel)

| Setting | Value |
|---------|-------|
| Root Directory | `web` |
| Build Command | `npm run build` |
| Key env | `NEXT_PUBLIC_API_URL` → Backend public URL |

---

## Execution sequence (after approval)

### Step 0 — Pre-flight

1. **User approval** to deploy (this gate).
2. **Push** `Shantanu` to `origin` (or merge to `main` per team policy).
3. **Rotate** `OPENAI_API_KEY` if previously exposed in git history.
4. **Generate** secrets: `X_SECRET`, `OTP_PEPPER`, `ADMIN_SECRET_KEY`, `WHATSAPP_VERIFY_TOKEN`.
5. **Gather** external credentials: Olli, MSG91, Turso, Zoho (if enabled).

### Step 1 — PostgreSQL

1. Create Railway project.
2. Add PostgreSQL service.
3. Wait until Active.

### Step 2 — ML (private)

1. Create service — repo `ml/`, branch `Shantanu`.
2. Build: `pip install -r requirements.txt`
3. Start: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set `OPENAI_API_KEY`.
5. Disable public networking.
6. Health check `/health`, timeout 300s.
7. Deploy → wait for healthy.
8. Confirm logs: classifier loaded.

### Step 3 — Backend (public)

1. Create service — repo `backend/`, branch `Shantanu`.
2. Build: `yarn install --frozen-lockfile && yarn build`
3. Start: `node scripts/docker-entrypoint.mjs`
4. Set env vars per `05-env-matrix.md`:
   - `POSTGRES_CONNECTION_STRING=${{Postgres.DATABASE_URL}}`
   - `ML_URL=http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=<vercel-domains>`
   - `MUNSHI_WEB_URL=https://www.munshidada.com`
   - All required secrets
5. **Do not set** `ENABLE_WEBHOOK_TEST_ROUTE`.
6. Deploy → wait for healthy.
7. Verify migrations in logs.
8. `GET /health` → Postgres up.
9. `GET /health/migrations` → ok.

### Step 4 — Webhooks + Vercel

1. Register Olli/Meta webhook → `https://<backend>/whatsapp/webhook`.
2. Update Vercel `NEXT_PUBLIC_API_URL`.
3. Redeploy Vercel.
4. Confirm `CORS_ORIGIN` includes Vercel URL.

### Step 5 — Smoke tests

Execute full checklist in `08-post-deploy-smoke-tests.md`:

- Backend health
- ML health (via Backend or private curl)
- Database connectivity
- `/help`, `/present`, `/members` intents (via `/classify` or WhatsApp)
- Natural language inventory flow
- Security: `/webhook/test` → 404, `/resolve/task-inventory` without secret → 401

### Step 6 — Sign-off

Record PASS/FAIL. If FAIL, rollback per `07-migration-plan.md`.

---

## Final verdict

### READY FOR RAILWAY EXECUTION: **YES**

Code and configuration are validated. Release readiness and deployment readiness audits passed on branch `Shantanu`.

### Pre-execution gates (not code blockers)

| Gate | Status | Action before deploy |
|------|--------|---------------------|
| Branch on GitHub | Pending | `git push origin Shantanu` |
| OpenAI key rotation | Recommended | Rotate in OpenAI dashboard |
| External secrets | Pending | Olli, MSG91, Turso, generated secrets |
| Railway project | Not created | Execute Step 1 after approval |
| Vercel env update | Pending | After Backend URL known |
| Webhook registration | Pending | After Backend public URL known |

**No code blockers remain** for Railway source deploy.

---

## Exact deployment sequence (post-approval)

```
APPROVE
  → push Shantanu to origin
  → rotate OPENAI_API_KEY
  → Railway: create project + Postgres
  → Railway: deploy ML (private) + verify /health
  → Railway: deploy Backend (public) + verify /health + /health/migrations
  → configure Olli webhook URL
  → Vercel: set NEXT_PUBLIC_API_URL + redeploy
  → run smoke tests (08)
  → sign-off
```

---

## STOP

**Do not deploy until explicit approval.**

This runbook is complete. Awaiting user approval to execute.
