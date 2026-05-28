# Infrastructure Audit — Index

**Full audit:** [infrastructure-dependency-audit.md](./infrastructure-dependency-audit.md)  
**Deployment detail:** [deployment-architecture.md](./deployment-architecture.md)  
**Application architecture:** [architecture-analysis.md](./architecture-analysis.md)

---

## Quick findings (2026-05-28)

### External accounts likely tied to another developer

- Docker Hub user **`ajayshakya786`** (hardcoded in CI)
- EC2 deploy path **`/home/ubuntu/munshi-dada`** + secrets `EC2_HOST`, `EC2_SSH_KEY`
- GitHub secret **`DOCKER_PASSWORD`** for that Docker Hub account

### External services in use

- AWS EC2 (deploy target)
- Docker Hub (images)
- PostgreSQL (env-driven; Neon commented as alternate in local env)
- Olli WABA API (`getolliai.com`)
- Meta WhatsApp (verify token + templates; outbound via Olli)
- FastAPI ML service (`ML_URL`, not in this repo)

### Not used

- Redis, AWS S3/SDK, OpenAI SDK, MongoDB (disabled)

### Critical action before scaling

1. Stop accidental deploys to old EC2 (review GitHub Actions secrets).
2. Plan registry + server + DB + WhatsApp ownership cutover (see full audit §8).
3. Audit ML service repository separately for AI provider keys.

---

*This file is a summary index only. All evidence and migration steps are in the full audit document.*
