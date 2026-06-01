# Migration Root Cause Analysis

**Date:** 2026-06-01  
**Classification:** Project-wide migration system failure (deployment integration gap)

## Executive answer

Migrations 001–006 were **never auto-executed** because **no deployment or startup path invoked them**. SQL is valid; entities align after apply; the failure is **operational integration**, not bad migration content.

## Where execution was supposed to happen

| Expected location | Documented? | Implemented? |
|-------------------|-------------|--------------|
| Developer manual `psql` | Yes (`migrations/README.md`) | Yes (only path that worked) |
| App startup | Explicitly **disabled** | No |
| Docker entrypoint | No | No (pre-fix) |
| GitHub Actions | No | No (pre-fix) |
| EC2 deploy script | No | No |

## Evidence chain

### 1. Application starts against outdated schema

**File:** `src/core/services/db-service/db.service.ts`

```typescript
await this.sqlConnection.init();  // authenticate only
// await this.sqlConnection.sync({alter: true});  // DISABLED
```

**File:** `src/core/health-check/health.service.ts` — checks `isConnected()`, not table existence.

**Result:** App boots with Postgres reachable but missing `vendors`, `inventory_*`, etc.

### 2. Migration command exists but never called

**File:** `scripts/apply-migrations.mjs` — created in runtime sprint, not in `package.json` scripts (pre-fix), not in Dockerfile CMD, not in `cicd.yml`.

### 3. Docker omits migration assets

**Pre-fix Dockerfile:**

```dockerfile
COPY dist/, node_modules/, package.json
CMD ["yarn","start"]
```

No `migrations/` folder, no `scripts/` folder, no entrypoint.

### 4. CI/CD bypasses migrations

**File:** `.github/workflows/cicd.yml` (pre-fix)

```yaml
deploy: cd /home/ubuntu/munshi-dada && restart-docker-compose
```

No migration step between image push and container restart.

### 5. Explicit documentation of non-auto-run

**File:** `migrations/README.md` line 62:

> The NestJS app does **not** auto-run migrations at startup

This was intentional for legacy safety but became systemic drift once Prompt 2–10 modules depended on new tables.

## Environment matrix (pre-fix)

| Environment | Migrations run? | Evidence |
|-------------|-----------------|----------|
| Local dev (`yarn dev`) | No | No hook in main.ts or package.json |
| Docker image | No | Dockerfile CMD = nest start |
| Docker Compose (EC2) | No | compose file not in repo; no migrate service |
| GitHub Actions | No | cicd.yml build/deploy only |
| AWS EC2 | No | SSH restart only |
| GCP | N/A | No GCP workflow in repo |

## Root cause statement

**Primary:** Missing migration execution in all automated deployment and startup paths.  
**Secondary:** Health checks validate DB connectivity, not schema version.  
**Contributing:** Manual-only documentation; `sequelize.sync` disabled without replacement automation until runtime sprint script.

## Fix summary (this sprint)

1. Shared `migration-runner.mjs` with `schema_migrations` tracking (all 6 files).
2. Startup gate in `main.ts` (`AUTO_MIGRATE=1` default).
3. Docker entrypoint migrates before `dist/main.js`.
4. `GET /health/migrations` for visibility.
5. CI job validates migrations on fresh Postgres before image push.
