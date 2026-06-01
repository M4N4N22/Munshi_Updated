# Migration Automation Report

**Date:** 2026-06-01

## Implementation

### Shared runner

**File:** `scripts/lib/migration-runner.mjs`

Exports:

- `loadConnectionString()` — env → `.env.local` → `.env`
- `listMigrationFiles()` — sorted `migrations/*.sql`
- `getMigrationStatus()` — applied/pending via `schema_migrations`
- `runPendingMigrations()` — idempotent apply with stop-on-error
- `bootstrapMigrations()` — auto-apply or throw if `AUTO_MIGRATE=0`

### CLI wrappers

| Command | Script |
|---------|--------|
| `yarn migrate` | `scripts/apply-migrations.mjs` |
| `yarn migrate:status` | `scripts/migration-status.mjs` (exit 2 if pending) |

### Docker entrypoint

**File:** `scripts/docker-entrypoint.mjs`

```text
bootstrapMigrations() → exit 1 on failure → spawn node dist/main.js
```

### Package.json

```json
"migrate": "node scripts/apply-migrations.mjs",
"migrate:status": "node scripts/migration-status.mjs",
"start:prod": "node scripts/docker-entrypoint.mjs"
```

## Target flow achieved

```text
Deploy → Run Pending Migrations → Verify Success → Start Application
```

## Verification (2026-06-01)

```bash
node scripts/migration-status.mjs
# applied_count: 6, pending_count: 0, up_to_date: true

node scripts/migration-test-scenarios.mjs
# 3/3 scenarios passed
```

## CI integration

**Job:** `migration-validation` in `.github/workflows/cicd.yml`

- Spins Postgres 16 service
- Applies all migrations on empty database
- Blocks `build-and-push` if migration SQL fails

## Future migrations

Add `007_*.sql` to `migrations/` — runner picks it up automatically via sorted directory listing. No code change required beyond the SQL file.
