# Demo Command Certification Report

Each row tested live on 2026-06-02T15:19:24.263Z. **PASS** = correct intent + handler executed + DB effect (where applicable) + outbound send not `error`.

## Certification Matrix

| # | Command | Exact phrase tested | Predicted intent | Handler | Webhook | DB / logic | Result |
|---|---------|---------------------|------------------|---------|---------|------------|--------|
| 1 | Attendance | `Aaj main present hoon` | /present | AttendanceService.markAttendance | ok | verified | ✅ PASS |
| 2 | Attendance | `Main aaj present hoon` | /present | AttendanceService.markAttendance | ok | verified | ✅ PASS |
| 3 | Attendance | `aaj present hoon` | /present | AttendanceService.markAttendance | ok | verified | ✅ PASS |
| 4 | Task Assignment | `Rahul Kumar ko store check ka kaam do` | /assign | TasksService.handleAssign | ok | verified | ✅ PASS |
| 5 | Task Assignment | `task Rahul ko do store check ka` | /assign | TasksService.handleAssign | ok | verified | ✅ PASS |
| 6 | Task Assignment | `Rahul ko inventory check karne ka task de do` | /inventory_status | InventoryService.handleInventoryStatus | ok | intent mismatch: got /inventory_status | ❌ FAIL |
| 7 | Task List | `mere tasks dikhao` | /tasks | TasksService.getTasks | ok | verified | ✅ PASS |
| 8 | Manager Task List | `mere tasks dikhao` | /tasks | TasksService.getTasks | error | webhook returned error (likely Olli send failure after handler) | ❌ FAIL |
| 9 | Inventory Query | `Steel sheets ka stock kitna bacha hai` | /inventory_status | InventoryService.handleInventoryStatus | ok | verified | ✅ PASS |
| 10 | Reports | `Mujhe aaj ka report dikhao` | /report | ReportService.generateReport | ok | verified | ✅ PASS |
| 11 | Business Discovery | `mera business setup karna hai` | /business_discovery | WorkflowRouter | ok | verified | ✅ PASS |
| 12 | Purchase Request | `purchase request bana do` | /purchase_request_create | WorkflowRouter | ok | verified | ✅ PASS |

## NL Hardening — Certified vs Failed Phrases

### Attendance

- **Recommended demo phrase:** `Aaj main present hoon`
- **Alternatives tested:** `Aaj main present hoon` → PASS; `Main aaj present hoon` → PASS

### Task Assignment

- **Recommended demo phrase:** `Rahul Kumar ko store check ka kaam do`
- **Alternatives tested:** `Rahul Kumar ko store check ka kaam do` → PASS; `Rahul ko inventory check karne ka task de do` → FAIL

### Task Update

- **Recommended demo phrase:** `task update kaam shuru ho gaya`
- **Alternatives tested:** `task update kaam shuru ho gaya` → PASS; `task update inventory check shuru ho gaya` → FAIL

### Task Complete

- **Recommended demo phrase:** `kaam complete ho gaya`
- **Alternatives tested:** `kaam complete ho gaya` → PASS; `task complete ho gaya` → PASS

### Manager Delegation

- **Recommended demo phrase:** `Rahul Kumar ko loading ka kaam do`
- **Alternatives tested:** `Rahul Kumar ko loading ka kaam do` → PASS; `Rahul ko loading ka kaam do` → PASS


## Demo Script Step Results

| Step | Message | Intent | Webhook | Pass |
|------|---------|--------|---------|------|
| 1 Attendance | `Aaj main present hoon` | /present | ok | ✅ |
| 2 Task Assign | `Rahul Kumar ko store check ka kaam do` | /assign | ok | ✅ |
| 3a Owner route | `Rahul Verma ko dispatch planning ka task do` | /assign | ok | — |
| 3b Manager list | `mere tasks dikhao` | /tasks | error | — |
| 3c Manager delegate | `task 90 Rahul Kumar ko do` | /mgrassign | ok | ✅ |
| 4 Inventory | `Steel sheets ka stock kitna bacha hai` | /inventory_status | ok | ✅ |
| 6-7 Purchase Request | `purchase request bana do` | /purchase_request_create | ok | — |
| 6-7 Purchase Request | `Cert PR 1780413530635` | general_chat | ok | — |
| 6-7 Purchase Request | `Steel Sheets` | general_chat | ok | — |
| 6-7 Purchase Request | `25` | general_chat | ok | — |
| 6-7 Purchase Request | `NO` | general_chat | ok | — |
| 6-7 Purchase Request | `YES` | general_chat | ok | — |
| 6-7 Purchase Request | `Gupta Metals` | general_chat | ok | — |
| 6-7 Purchase Request | `YES` | general_chat | ok | — |
| 7 Vendor close | `—` | — | ok | ✅ |
| 8 Report | `Mujhe aaj ka report dikhao` | /report | ok | ✅ |
| Worker Update | `task update 91 kaam shuru ho gaya` | /update | ok | ✅ |
| Worker Complete | `task 91 complete ho gaya` | /complete | ok | ✅ |
| 10 Discovery | `mera business setup karna hai` | /business_discovery | ok | ✅ |

## Failed Step Detail

**3b Manager list** — `mere tasks dikhao`

- Handler likely succeeded (intent /tasks)
- Outbound Olli returned failure → webhook body `error`
- **Precondition for recording:** Retry once; if fails, skip task list and use task ID from owner's routing confirmation message
