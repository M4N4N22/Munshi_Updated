# Phase 1 — Capability Frequency Analysis

**Method:** Operational judgment for Indian SMB WhatsApp-first usage — not production analytics (logs unavailable in Phase 1).  
**Scale:** High (daily+), Medium (weekly/monthly), Low (setup/episodic)

---

## Frequency matrix

| Capability | Frequency | Primary users | Rationale |
|------------|-----------|---------------|-----------|
| Attendance Management | **High** | Worker, Manager | Every shift |
| Task Visibility | **High** | All | Multiple times per day |
| Task Execution | **High** | Worker, Manager | Per completed work unit |
| Task Delegation | **High** | Owner, Manager | Core coordination loop |
| Manager Task Coordination | **Medium** | Manager | Only factories with owner→dept-head model |
| Stock-Linked Operations | **Medium** | Owner, Manager | Stock-aware businesses only |
| Issue Management | **Medium** | All | Sporadic but important |
| Platform Guidance | **Medium** | All | Front-loaded; ongoing for new users |
| Inventory Visibility | **Medium** | Owner, Manager | Daily for stock-heavy; weekly for light |
| Attendance Reporting | **Medium** | Owner, Manager | Daily or weekly payroll cycles |
| Team Visibility | **Low–Medium** | Owner, Manager | Reference lookups |
| Procurement | **Low–Medium** | Owner, Manager | Tied to stock alerts and buying cycles |
| Inventory Data Entry | **Low** | Owner, Manager | Setup bursts; occasional adds |
| Workforce Onboarding | **Low** | Owner, Manager | Hiring events |
| Vendor Management | **Low** | Owner, Manager | Occasional supplier adds |
| Business Setup | **Low** | Owner | Once per tenant + rare updates |
| Document Processing | **Low** | Owner, Manager | When docs uploaded |

---

## By role — daily touchpoints

| Role | High-frequency capabilities | Est. daily ML intents |
|------|----------------------------|----------------------|
| Worker | Attendance, Task Visibility, Task Execution | 3–8 |
| Manager | + Delegation, Manager Coordination, Issues | 5–15 |
| Owner | + Inventory Visibility, Reporting, Delegation | 5–20 |

---

## Command-level frequency (within capabilities)

| Frequency | Commands |
|-----------|----------|
| **Very high** | `/present`, `/absent`, `/tasks`, `/complete` |
| **High** | `/assign`, `/update`, `/issue`, NL→assign variants |
| **Medium** | `/mgr*`, `/inventory_status`, `/help`, `/report`, `/issues`, `/resolve` |
| **Low** | `/onboard_*`, `/inventory_create`, `/inventory_import_csv`, `/purchase_request_create`, `/business_discovery`, `/suggestion_approve`, `/assign_delivery`, `/task_inventory_nl` |

---

## Business-type skew

| Business type | Elevated capabilities |
|---------------|----------------------|
| Manufacturer | Stock-Linked Ops, Inventory Visibility, Procurement |
| Trader / Distributor | Inventory Visibility, Procurement, Stock-Linked Ops |
| Workshop (small) | Task Delegation, Attendance, Issue Management |
| Multi-dept factory | Manager Coordination, Team Visibility |

---

## Implications for ML hardening (business only)

1. **High-frequency capabilities** deserve evaluation datasets first — errors compound daily.
2. **Low-frequency but high-risk** (inventory import, document approval) need accuracy over volume.
3. **Manager Coordination** is medium frequency but **high confusion risk** with delegation intents.
