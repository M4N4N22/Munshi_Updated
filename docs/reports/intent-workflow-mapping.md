# Intent → Workflow Mapping

**Date:** 2026-06-01  
**Sources:** LLM `bot_engine.py`, Backend `workflow.registry.ts`, `whatsapp.service.ts`

---

## Workflow-start intents

| Intent | Workflow type | Start command | Domain | Role (backend gate) | Current status |
|--------|---------------|---------------|--------|---------------------|----------------|
| `/business_discovery` | `BUSINESS_DISCOVERY` | `/business_discovery` | Business Discovery | Owner, Manager | **Regex reliable** — LLM gaps on some HI phrases |
| `/continue_discovery` | `BUSINESS_DISCOVERY` | `/continue_discovery` (alias) | Business Discovery | Owner, Manager | **Regex reliable** |
| `/onboard_vendor` | `ONBOARD_VENDOR` | `/onboard_vendor` | Vendors | Owner, Manager | **Regex reliable** |
| `/onboard_worker` | `ONBOARD_WORKER` | `/onboard_worker` | Organization | Owner, Manager | **Regex reliable** (83% in audit) |
| `/inventory_create` | `INVENTORY_CREATE` | `/inventory_create` | Inventory | Owner, Manager | **Regex reliable** (82% inventory create/status) |
| `/purchase_request_create` | `PURCHASE_REQUEST_CREATE` | `/purchase_request_create` | Procurement | Owner, Manager | **Regex moderate** (69% procurement) |
| `/suggestion_approve` | `SUGGESTION_APPROVAL` | `/suggestion_approve` | Documents | Owner, Manager | Slash / document queue only — **no NL regex** |

---

## Command intents (no multi-step workflow)

| Intent | Backend handler | Domain | Role | Current status |
|--------|-----------------|--------|------|----------------|
| `/inventory_status` | `WhatsAppService` → `InventoryService` | Inventory | Owner, Manager, Worker* | **Regex reliable** |
| `/present` | Attendance mark present | Attendance | Worker | **Broken in HI** — 0% audit |
| `/absent` | Attendance mark absent | Attendance | Worker | **Broken in HI** — 0% audit |
| `/complete` | Task completion | Tasks | Worker | **Mixed** — deterministic EN/HI completion words OK; 67% audit |
| `/tasks` | Task list | Tasks | Worker | **Broken in HI** — 0% audit |
| `/update` | Task update | Tasks | Worker | **Broken** — 0% audit |
| `/issue` | Create issue | Issues | Worker | **Broken in HI** — 0% audit |
| `/issues` | List issues | Issues | All | **Broken** — 0% audit |
| `/resolve` | Resolve issue | Issues | Manager, Worker | **Broken** — 0% audit |
| `/assign` | Create/assign task to person | Tasks | Manager, Owner | **Broken in HI** — 29% audit |
| `/depart_assign` | Route to department | Tasks | Manager, Owner | **Broken in HI** — 0% audit |
| `/mgrassign` | Delegate existing task | Tasks | Manager | **Broken in HI** — 25% audit |
| `/mgrself` | Manager self-assign | Tasks | Manager | **Broken in HI** — 0% audit |
| `/mgrtransfer` | Transfer task dept | Tasks | Manager | **Broken in HI** — 0% audit |
| `/mgrreject` | Reject task | Tasks | Manager | **Broken in HI** — 0% audit |
| `/report` | Generate report | Reports | Owner, Manager | **Broken in HI** — 0% audit |
| `/members` | List factory members | Organization | Owner, Manager | **Broken** — vendor list conflated |
| `/help` | Help text | Meta | All | **Broken in HI** — 0% audit |
| `general_chat` | LLM chat response | Meta | All | **Overused** — 200 misroute sink |

*Workers blocked from workflow-start; may use command intents where role allows.

---

## Flow diagram (intent → execution)

```
Intent classified
       │
       ├─ Workflow intent? ──► WorkflowRegistry.getHandlerByCommand()
       │                              │
       │                              ▼
       │                    workflow_sessions INSERT
       │                              │
       │                              ▼
       │                    Step handler → domain services → DB
       │
       └─ Command intent? ──► WhatsAppService.processCommand()
                                      │
                                      ▼
                              Domain service → DB
```

---

## Discovery vs onboarding distinction

| User says | Intent | Workflow |
|-----------|--------|----------|
| "mera business … hai" | `/business_discovery` | Profile buckets (non-blocking) |
| "naya vendor add karo" | `/onboard_vendor` | Vendor master record |
| "naya worker add karo" | `/onboard_worker` | Factory user record |

Regex disambiguation: `_VENDOR_PROCUREMENT_ACTION_RE` prevents vendor onboard when procurement verbs present.

---

## Document domain (indirect)

Document upload does not use NL intent. Flow: upload → parse (`ML_URL/parse`) → suggestions → `/suggestion_approve` workflow.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Regex reliable** | ≥80% on real-language audit for category |
| **Regex moderate** | 60–79% |
| **Broken in HI** | Hindi/Hinglish phrases → `general_chat` |
| **Overused** | Catch-all absorbs intended intents |
