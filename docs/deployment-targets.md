# Deployment targets

**Production (use this):**

| Service | Platform | Branch | Notes |
|---------|----------|--------|-------|
| Web | Vercel | `main` | Root dir `web`, domain `www.munshidada.com` |
| Backend | Railway | `main` | Root dir `backend`, public URL e.g. `backend-production-41504.up.railway.app` |
| ML | Railway (private) | `main` | Root dir `ml` |
| PostgreSQL | **Supabase** (recommended) or Railway Postgres | — | Same `POSTGRES_CONNECTION_STRING` on local + Railway backend |

**Legacy (do not auto-deploy):**

| Service | Platform | Trigger |
|---------|----------|---------|
| Backend + ML on GCP VM | Docker Compose on `munshi-prod` | Manual: [deploy-gcp-vm.yml](../.github/workflows/deploy-gcp-vm.yml) or CI dispatch with `deploy_gcp` |

## GitHub Actions on `main`

Push to `main` runs **CI only** (migrations + backend build). It does **not** deploy to GCP.

## Railway: backend + ML (one project, two services)

Railway does **not** run backend and ML in one container. Use **one Railway project** with **two services** on the **same GitHub repo**. There is no “deploy ML when backend deploys” hook file — both services watch `main` and **each redeploys on push** (see `watchPatterns` in `backend/railway.toml` and `ml/railway.toml`).

```
Railway project (e.g. Munshi)
├── backend   ← Root Directory: backend   (public URL)
└── ml        ← Root Directory: ml        (private only)
```

### First-time setup

1. Open [Railway](https://railway.com) → your project (or **New Project**).
2. **Backend service**
   - **+ New** → **GitHub Repo** → `Munshi_Updated`
   - Service name: `backend` (name matters for variable references)
   - **Settings → Source** → branch **`main`**
   - **Settings → Root Directory** → `backend`
   - **Settings → Networking** → generate **public** domain
   - **Settings → Deploy** → config is in `backend/railway.toml` (build/start/health)
3. **ML service** (same project)
   - **+ New** → **GitHub Repo** → same repo again
   - Service name: `ml`
   - **Root Directory** → `ml`
   - **Networking** → **disable public networking** (private only)
   - **Settings → Resources** → **≥ 2 GB RAM** (torch / sentence-transformers cold start)
   - Config in `ml/railway.toml`
4. **Wire backend → ML** (backend **Variables** tab):
   - `ML_URL` = `http://${{ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml.PORT}}`
   - Use Railway’s variable picker: select service **ml** → `RAILWAY_PRIVATE_DOMAIN` and `PORT`
   - Service name must be `ml` (lowercase) for `${{ml.*}}` references to work
5. **Backend env (minimum)**:
   - `POSTGRES_CONNECTION_STRING` = Supabase URL (shared with local)
   - `ML_URL` = (above)
   - `MUNSHI_WEB_URL` = `https://www.munshidada.com`
   - `CORS_ORIGIN` = `https://www.munshidada.com,https://munshidada.com`
   - `OLLI_KEY`, `X_SECRET`, `OTP_PEPPER`, `WHATSAPP_VERIFY_TOKEN`
   - `ONBOARDING_SKIP_OTP=true` — pilot: skip SMS OTP on web signup (set `false` when MSG91 live), `NODE_ENV=production`
6. **ML env (minimum)**:
   - `OPENAI_API_KEY` = your key

### What happens on `git push` to `main`

| Changed paths | Backend redeploys? | ML redeploys? |
|---------------|-------------------|---------------|
| `backend/**` | Yes | No |
| `ml/**` | No | Yes |
| `web/**` only | No | No (Vercel handles web) |
| Both backend + ml | Yes | Yes (in parallel) |

You do **not** need a compose file or a script to chain deploys — Railway triggers each service independently from the same push.

### Switch Railway from `Shantanu` → `main`

1. [Railway project](https://railway.com/project/043b8a36-21f6-422b-82af-fd7831269075) → **backend** and **ml** services.
2. **Settings → Source** → repo `M4N4N22/Munshi_Updated` (or org repo), branch **`main`**.
3. **Redeploy** both services once after merging admin/onboarding PRs.
4. Confirm backend health: `GET https://<backend-domain>/health`

## Vercel + Olli

- Vercel `NEXT_PUBLIC_API_URL` = Railway backend public URL.
- Olli webhook = `{RAILWAY_BACKEND_URL}/webhook`.
