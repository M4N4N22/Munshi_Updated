# Prompt 10 — Contract Report

## SECTION A — Backend Implementation

Shared contracts updated:
- `workflow-types.json` → `PURCHASE_REQUEST_CREATE`
- `suggestion-types.json` → `CREATE_PURCHASE_REQUEST`
- `intent-types.json` → `/purchase_request_create`
- `documents.constants.ts` → `SUGGESTION_TYPE.CREATE_PURCHASE_REQUEST`

## SECTION B — LLM Requirements

Classify response unchanged shape; new intent value only.

## SECTION C — Contract Requirements

### Purchase Request Intent Contract

```json
{
  "intent": "/purchase_request_create",
  "worker_slug": null,
  "depart_slug": null,
  "reject_reason": null
}
```

### Purchase Request Workflow Contract

```json
{
  "workflow_type": "PURCHASE_REQUEST_CREATE",
  "start_command": "/purchase_request_create",
  "session_data": {
    "title": "Restock cement",
    "items": [{ "item_name": "Cement", "requested_quantity": "100", "unit": "bags" }],
    "purchase_request_id": 12
  },
  "steps": ["REQUEST_CREATION", "APPROVAL", "VENDOR_ASSIGNMENT", "CLOSE"]
}
```

### Purchase Request Suggestion Contract

```json
{
  "suggestion_key": "low-stock:3:5",
  "inventory_item_id": 5,
  "item_name": "Cement",
  "suggested_quantity": "20",
  "unit": "bags",
  "reason": "Low stock: Cement (2 bags, reorder at 10)"
}
```

## SECTION D — Training Data Requirements

Contract drift eval must assert backend constants match JSON files (existing `contract_drift.spec.ts`).

## SECTION E — Future Automation Opportunities

Cross-repo OpenAPI → contract generation for PR DTOs.
