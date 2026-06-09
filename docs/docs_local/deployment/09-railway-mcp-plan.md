# Railway MCP Readiness Plan

**Status:** Plan only — no MCP actions executed  
**Date:** 2026-06-07

This document describes what a **Railway MCP integration** (or Railway CLI via Cursor agent) can automate versus what requires human review, and the ordered sequence Cursor can execute after approval.

---

## What Railway MCP can automate

Assuming Railway MCP exposes project/service/env/deploy operations (standard Railway API surface):

| Capability | Automatable | Notes |
|------------|-------------|-------|
| Create Railway project | Yes | e.g. `munshi-staging` |
| Add PostgreSQL plugin | Yes | Managed database service |
| Create application service from GitHub repo | Yes | Per-service root directory |
| Set root directory (`backend`, `ml`) | Yes | Monorepo path config |
| Set build / start commands | Yes | Values from `02`/`03` deployment docs |
| Set health check path / timeout | Yes | `/health`; ML timeout 300s |
| Configure private vs public networking | Partial | ML private, Backend public — verify in dashboard |
| Inject service reference variables | Yes | `${{Postgres.DATABASE_URL}}`, `${{ML.RAILWAY_PRIVATE_DOMAIN}}` |
| Set plain env vars | Yes | `NODE_ENV`, `CORS_ORIGIN`, etc. |
| Set secret env vars | Yes | `X_SECRET`, `OPENAI_API_KEY`, `OLLI_KEY` |
| Trigger deploy / redeploy | Yes | GitHub-connected services |
| Poll deployment status | Yes | Wait for SUCCESS |
| Fetch service public URL | Yes | For Vercel `NEXT_PUBLIC_API_URL` |
| View deployment logs | Yes | Migration + ML model load verification |

---

## What must be reviewed manually

| Item | Why manual |
|------|------------|
| **GitHub branch selection** | Confirm `Shantanu` vs `main` after merge approval |
| **Push branch to origin** | Branch is ahead of remote — Railway needs GitHub access |
| **Secret values** | OpenAI, Olli, MSG91, Turso — from external dashboards |
| **OpenAI key rotation** | Key may exist in older git history |
| **Custom domains** | `api.www.munshidada.com`, DNS records |
| **CORS_ORIGIN list** | Must match actual Vercel preview/production URLs |
| **Webhook registration** | GetOlli/Meta — point to Backend public URL |
| **Zoho OAuth redirect URI** | Must match `ZOHO_REDIRECT_URI` + Zoho app config |
| **ML memory sizing** | Confirm ≥ 2 GB in Railway plan |
| **ML health check timeout** | 300s — UI may need manual adjustment |
| **Vercel env update** | Separate platform — `NEXT_PUBLIC_API_URL` |
| **Turso credentials** | Vercel-only, not Railway |
| **Post-deploy smoke tests** | Human or agent HTTP checks (see `08`) |
| **Backup policy** | Enable Railway Postgres backups per plan tier |
| **Cost / plan limits** | torch ML service sizing |

---

## Cursor-executable deployment sequence (after approval)

### Phase 0 — Pre-flight (manual gate)

```
[ ] User approves deployment execution
[ ] git push origin Shantanu  (or merge to main + push)
[ ] Rotate OPENAI_API_KEY if not already done
[ ] Collect secrets: X_SECRET, OTP_PEPPER, OLLI_KEY, MSG91, Turso, ADMIN_SECRET_KEY
```

### Phase 1 — Railway project + Postgres

```
1. MCP: create_project("munshi-staging")
2. MCP: add_postgres_service()
3. MCP: wait_until_healthy(postgres)
```

**Verify:** Postgres service Active in dashboard.

### Phase 2 — ML service (private)

