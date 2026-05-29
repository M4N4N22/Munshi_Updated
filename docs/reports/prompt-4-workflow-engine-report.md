# Prompt 4 — Workflow Engine Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Objective

Introduce a **generic, command-driven Workflow Session Engine** that supports multi-step WhatsApp conversations without embedding workflow logic in `WhatsAppService`.

Vendor onboarding is the first registered workflow; the engine itself is workflow-agnostic.

---

## 2. Architecture

```text
WhatsAppService
      │
      ▼
WorkflowRouterService  ──► resolve user context, role gate
      │
      ▼
WorkflowEngineService  ──► session lifecycle + step dispatch
      │
      ├── WorkflowSessionService ──► DB persistence
      └── WorkflowRegistry ──► command/type → handler map
              │
              └── VendorOnboardingWorkflowHandler (first plugin)
```

### Design principles

| Principle | Implementation |
|-----------|----------------|
| Command-driven | Workflows start from canonical slash commands (e.g. `/onboard_vendor`) |
| Origin-agnostic | Engine does not care whether command came from ML or direct slash |
| Pluggable handlers | `WorkflowRegistry.registerHandler()` for future workflows |
| Session isolation | One `ACTIVE` session per phone (DB unique partial index) |
| No ML changes | Zero modifications to ML URL, prompts, or classifiers |

---

## 3. Files created

| File | Purpose |
|------|---------|
| `migrations/003_workflow_sessions.sql` | `workflow_sessions` table + indexes |
| `src/services/workflow/workflow.constants.ts` | `WORKFLOW_TYPE`, `WORKFLOW_STATUS`, step enums |
| `src/services/workflow/workflow.interfaces.ts` | Handler/session contracts |
| `src/services/workflow/workflow.schema.ts` | Sequelize `WorkflowSession` model |
| `src/services/workflow/workflow-session.repository.ts` | Thin repository |
| `src/services/workflow/workflow-session.service.ts` | Session CRUD lifecycle |
| `src/services/workflow/workflow.registry.ts` | Command/type registry |
| `src/services/workflow/workflow-engine.service.ts` | `WorkflowEngineService` + `WorkflowRouterService` |
| `src/services/workflow/handlers/vendor-onboarding.handler.ts` | First workflow handler |
| `src/services/workflow/workflow.module.ts` | Nest module wiring |
| `src/services/workflow/workflow-session.service.spec.ts` | Session unit tests |
| `src/services/workflow/workflow.registry.spec.ts` | Registry unit tests |
| `src/services/workflow/workflow-routing.spec.ts` | Routing integration tests |
| `src/services/workflow/handlers/vendor-onboarding.handler.spec.ts` | Handler unit tests |

---

## 4. Files modified

| File | Change |
|------|--------|
| `src/core/services/db-service/models.ts` | Register `WorkflowSession` model |
| `src/services/factories/factories.schema.ts` | `hasMany` workflow_sessions |
| `src/modules/whatsapp/whatsapp.constants.ts` | Added `ONBOARD_VENDOR` command |
| `src/modules/whatsapp/whatsapp.module.ts` | Import `WorkflowModule` |
| `src/modules/whatsapp/whatsapp.service.ts` | Workflow routing integration |

---

## 5. Database — `workflow_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `factory_id` | INTEGER NOT NULL | Factory scope |
| `phone_number` | VARCHAR(32) NOT NULL | WhatsApp user |
| `workflow_type` | VARCHAR(64) NOT NULL | e.g. `ONBOARD_VENDOR` |
| `current_step` | VARCHAR(64) NOT NULL | Handler-defined step id |
| `session_data` | JSONB DEFAULT `{}` | Accumulated answers |
| `status` | VARCHAR(32) DEFAULT `ACTIVE` | ACTIVE / COMPLETED / CANCELLED / EXPIRED |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit |

**Constraint:** Partial unique index `uq_workflow_sessions_active_phone` — one ACTIVE session per phone.

Apply:

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/003_workflow_sessions.sql
```

---

## 6. Session management API

| Method | Behavior |
|--------|----------|
| `createSession()` | Creates ACTIVE session; rejects if one already active |
| `getSession(id)` | Fetch by primary key |
| `getActiveSession(phone)` | Latest ACTIVE session for phone |
| `updateSession(id, patch)` | Update step/data while ACTIVE |
| `completeSession(id)` | Set status COMPLETED |
| `cancelSession(id)` | Set status CANCELLED |
| `expireSession(id)` | Set status EXPIRED (for future cron/TTL) |

---

## 7. Workflow registry

Registry maps:

- **By command:** `/onboard_vendor` → `VendorOnboardingWorkflowHandler`
- **By type:** `ONBOARD_VENDOR` → same handler

Future workflows register via constructor injection + `registerHandler()` — no changes to engine core required.

---

## 8. Engine flow

### Start workflow

1. Resolve user context (phone → factory, role)
2. Role gate: WORKER forbidden
3. `createSession()` with handler's `workflowType` and `firstStep`
4. Return handler's `getInitialPrompt()`

### Handle step

1. Load ACTIVE session by phone
2. Resolve handler by `workflow_type`
3. `handler.handleStep(session, message, context)`
4. On `completed` → `completeSession()`
5. On `cancelled` → `cancelSession()`
6. Else → `updateSession()` with next step + session data
7. Return prompt message to user

---

## 9. Test coverage

```
yarn test --testPathPattern="workflow|vendor-onboarding"
→ 4 suites, 23 tests passed
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| `workflow-session.service.spec.ts` | 8 | create, update, complete, cancel, expire, conflict |
| `workflow.registry.spec.ts` | 3 | command lookup, type lookup, start command match |
| `vendor-onboarding.handler.spec.ts` | 8 | happy path, validation, skip, duplicate errors |
| `workflow-routing.spec.ts` | 4 | active interception, ML entry, slash entry, completion |

Full suite: **42 tests passed** (includes 19 vendor tests from Prompt 3).

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Stale ACTIVE sessions block new workflows | Future: TTL cron calling `expireSession()` |
| No `/cancel` command yet | Handler returns `cancelled` on unknown step; explicit cancel deferred |
| Single-session-per-phone | By design; document for operators |
| Migration not auto-applied | Manual `psql` required before production use |

---

## 11. Extension guide (future workflows)

1. Add `WORKFLOW_TYPE` + step constants
2. Implement `IWorkflowHandler`
3. Register in `WorkflowRegistry` constructor
4. Add slash command to `WORKFLOW_START_COMMANDS` and `whatsapp.constants.ts` (if needed in `processCommand` fallback)
5. No changes to `WorkflowEngineService` required

---

*See also: [prompt-4-vendor-onboarding-report.md](./prompt-4-vendor-onboarding-report.md), [prompt-4-routing-analysis.md](./prompt-4-routing-analysis.md)*
