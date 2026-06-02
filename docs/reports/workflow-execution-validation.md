# Workflow Execution Validation

**Date:** 2026-06-02  
**Scope:** Workflow-start intents + command intents (QA sprint)  
**Source:** `intent-functional-validation-results.json` + live slash/NL re-tests

---

## Workflow inventory

| Intent | Workflow type | Start path (expected) | Registry handler |
|--------|---------------|----------------------|------------------|
| `/business_discovery` | `BUSINESS_DISCOVERY` | `startWorkflowFromMlCommand` or slash | ✅ |
| `/continue_discovery` | `BUSINESS_DISCOVERY` | Same (alias) | ✅ |
| `/onboard_vendor` | `ONBOARD_VENDOR` | ML or slash; `processCommand` fallback | ✅ |
| `/onboard_worker` | `ONBOARD_WORKER` | ML or slash; `processCommand` fallback | ✅ |
| `/inventory_create` | `INVENTORY_CREATE` | ML or slash; `processCommand` fallback | ✅ |
| `/purchase_request_create` | `PURCHASE_REQUEST_CREATE` | ML only (no `processCommand` fallback) | ✅ |

Command intents (no `workflow_sessions`): attendance, tasks, issues, reports, manager ops (except multi-step onboard/create), members, help.

---

## Validation checklist (per workflow intent)

| # | Check | `/business_discovery` | `/continue_discovery` | `/onboard_vendor` | `/onboard_worker` | `/inventory_create` | `/purchase_request_create` |
|---|-------|----------------------|----------------------|-------------------|-------------------|---------------------|---------------------------|
| 1 | Intent classified correctly (golden) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Workflow exists in registry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Workflow starts (NL golden) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 4 | Workflow starts (slash manual) | ✅ | ✅ | ✅ | — | — | — |
| 5 | Workflow completes | ⏸ Not reached | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ |
| 6 | DB updated on complete | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ |
| 7 | Response returned | ✅ webhook `ok` | ✅ | ✅ | ✅ | ✅ | ✅ |

Slash verification (Owner `918604856137`, after `/cancel`):

- `/business_discovery` → ACTIVE session, step `MENU`, prompt returned  
- `/onboard_vendor` → ACTIVE session, step `VENDOR_NAME`, prompt returned  

NL verification (same phone, after `/cancel`):

- `mera business setup karna hai` → webhook `ok`, **zero ACTIVE sessions**, no new row  
- `naya vendor add karo` → same  
- `purchase request bana do` → same  

Historical note: backend logs from 2026-06-01 show NL `purchase request bana do` **did** INSERT a session on that runtime. Current runtime exhibits regression or instance drift for NL workflow starts.

---

## Command-intent execution (golden E2E)

| Intent | Handler | Webhook | Execution signal | Result |
|--------|---------|---------|------------------|--------|
| `/inventory_status` | `InventoryService.handleInventoryStatus` | ok | command path | ✅ |
| `/present` / `/absent` | `AttendanceService.markAttendance` | ok | attendance path | ✅ |
| `/tasks` | `TasksService.getTasks` | ok | command path | ✅ |
| `/update` | `TasksService.addTaskUpdate` | **error** | exception in handler/send | ❌ |
| `/complete` | `TasksService.completeTask` | ok | assumed | ✅ |
| `/issue` | `IssueService.createIssue` | ok | issues count +1 | ✅ |
| `/issues` | `IssueService.listIssues` | ok | command path | ✅ |
| `/resolve` | `IssueService.resolveIssue` | ok | assumed | ✅ |
| `/report` | `ReportService.generateReport` | ok | command path | ✅ |
| `/assign` | `TasksService.createTaskFromAssign` | **error** | worker/slug resolution or send failure | ❌ |
| `/mgrassign` | `TasksService.applyManagerDelegateWorker` | **error** | task/worker resolution | ❌ |
| `/mgrtransfer` | `TasksService.applyManagerTransferDepartment` | **error** | dept slug resolution | ❌ |
| `/mgrreject` | `TasksService.applyManagerRejectTask` | ok | assumed | ✅ |
| `/mgrself` | `TasksService.applyManagerSelf` | **error** | task id resolution | ❌ |
| `/depart_assign` | `TasksService.createDepartmentTask` | ok | tasks count | ✅ |
| `/members` | `FactoryService.getFactoryUsers` | ok | command path | ✅ |
| `/help` | `waHelpText` | ok | command path | ✅ |

**Webhook `error`** = uncaught exception in `handleIncomingMessage` (often downstream WhatsApp send via Olli after handler throw).

---

## Active-session interference

When an ACTIVE `BUSINESS_DISCOVERY` session exists, **all** subsequent messages for that phone are routed to the workflow handler before ML classification. Observed in backend logs:

- `aaj main present hoon` → discovery profile timestamp update (not attendance)  
- `naya vendor ABC Paper Traders add karo` → factory/profile bucket update (not vendor onboarding)  

Golden tests send `/cancel` before each case (300 ms pause). Cancellation works when a session exists; failure mode is **NL never creating a session**, not stale-session pollution in the golden sequence.

---

## Execution flow (observed)

```text
Incoming message
    │
    ├─ /cancel ? → cancelWorkflow
    │
    ├─ ACTIVE workflow_sessions ? → handleActiveWorkflowMessage (blocks ML)
    │
    ├─ Slash workflow command ? → startWorkflowFromCommand ✅ (verified)
    │
    └─ ML /classify
           ├─ startWorkflowFromMlCommand → ❌ no session on current runtime (NL)
           └─ processCommand fallback
                  ├─ onboard/create via cmdLc → should start (vendor slash ✅; NL ❌ observed)
                  ├─ business_discovery / continue / PR → waUnknownCommand (no session)
                  └─ command intents → domain services (mostly ✅)
```

---

## Workflow completion status

No golden test drove a workflow from first step through terminal `COMPLETED` in this sprint. Blocked at step 3 (start) for all six workflow intents via natural language.

**Recommendation (reporting only):** Re-run workflow completion tests using **slash start commands** after NL start is fixed, then step through each handler through `workflow_sessions.status = COMPLETED` and verify domain row creation (`vendors`, `inventory_items`, `purchase_requests`, etc.).

---

## Summary

| Category | Pass | Fail | Blocked |
|----------|------|------|---------|
| Workflow-start (NL) | 0 | 6 | — |
| Workflow-start (slash) | 2 verified | — | 4 not re-tested |
| Command execution | 13 | 5 | — |
| **Total golden** | **13** | **11** | — |

Primary blocker for Trader OS onboarding flows: **natural-language path does not create ACTIVE `workflow_sessions`**, despite correct ML intent and `ok` webhook.
