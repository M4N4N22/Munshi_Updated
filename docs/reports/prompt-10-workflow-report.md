# Prompt 10 — Workflow Report

## SECTION A — Backend Implementation

Workflow type **`PURCHASE_REQUEST_CREATE`** registered in `WorkflowRegistry`.

| Step | ID | Behavior |
|------|-----|----------|
| 1 | `REQUEST_CREATION` | Collect title, item, quantity; optional multi-item loop |
| 2 | `APPROVAL` | Owner/manager YES/NO → approve or reject PR |
| 3 | `VENDOR_ASSIGNMENT` | Select vendor by name/id; SKIP allowed |
| 4 | `CLOSE` | Confirm close → `CLOSED` status |

Reuses: session TTL, `/cancel`, role gates, `WorkflowSessionService`.

Handler: `src/services/workflow/handlers/purchase-request-create.handler.ts`

## SECTION B — LLM Requirements

Maps natural language to `/purchase_request_create` before workflow router starts session.

## SECTION C — Contract Requirements

```json
{
  "workflow_type": "PURCHASE_REQUEST_CREATE",
  "start_command": "/purchase_request_create",
  "steps": ["REQUEST_CREATION", "APPROVAL", "VENDOR_ASSIGNMENT", "CLOSE"]
}
```

## SECTION D — Training Data Requirements

Workflow intent examples must not collide with `/onboard_vendor` (supplier registration) or `/inventory_create`.

## SECTION E — Future Automation Opportunities

Auto-start PR workflow from low-stock suggestion queue via WhatsApp notification (owner taps approve).
