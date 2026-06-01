# Startup Protection Report

**Date:** 2026-06-01

## Requirement

Application must not start silently against an outdated schema.

## Implementation

### Layer 1 — `main.ts` (all entry paths)

Before `NestFactory.create()`:

```typescript
await ensureDatabaseMigrations();
```

Behavior:

| Condition | Action |
|-----------|--------|
| All migrations applied | Log "Database schema is up to date", continue |
| Pending + `AUTO_MIGRATE=1` (default) | Apply pending, exit 1 on SQL failure |
| Pending + `AUTO_MIGRATE=0` | Log pending list, **exit 1** |

Error message example:

```text
Database schema is outdated. Pending migrations (1): 007_example.sql.
Run `yarn migrate` or set AUTO_MIGRATE=1 to apply automatically at startup.
```

### Layer 2 — Docker entrypoint

Same `bootstrapMigrations()` runs before spawning `dist/main.js`. Container exits non-zero if migration fails — orchestrator will not mark unhealthy pod as ready.

### Layer 3 — DbService (unchanged)

Still refuses start if Postgres unreachable (`process.exit(1)`). Does not replace migration checks.

## What is NOT used

- `sequelize.sync()` — remains disabled to avoid uncontrolled DDL
- Silent skip — no path continues with pending migrations unless explicitly disabled and zero pending

## Disable auto-migrate (advanced)

```bash
AUTO_MIGRATE=0 yarn dev
```

Startup **will fail** if any pending migration exists — forces operator to run `yarn migrate` manually first.

## Test evidence

`scripts/migration-test-scenarios.mjs` scenario `auto_migrate_disabled_refuses`:

- Removes 006 from tracking
- Calls `bootstrapMigrations({ autoMigrate: false })`
- Confirms refusal with pending list
