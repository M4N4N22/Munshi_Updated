# Phase 2 — Backend Audit

**Branch:** `Shantanu`  
**Audit date:** 2026-06-07  
**Verdict:** **FAIL**

---

## Build & test execution

| Command | Result | Notes |
|---------|--------|-------|
| `yarn install` | PASS | Prior session; lockfile present |
| `yarn build` | **PASS** | `nest build` completed in ~8s |
| `yarn test` | **FAIL** | 2 suites failed, 72 passed (338 tests total) |
| `yarn test -- contract-drift` | **PASS** | 39 tests |

### Test failures

**1. `workflow.registry.spec.ts` — compile error**

- Production `WorkflowRegistry` constructor expects **8** handlers (`workflow.registry.ts:21–29`)
- Spec passes only **6** handlers (`workflow.registry.spec.ts:65–71`)
- Missing: `AssignClarifyWorkflowHandler`, `TaskInventoryCreationWorkflowHandler`
- Assertion `listStartCommands().toHaveLength(7)` is stale (registry now has 9 command keys)

**2. `workflow-hardening.spec.ts` — runtime failure**

```
TypeError: this.registry.matchWorkflowStartCommand is not a function
```

- Mock registry in test does not implement `matchWorkflowStartCommand` used by `workflow-engine.service.ts:219`

---

## Module registration

**`AppModule`** (`backend/src/app/api/app.module.ts`) imports 24 feature modules including `WhatsAppModule`, `WorkflowModule` (transitive), `IntegrationModule`, `TaskInventoryResolutionModule`, `OnboardingModule`.

**`WorkflowModule`** registers 8 workflow handlers + engine, router, session service, expiry cron.

No orphan controllers found outside module imports.

---

## Routes of concern

| Route | Auth | Risk |
|-------|------|------|
| `GET /webhook` | `WHATSAPP_VERIFY_TOKEN` | OK |
| `POST /webhook` | None (Olli inbound) | Expected; logs full body |
| `POST /webhook/test` | **None** | **HIGH** — bypasses Olli parser |
| `POST /resolve/task-inventory` | **None** | **HIGH** — marked internal/testing |
| `GET /api/docs` | **None** | **MEDIUM** — Swagger exposed |

`InternalCallGuard` exists (`guards.ts`) but is **never applied** to `/resolve/task-inventory`.

---

## TODO / FIXME

No `TODO`, `FIXME`, or `HACK` markers in `backend/src/**/*.ts`.

---

## Localhost references

| Location | Context | Classification |
|----------|---------|----------------|
| `ML_URL ?? 'http://localhost:8000'` | `ml-parser.adapter.ts`, `ml-task-inventory.client.ts`, `whatsapp.service.ts` | Dev fallback — **acceptable** if `ML_URL` set in prod |
| `MUNSHI_WEB_URL ?? 'http://localhost:3000'` | `zoho-oauth.service.ts` | Dev fallback |
| `main.ts` `PORT ?? 3000` | Default bind port | **BUG** — `.env.example` says `4001` |
| Test/integration scripts | Localhost URLs | Acceptable (test-only) |

---

## PORT configuration mismatch

| Source | Port |
|--------|------|
| `backend/.env.example` | `4001` |
| `main.ts` default | `3000` |
| `backend/Dockerfile` EXPOSE | `4000` |
| `docker-compose.example.yml` | `4001` |

---

## Dead code / unused

- `mongoose` / `@nestjs/mongoose` — wired in deps but Mongo init disabled
- `InternalCallGuard` — defined, never used

---

## Summary

| Category | Result |
|----------|--------|
| Build | PASS |
| Unit tests | **FAIL** (2 suites) |
| Contract tests | PASS |
| Module registration | PASS |
| Production route safety | **FAIL** |
| Port configuration | **FAIL** |

**Overall:** **FAIL**
