# Deployment Flow Report

**Date:** 2026-06-01

## Current flow (AWS — from repository evidence)

```text
Developer push to main
        ↓
GitHub Actions: build-and-push
  • docker build (Dockerfile)
  • push shantanugarg2004/munshi_dada:latest
        ↓
GitHub Actions: deploy-on-ec2
  • SSH to EC2_HOST
  • cd /home/ubuntu/munshi-dada
  • docker compose pull
  • restart-docker-compose
        ↓
Container starts (pre-fix: yarn start → Nest only)
```

## Where migrations SHOULD run

| Priority | Location | Rationale |
|----------|----------|-----------|
| 1 | **Container entrypoint** | Every start/restart applies pending SQL idempotently |
| 2 | **App bootstrap** | Defense in depth for non-Docker runs (`yarn dev`) |
| 3 | **CI fresh DB test** | Catch broken SQL before production image |
| 4 | **Optional pre-deploy SSH** | Redundant if entrypoint current |

## Where migrations ACTUALLY ran (pre-fix)

| Step | Ran migrations? |
|------|-----------------|
| Local `yarn dev` | No |
| Docker build | No |
| Docker container start | No |
| GitHub Actions | No |
| EC2 SSH deploy | No |
| **Manual operator** | **Yes** (`apply-migrations.mjs` / psql) |

## Updated flow (post-fix)

```text
Developer push to main
        ↓
GitHub Actions: migration-validation
  • Postgres service container
  • node scripts/apply-migrations.mjs
  • node scripts/migration-status.mjs
        ↓
GitHub Actions: build-and-push (needs migration-validation)
        ↓
GitHub Actions: deploy-on-ec2
  • docker compose pull
  • restart-docker-compose
        ↓
Container CMD: node scripts/docker-entrypoint.mjs
  1. bootstrapMigrations() — apply pending
  2. node dist/main.js
        ↓
main.ts ensureDatabaseMigrations() — second gate for yarn dev / direct node
        ↓
GET /health/migrations — operational visibility
```

## Docker image contents (post-fix)

```dockerfile
COPY migrations/
COPY scripts/
ENV AUTO_MIGRATE=1
CMD node scripts/docker-entrypoint.mjs
```

## Gaps remaining outside repo

- EC2 `docker-compose.yml` not versioned — team should align with `docker-compose.example.yml`
- `restart-docker-compose` shell helper not in git
- GCP deployment not defined — reuse same entrypoint + env pattern when added

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `POSTGRES_CONNECTION_STRING` | required | Migration target DB |
| `AUTO_MIGRATE` | `1` | Apply pending at startup |
| `AUTO_MIGRATE=0` | — | **Refuse start** if pending migrations |
| `DRY_RUN=1` | — | List pending without applying |
