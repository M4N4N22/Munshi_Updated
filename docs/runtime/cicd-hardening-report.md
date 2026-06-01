# CI/CD Hardening Report

**Date:** 2026-06-01

## Environment strategy (unified)

All environments use the same migration runner (`scripts/lib/migration-runner.mjs`) with `schema_migrations` tracking.

| Environment | Migration trigger | Status |
|-------------|-------------------|--------|
| **Local dev** | `main.ts` on `yarn dev` / `yarn start` | ✅ Implemented |
| **Docker** | `docker-entrypoint.mjs` on container start | ✅ Implemented |
| **Docker Compose** | `docker-compose.example.yml` + entrypoint | ✅ Example provided |
| **GitHub Actions** | `migration-validation` job on fresh Postgres | ✅ Implemented |
| **AWS EC2** | New image entrypoint on `restart-docker-compose` | ✅ After next deploy |
| **GCP** | Not in repo | 📋 Use same Dockerfile CMD when added |

## GitHub Actions changes

### New job: `migration-validation`

- Runs before `build-and-push`
- Service: `postgres:16-alpine`
- Steps: `apply-migrations.mjs` → `migration-status.mjs`

### Deploy job

- Added `docker compose pull` before restart
- Migration execution delegated to container entrypoint (image includes `migrations/` + `scripts/`)

## Docker changes

| Before | After |
|--------|-------|
| CMD `yarn start` | CMD `node scripts/docker-entrypoint.mjs` |
| No SQL in image | `COPY migrations/ scripts/` |
| No AUTO_MIGRATE | `ENV AUTO_MIGRATE=1` |

## Local developer workflow

```bash
yarn migrate:status   # check pending
yarn dev              # auto-migrates then starts Nest
```

## Operational monitoring

```bash
curl http://localhost:4001/health/migrations
```

Response when healthy:

```json
{
  "status": "ok",
  "up_to_date": true,
  "applied_count": 6,
  "pending_count": 0,
  "latest_file": "006_procurement_foundation.sql"
}
```

## EC2 action items (outside repo)

1. Ensure compose pulls new image with entrypoint after merge to `main`
2. Align compose service env: `POSTGRES_CONNECTION_STRING`, `AUTO_MIGRATE=1`
3. Optionally version `docker-compose.yml` in git using `docker-compose.example.yml` as template

## Regression prevention

- CI fails if migration SQL breaks on empty database
- Startup fails if pending migrations and auto-migrate disabled
- Startup fails if migration SQL errors during apply
