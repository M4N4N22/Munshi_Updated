# Implementation Report — Phase 1

## Prompt 1.5 — Infrastructure Dependency Audit

**Date:** 2026-05-28  
**Status:** Complete (analysis only; no infrastructure changes)

---

## 1. What was analyzed

- GitHub Actions CI/CD and deployment automation
- Docker build and runtime configuration
- Environment variable usage across the NestJS codebase
- WhatsApp / Meta / Olli integration paths
- PostgreSQL and optional Mongo configuration
- Cloud SDK usage, Redis, queues, and external API references
- Domain, webhook, and CORS assumptions
- Repository vs infrastructure ownership alignment

---

## 2. Files inspected

| Category | Paths |
|----------|-------|
| CI/CD | `.github/workflows/cicd.yml` |
| Container | `Dockerfile`, `.dockerignore` |
| Config | `package.json`, `.gitignore`, `.env.local` (local, gitignored) |
| Bootstrap | `src/main.ts` |
| Database | `src/core/services/db-service/db.service.ts`, `providers/sql.provider.ts`, `providers/mongo.provider.ts` |
| Messaging | `src/core/messaging/messaging.service.ts` |
| WhatsApp | `src/modules/whatsapp/whatsapp.controller.ts`, `whatsapp.service.ts` |
| Security | `src/core/guards/guards.ts` |
| Onboarding | `src/services/factories/factories.service.ts` |
| Cron | `src/services/tasks/task-deadline.cron.ts` |
| Git | `git remote -v` |
| Prior docs | `docs/architecture-analysis.md` |

**Not available in repo:** `docker-compose.yml`, EC2 host config, FastAPI ML service, Meta/Olli dashboards.

---

## 3. Infrastructure dependencies discovered

| Dependency | Role |
|------------|------|
| GitHub Actions | Build multi-arch image, SSH deploy on push to `main` |
| Docker Hub (`ajayshakya786/munshi-dada`) | Container registry |
| AWS EC2 | Production host (via `EC2_HOST` secret) |
| PostgreSQL | Primary database (`POSTGRES_CONNECTION_STRING`) |
| Olli API | WhatsApp send + likely inbound relay |
| Meta WhatsApp | Webhook verification + message templates |
| FastAPI ML (`ML_URL`) | Intent classification (external host) |
| Node 20 Alpine | Base Docker image (public) |

**Absent:** Redis, AWS S3, OpenAI SDK, staging environment, in-repo compose.

---

## 4. Ownership dependencies discovered

- **CI publishes to another user’s Docker Hub** while git remote is `ShantanuGarg2004/Munshi_Updated` — high risk of deploying to third-party infra if secrets unchanged.
- **Deploy targets EC2** using secrets not defined in repo — ownership = whoever controls `EC2_HOST` / SSH key.
- **Postgres and ML URLs** in local env sample use public IPs — likely VMs owned by prior operator.
- **Olli + Meta WABA** credentials are environment-bound; templates (`factory_attendance_reminder`, `onboarding_message`) must exist in the business account.
- **`WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`** appear unused (Olli-only outbound) — may still be billed/owned under old Meta setup.

---

## 5. Risks / issues

1. **Auto-deploy on `main`** may update production on a server the Munshi team does not own.
2. **Webhook cutover** can drop WhatsApp messages if Meta/Olli URL is switched incorrectly.
3. **No migrations** — database migration requires manual schema export.
4. **Secrets in `.env.local`** on developer machines (gitignored) — rotation recommended during ownership transfer, not done in this task.
5. **Single `latest` tag** — non-reproducible rollbacks.
6. **ML service not in repo** — blind spot for OpenAI/model provider keys.

---

## 6. Recommended next step

1. **Pause or gate** GitHub Actions deploy job until new `EC2_*` and Docker registry secrets are under Munshi control.
2. **Export** server `docker-compose.yml`, env, and Postgres dump from current EC2 (with incumbent owner or read-only access).
3. **Execute** migration plan in `docs/infrastructure-dependency-audit.md` §8 (parallel infra → data → WhatsApp → CI).
4. **Audit** FastAPI ML repository separately (Prompt 2 or dedicated ML infra pass).
5. Proceed to **Prompt 2** feature work only after webhook + DB + deploy path are owned by the team.

---

## Deliverables created

| Document | Purpose |
|----------|---------|
| `docs/infrastructure-dependency-audit.md` | Full audit (required structure §1–§10) |
| `docs/deployment-architecture.md` | Deployment-focused reference |
| `docs/infra-audit.md` | Executive index / quick findings |
| `docs/implementation-report.md` | This report |

**Prior doc retained:** `docs/architecture-analysis.md` (unchanged in this pass).

---

*Stop rule: audit complete. Awaiting next prompt.*
