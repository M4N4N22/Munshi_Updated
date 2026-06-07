# Pre-Push Risk Review

**Date:** 2026-06-07

---

## CRITICAL

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Live OpenAI key in committed `ml/.env.example`** | HEAD still has `sk-proj-…`; fix is uncommitted only | Commit + push `ml/.env.example` fix **before** any other push |
| **`.local/` not gitignored** | 3,215 untracked files including Postgres data; `git add -A` would stage binaries | Add `.local/` to `.gitignore` before commit; never `git add .local/` |
| **Push without committing remediation** | Remote would get merge commits but **not** security/test fixes | Commit all MUST COMMIT files first |

---

## HIGH

| Risk | Detail | Mitigation |
|------|--------|------------|
| `backend/.env` contains `OLLI_KEY` | Gitignored — safe unless force-added | Never `git add -f backend/.env` |
| `ml/.env` contains live OpenAI key | Gitignored | Never `git add -f ml/.env` |
| Audit docs reference old key in prose | `08-security-audit.md`, `12-remediation-implementation.md` quote `sk-proj-…` | Acceptable as audit record OR redact before commit |
| Lockfile drift (`package-lock.json`, `yarn.lock`) | May cause CI/install inconsistency | Pick one package manager per package; revert or commit consistently |

---

## MEDIUM

| Risk | Detail | Mitigation |
|------|--------|------------|
| `docs/docs_local/release/` size | 27+ markdown files | Fine to commit; internal docs |
| `X_SECRET=secret` in `backend/.env` | Local only, gitignored | Rotate for production |
| Triple lockfiles in `web/` | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | Resolve in separate hygiene task |
| 8 unpushed commits include merge | Larger push surface | Review `git log origin/Shantanu..HEAD` before push |

---

## LOW

| Risk | Detail |
|------|--------|
| `.local/pgdata` disk usage | Local dev artifact; delete anytime |
| `stash@{0}` stale duplicate | Drop after commit |
| `web/yarn.lock` 2-line drift | Line endings |

---

## Files that must NOT be pushed

| Path | Reason |
|------|--------|
| `backend/.env` | Live `OLLI_KEY`, Postgres credentials |
| `ml/.env` | Live OpenAI key |
| `web/.env.local` | Local API/secret config |
| `.local/**` | Postgres data + local node_modules |
| `backend/dist/`, `web/.next/` | Build artifacts |
| `**/.venv/`, `**/node_modules/` | Dependencies |

---

## Safe to push (after commit)

| Category | Items |
|----------|-------|
| Already committed | 8 commits (merge + main GCP deploy imports + feature history) |
| Pending commit | Remediation + docs + pytest.ini |
| Never push | `.env` files, `.local/` |
