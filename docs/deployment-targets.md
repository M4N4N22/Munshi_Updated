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

## Switch Railway from `Shantanu` → `main`

1. [Railway project](https://railway.com/project/043b8a36-21f6-422b-82af-fd7831269075) → each service (backend, ml).
2. **Settings → Source** → connect repo `ShantanuGarg2004/Munshi_Updated`, branch **`main`**.
3. **Redeploy** backend + ML (or wait for auto-deploy after this doc’s CI push).
4. Backend env (minimum):
   - `POSTGRES_CONNECTION_STRING` = Supabase URL (shared with local)
   - `ML_URL` = `http://${{ml.RAILWAY_PRIVATE_DOMAIN}}:${{ml.PORT}}`
   - `MUNSHI_WEB_URL` = `https://www.munshidada.com`
   - `CORS_ORIGIN` = `https://www.munshidada.com,https://munshidada.com`
   - `OLLI_KEY`, `X_SECRET`, `OTP_PEPPER`, `WHATSAPP_VERIFY_TOKEN`

## Vercel + Olli

- Vercel `NEXT_PUBLIC_API_URL` = Railway backend public URL.
- Olli webhook = `{RAILWAY_BACKEND_URL}/webhook`.
