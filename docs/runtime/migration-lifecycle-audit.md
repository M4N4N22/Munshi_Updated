# Migration Lifecycle Audit

**Date:** 2026-06-01  
**Scope:** Munshi Backend migration system (001–006)

## Current lifecycle (pre-fix)

```text
Developer writes migrations/*.sql
        ↓
Committed to git
        ↓
yarn dev / yarn start / Docker CMD
        ↓
NestJS bootstrap → DbService.init() → sequelize.authenticate() ONLY
        ↓
Application serves traffic (schema may be outdated)
        ↓
Operator manually runs psql OR node scripts/apply-migrations.mjs
```

## Configuration inventory

| Artifact | Migration behavior | Evidence |
|----------|-------------------|----------|
| `package.json` | No `migrate` script wired to start/dev (pre-fix) | Only `build`, `dev`, `start:prod` |
| `src/main.ts` | No migration gate | Direct `NestFactory.create` |
| `src/core/services/db-service/db.service.ts` | `sequelize.sync()` **commented out** | Line 29 |
| `migrations/README.md` | Documents manual `psql` only | Explicit "does not auto-run" |
| `scripts/apply-migrations.mjs` | Manual remediation script | Not called by CI/Docker/start |
| `Dockerfile` | `CMD yarn start` — no migrations copied | Only `dist/`, `node_modules/` |
| `.github/workflows/cicd.yml` | Build → push → SSH restart only | No migration job |
| EC2 `docker-compose.yml` | **Not in repository** | Host-only per `.dockerignore` |
| `restart-docker-compose` | Restarts containers | No migration step |

## Intended vs actual

| Stage | Intended (docs) | Actual |
|-------|-----------------|--------|
| Local dev | Manual psql | Manual; `yarn dev` never migrated |
| Docker | Unknown | Image start = `nest start`, no SQL files |
| CI/CD | None documented | Build/push/deploy only |
| Runtime DB | Schema matches models | Drift until manual apply |

## Post-fix lifecycle

```text
Deploy / yarn dev / container start
        ↓
scripts/lib/migration-runner.mjs
        ↓
Check schema_migrations → apply pending SQL
        ↓
Verify success (exit 1 on failure)
        ↓
NestJS bootstrap
        ↓
GET /health/migrations for visibility
```

## Key files (new/updated)

- `scripts/lib/migration-runner.mjs` — shared runner
- `scripts/docker-entrypoint.mjs` — migrate + start
- `src/main.ts` — startup protection
- `GET /health/migrations` — status endpoint
- `docker-compose.example.yml` — local reference stack
