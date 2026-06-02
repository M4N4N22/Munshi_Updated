# Demo Flow Validation Report

End-to-end validation via WhatsApp test webhook (prep only) and database verification.

## Flow Results

| Flow | Input | Expected Workflow | DB Mutation | Duration (est.) | Status |
|------|-------|-------------------|-------------|-----------------|--------|
| Attendance | Aaj main present hoon | AttendanceService.markAttendance | `attendance.is_present=true` | 15s | ✅ SAFE |
| Task assign | Rahul Kumar ko store check ka kaam do | TasksService.createTaskFromAssign | `tasks` insert | 20s | ✅ SAFE |
| Task update | task update kaam shuru ho gaya | TasksService.addTaskUpdate | `task_updates` insert | 15s | ✅ SAFE |
| Task complete | kaam complete ho gaya | TasksService.completeTask | `tasks.is_completed` | 15s | ✅ SAFE |
| Manager routing | Rahul Verma ko dispatch planning ka task do | Department routing | `tasks.routing_status=AWAITING_MANAGER_ACTION` | 25s | ✅ SAFE |
| Manager delegate | task [ID] Rahul Kumar ko do | TasksService.applyManagerDelegateWorker | `routing_status=DELEGATED_TO_WORKER` | 25s | ✅ SAFE |
| Inventory query | Steel sheets ka stock kitna bacha hai | InventoryService.handleInventoryStatus | read `inventory_items` | 15s | ✅ SAFE |
| Purchase request | purchase request bana do (+ steps) | PURCHASE_REQUEST_CREATE workflow | `purchase_requests` + items | 90s | ✅ SAFE |
| Report | Mujhe aaj ka report dikhao | ReportService.generateReport | aggregated read | 20s | ✅ SAFE |
| Business discovery | mera business setup karna hai | BUSINESS_DISCOVERY workflow | profile/session update | 30s | ✅ SAFE (short) |
| Document upload | CSV via upload pipeline | Document orchestrator | `documents`, suggestions | 45s | ✅ SAFE |

## Dry Run Evidence

- **Manager delegation:** PASS — `task 83 Rahul Kumar ko do`
- **Purchase request:** PASS — PR #16, vendor 12

## Excluded Flows

- Manager self-assignment (`/mgrself`) — unstable NL
- Manager department transfer (`/mgrtransfer`) — known unreliable
- Standalone vendor lookup — no dedicated intent
