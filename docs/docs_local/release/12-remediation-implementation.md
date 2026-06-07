# Remediation Implementation Log

**Date:** 2026-06-07  
**No merge, no push, no deploy performed**

---

## PART 1 — Security (MB-01)

**File:** `ml/.env.example`

```diff
- OPENAI_API_KEY="sk-proj-…"
+ OPENAI_API_KEY=your-openai-api-key-here
```

**Key rotation:** Required — see `11-remediation-analysis.md`.

---

## PART 2 — Backend tests (MB-05)

**File:** `backend/src/services/workflow/workflow.registry.spec.ts`

- Added `AssignClarifyWorkflowHandler` and `TaskInventoryCreationWorkflowHandler` mocks
- Constructor now passes 8 handlers (matches production)
- `listStartCommands()` assertion updated to 9 (includes `/continue_discovery` alias)
- Added assertions for `/assign_clarify` and `/task_inventory_nl`

**File:** `backend/src/services/workflow/workflow-hardening.spec.ts`

- Added `matchWorkflowStartCommand` to registry mock in `starts worker onboarding` test

**Result:** `yarn test` — **74/74 suites, 340/340 tests PASS**

---

## PART 3 — PORT standardization (MB-06)

| File | Change |
|------|--------|
| `backend/src/main.ts` | Default `PORT` → `4001` |
| `backend/Dockerfile` | `EXPOSE 4001` |
| `backend/.env.example` | `PORT=4001` (unchanged, now aligned) |
| `docker-compose.example.yml` | Already `4001` — no change |

**Verified:** `node scripts/docker-entrypoint.mjs` → `GET /health` **200** on port 4001

---

## PART 6 — Environment documentation

**File:** `backend/.env.example` — rewritten

- Single `MUNSHI_WEB_URL`
- Added `ONBOARDING_MSG91_AUTH_KEY`, `ONBOARDING_MSG91_TEMPLATE_ID`
- Added `ONBOARDING_OTP_EXPOSE_IN_RESPONSE` (commented)
- Added `ENABLE_WEBHOOK_TEST_ROUTE` (commented)
- Added Railway-oriented comments for `ML_URL`, `POSTGRES_CONNECTION_STRING`

**File:** `web/.env.example`

- Added `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_SECRET_KEY`

**File:** `.env.example` (root)

- Pointer to package-specific examples + Railway guide

**File:** `docs/docs_local/release/railway-deployment.md`

- New deployment reference doc

**File:** `ml/pytest.ini`

- `pythonpath = .` — fixes pytest collection without manual `PYTHONPATH`

---

## PART 7 — Security hardening (MB-03, MB-04)

**File:** `backend/src/modules/whatsapp/whatsapp.controller.ts`

- `POST /webhook/test` returns 404 unless `ENABLE_WEBHOOK_TEST_ROUTE=true`

**File:** `backend/src/services/task-inventory-resolution/task-inventory-resolution.controller.ts`

- `@UseGuards(InternalCallGuard)` on `POST /resolve/task-inventory`
- Requires `x-secret` header matching `X_SECRET`

**File:** `backend/src/services/task-inventory-resolution/task-inventory-resolution.module.ts`

- Registered `InternalCallGuard` in providers

---

## Files changed (summary)

| Path | Type |
|------|------|
| `ml/.env.example` | Security |
| `ml/pytest.ini` | Test infra |
| `backend/src/main.ts` | Port |
| `backend/Dockerfile` | Port |
| `backend/.env.example` | Docs |
| `backend/src/services/workflow/workflow.registry.spec.ts` | Tests |
| `backend/src/services/workflow/workflow-hardening.spec.ts` | Tests |
| `backend/src/modules/whatsapp/whatsapp.controller.ts` | Security |
| `backend/src/services/task-inventory-resolution/*.ts` | Security |
| `web/.env.example` | Docs |
| `.env.example` | Docs |
| `docs/docs_local/release/railway-deployment.md` | Docs |
