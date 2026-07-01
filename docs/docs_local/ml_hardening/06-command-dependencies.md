# Phase 6 — Command Dependencies

## Entity dependencies

| Command | Users | Departments | Tasks | Inventory | Vendors | Integrations | Approvals |
|---------|:-----:|:-----------:|:-----:|:---------:|:-------:|:------------:|:---------:|
| /present, /absent | ✓ | | | | | | |
| /tasks, /complete | ✓ | | ✓ | optional | | | |
| /assign, /assign_clarify | ✓ | | creates | | | | |
| /depart_assign | ✓ | ✓ | creates | | | | |
| /assign_delivery, /task_inventory_nl | ✓ | | creates | ✓ | | | |
| /mgr* | ✓ | ✓ | ✓ | | | | |
| /update | ✓ | | ✓ | | | | |
| /issue, /issues, /resolve | ✓ | | | | | | |
| /members | ✓ | ✓ | | | | | |
| /report | ✓ | | | | | | |
| /onboard_worker | ✓ | ✓ | | | | | |
| /onboard_vendor | ✓ | | | | ✓ | | |
| /inventory_create | ✓ | | | creates | | | |
| /inventory_status | ✓ | | | reads | | | |
| /inventory_import_csv | ✓ | | | bulk | | Zoho CSV | confirm |
| /purchase_request_create | ✓ | | | reads | optional | | approval flow |
| /business_discovery | ✓ | | | | | | |
| /suggestion_approve | ✓ | | optional | optional | optional | documents | ✓ yes/no |
| /cancel | session | | | | | | |

## Command → command relationships

```
/onboard_worker ──► enables ──► /present, /tasks, /update
/onboard_vendor ──► enables ──► purchase flows
/inventory_create ──► enables ──► /inventory_status, /assign_delivery
/inventory_import_csv ──► enables ──► accurate /inventory_status
/inventory_status (low stock) ──► CTA ──► /purchase_request_create
/assign (ambiguous) ──► /assign_clarify workflow
/business_discovery ──► /continue_discovery
/document upload ──► /suggestion_approve
/assign_delivery ≈ /task_inventory_nl (same outcome class)
```

## Session dependencies

- Active `workflow_sessions` block new workflow starts unless `/cancel` or slash bypass.
- `inventory_import_csv` requires session phases: `review` → text `CONFIRM`.
- Purchase request may consume `low_stock_alert_context` disambiguation state.

## ML contract gaps (dependency for Phase 3+)

Commands in backend but **not** in `intent-types.json`:

- `/inventory_import_csv`
- `/assign_delivery`
- `/task_inventory_nl`
- `/suggestion_approve`

NL may misroute to `/inventory_create` or `general_chat` for import intent.
