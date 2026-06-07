# Final Merge & Railway Readiness

**Branch:** `Shantanu`  
**Date:** 2026-06-07  
**Actions taken:** Remediation + validation only. **No merge. No push. No deploy.**

---

## Merge verdict

# READY TO MERGE WITH KNOWN ISSUES

All **CRITICAL** code blockers from the prior audit have been remediated:

| Blocker | Status |
|---------|--------|
| MB-01 OpenAI key in example | **Fixed** — placeholder; rotation still required |
| MB-02 ML Dockerfile incomplete | **Deferred** — not Railway target; legacy only |
| MB-03 `/webhook/test` unguarded | **Fixed** — env gated |
| MB-04 `/resolve` unguarded | **Fixed** — `InternalCallGuard` |
| MB-05 Failing tests | **Fixed** — 340/340 pass |
| MB-06 PORT mismatch | **Fixed** — 4001 everywhere |

### Remaining known issues (non-blocking for merge)

| ID | Issue | Severity |
|----|-------|----------|
| MB-07 | Triple lockfiles in `web/` | MEDIUM |
| MB-08 | ML not in CI | MEDIUM |
| MB-12 | OTP exposed when `NODE_ENV !== production` | MEDIUM (staging config) |
| MB-14 | `@nestjs/swagger` in devDependencies | LOW |
| MB-19 | Web npm audit vulnerabilities | MEDIUM |

### Pre-merge action required (ops, not code)

- **Rotate OpenAI API key** if the old key was ever live

---

## Railway deployment verdict

# READY FOR RAILWAY DEPLOYMENT: YES

(with pre-deploy checklist)

| Service | Ready | Notes |
|---------|-------|-------|
| Railway PostgreSQL | YES | Migrations auto-apply |
| Railway Backend | YES | Source build validated |
| Railway ML | YES | Full source tree; size RAM for torch |
| Vercel Web | YES | Build passes; env docs updated |

### Pre-deploy blockers (configuration, not code)

| Item | Action |
|------|--------|
| OpenAI key rotation | Revoke old key; set new in Railway ML env |
| Railway project creation | Create Postgres + ML + Backend services |
| Env vars | Configure per `15-railway-deployment-plan.md` |
| MSG91 | Set for production OTP SMS |
| Turso | Set on Vercel for leads admin |
| Olli webhook | Point to Railway backend public URL |

### Not blockers for Railway

- Legacy `ml/Dockerfile` incomplete COPY (source build uses full tree)
- Legacy `cicd.yml` VM deploy path (ignored per task)
- Docker Hub pipeline (not target)

---

## Smoke test summary

| Test | Result |
|------|--------|
| `yarn test` | PASS (340) |
| `yarn test -- contract-drift` | PASS (39) |
| `pytest` | PASS (56) |
| `npm run build` (web) | PASS |
| `yarn build` / `npm run build` (backend) | PASS |
| `start:prod` health :4001 | PASS |

---

## Report index

| # | Report |
|---|--------|
| 11 | [Remediation analysis](./11-remediation-analysis.md) |
| 12 | [Remediation implementation](./12-remediation-implementation.md) |
| 13 | [Railway source-build validation](./13-railway-source-build-validation.md) |
| 14 | [Deployment smoke tests](./14-deployment-smoke-tests.md) |
| 15 | [Railway deployment plan](./15-railway-deployment-plan.md) |
| — | [Railway deployment guide](./railway-deployment.md) |

---

## STOP — awaiting approval

Do **not** merge `Shantanu` → `main` until approved.

Do **not** create Railway resources until approved.

Next steps after approval:

1. Rotate OpenAI key
2. Merge to `main`
3. Create Railway project per `15-railway-deployment-plan.md`
4. Configure Vercel env with Railway backend URL
5. Run post-deploy verification checklist
