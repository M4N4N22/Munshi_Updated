# Phase 0 Summary — Command Discovery & Capability Registry

**Date:** 2026-06-10  
**Status:** Complete (read-only research)  
**Branch:** No git operations performed

---

## 1. Total commands discovered

**30** distinct slash commands across WhatsApp backend.

| Source | Count |
|--------|-------|
| `COMMANDS` (`whatsapp.constants.ts`) | 25 |
| Workflow-only (not in COMMANDS enum) | 5 |
| **Unique total** | **30** |

Workflow-only: `/suggestion_approve`, `/business_discovery`, `/assign_clarify`, `/task_inventory_nl`, `/continue_discovery`

**Not counted:** `general_chat` (ML intent), interactive button IDs, text `CONFIRM`/`CANCEL`, chat triggers (`hello`, `menu`, `start`).

---

## 2. Commands by category

| Category | Count | Commands |
|----------|------:|----------|
| Attendance | 2 | present, absent |
| Tasks & work | 12 | tasks, complete, update, assign, assign_clarify, depart_assign, assign_delivery, mgrself, mgrassign, mgrtransfer, mgrreject, task_inventory_nl |
| Inventory | 3 | inventory_create, inventory_status, inventory_import_csv |
| Procurement | 1 | purchase_request_create |
| Vendor | 1 | onboard_vendor |
| Onboarding | 3 | onboard_worker, business_discovery, continue_discovery |
| Issues | 3 | issue, issues, resolve |
| Management | 2 | members, report |
| Documents | 1 | suggestion_approve |
| Meta | 2 | help, cancel |

---

## 3. Commands by role

| Role scope | Count | Notes |
|------------|------:|-------|
| All users | 8 | present, absent, tasks, complete, issue, help, cancel + issue create |
| Worker-only | 1 | update |
| Manager-only routing | 4 | mgrself, mgrassign, mgrtransfer, mgrreject |
| Owner + Manager | 17 | assign*, inventory*, onboard*, report, members, issues, resolve, purchase*, discovery*, suggestion_approve |

---

## 4. Top-level capabilities (18)

1. Daily Attendance  
2. Task Visibility  
3. Task Completion  
4. Task Delegation  
5. Delivery & Stock-Linked Tasks  
6. Manager Task Routing  
7. Worker Progress Reporting  
8. Issue Tracking  
9. Team & Org Visibility  
10. Attendance Reporting  
11. Workforce Onboarding  
12. Vendor Onboarding  
13. Business Profile Setup  
14. Inventory Master Data  
15. Inventory Visibility  
16. Bulk Inventory Import  
17. Procurement / Purchase Requests  
18. Document-Driven Actions (+ Help, Workflow Control, Conversational Fallback)

Full mapping: `07-capability-registry.md`

---

## 5. Potential command overlaps

| Priority | Overlap |
|----------|---------|
| High | `/assign_delivery` ↔ `/task_inventory_nl` |
| High | `/business_discovery` ↔ `/continue_discovery` |
| High | `/inventory_create` ↔ `/inventory_import_csv` ↔ NL "add stock" |
| Medium | `/assign` ↔ `/assign_clarify` |
| Medium | `/inventory_status` low-stock ↔ `/purchase_request_create` |
| Contract gap | ML missing 4 backend commands — NL routing risk |

Details: `08-redundancy-analysis.md`

---

## 6. Recommended next phase

**Phase 1 — Business Capability Mapping**

1. Validate capability groupings with product/stakeholders (factory owner interviews).
2. Close ML contract drift: align `intent-types.json` with all 30 commands or document intentional exclusions.
3. Map interactive CTAs (`WA_INTERACTIVE_ID`) to capability IDs for unified intent model.
4. Define capability success metrics (e.g. "Bulk Inventory Import" = import without duplicate stock-in).
5. Prioritize high-traffic NL phrases per capability from production logs (when available).

**Then Phase 2 — Business Workflow Analysis:** swimlanes for owner→manager→worker paths using commands as transition labels.

---

## Deliverables index

| File | Content |
|------|---------|
| `01-command-registry.md` | Full 30-command table |
| `02-command-classification.md` | Category hierarchy |
| `03-role-mapping.md` | Role access matrix |
| `04-business-purpose-analysis.md` | Operational why |
| `05-workflow-mapping.md` | Start → process → end |
| `06-command-dependencies.md` | Entity + command deps |
| `07-capability-registry.md` | Business capability view |
| `08-redundancy-analysis.md` | Overlap identification |
| `09-phase0-summary.md` | This document |

---

## Architecture snapshot

```
WhatsApp message
    ├─ Direct slash (COMMANDS) → processCommand()
    ├─ Slash bypass (mgr*, assign_delivery) → processCommand()
    ├─ Workflow start → WorkflowRouter → handler
    ├─ NL shortcuts (taskInventoryNl, low-stock CTA)
    └─ ML POST /classify → normalizeIntentCommand → workflow | processCommand | general_chat
```

**Key files:** `whatsapp.service.ts`, `whatsapp.constants.ts`, `workflow.constants.ts`, `workflow.registry.ts`, `backend/contracts/intent-types.json`, `ml/bot_engine.py`
