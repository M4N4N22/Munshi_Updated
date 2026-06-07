# Deployment Smoke Tests

**Date:** 2026-06-07  
**Environment:** Windows local, Postgres on :5432  
**No deploy performed**

---

## Results summary

| Suite | Command | Result |
|-------|---------|--------|
| Backend build (yarn) | `yarn build` | **PASS** |
| Backend build (npm) | `npm run build` | **PASS** |
| Backend unit tests | `yarn test` | **PASS** — 74 suites, 340 tests |
| Backend contract drift | `yarn test -- contract-drift` | **PASS** — 39 tests |
| Backend prod start | `node scripts/docker-entrypoint.mjs` | **PASS** — health 200 :4001 |
| ML tests | `pytest` | **PASS** — 56 tests |
| ML import | `import main` | **PASS** |
| Web build | `npm run build` | **PASS** |
| Web tests | `npm test` | **PASS** — 4 tests |

**Overall:** **ALL PASS**

---

## Backend detail

```
Test Suites: 74 passed, 74 total
Tests:       340 passed, 340 total
```

Previously failing suites now pass:

- `workflow.registry.spec.ts`
- `workflow-hardening.spec.ts`

Health check response:

```json
{"data":{"status":"ok","info":{"Postgres":{"status":"up"}}}}
```

Port: **4001** (verified via `PORT` env + default)

---

## ML detail

```
56 passed in 3.70s
```

`pytest.ini` enables collection without manual `PYTHONPATH`.

---

## Web detail

Production build routes:

- `/`, `/onboarding`, `/integrations`, `/admin`, `/privacy`
- `/api/leads`, `/api/whatsapp`, `/api/whatsapp/status`

---

## Security smoke (manual verification)

| Check | Expected | Verified |
|-------|----------|----------|
| `ml/.env.example` has placeholder key | No `sk-proj-` | Yes |
| `/webhook/test` without env flag | 404 in prod | Code path gated |
| `/resolve/task-inventory` without `x-secret` | 401 | Guard wired |

---

## Not run (out of scope)

| Suite | Reason |
|-------|--------|
| `yarn test:integration` (17 files) | Requires dedicated Postgres test DB + time |
| Railway deploy smoke | No Railway resources created per task |
| Vercel deploy smoke | No deploy per task |

Integration tests are configured in CI (`inventory-integration.yml`) for Phase 0 on `main` push.
