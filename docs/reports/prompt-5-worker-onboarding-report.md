# Prompt 5 — Worker Onboarding Report

**Date:** 2026-05-29  
**Status:** Complete

---

## 1. Overview

Second workflow registered in the engine, proving multi-workflow support with different fields and business logic tied to existing Munshi modules.

**Entry command:** `/onboard_worker`  
**Access:** OWNER and MANAGER only

---

## 2. Workflow steps

| Step | ID | Prompt | Validation |
|------|-----|--------|------------|
| 1 | `WORKER_NAME` | Worker name? | `normalizeWorkerName()` |
| 2 | `WORKER_PHONE` | Worker phone? | `normalizeWorkerPhone()` |
| 3 | `WORKER_DEPARTMENT` | Select department (list shown) | Name, slug, or ID |
| 4 | `WORKER_DOJ` | Date of joining? SKIP ok | `YYYY-MM-DD` or skip |
| 5 | (implicit) | — | `WorkerOnboardingService.onboardWorker()` |

---

## 3. Business logic reuse

`WorkerOnboardingService.onboardWorker()` orchestrates existing services:

| Action | Service method |
|--------|----------------|
| Create user + factory link (WORKER) | `FactoryService.assignMember()` |
| Set date of joining | `FactoryService.updateFactoryUser({ doj })` |
| Attach to department | `DepartmentsService.addWorker()` |
| Welcome WhatsApp message | `MessagingService.buildWorkerWelcomeText()` + `sendText()` |

No duplicate user creation logic. Worker is immediately compatible with attendance, tasks, reports, and department workflows.

---

## 4. Department selection

Departments fetched via `DepartmentsService.listByFactory(factoryId)`.

User may reply with:
- Department ID (e.g. `3`)
- Department name (e.g. `Sales`)
- Department slug (e.g. `sales`)

List format in prompt:
```text
• 3 — Sales (`sales`)
• 4 — IT (`it`)
```

---

## 5. Example conversation

```text
User: /onboard_worker
Munshi: Worker onboarding — What is the worker name?

User: Anil Kumar
Munshi: What is the worker phone number?

User: 9876543210
Munshi: Department selection — [department list]

User: Sales
Munshi: Date of joining? YYYY-MM-DD or SKIP

User: SKIP
Munshi: Worker onboarded successfully — welcome message sent to worker
```

Worker receives:
```text
Welcome to Munshi
You have been onboarded successfully.
You can now interact with Munshi on WhatsApp.
```

---

## 6. Error handling

| Error | Behavior |
|-------|----------|
| Duplicate phone | Rewind to phone step |
| Invalid department | Re-prompt department step with list |
| No departments in factory | Cancel workflow with guidance |
| Invalid name/phone/DOJ | Re-prompt same step |

---

## 7. Registry

```typescript
{
  '/onboard_vendor': VendorOnboardingWorkflowHandler,
  '/onboard_worker': WorkerOnboardingWorkflowHandler,
}
```

Architecture remains generic — no worker-specific logic in `WhatsAppService` or `WorkflowEngineService`.

---

## 8. Test coverage

| Suite | Tests |
|-------|-------|
| `worker-onboarding.validation.spec.ts` | 9 |
| `worker-onboarding.service.spec.ts` | 2 |
| `handlers/worker-onboarding.handler.spec.ts` | 4 |

Scenarios: happy path, invalid department, duplicate phone, factory isolation (dept validation).

---

*See also: [prompt-5-workflow-hardening-report.md](./prompt-5-workflow-hardening-report.md)*
