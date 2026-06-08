# Lockfile Decision

**Date:** 2026-06-07

---

## Files analyzed

| File | Changed? | Nature of change |
|------|----------|------------------|
| `backend/package-lock.json` | Yes (before revert) | Removed `"peer": true` flags across many entries |
| `web/package-lock.json` | Yes (before revert) | Similar npm lockfile metadata drift |
| `web/yarn.lock` | Yes (before revert) | Single `tslib` semver range line (`^2.4.0` removed) |

---

## Root cause

**Audit-induced drift** — not intentional feature work.

Changes arose from running `npm install` during:

- Backend build validation (`npm run build`)
- Web install validation

Backend CI and README use **yarn** (`yarn install --frozen-lockfile`). Web README uses **npm**, but the `yarn.lock` drift was a one-line resolver range tweak, not a dependency upgrade.

---

## Decision

**REVERT** — all three lockfiles restored to pre-audit state via `git restore`.

No separate lockfile commit created.

---

## Rationale

| Factor | Assessment |
|--------|------------|
| Intentional dependency change? | No |
| Required for Railway readiness? | No |
| Required for security fixes? | No |
| Risk of committing? | CI/install inconsistency |

---

## Recommendation for future

Pick one package manager per package before next push:

- **Backend:** yarn (`yarn.lock` is canonical in CI)
- **Web:** npm (`package-lock.json`) or yarn — resolve triple-lockfile issue separately
