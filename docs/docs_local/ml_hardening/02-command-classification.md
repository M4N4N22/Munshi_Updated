# Phase 2 — Command Classification

## Hierarchy

```
Munshi WhatsApp Commands
├── Attendance (2)
│   ├── /present
│   └── /absent
├── Tasks & Work (12)
│   ├── Worker ops: /tasks, /complete, /update
│   ├── Delegation: /assign, /assign_clarify, /depart_assign, /assign_delivery
│   ├── Manager routing: /mgrself, /mgrassign, /mgrtransfer, /mgrreject
│   └── NL inventory tasks: /task_inventory_nl
├── Inventory (3)
│   ├── /inventory_create
│   ├── /inventory_status
│   └── /inventory_import_csv
├── Procurement (1)
│   └── /purchase_request_create
├── Issues (3)
│   ├── /issue
│   ├── /issues
│   └── /resolve
├── Onboarding & Master Data (5)
│   ├── /onboard_worker
│   ├── /onboard_vendor
│   ├── /business_discovery
│   ├── /continue_discovery
│   └── /inventory_create (also inventory)
├── Documents & Suggestions (1)
│   └── /suggestion_approve
├── Team & Reporting (2)
│   ├── /members
│   └── /report
├── Integrations (implicit via workflows)
│   └── (Zoho: no slash command — OAuth UI + cron)
├── Administration / Meta (2)
│   ├── /help
│   └── /cancel
└── Other / ML-adjacent
    └── general_chat (not a slash command)
```

## Count by category

| Category | Commands | Count |
|----------|----------|-------|
| Attendance | present, absent | 2 |
| Tasks | tasks, complete, update, assign, assign_clarify, depart_assign, assign_delivery, mgrself, mgrassign, mgrtransfer, mgrreject, task_inventory_nl | 12 |
| Inventory | inventory_create, inventory_status, inventory_import_csv | 3 |
| Procurement | purchase_request_create | 1 |
| Vendor | onboard_vendor | 1 |
| Onboarding | onboard_worker, business_discovery, continue_discovery | 3 |
| Issues | issue, issues, resolve | 3 |
| Management | members, report | 2 |
| Documents | suggestion_approve | 1 |
| Meta | help, cancel | 2 |
| **Total** | | **30** |

## Registration layers

| Layer | File | Purpose |
|-------|------|---------|
| Direct slash (KNOWN) | `whatsapp.constants.ts` | `parseDirectSlashCommand()` — 25 commands |
| Workflow start | `workflow.constants.ts` | 8 workflow commands + `/continue_discovery` alias |
| ML contract | `backend/contracts/intent-types.json` | 24 intents (no `/inventory_import_csv`, `/task_inventory_nl`, `/suggestion_approve`, `/assign_delivery`) |
| Slash bypass (no ML) | `whatsapp.service.ts` | mgr*, assign_delivery skip classify |
