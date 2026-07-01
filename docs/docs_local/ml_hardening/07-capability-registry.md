# Phase 7 — Capability Registry

Business capabilities mapped to commands.

## Capability: Daily Attendance

**Commands:** `/present`, `/absent`  
**Outcome:** Attendance ledger for factory workers and managers.

## Capability: Task Visibility

**Commands:** `/tasks`  
**Outcome:** Role-appropriate task inbox.

## Capability: Task Completion

**Commands:** `/complete`  
**Outcome:** Close tasks; trigger inventory stock-out when task has inventory lines.

## Capability: Task Delegation (Owner/Manager → Worker)

**Commands:** `/assign`, `/assign_clarify`, `/depart_assign`  
**Outcome:** New assigned work with optional deadline and department routing.

## Capability: Delivery & Stock-Linked Tasks

**Commands:** `/assign_delivery`, `/task_inventory_nl`  
**Outcome:** Task describing SKU movement (delivery, count, issue patterns).

## Capability: Manager Task Routing

**Commands:** `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`  
**Outcome:** Owner→manager→worker pipeline and misroute correction.

## Capability: Worker Progress Reporting

**Commands:** `/update`  
**Outcome:** Timestamped updates on assigned tasks.

## Capability: Issue Tracking

**Commands:** `/issue`, `/issues`, `/resolve`  
**Outcome:** Operational problem lifecycle.

## Capability: Team & Org Visibility

**Commands:** `/members`  
**Outcome:** Factory roster and department structure.

## Capability: Attendance Reporting

**Commands:** `/report`  
**Outcome:** Date-scoped attendance summary for leadership.

## Capability: Workforce Onboarding

**Commands:** `/onboard_worker`  
**Outcome:** New employee registered on WhatsApp with role and department.

## Capability: Vendor Onboarding

**Commands:** `/onboard_vendor`  
**Outcome:** Supplier master record for procurement.

## Capability: Business Profile Setup

**Commands:** `/business_discovery`, `/continue_discovery`  
**Outcome:** Factory metadata for routing, ML context, onboarding completeness.

## Capability: Inventory Master Data

**Commands:** `/inventory_create`  
**Outcome:** Single SKU/item creation with category and unit.

## Capability: Inventory Visibility

**Commands:** `/inventory_status`  
**Outcome:** SKU lookup or low-stock alert list.

## Capability: Bulk Inventory Import

**Commands:** `/inventory_import_csv` (+ CONFIRM)  
**Outcome:** CSV-validated stock-in from exports (e.g. Zoho).

## Capability: Procurement / Purchase Requests

**Commands:** `/purchase_request_create`  
**Outcome:** Formal reorder request, often from low-stock CTA.

## Capability: Document-Driven Actions

**Commands:** `/suggestion_approve`  
**Outcome:** Human approval of AI-extracted actions from uploaded documents.

## Capability: Self-Service Help

**Commands:** `/help`  
**Outcome:** Role-tailored command reference.

## Capability: Workflow Control

**Commands:** `/cancel`  
**Outcome:** Abort in-progress multi-step flows.

## Capability: Conversational Fallback (ML)

**Intent:** `general_chat` (not slash)  
**Outcome:** Munshi persona reply when no operational intent matches.

## Related non-command capabilities

| Capability | Trigger | Notes |
|------------|---------|-------|
| Owner home menu | hello, menu, start | Interactive buttons → workflows |
| Zoho integration | Settings UI | No slash command |
| Team CSV export | Interactive `team_export_csv` | Not slash |
