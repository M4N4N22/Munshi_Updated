# Final Release Readiness Signoff

**Branch under review:** `Shantanu`  
**Target branch:** `main`  
**Audit date:** 2026-06-07  
**Auditor:** Automated pre-merge audit (no code changes made)

---

## Final verdict

# DO NOT MERGE

---

## Rationale

The `Shantanu` branch delivers substantial inventory, Zoho, and Phase 4 NL workflow functionality (7 commits, 458 files, +62k lines). Core builds succeed and the majority of tests pass. However, **five CRITICAL blockers** prevent safe merge to `main`:

1. **Committed OpenAI API key** in `ml/.env.example` (secret exposure)
2. **Broken ML Docker image** — missing `parsers/`, `contracts/`, `extractors/`
3. **Unguarded debug endpoints** — `POST /webhook/test`, `POST /resolve/task-inventory`
4. **Failing backend test suite** — 2 workflow test files out of sync with production code
5. **Port misconfiguration** — `main.ts` / Dockerfile / docs disagree on backend port

---

## Phase results

| Phase | Report | Verdict |
|-------|--------|---------|
| 1 — Monorepo health | [01-monorepo-audit.md](./01-monorepo-audit.md) | **FAIL** |
| 2 — Backend | [02-backend-audit.md](./02-backend-audit.md) | **FAIL** |
| 3 — ML | [03-ml-audit.md](./03-ml-audit.md) | **FAIL** |
| 4 — Web | [04-web-audit.md](./04-web-audit.md) | PASS WITH ISSUES |
| 5 — Database | [05-database-audit.md](./05-database-audit.md) | PASS WITH ISSUES |
| 6 — Environment | [06-env-audit.md](./06-env-audit.md) | FAIL (docs + secret) |
| 7 — Deployment | [07-deployment-readiness.md](./07-deployment-readiness.md) | **FAIL** |
| 8 — Security | [08-security-audit.md](./08-security-audit.md) | **FAIL** |
| 9 — Test coverage | [09-test-coverage-audit.md](./09-test-coverage-audit.md) | PARTIAL |
| 10 — Merge blockers | [10-merge-blockers.md](./10-merge-blockers.md) | 5 CRITICAL |

---

## What passed

| Check | Result |
|-------|--------|
| `yarn build` (backend) | PASS |
| `npm run build` (web) | PASS |
| `yarn test -- contract-drift` | PASS (39 tests) |
| `PYTHONPATH=ml pytest` | PASS (56 tests) |
| `npm test` (web) | PASS (4 tests) |
| Migration status (15/15) | PASS |
| CI migration validation job (configured) | PASS (on `main` push) |
| Monorepo structure | PASS |
| Contract alignment backend ↔ ML | PASS |

---

## Exact blockers (must fix before merge)

| Priority | Action |
|----------|--------|
| P0 | Rotate OpenAI key; replace `ml/.env.example` value with `your-openai-api-key-here` |
| P0 | Update `ml/Dockerfile` to `COPY parsers/ contracts/ extractors/` (and any other imports) |
| P0 | Protect or disable `POST /webhook/test` and `POST /resolve/task-inventory` in production |
| P0 | Fix `workflow.registry.spec.ts` (8 handlers) and `workflow-hardening.spec.ts` mock |
| P0 | Align `PORT` — `main.ts` default `4001`, Dockerfile `EXPOSE 4001` |

---

## Post-merge deploy checklist (after blockers cleared)

| Service | Platform | Prerequisite |
|---------|----------|--------------|
| Backend | EC2/GCP VM | Supabase `POSTGRES_CONNECTION_STRING`, `ML_URL`, `OLLI_KEY`, Zoho vars |
| ML | Separate container | `OPENAI_API_KEY`, fixed Dockerfile |
| Web | Vercel (`web/` root) | `NEXT_PUBLIC_API_URL`, `TURSO_*`, `ADMIN_SECRET_KEY` |

---

## Sign-off

| Role | Status | Date |
|------|--------|------|
| Automated audit | **DO NOT MERGE** | 2026-06-07 |
| Engineering lead | _Pending_ | |
| Security review | _Pending_ (OpenAI key rotation) | |
| Ops / deploy | _Pending_ (ML Docker, port alignment) | |

---

## Report index

1. [01-monorepo-audit.md](./01-monorepo-audit.md)
2. [02-backend-audit.md](./02-backend-audit.md)
3. [03-ml-audit.md](./03-ml-audit.md)
4. [04-web-audit.md](./04-web-audit.md)
5. [05-database-audit.md](./05-database-audit.md)
6. [06-env-audit.md](./06-env-audit.md)
7. [07-deployment-readiness.md](./07-deployment-readiness.md)
8. [08-security-audit.md](./08-security-audit.md)
9. [09-test-coverage-audit.md](./09-test-coverage-audit.md)
10. [10-merge-blockers.md](./10-merge-blockers.md)