```
4. MCP: create_service(
     name="ml",
     repo=<github-repo>,
     branch="Shantanu",
     rootDirectory="ml",
     buildCommand="pip install -r requirements.txt",
     startCommand="python -m uvicorn main:app --host 0.0.0.0 --port $PORT"
   )
5. MCP: set_networking(ml, public=false)
6. MCP: set_health_check(ml, path="/health", timeout=300)
7. MCP: set_variable(ml, "OPENAI_API_KEY", <secret>)
8. MCP: set_resources(ml, memory_mb=2048)  # if supported
9. MCP: deploy(ml)
10. MCP: wait_until_healthy(ml)
```

**Verify:** ML deployment logs show "API Ready" / classifier loaded.

### Phase 3 — Backend service (public)

```
11. MCP: create_service(
      name="backend",
      repo=<github-repo>,
      branch="Shantanu",
      rootDirectory="backend",
      buildCommand="yarn install --frozen-lockfile && yarn build",
      startCommand="node scripts/docker-entrypoint.mjs"
    )
12. MCP: set_networking(backend, public=true)
13. MCP: set_health_check(backend, path="/health", timeout=60)
14. MCP: set_variable(backend, "NIXPACKS_NODE_VERSION", "20")
15. MCP: set_variable(backend, "NODE_ENV", "production")
16. MCP: set_variable(backend, "POSTGRES_CONNECTION_STRING", "${{Postgres.DATABASE_URL}}")
17. MCP: set_variable(backend, "ML_URL", "http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}")
18. MCP: set_variables(backend, <all required secrets from 05-env-matrix.md>)
19. MCP: deploy(backend)
20. MCP: wait_until_healthy(backend)
```

**Verify:**

- Logs show `[migrate] Applied ...` or `schema is up to date`
- `GET <backend-url>/health` → Postgres up
- `GET <backend-url>/health/migrations` → ok

### Phase 4 — External integrations (manual + agent-assisted)

```
21. MANUAL: Register Olli/Meta webhook → https://<backend-public>/whatsapp/webhook
22. MANUAL: Set WHATSAPP_VERIFY_TOKEN to match webhook config
23. MCP/CLI: curl smoke tests per 08-post-deploy-smoke-tests.md
```

### Phase 5 — Vercel Web

```
24. MANUAL: Set Vercel env NEXT_PUBLIC_API_URL=<backend-public-url>
25. MANUAL: Redeploy Vercel production
26. MANUAL: Confirm CORS_ORIGIN on Backend includes Vercel domain
```

### Phase 6 — Full smoke suite

```
27. AGENT: Execute checklist in 08-post-deploy-smoke-tests.md
28. REPORT: PASS/FAIL summary to user
```

---

## MCP command mapping (illustrative)

Exact MCP tool names depend on the Railway MCP server configuration. Map concepts as:

| Intent | Typical MCP / CLI equivalent |
|--------|------------------------------|
| Create project | `railway init` / `createProject` |
| Add Postgres | `railway add --database postgres` |
| Link GitHub repo | Railway dashboard or `railway link` |
| Set variables | `railway variables set KEY=value` |
| Deploy | `railway up` or GitHub auto-deploy |
| Get URL | `railway domain` / `service.getUrl()` |
| Tail logs | `railway logs` |

---

## Rollback via MCP

| Action | MCP |
|--------|-----|
| Redeploy previous Backend image | Yes — `rollback(deployment_id)` |
| Redeploy previous ML image | Yes |
| Restore Postgres | **Manual** — Railway dashboard backup restore |
| Revert Vercel | **Manual** — Vercel dashboard |

---

## Readiness for MCP execution

| Prerequisite | Status |
|--------------|--------|
| Code deployment configs validated | PASS |
| Env matrix documented | PASS |
| Service inventory complete | PASS |
| Branch pushed to GitHub | **PENDING** — required before MCP GitHub deploy |
| Railway MCP connected in Cursor | **UNKNOWN** — verify MCP server enabled |
| Secrets collected | **PENDING** — user action |

**MCP can execute Phases 1–3 and smoke HTTP tests once pre-flight gates pass.**
