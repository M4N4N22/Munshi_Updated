# Working Tree Inventory

**Date:** 2026-06-07  
**Branch:** `Shantanu`  
**HEAD:** `bbbb36d` (8 commits ahead of `origin/Shantanu`)

---

## Git status summary

```
On branch Shantanu
Your branch is ahead of 'origin/Shantanu' by 8 commits.
Changes not staged for commit: 14 files
Untracked: .local/, docs/docs_local/release/, ml/pytest.ini
```

**No staged changes. No deleted or renamed files.**

---

## Committed but not pushed (8 commits)

| Commit | Purpose |
|--------|---------|
| `bbbb36d` | Merge `main` → `Shantanu` |
| `9a4fa27`–`332edd3` | 6 GCP deploy/CI commits from main |
| `bd3c6b3`–`acebee2` | 7 Shantanu feature commits (already on remote at `bd3c6b3`; merge + main imports are new) |

*Note: Remote `origin/Shantanu` is at `bd3c6b3`. Local is 8 commits ahead.*

---

## Modified files (14) — uncommitted

| Path | Change type | Purpose |
|------|-------------|---------|
| `.env.example` | Modified | Monorepo env pointer → package examples + Railway guide |
| `backend/.env.example` | Modified | MSG91, webhook test flag, single `MUNSHI_WEB_URL`, Railway notes |
| `backend/Dockerfile` | Modified | `EXPOSE 4000` → `4001` |
| `backend/package-lock.json` | Modified | Lockfile drift from `npm install` run |
| `backend/src/main.ts` | Modified | Default `PORT` 3000 → 4001 |
| `backend/src/modules/whatsapp/whatsapp.controller.ts` | Modified | Gate `POST /webhook/test` behind env flag |
| `backend/src/services/task-inventory-resolution/task-inventory-resolution.controller.ts` | Modified | `InternalCallGuard` on `/resolve/task-inventory` |
| `backend/src/services/task-inventory-resolution/task-inventory-resolution.module.ts` | Modified | Register `InternalCallGuard` provider |
| `backend/src/services/workflow/workflow-hardening.spec.ts` | Modified | Fix mock `matchWorkflowStartCommand` |
| `backend/src/services/workflow/workflow.registry.spec.ts` | Modified | 8-handler registry + 9 commands |
| `ml/.env.example` | Modified | Remove live OpenAI key → placeholder |
| `web/.env.example` | Modified | Add Turso + `ADMIN_SECRET_KEY` |
| `web/package-lock.json` | Modified | Lockfile drift from `npm install` |
| `web/yarn.lock` | Modified | Minor line-ending / lock drift |

---

## Deleted files

None.

---

## Renamed files

None.

---

## Untracked files

### `docs/docs_local/release/` (23 files)

Release audit, remediation, Railway, and sync documentation from this session.

| Files | Purpose |
|-------|---------|
| `01`–`21` | Prior audit + remediation + sync reports |
| `railway-deployment.md` | Railway deploy guide |
| `final-release-readiness-signoff.md` | Pre-remediation signoff |
| `22`–`27` | This pre-push audit (being created) |

### `ml/pytest.ini` (1 file)

Sets `pythonpath = .` for ML test collection.

### `.local/` (~3,215 files)

Local dev artifacts from embedded Postgres setup:

| Path | Purpose |
|------|---------|
| `.local/package.json` | embedded-postgres npm wrapper |
| `.local/package-lock.json` | Lockfile for above |
| `.local/start-postgres.mjs` | Postgres startup script (if present) |
| `.local/pgdata/**` | **PostgreSQL data directory** (~3,200+ binary files) |
| `.local/node_modules/` | embedded-postgres deps |

**Not gitignored** — appears in `git status` as untracked.

---

## Gitignored local files (not in status, verified)

| Path | Ignored by |
|------|------------|
| `backend/.env` | `backend/.gitignore` |
| `ml/.env` | `ml/.gitignore` |
| `web/.env.local` | `web/.gitignore` |

These contain real credentials and must never be committed.
