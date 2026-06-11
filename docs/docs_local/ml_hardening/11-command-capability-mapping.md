# Phase 1 — Command → Capability Mapping

Every command mapped to **primary** and **secondary** business capabilities.

| Command | Primary Capability | Secondary Capability |
|---------|-------------------|---------------------|
| `/present` | Attendance Management | Platform Guidance |
| `/absent` | Attendance Management | Platform Guidance |
| `/tasks` | Task Visibility | Task Execution |
| `/complete` | Task Execution | Stock-Linked Operations |
| `/assign` | Task Delegation | Team Visibility |
| `/assign_clarify` | Task Delegation | Platform Guidance |
| `/depart_assign` | Task Delegation | Manager Task Coordination |
| `/assign_delivery` | Stock-Linked Operations | Task Delegation |
| `/task_inventory_nl` | Stock-Linked Operations | Task Delegation |
| `/mgrself` | Manager Task Coordination | Task Execution |
| `/mgrassign` | Manager Task Coordination | Task Delegation |
| `/mgrtransfer` | Manager Task Coordination | Team Visibility |
| `/mgrreject` | Manager Task Coordination | Issue Management |
| `/update` | Task Execution | Task Visibility |
| `/issue` | Issue Management | Task Execution |
| `/issues` | Issue Management | Team Visibility |
| `/resolve` | Issue Management | Attendance Reporting |
| `/members` | Team & Organization Visibility | Task Delegation |
| `/help` | Platform Guidance & Control | — |
| `/report` | Attendance Reporting | Team Visibility |
| `/onboard_vendor` | Vendor Management | Business Setup |
| `/onboard_worker` | Workforce Onboarding | Business Setup |
| `/inventory_create` | Inventory Data Entry | Inventory Visibility |
| `/inventory_status` | Inventory Visibility | Procurement |
| `/inventory_import_csv` | Inventory Data Entry | Inventory Visibility |
| `/purchase_request_create` | Procurement & Reordering | Inventory Visibility |
| `/cancel` | Platform Guidance & Control | — |
| `/suggestion_approve` | Document Processing | Inventory Data Entry |
| `/business_discovery` | Business Setup | Platform Guidance |
| `/continue_discovery` | Business Setup | Platform Guidance |

---

## Capability → command reverse index

| Capability | Commands | Count |
|------------|----------|------:|
| Attendance Management | present, absent | 2 |
| Attendance Reporting | report | 1 |
| Task Visibility | tasks | 1 |
| Task Execution | complete, update | 2 |
| Task Delegation | assign, assign_clarify, depart_assign, assign_delivery*, task_inventory_nl* | 5 |
| Stock-Linked Operations | assign_delivery, task_inventory_nl, complete† | 3 |
| Manager Task Coordination | mgrself, mgrassign, mgrtransfer, mgrreject | 4 |
| Issue Management | issue, issues, resolve | 3 |
| Team Visibility | members | 1 |
| Workforce Onboarding | onboard_worker | 1 |
| Vendor Management | onboard_vendor | 1 |
| Business Setup | business_discovery, continue_discovery | 2 |
| Inventory Visibility | inventory_status | 1 |
| Inventory Data Entry | inventory_create, inventory_import_csv, suggestion_approve‡ | 3 |
| Procurement | purchase_request_create | 1 |
| Document Processing | suggestion_approve | 1 |
| Platform Guidance | help, cancel, present/absent§ | 3+ |

\* Secondary delegation role for delivery/NL paths  
† When task has inventory lines on completion  
‡ When suggestion type is inventory import  
§ Attendance often first worker interaction

---

## Multi-capability commands (highest overlap)

| Command | Why multiple capabilities |
|---------|---------------------------|
| `/assign_delivery` | Delegation + stock movement |
| `/task_inventory_nl` | NL delegation + stock movement |
| `/complete` | Work closure + optional stock-out |
| `/inventory_status` | Visibility + triggers procurement |
| `/suggestion_approve` | Documents + inventory/vendor/actions |
| `/depart_assign` | Delegation + org structure routing |
