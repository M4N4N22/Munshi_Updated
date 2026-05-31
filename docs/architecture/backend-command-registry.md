# Backend Command Registry

**Repository:** Munshi Backend  
**Date:** 2026-05-30  
**Source:** `src/modules/whatsapp/whatsapp.constants.ts`, `whatsapp.service.ts`, `workflow.constants.ts`

---

## Command routing overview

| Entry | Mechanism |
|-------|-----------|
| Slash typed by user | ML may still classify; some bypass ML |
| Natural language | `POST ML_URL/classify` → `processCommand` |
| Workflow commands | `WorkflowRouter.startWorkflowFromCommand` |
| Manager bypass | Always `processCommand` (even during active workflow) |

**Roles:** `OWNER`, `MANAGER`, `WORKER` (`USER_ROLE`)

---

## Operational commands

### `/help`

| Field | Value |
|-------|-------|
| **Purpose** | Show available commands and hints |
| **Input** | None |
| **Output** | WhatsApp help text (`waHelpText`) |
| **Workflow** | None |
| **Service** | `WhatsAppService` (templates) |
| **Role** | All |
| **Example** | `/help` |

---

### `/present`

| Field | Value |
|-------|-------|
| **Purpose** | Mark user attendance as present |
| **Input** | None (NL: "aa gaya hu", "I am here") |
| **Output** | Attendance confirmation message |
| **Workflow** | None |
| **Service** | `AttendanceService.markAttendance(userId, factoryId, true)` |
| **Role** | All |
| **Example** | `/present` · ML: `"present"` |

---

### `/absent`

| Field | Value |
|-------|-------|
| **Purpose** | Mark user attendance as absent |
| **Input** | None (NL: "aaj nahi aa paunga") |
| **Output** | Attendance confirmation message |
| **Workflow** | None |
| **Service** | `AttendanceService.markAttendance(..., false)` |
| **Role** | All |
| **Example** | `/absent` |

---

### `/tasks`

| Field | Value |
|-------|-------|
| **Purpose** | List user's tasks (grouped for managers) |
| **Input** | None |
| **Output** | Formatted task list |
| **Workflow** | None |
| **Service** | `TasksService` list methods |
| **Role** | All |
| **Example** | `/tasks` · `"show my tasks"` |

---

### `/complete`

| Field | Value |
|-------|-------|
| **Purpose** | Mark a task as completed |
| **Input** | Optional `taskId` (slash or ML `id`) |
| **Output** | Completion confirmation |
| **Workflow** | None |
| **Service** | `TasksService.completeTask` |
| **Role** | All |
| **Example** | `/complete 4` · ML: `"ho gaya"`, `"done"` |

---

### `/update`

| Field | Value |
|-------|-------|
| **Purpose** | Add update/note to a task |
| **Input** | `taskId`, update message |
| **Output** | Update confirmation |
| **Workflow** | None |
| **Service** | `TasksService` update path |
| **Role** | Worker (primary) |
| **Example** | `/update 4 started work` |

---

### `/assign`

| Field | Value |
|-------|-------|
| **Purpose** | Assign **new** task to a named worker |
| **Input** | `@mention` or name, description, optional deadline (ML) |
| **Output** | Task assigned confirmation |
| **Workflow** | None |
| **Service** | `TasksService.assignToUser` |
| **Role** | Manager+ |
| **Example** | `/assign @rahul invoice bhejdo` · `"ajay ko warehouse khali karne bolo"` |

---

### `/depart_assign`

| Field | Value |
|-------|-------|
| **Purpose** | Route new task to a **department manager** (owner only) |
| **Input** | `depart_slug`, task description, optional deadline |
| **Output** | Department assign confirmation |
| **Workflow** | None |
| **Service** | `TasksService.assignToUser` → dept manager |
| **Role** | **Owner only** |
| **Example** | ML: intent `/depart_assign`, `depart_slug: sales` · `"invoice bhejo"` |

---

### `/mgrself`

| Field | Value |
|-------|-------|
| **Purpose** | Manager accepts owner-routed task themselves |
| **Input** | `taskId` |
| **Output** | Self-assign confirmation |
| **Workflow** | None |
| **Service** | `TasksService.applyManagerSelf` |
| **Role** | Manager+ |
| **Example** | `/mgrself 12` · `"I will do task 12"` |
| **Bypass** | Yes — runs during active workflow |

---

### `/mgrassign`

| Field | Value |
|-------|-------|
| **Purpose** | Manager delegates existing task to worker |
| **Input** | `taskId`, `@mention` or worker slug |
| **Output** | Delegate confirmation |
| **Workflow** | None |
| **Service** | `TasksService.applyManagerDelegateWorker` |
| **Role** | Manager+ |
| **Example** | `/mgrassign 12 @anil` · `"task 5 @rahul ko assign karo"` |
| **Bypass** | Yes |

---

### `/mgrtransfer`

| Field | Value |
|-------|-------|
| **Purpose** | Transfer task to another department |
| **Input** | `taskId`, `depart_slug` |
| **Output** | Transfer confirmation |
| **Workflow** | None |
| **Service** | `TasksService.applyManagerTransferDepartment` |
| **Role** | Manager+ |
| **Example** | `/mgrtransfer 12 sales` |
| **Bypass** | Yes |

