# Demo Workflow Session Interference Report

## How sessions block commands

`WhatsAppService.handleIncomingMessage` checks `resolveActiveSession` **before** ML classify. Any ACTIVE session routes the message into the workflow handler.

```
Message → Active session? → YES → workflow step handler (ML skipped)
                         → NO  → ML classify → command/workflow start
```

## Interference Matrix (tested 2026-06-02T15:19:24.263Z)

| # | Active workflow | User tries | ML would be | Actual behaviour | Result |
|---|-----------------|------------|-------------|------------------|--------|
| 1 | PURCHASE_REQUEST_CREATE (step REQUEST_CREATION) | `Steel sheets ka stock kitna bacha hai` | /inventory_status | Consumed as workflow input | YES — active workflow consumed message |
| 2 | PURCHASE_REQUEST_CREATE (step REQUEST_CREATION) | `Mujhe aaj ka report dikhao` | /report | Consumed as workflow input | YES — active workflow consumed message |
| 3 | BUSINESS_DISCOVERY (step MENU) | `mere tasks dikhao` | /tasks | Consumed as workflow input | YES — active workflow consumed message |
| 4 | PURCHASE_REQUEST_CREATE (step REQUEST_CREATION) | `null` | general_chat | Consumed as workflow input | YES — active workflow consumed message |
| — | *(cancelled)* | Steel sheets query | /inventory_status | Normal inventory read | NO interference ✅ |

## Root Cause

| Session ID (example) | Workflow | Step | Blocking condition |
|---------------------|----------|------|-------------------|
| 94–97 | PURCHASE_REQUEST_CREATE | REQUEST_CREATION | Free-text captured as PR title/item |
| 96 | BUSINESS_DISCOVERY | MENU | Menu selection parser receives task-list phrase |

## Recording Rules

1. **Finish** each workflow (PR → YES close) or send **cancel** (`/cancel` or natural cancel if supported) before inventory/report/task commands.
2. Do **not** open Business Discovery mid-demo unless it is the final segment.
3. Purchase request is **multi-step** — stay in flow until Munshi confirms complete.
4. Order demo sections to minimize context switches: Attendance → Tasks → Inventory → PR (continuous) → Report → Discovery (optional close).

## Demo Script Impact

- **demo-script-v1.md Section 4 (inventory)** must run **before** Section 6 (PR) OR after PR is fully closed — not during an active PR session.
- Current script order (inventory before PR) is **correct**.
- Section 8 (report) after PR close is **correct** (verified in dry run).
