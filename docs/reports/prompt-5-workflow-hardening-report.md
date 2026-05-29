# Prompt 5 — Workflow Hardening Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Objective

Validate and harden the Prompt 4 Workflow Session Engine with cancellation, expiry, recovery, and multi-workflow registry support.

---

## 2. Workflow engine changes

| Feature | Implementation |
|---------|----------------|
| **Cancellation** | `/cancel` command via `WorkflowRouterService.cancelWorkflow()` |
| **Expiry detection** | `WorkflowSessionService.isExpired()` using configurable TTL |
| **Session resolution** | `resolveActiveSession()` auto-expires stale ACTIVE rows |
| **Recovery** | Expired sessions return informative message; message falls through to normal routing |
| **Bulk expiry** | `expireStaleActiveSessions()` + hourly `WorkflowExpiryCronService` |
| **Multi-workflow registry** | Vendor + Worker handlers registered independently |

---

## 3. Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `WORKFLOW_SESSION_TTL_HOURS` | `24` | ACTIVE session lifetime in hours |

Helper: `getWorkflowSessionTtlMs()` in `workflow.constants.ts`.

---

## 4. Cancellation behavior

```text
/cancel
  ├── ACTIVE session → status CANCELLED → confirmation message
  ├── expired session (resolved) → expiry message
  └── no session → helpful "No active workflow" message
```

`/cancel` is handled:
- First in `WhatsAppService.handleIncomingMessage()` (before active workflow routing)
- Inside active workflow via `handleActiveWorkflowMessage()`
- As fallback in `processCommand()`

---

## 5. Expiry behavior

```text
ACTIVE session older than TTL
  → expireSession() on access (resolveActiveSession)
  → OR hourly cron (expireStaleActiveSessions)
  → status EXPIRED
  → no longer accepts workflow input
```

When a user sends a message and their session just expired:
1. Expiry notification is sent
2. Message continues to normal ML/command routing (not treated as workflow input)

---

## 6. Files created

| File | Purpose |
|------|---------|
| `workflow-expiry.cron.ts` | Hourly stale session cleanup |
| `worker-onboarding.service.ts` | Orchestrates factory + dept worker creation |
| `worker-onboarding.validation.ts` | Name, phone, DOJ, department parsing |
| `handlers/worker-onboarding.handler.ts` | Worker onboarding workflow |
| `workflow-hardening.spec.ts` | Cancel/expiry/recovery tests |
| `worker-onboarding.*.spec.ts` | Service, validation, handler tests |

---

## 7. Files modified

| File | Change |
|------|--------|
| `workflow.constants.ts` | ONBOARD_WORKER, CANCEL, TTL helpers, worker steps |
| `workflow.interfaces.ts` | Worker session data, resolve result type |
| `workflow-session.service.ts` | Expiry + resolve + bulk expire |
| `workflow-engine.service.ts` | Cancel, expiry messages, resolve in handler |
| `workflow.registry.ts` | Worker handler registration |
| `workflow.module.ts` | Factory, Departments, Messaging imports + cron |
| `whatsapp.service.ts` | Cancel + expiry-aware routing |
| `whatsapp.constants.ts` | ONBOARD_WORKER, CANCEL commands |
| `factories.dto.ts` | Optional `doj` on member update |
| `messaging.service.ts` | `buildWorkerWelcomeText()` |

---

## 8. Test summary

```
yarn test
→ 10 suites, 67 tests passed

New workflow tests: 44 (was 23 in Prompt 4)
```

| Area | Tests |
|------|-------|
| Session expiry/resolution | 4 new |
| Cancellation/recovery | 6 |
| Worker onboarding | 15 |
| Registry (2 workflows) | 5 |

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| TTL only checked on access + hourly cron | Acceptable for v1; can add index on `created_at` later |
| Worker welcome + assignMember template both sent | Intentional; template is existing factory onboarding behavior |
| No `/cancel` ML intent | Direct slash only; ML unchanged by design |

---

*See also: [prompt-5-worker-onboarding-report.md](./prompt-5-worker-onboarding-report.md)*
