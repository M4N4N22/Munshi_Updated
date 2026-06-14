# Phase 1 — Command Registry

**Date:** 2026-06-10  
**Sources:** `whatsapp.constants.ts`, `workflow.constants.ts`, `workflow.registry.ts`, `intent-types.json`, `ml/contracts/typescript/index.ts`

**Total slash commands discovered:** **30**

---

## Registry

| # | Command | Description | Role | Business purpose | Workflow / handler | Inputs | Outputs | Services |
|---|---------|-------------|------|------------------|-------------------|--------|---------|----------|
| 1 | `/present` | Mark self present | All | Daily attendance | `AttendanceService.markAttendance` | — | Confirmation | attendance |
| 2 | `/absent` | Mark self absent | All | Daily attendance | `AttendanceService.markAttendance` | — | Confirmation | attendance |
| 3 | `/tasks` | List my tasks | All | Work visibility | `TasksService.getTasks` | — | Task list (role-formatted) | tasks |
| 4 | `/complete` | Complete a task | All | Close work loop | `TasksService.completeTask` | taskId | Completion + inventory movements | tasks, inventory |
| 5 | `/assign` | Assign task to worker | Owner, Manager | Delegate work | `TasksService.handleAssign` or `/assign_clarify` | @mention, description, deadline? | Task created | tasks, workflow |
| 6 | `/assign_delivery` | Delivery task with SKU qty | Owner, Manager | Stock-linked delivery | `handleAssignDelivery` → task + inventory line | @worker, SKU, qty | Delivery task | tasks, inventory |
| 7 | `/depart_assign` | Assign to department | Owner, Manager | Cross-dept routing | `tryClassifiedDepartmentAssign` | depart_slug, description | Dept task | tasks, departments |
| 8 | `/mgrself` | Manager accepts owner task | Manager | Owner→manager handoff | `TasksService.applyManagerSelf` | taskId | Assignment update | tasks |
| 9 | `/mgrassign` | Manager delegates to worker | Manager | Manager routing | `TasksService.applyManagerDelegateWorker` | taskId, @worker | Assignment update | tasks |
| 10 | `/mgrtransfer` | Transfer task to dept | Manager | Misroute correction | `TasksService.applyManagerTransferDepartment` | taskId, dept_slug | Transfer notice | tasks, departments |
| 11 | `/mgrreject` | Reject misrouted task | Manager | Escalation back to owner | `TasksService.applyManagerRejectTask` | taskId, reason | Rejection notice | tasks |
| 12 | `/update` | Progress update on task | Worker | Status reporting | `TasksService.addUpdate` | taskId, message | Update logged | tasks |
| 13 | `/issue` | Report a problem | All | Operational issues | `IssuesService.createIssue` | message | Issue created | issues |
| 14 | `/issues` | List active issues | Owner, Manager | Issue oversight | `IssuesService.getActiveIssues` | — | Issue list | issues |
| 15 | `/resolve` | Close an issue | Owner, Manager | Issue closure | `IssuesService.resolveIssue` | issueId | Resolved | issues |
| 16 | `/members` | Team overview | Owner, Manager | Org visibility | `FactoryService`, `DepartmentsService` | — | Team + dept roster | factories, departments |
| 17 | `/help` | Command guide | All | Self-service help | `buildHelpMessages` | — | Role-based help text | — |
| 18 | `/report` | Attendance report | Owner, Manager | Payroll / oversight | `ReportService.generateReport` | date? | Report | reports |
| 19 | `/onboard_vendor` | Vendor onboarding | Owner, Manager | Supplier master data | `ONBOARD_VENDOR` workflow | multi-step NL | Vendor record | vendors, workflow |
| 20 | `/onboard_worker` | Employee onboarding | Owner, Manager | Workforce onboarding | `ONBOARD_WORKER` workflow | multi-step NL | User + factory link | users, workflow |
| 21 | `/inventory_create` | Add item step-by-step | Owner, Manager | Stock master data | `INVENTORY_CREATE` workflow | name, SKU, category… | Item created | inventory, workflow |
| 22 | `/inventory_status` | Stock check / low stock | Owner, Manager | Stock visibility | `handleInventoryStatus` | SKU optional | Status or list | inventory |
| 23 | `/inventory_import_csv` | Start CSV import session | Owner, Manager | Bulk stock load | Session → review → CONFIRM | CSV file | Import summary | inventory-bulk-import |
| 24 | `/purchase_request_create` | Start purchase request | Owner, Manager | Procurement | `PURCHASE_REQUEST_CREATE` workflow | items, approval | PR created | purchase-requests, workflow |
| 25 | `/cancel` | Cancel active workflow | All | Escape hatch | `WorkflowRouter.cancelWorkflow` | — | Session cleared | workflow |
| 26 | `/suggestion_approve` | Document suggestion YES/NO | Owner, Manager | AI doc → action | `SUGGESTION_APPROVAL` workflow | yes/no | Suggestion executed | documents, workflow |
| 27 | `/business_discovery` | Business profile setup | Owner, Manager | Onboarding data | `BUSINESS_DISCOVERY` workflow | progressive fields | Profile updated | business-discovery |
| 28 | `/continue_discovery` | Resume discovery | Owner, Manager | Resume paused setup | Same as business_discovery | — | Continues session | business-discovery |
| 29 | `/assign_clarify` | Who should do this task? | Owner, Manager | NL assign without @mention | `ASSIGN_CLARIFY` workflow | task description | Assignee chosen → assign | workflow, tasks |
| 30 | `/task_inventory_nl` | NL task + inventory | Owner, Manager | Delivery/count/issue tasks | `TASK_INVENTORY_CREATION` workflow | NL + disambiguation | Task + inventory lines | task-inventory-resolution |

---

## Non-slash related triggers (not counted above)

| Trigger | Type | Maps to |
|---------|------|---------|
| `hello`, `namaste`, `menu`, `start` | Chat home | Owner home interactive menu |
| Interactive button IDs | CTA | `home_add_stock`, `team_onboard_wa`, etc. |
| `CONFIRM` / `CANCEL` | Session text | Inventory CSV review (not slash) |
| `general_chat` | ML intent | Conversational fallback (not a command) |

---

## Why commands exist

Munshi targets Indian SMB factories: attendance on WhatsApp, task delegation without apps, inventory for stock truth, procurement when stock runs low. Slash commands are the **canonical machine-readable intent** layer; natural language maps to them via ML (`ml/bot_engine.py` → `POST /classify`).