---

### `/mgrreject`

| Field | Value |
|-------|-------|
| **Purpose** | Reject misrouted task with reason (owner notified) |
| **Input** | `taskId`, `reject_reason` |
| **Output** | Rejection confirmation |
| **Workflow** | None |
| **Service** | `TasksService.applyManagerRejectTask` |
| **Role** | Manager+ |
| **Example** | `/mgrreject 12 not our scope` |
| **Bypass** | Yes |

---

### `/issue`

| Field | Value |
|-------|-------|
| **Purpose** | Report a new issue |
| **Input** | Issue description |
| **Output** | Issue created confirmation |
| **Workflow** | None |
| **Service** | `IssuesService.createIssue` |
| **Role** | All |
| **Example** | `/issue machine not working` |

---

### `/issues`

| Field | Value |
|-------|-------|
| **Purpose** | List active issues |
| **Input** | None |
| **Output** | Issue list |
| **Workflow** | None |
| **Service** | `IssuesService` list |
| **Role** | All |
| **Example** | `/issues` |

---

### `/resolve`

| Field | Value |
|-------|-------|
| **Purpose** | Resolve an issue |
| **Input** | `issueId` |
| **Output** | Resolve confirmation |
| **Workflow** | None |
| **Service** | `IssuesService.resolveIssue` |
| **Role** | Manager+ |
| **Example** | `/resolve 3` |

---

### `/members`

| Field | Value |
|-------|-------|
| **Purpose** | Team / department overview |
| **Input** | None |
| **Output** | Members + departments list |
| **Workflow** | None |
| **Service** | `FactoryService`, `DepartmentsService` |
| **Role** | Manager+ |
| **Example** | `/members` |

---

### `/report`

| Field | Value |
|-------|-------|
| **Purpose** | Generate factory report |
| **Input** | Optional date |
| **Output** | Report text |
| **Workflow** | None |
| **Service** | `ReportsService.generateReport` |
| **Role** | Manager+ |
| **Example** | `/report` · `/report 2026-05-29` |

---

## Workflow start commands

### `/onboard_vendor`

| Field | Value |
|-------|-------|
| **Purpose** | Start multi-step vendor creation |
| **Input** | None (workflow collects fields) |
| **Output** | Step prompts → final vendor created |
| **Workflow** | `ONBOARD_VENDOR` |
| **Service** | `VendorService.createVendor` (on completion) |
| **Role** | Manager+ |
| **Example** | `/onboard_vendor` |

---

### `/onboard_worker`

| Field | Value |
|-------|-------|
| **Purpose** | Start multi-step worker onboarding |
| **Input** | None |
| **Output** | Step prompts → user linked to factory + department |
| **Workflow** | `ONBOARD_WORKER` |
| **Service** | `FactoryService`, `DepartmentsService`, `WorkerOnboardingService` |
| **Role** | Manager+ |
| **Example** | `/onboard_worker` |

---

### `/inventory_create`

| Field | Value |
|-------|-------|
| **Purpose** | Create inventory item via guided workflow |
| **Input** | None (6 steps) |
| **Output** | Item created |
| **Workflow** | `INVENTORY_CREATE` |
| **Service** | `InventoryService.createItem` |
| **Role** | Manager+ |
| **Example** | `/inventory_create` |

---

### `/suggestion_approve`

| Field | Value |
|-------|-------|
| **Purpose** | YES/NO approval for document suggestions |
| **Input** | Started via REST with `suggestion_id` in session |
| **Output** | Execute or reject suggestion |
| **Workflow** | `SUGGESTION_APPROVAL` |
| **Service** | `SuggestionExecutionService` / `rejectSuggestion` |
| **Role** | Manager+ (workflow guard) |
| **Example** | REST-initiated; user replies YES/NO on WhatsApp |

---

## Inventory commands (non-workflow)

### `/inventory_status`

| Field | Value |
|-------|-------|
| **Purpose** | SKU status or low-stock list |
| **Input** | Optional SKU in message |
| **Output** | Item status or low-stock summary |
| **Workflow** | None |
| **Service** | `InventoryService` status/low-stock |
| **Role** | Manager+ |
| **Example** | `/inventory_status CEM001` |

---

## Session control

### `/cancel`

| Field | Value |
|-------|-------|
| **Purpose** | Cancel active workflow session |
| **Input** | None |
| **Output** | Cancellation confirmation |
| **Workflow** | Cancels any active session |
| **Service** | `WorkflowRouterService.cancelWorkflow` |
| **Role** | All |
| **Example** | `/cancel` |

---

## ML-only intents (no slash parser in LLM repo)

These are classified by LLM but **not** in LLM `CommandParser` slash list:

- `/assign`, `/depart_assign`, `/mgrassign`, `/mgrself`

Backend workflow intents expected from ML (may need prompt coverage):

- `/onboard_vendor`, `/onboard_worker`, `/inventory_create`

---

## Commands NOT in backend COMMANDS constant

| Command | Notes |
|---------|-------|
| `/depart_assign` | ML-only intent; handled in `processCommand` |
| `/suggestion_approve` | Workflow registry only; REST-started |

---

*Related: [workflow-inventory.md](./workflow-inventory.md) · [intent-classification-strategy.md](./intent-classification-strategy.md)*
