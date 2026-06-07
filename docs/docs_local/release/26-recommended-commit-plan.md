# Recommended Commit Plan

**Date:** 2026-06-07  
**Do NOT execute — recommendation only**

---

## Pre-commit housekeeping

1. Add `.local/` to root `.gitignore`
2. Verify `git status` — no `.env` files staged
3. Drop `stash@{0}` after commits succeed

---

## Commit A — Security & Railway readiness (code)

**Message:** `fix: security hardening and port standardization for deploy readiness`

```
backend/src/main.ts
backend/Dockerfile
backend/src/modules/whatsapp/whatsapp.controller.ts
backend/src/services/task-inventory-resolution/task-inventory-resolution.controller.ts
backend/src/services/task-inventory-resolution/task-inventory-resolution.module.ts
ml/.env.example
backend/.env.example
web/.env.example
.env.example
ml/pytest.ini
```

**Why together:** Single deploy-readiness unit — security gates, env docs, port 4001, ML test infra.

---

## Commit B — Test fixes

**Message:** `test: align workflow registry specs with 8-handler production registry`

```
backend/src/services/workflow/workflow.registry.spec.ts
backend/src/services/workflow/workflow-hardening.spec.ts
```

**Why separate:** Test-only changes; easy to bisect if needed.

---

## Commit C — Release documentation

**Message:** `docs: add release audit, Railway plan, and branch sync reports`

```
docs/docs_local/release/
```

**Why separate:** Large doc-only diff; no runtime impact.

---

## Commit D — Lockfiles (optional, decide first)

**Option 1 — Include:** If npm is canonical for backend/web CI

```
backend/package-lock.json
web/package-lock.json
web/yarn.lock
```

**Option 2 — Revert:** If yarn-only for backend

```
git restore backend/package-lock.json web/package-lock.json web/yarn.lock
```

**Recommendation:** Revert lockfile changes unless intentionally standardizing on npm. They arose from ad-hoc `npm install` during audit runs.

---

## Commit E — Gitignore (recommended)

**Message:** `chore: gitignore local embedded Postgres dev directory`

```
.gitignore   # add .local/
```

Can be squashed into Commit A.

---

## Push order (after commits)

```bash
git push origin Shantanu
```

Pushes:

- 8 existing commits (merge + main sync + features)
- 3–4 new commits (A, B, C, optional D/E)

**Total ahead of current `origin/Shantanu`:** ~11–12 commits

---

## What NOT to commit

- `.local/` (entire directory)
- `backend/.env`, `ml/.env`, `web/.env.local`
- `backend/dist/`, `web/.next/`
