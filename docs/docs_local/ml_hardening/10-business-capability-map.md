# Phase 1 — Business Capability Map

**Date:** 2026-06-10  
**Inputs:** Phase 0 command registry (30 commands), capability registry, business-purpose analysis  
**Scope:** Business outcomes — not implementation

---

## Refinement from Phase 0

Phase 0 listed **18 capability groups** tied 1:1 to command clusters. Phase 1 consolidates into **17 major business capabilities** that reflect what Indian SMB operators actually want to accomplish.

| # | Business Capability | One-line outcome | Commands |
|---|---------------------|------------------|----------|
| 1 | **Attendance Management** | Know who is on the floor today | `/present`, `/absent` |
| 2 | **Attendance Reporting** | Payroll and oversight by date | `/report` |
| 3 | **Task Visibility** | See what work is pending | `/tasks` |
| 4 | **Task Execution** | Do work and report progress | `/complete`, `/update` |
| 5 | **Task Delegation** | Assign work to people or departments | `/assign`, `/assign_clarify`, `/depart_assign` |
| 6 | **Stock-Linked Operations** | Tie physical stock movement to tasks | `/assign_delivery`, `/task_inventory_nl` |
| 7 | **Manager Task Coordination** | Route owner tasks through department heads | `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject` |
| 8 | **Issue Management** | Track and close operational problems | `/issue`, `/issues`, `/resolve` |
| 9 | **Team & Organization Visibility** | Understand who works where | `/members` |
| 10 | **Workforce Onboarding** | Bring employees onto WhatsApp ops | `/onboard_worker` |
| 11 | **Vendor Management** | Register suppliers for buying | `/onboard_vendor` |
| 12 | **Business Setup** | Configure factory profile for Munshi | `/business_discovery`, `/continue_discovery` |
| 13 | **Inventory Visibility** | Answer "how much do we have?" | `/inventory_status` |
| 14 | **Inventory Data Entry** | Add or bulk-load stock master data | `/inventory_create`, `/inventory_import_csv` |
| 15 | **Procurement & Reordering** | Request materials when stock runs low | `/purchase_request_create` |
| 16 | **Document Processing** | Turn uploaded docs into approved actions | `/suggestion_approve` |
| 17 | **Platform Guidance & Control** | Learn the system; exit stuck flows | `/help`, `/cancel`, `general_chat`, owner home |

**Total business capabilities:** **17**

---

## Capability tiers

### Core daily operations (factory floor)
Attendance Management, Task Visibility, Task Execution, Issue Management (report side)

### Coordination layer (owner / manager)
Task Delegation, Manager Task Coordination, Stock-Linked Operations, Team Visibility, Attendance Reporting

### Master data & setup (episodic)
Workforce Onboarding, Vendor Management, Business Setup, Inventory Data Entry

### Supply chain (periodic)
Inventory Visibility, Procurement

### Intelligence & meta
Document Processing, Platform Guidance

---

## Problems Munshi solves (capability lens)

| Business problem | Capability |
|------------------|------------|
| "I don't know who came today" | Attendance Management + Reporting |
| "Instructions get lost on phone calls" | Task Delegation |
| "Workers don't know what to do" | Task Visibility + Execution |
| "Owner assigns to wrong department" | Manager Task Coordination |
| "Stock and delivery are disconnected" | Stock-Linked Operations |
| "Machine broke — nobody tracked it" | Issue Management |
| "Is there enough material for this order?" | Inventory Visibility |
| "Reorder when running low" | Procurement |
| "New worker can't use WhatsApp yet" | Workforce Onboarding |
| "Supplier details scattered in notebooks" | Vendor Management |
| "Invoice upload should update stock" | Document Processing |

---

## Non-command enablers (context only)

| Enabler | Supports capabilities |
|---------|----------------------|
| Owner home menu (`hello`, `menu`, buttons) | Business Setup, Inventory Data Entry, Workforce Onboarding |
| Low-stock CTA buttons | Procurement, Inventory Visibility |
| Zoho integration (web UI) | Inventory Data Entry (import source) |
| `CONFIRM` text (CSV review) | Inventory Data Entry |

These are not slash commands but are part of the business capability experience.
