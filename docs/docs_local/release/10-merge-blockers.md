# Phase 10 — Merge Blocker Review

**Branch:** `Shantanu` → `main`  
**Audit date:** 2026-06-07  

---

## CRITICAL — Do not merge

| ID | Blocker | Location | Why it blocks |
|----|---------|----------|---------------|
| MB-01 | Live OpenAI API key in git-tracked file | `ml/.env.example:15` | Secret exposure; rotate key before any merge |
| MB-02 | ML Docker image missing `parsers/`, `contracts/`, `extractors/` | `ml/Dockerfile:22–23` | Production ML deploy will crash on import |
| MB-03 | Unguarded `POST /webhook/test` | `whatsapp.controller.ts:47–50` | Arbitrary message injection into full WhatsApp handler |
| MB-04 | Unguarded `POST /resolve/task-inventory` | `task-inventory-resolution.controller.ts` | Internal resolver exposed; `InternalCallGuard` not wired |
| MB-05 | Backend test suite failing | `workflow.registry.spec.ts`, `workflow-hardening.spec.ts` | 2/74 suites fail; CI culture expects green tests |

---

## HIGH

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| MB-06 | PORT trifecta (3000 / 4000 / 4001) | `main.ts`, `Dockerfile`, `.env.example` | Wrong port binding in prod if env incomplete |
| MB-07 | Triple lockfiles in `web/` | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | Non-reproducible web builds |
| MB-08 | ML not in CI | Root `cicd.yml` | ML regressions ship silently |
| MB-09 | `workflow.registry.spec.ts` stale | Missing 2 handlers, wrong command count | Test suite does not reflect production registry |
| MB-10 | MSG91 OTP env vars undocumented | `onboarding-sms.service.ts` | Web onboarding SMS will fail in prod without docs |
| MB-11 | Turso + `ADMIN_SECRET_KEY` undocumented | `web/lib/db.ts`, `api/leads/route.ts` | Leads admin broken on Vercel without tribal knowledge |
| MB-12 | OTP exposed when `NODE_ENV !== 'production'` | `onboarding-sms.service.ts:22–26` | Staging leaks OTPs |

---

## MEDIUM

| ID | Issue | Location |
|----|-------|----------|
| MB-13 | Duplicate `MUNSHI_WEB_URL` in backend `.env.example` | Lines 16 vs 47 |
| MB-14 | `@nestjs/swagger` in devDependencies, used at runtime | `backend/package.json` |
| MB-15 | Legacy deploy path `PROJECT_PATH: /home/ubuntu/munshi-dada` | `.github/workflows/cicd.yml:12` |
| MB-16 | Phase 4 has no integration tests in CI | `63-phase4-signoff.md` |
| MB-17 | `mongoose` deps unused | `backend/package.json` |
| MB-18 | Duplicate migration prefix `007` | `migrations/` — maintainability risk |
| MB-19 | Web npm audit: 1 critical vulnerability | `npm install` output |
| MB-20 | Swagger UI unauthenticated | `main.ts:74` |

---

## LOW

| ID | Issue | Location |
|----|-------|----------|
| MB-21 | `streamlit` in ML requirements — unused | `ml/requirements.txt` |
| MB-22 | Orphan `ml/.github/workflows/cicd.yml` | Wrong repo root assumptions |
| MB-23 | Large commented block in `ml/main.py` | Maintenance noise |
| MB-24 | Windows Postgres UTF-8 encoding friction | Local dev only |
| MB-25 | No migration rollback path | By design — document for ops |

---

## Merge decision matrix

| Severity | Count | Merge policy |
|----------|-------|--------------|
| CRITICAL | 5 | **Block merge** |
| HIGH | 7 | Fix or accept with explicit sign-off |
| MEDIUM | 8 | Track post-merge |
| LOW | 5 | Track backlog |

---

## Minimum fix set to unblock merge

1. **MB-01** — Remove/rotate OpenAI key in `ml/.env.example`
2. **MB-02** — Fix `ml/Dockerfile` COPY to include `parsers/`, `contracts/`, `extractors/`
3. **MB-03 / MB-04** — Gate test routes behind env flag or `InternalCallGuard` + disable in production
4. **MB-05** — Fix failing workflow test suites
5. **MB-06** — Align `PORT` default, Dockerfile EXPOSE, and `.env.example`

Optional but strongly recommended before production deploy:

- MB-08 (ML CI job)
- MB-10, MB-11 (env documentation)
- MB-12 (OTP expose policy)
