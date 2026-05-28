# Munshi — Deployment Architecture

Companion to `infrastructure-dependency-audit.md`. Describes **how the system is deployed today** without changing infrastructure.

---

## Overview

| Layer | Technology |
|-------|------------|
| Source | GitHub (`ShantanuGarg2004/Munshi_Updated`) |
| CI | GitHub Actions (single workflow) |
| Artifact | Docker image on Docker Hub |
| Runtime | Docker on AWS EC2 (inferred) |
| Process manager | Docker Compose (on server, not in repo) |
| App | NestJS 11 in Node 20 Alpine container |

---

## CI/CD pipeline

**File:** `.github/workflows/cicd.yml`

### Job 1: `build-and-push`

- Trigger: push to `main`
- Builds from repo root `Dockerfile`
- Platforms: `linux/amd64`, `linux/arm64`
- Pushes to: **`ajayshakya786/munshi-dada:latest`**
- Auth: GitHub secret `DOCKER_PASSWORD` + hardcoded `DOCKER_USERNAME`

### Job 2: `deploy-on-ec2`

- Depends on: `build-and-push`
- SSH: `ubuntu@${EC2_HOST}` with `EC2_SSH_KEY`
- Remote: `cd /home/ubuntu/munshi-dada && restart-docker-compose`

There is **no** build matrix per environment, no manual approval, and no versioned image tags in the workflow.

---

## Docker image

```text
build stage:  node:20-alpine → yarn install → yarn build
prod stage:   copy dist/, node_modules/, package.json
CMD:          yarn start   (nest start)
EXPOSE:       4000
```

**Note:** Application reads `PORT` from environment (default `3000`). Production compose on EC2 should set `PORT=4000` to match `EXPOSE`, or align both.

---

## Server layout (assumed, not in git)

```text
/home/ubuntu/munshi-dada/
├── docker-compose.yml      # pulls image + env (NOT in repository)
└── (env files)             # POSTGRES, OLLI, ML_URL, etc.
```

Custom command `restart-docker-compose` is installed on the EC2 host outside this repo.

`.dockerignore` excludes `docker-compose.yml` from the image build — compose is **host-only**.

---

## Runtime dependencies at deploy time

The container expects environment variables (typically from compose):

- `POSTGRES_CONNECTION_STRING` — required at startup
- `OLLI_URL`, `OLLI_KEY` — WhatsApp outbound
- `ML_URL` — AI classification
- `WHATSAPP_VERIFY_TOKEN` — Meta GET webhook verification
- Optional: `PORT`, `CORS_ORIGIN`, `X_SECRET`, `WHATSAPP_ONBOARDING_TEMPLATE`

See full list in `infrastructure-dependency-audit.md` §3.

---

## Networking

| Endpoint | Path | Purpose |
|----------|------|---------|
| HTTP API | `/` (Nest) | REST admin + Swagger `/api/docs` |
| Health | `/health` | Postgres connectivity |
| WhatsApp verify | `GET /webhook` | Meta subscription |
| WhatsApp inbound | `POST /webhook` | Olli-shaped message payload |
| Test | `POST /webhook/test` | Manual NL testing |

Public HTTPS termination (NGINX/Caddy/ALB) is **not defined in this repository** — assumed on EC2.

---

## What is NOT in this deployment repo

- `docker-compose.yml`
- NGINX / TLS config
- FastAPI ML service
- Postgres provisioning scripts
- GitHub Actions secrets values
- Meta / Olli dashboard configuration

---

## Ownership alignment checklist

Before relying on this pipeline under Munshi ownership:

1. Replace `DOCKER_USERNAME` `ajayshakya786` with team registry account.
2. Rotate `DOCKER_PASSWORD`, `EC2_HOST`, `EC2_SSH_KEY` in GitHub.
3. Clone compose + env from old EC2 or rebuild on new host.
4. Confirm image pull uses new registry path.
5. Add staging workflow or `workflow_dispatch` before auto-deploy to production.

---

*See `infrastructure-dependency-audit.md` for migration plan and risks.*
