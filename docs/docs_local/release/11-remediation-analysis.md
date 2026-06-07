# Remediation Analysis

**Branch:** `Shantanu`  
**Date:** 2026-06-07  
**Scope:** Pre-merge + Railway readiness (no deploy, no merge)

---

## Source audit inputs

Prior reports: `01`–`10`, `final-release-readiness-signoff.md`

---

## Blockers addressed in this remediation

| ID | Issue | Remediation approach |
|----|-------|-------------------|
| MB-01 | OpenAI key in `ml/.env.example` | Replace with placeholder; document rotation |
| MB-05 | Failing workflow tests | Update specs to match 8-handler registry |
| MB-06 | PORT mismatch | Align `main.ts`, Dockerfile to `4001` |
| MB-03 | Unguarded `/webhook/test` | Env gate `ENABLE_WEBHOOK_TEST_ROUTE=true` |
| MB-04 | Unguarded `/resolve/task-inventory` | Wire `InternalCallGuard` |
| MB-10 | MSG91 vars undocumented | Add to `backend/.env.example` |
| MB-11 | Turso + admin key undocumented | Add to `web/.env.example` |
| MB-13 | Duplicate `MUNSHI_WEB_URL` | Single canonical entry in `.env.example` |

---

## Blockers deferred (documented, not fixed)

| ID | Issue | Reason |
|----|-------|--------|
| MB-02 | ML Dockerfile incomplete COPY | Legacy Docker Hub path — **not target** for Railway source build |
| MB-07 | Triple lockfiles in `web/` | Out of scope; recommend npm-only before merge |
| MB-08 | ML not in CI | Railway-focused; CI update deferred |
| MB-12 | OTP expose in non-prod | Documented in `.env.example`; behavior intentional for staging |
| MB-14 | `@nestjs/swagger` in devDeps | Low risk for Railway; defer |
| MB-15 | Legacy VM deploy path in `cicd.yml` | Explicitly ignored per task |

---

## Railway vs legacy Docker analysis

| Concern | Legacy Docker Hub | Railway source build |
|---------|-------------------|---------------------|
| ML missing `parsers/` | **FAIL** in Dockerfile | **PASS** — full `ml/` directory deployed |
| Backend port | EXPOSE mismatch (fixed) | Uses `PORT` env from Railway |
| Postgres | External / compose | Railway Postgres plugin |
| ML networking | Public port 8000 | Private service + `ML_URL` reference |

**Conclusion:** Railway source-build path avoids the ML Dockerfile defect. Legacy Dockerfile remains stale but is not the deployment target.

---

## Key rotation requirement (MB-01)

**Rotation required: YES**

The previous `ml/.env.example` contained a full `sk-proj-…` key tracked in git. Anyone with repo access may have seen it. Before staging/production:

1. Revoke or rotate the key in [OpenAI API keys](https://platform.openai.com/api-keys)
2. Set new key only in Railway ML service env (never commit)
3. Update any local `ml/.env` copies that used the old key

The placeholder `your-openai-api-key-here` is safe for git.

---

## Risk assessment post-remediation

| Area | Before | After |
|------|--------|-------|
| Security (secrets) | CRITICAL | MEDIUM (rotation pending) |
| Backend tests | FAIL | PASS |
| PORT config | FAIL | PASS |
| Debug endpoints | CRITICAL | LOW (gated) |
| Env documentation | FAIL | PASS |
| Railway ML source | PASS (inherent) | PASS |
| Railway backend source | PASS WITH ISSUES | PASS |
