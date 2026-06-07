# Phase 1 — Monorepo Health Audit

**Branch:** `Shantanu` → `main`  
**Audit date:** 2026-06-07  
**Verdict:** **FAIL**

---

## Scope

Packages reviewed: `backend/`, `ml/`, `web/`, root configs, `docs/`, `.github/workflows/`.

**Branch delta vs `origin/main`:** 7 commits, 458 files changed (+62,523 / −583 lines).

---

## Directory structure

| Path | Expected | Status |
|------|----------|--------|
| `backend/` | NestJS API | Present |
| `ml/` | FastAPI intent/parser service | Present |
| `web/` | Next.js onboarding + landing | Present |
| `backend/contracts/` | Source of truth for intents | Present |
| `ml/contracts/` | Mirrored contracts | Present |
| `docker-compose.example.yml` | Local stack template | Present |
| `.github/workflows/` | CI/CD | Present (backend-focused) |

Structure matches documented monorepo layout in root `README.md`.

---

## Cross-project references

| Check | Result |
|-------|--------|
| Broken `../ml` or `../web` imports in backend | None found |
| Contract drift tests | **PASS** — `yarn test -- contract-drift` (39 tests) |
| ML contract tests | **PASS** — 56 pytest (with `PYTHONPATH=ml`) |
| Backend-only schema `task-inventory-resolve-request.json` | Intentional; ML does not consume resolver schemas |

---

## Lockfile / dependency hygiene

| Package | Lockfiles | Risk |
|---------|-----------|------|
| `web/` | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | **HIGH** — non-deterministic installs |
| `backend/` | `yarn.lock`, `package-lock.json` | **MEDIUM** — CI uses yarn; npm may diverge |
| `ml/` | `requirements.txt` only | OK |

**Version alignment (shared):**

- TypeScript: backend `^5.7.3`, web `5.7.3` — aligned
- Node types: backend `^22.10.7`, web `^22` — compatible

**Unused / questionable dependencies:**

| Package | Dependency | Finding |
|---------|------------|---------|
| `backend` | `mongoose`, `@nestjs/mongoose` | Mongo connection commented out in `db.service.ts` |
| `backend` | `@nestjs/swagger` | Listed in **devDependencies** but used at runtime in `main.ts` |
| `web` | `@libsql/client` | Used for leads DB (`web/lib/db.ts`) — not documented in `.env.example` |

---

## Circular dependencies

No circular import cycles detected at module level. `WorkflowModule` uses `forwardRef` for `DocumentModule` and `TaskInventoryResolutionModule` — intentional Nest pattern.

---

## Local-only artifacts (not in git)

- `.local/` — embedded Postgres helper from prior local setup (not part of monorepo contract)
- `backend/.env`, `ml/.env`, `web/.env.local` — gitignored; only `.env.example` files are tracked

---

## Summary

| Category | Result |
|----------|--------|
| Directory structure | PASS |
| Cross-package references | PASS |
| Contract alignment | PASS |
| Lockfile determinism | **FAIL** |
| Dependency hygiene | **FAIL** (unused mongoose, swagger in devDeps) |

**Overall:** **FAIL** — merge is blocked on lockfile ambiguity and dependency hygiene until resolved or documented as accepted risk.
