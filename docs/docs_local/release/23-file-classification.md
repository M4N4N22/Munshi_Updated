# File Classification

**Date:** 2026-06-07

---

## MUST COMMIT

| Path | Justification |
|------|---------------|
| `ml/.env.example` | **CRITICAL** — removes live OpenAI key from tracked example |
| `backend/.env.example` | Railway/deploy env documentation (MSG91, flags, deduped URLs) |
| `web/.env.example` | Turso + admin key documentation |
| `.env.example` | Monorepo env pointer |
| `backend/src/main.ts` | PORT standardization (4001) |
| `backend/Dockerfile` | EXPOSE 4001 alignment |
| `backend/src/modules/whatsapp/whatsapp.controller.ts` | Security: webhook test route gating |
| `backend/src/services/task-inventory-resolution/task-inventory-resolution.controller.ts` | Security: InternalCallGuard |
| `backend/src/services/task-inventory-resolution/task-inventory-resolution.module.ts` | Guard provider registration |
| `backend/src/services/workflow/workflow.registry.spec.ts` | Test fix — registry matches production |
| `backend/src/services/workflow/workflow-hardening.spec.ts` | Test fix — mock completeness |
| `ml/pytest.ini` | ML test infra — enables `pytest` without manual PYTHONPATH |
| `docs/docs_local/release/*.md` | Audit trail + deploy plans (team visibility) |

### Lockfiles — decision required

| Path | Recommendation |
|------|----------------|
| `backend/package-lock.json` | **Commit if npm is canonical** — or revert if yarn-only |
| `web/package-lock.json` | **Commit if npm is canonical** — or revert if yarn-only |
| `web/yarn.lock` | Minor drift — commit with web changes or revert |

*Triple lockfile problem (npm + yarn + pnpm in web) remains a repo hygiene issue.*

---

## SAFE TO IGNORE (do not commit)

| Path | Justification |
|------|---------------|
| `backend/.env` | Gitignored; local credentials (`OLLI_KEY`, Postgres URL) |
| `ml/.env` | Gitignored; contains live `OPENAI_API_KEY` |
| `web/.env.local` | Gitignored; local Vercel/API config |
| `backend/dist/` | Build output (gitignored) |
| `web/.next/` | Build output (gitignored) |
| `ml/.venv/` | Python venv (gitignored) |
| `**/node_modules/` | Dependencies (gitignored) |

---

## SAFE TO DELETE (local machine)

| Path | Justification |
|------|---------------|
| `.local/pgdata/**` | Ephemeral Postgres data; regenerable via `start-postgres.mjs` |
| `.local/node_modules/` | Reinstallable via `npm install` in `.local/` |
| `.local/package-lock.json` | Regenerable |
| `.local/package.json` | Local helper only |

### Do NOT delete (until committed)

| Path | Reason |
|------|--------|
| Uncommitted remediation files | Needed for push |
| `docs/docs_local/release/` | Audit documentation to commit |

### Stale / duplicate

| Item | Action |
|------|--------|
| `stash@{0}` | Drop after committing working tree (duplicate content) |

---

## Railway readiness file status

| File | Committed @ HEAD? | Working tree |
|------|-------------------|--------------|
| `ml/.env.example` | **Yes — contains live key** | Fixed (placeholder) — uncommitted |
| `backend/.env.example` | Old version | Updated — uncommitted |
| `web/.env.example` | Old version | Updated — uncommitted |
| `backend/src/main.ts` | PORT default 3000 | PORT 4001 — uncommitted |
| Security guard changes | No | Uncommitted |
| `docs/docs_local/release/railway-deployment.md` | No | Untracked |
| `ml/pytest.ini` | No | Untracked |

**Pushing now without committing would leave the live OpenAI key on the remote** (still in last committed `ml/.env.example` until remediation is committed and pushed).
