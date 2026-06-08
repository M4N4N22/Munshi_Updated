# Backend Deployment Validation (Railway)

**Status:** Validated — not deployed  
**Branch:** `Shantanu`  
**Date:** 2026-06-07

---

## Directory verified: `backend/`

| Check | Result | Evidence |
|-------|--------|----------|
| `package.json` present | PASS | NestJS 11, scripts defined |
| Production build script | PASS | `"build": "nest build"` |
| Production start script | PASS | `"start:prod": "node scripts/docker-entrypoint.mjs"` |
| Lockfile for reproducible install | PASS | `yarn.lock` present |
| Migration SQL files | PASS | 15 files in `backend/migrations/` |
| Health endpoint | PASS | `GET /health` — Postgres connectivity via Terminus |
| Migration health endpoint | PASS | `GET /health/migrations` |
| PORT handling | PASS | `process.env.PORT ?? 4001` in `main.ts` |
| CORS | PASS | `CORS_ORIGIN` comma-separated origins |
| Security guards | PASS | `ENABLE_WEBHOOK_TEST_ROUTE` gated; `InternalCallGuard` on `/resolve/*` |

---

## `package.json` scripts

```json
"build": "nest build",
"start:prod": "node scripts/docker-entrypoint.mjs",
"migrate": "node scripts/apply-migrations.mjs",
"migrate:status": "node scripts/migration-status.mjs"
```

**Production path:** Railway runs `yarn build` → `node scripts/docker-entrypoint.mjs`.

---

## Production entrypoint flow

`scripts/docker-entrypoint.mjs`:

1. Runs `scripts/migration-bootstrap.mjs` (applies pending SQL if `AUTO_MIGRATE !== '0'`)
2. Spawns `node dist/main.js` with `SKIP_MIGRATION_BOOTSTRAP=1` (avoids double migration)

`main.ts` also has a migration gate for non-entrypoint starts (local `nest start`); entrypoint sets `SKIP_MIGRATION_BOOTSTRAP=1` for the child process.

**Default:** `AUTO_MIGRATE=1` (migrations run on every deploy/restart).

---

## Health endpoints

### `GET /health`

- Controller: `backend/src/core/health-check/health.controller.ts`
- Checks: Postgres connection via `CustomHealthService.checkSqlConnection()`
- **PASS criteria:** HTTP 200, body includes `"Postgres": {"status": "up"}`

### `GET /health/migrations`

- Controller: `backend/src/core/migrations/migration-health.controller.ts`
- Returns applied/pending migrations from `schema_migrations` table
- **PASS criteria:** `"status": "ok"` when schema is up to date

---

## Migration strategy

| Aspect | Detail |
|--------|--------|
| **When** | On every Backend container start (before NestJS listens) |
| **How** | `migration-bootstrap.mjs` → `apply-migrations.mjs` logic |
| **Disable** | Set `AUTO_MIGRATE=0` (not recommended for Railway) |
| **Manual CLI** | `yarn migrate` / `yarn migrate:status` (requires DB access) |
| **Rollback** | No down-migrations — forward-only (see `07-migration-plan.md`) |

---

## Exact Railway settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `yarn install --frozen-lockfile && yarn build` |
| **Start Command** | `node scripts/docker-entrypoint.mjs` |
| **Health Check Path** | `/health` |
| **Health Check Timeout** | 60s (migrations may add startup latency on first deploy) |
| **Watch Paths** | `backend/**` |

### Recommended additional Railway variables

| Variable | Value |
|----------|-------|
| `NIXPACKS_NODE_VERSION` | `20` |
| `NODE_ENV` | `production` |
| `AUTO_MIGRATE` | `1` (default — explicit is fine) |
| `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` | `false` |

### Do NOT set in production

| Variable | Reason |
|----------|--------|
| `ENABLE_WEBHOOK_TEST_ROUTE=true` | Exposes debug webhook route |
| `SKIP_MIGRATION_BOOTSTRAP=1` | Would skip migrations if set on entrypoint env |

---

## Build validation notes

- `nest build` compiles TypeScript to `dist/`
- `migrations/` and `scripts/` must be present at runtime (not compiled into `dist/`) — Railway deploys full `backend/` tree after build
- `Dockerfile` confirms same pattern: copies `dist/`, `node_modules/`, `migrations/`, `scripts/`

---

## Inter-service URLs (Backend perspective)

| Target | Env var | Example |
|--------|---------|---------|
| PostgreSQL | `POSTGRES_CONNECTION_STRING` | `${{Postgres.DATABASE_URL}}` |
| ML (private) | `ML_URL` | `http://${{ML.RAILWAY_PRIVATE_DOMAIN}}:${{ML.PORT}}` |
| Web (CORS/OAuth) | `CORS_ORIGIN`, `MUNSHI_WEB_URL` | `https://munshi.app` |

Service name in Railway references (`${{ML.*}}`) must match the actual ML service slug after creation.

---

## Validation verdict

**Backend deployment configuration: PASS**

Ready for Railway source deploy from `backend/` root with the settings above.
