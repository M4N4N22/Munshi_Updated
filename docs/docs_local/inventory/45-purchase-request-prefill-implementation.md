# Phase 3.4 — Purchase Request Prefill Implementation

**Run date:** 2026-06-06  
**Status:** IMPLEMENTED

---

## Files Added / Modified

| File | Change |
|------|--------|
| `purchase-request-prefill.helper.ts` | Command parse, qty formula, session + prompt builders |
| `purchase-request-prefill.helper.spec.ts` | Unit tests |
| `purchase-request-prefill.service.ts` | Read-only item lookup + prefill DTO |
| `purchase-requests.interfaces.ts` | `IPurchaseRequestPrefill` |
| `purchase-requests.dto.ts` | Prefill query/response DTOs |
| `purchase-requests.controller.ts` | `GET prefill/low-stock` |
| `purchase-requests.module.ts` | Register + export prefill service |
| `whatsapp.templates.ts` | CTA: `/purchase_request_create?itemId={id}` |
| `inventory-low-stock-alert.handler.ts` | Pass `inventoryItemId` to template |
| `workflow.registry.ts` | Match commands with `?query` |
| `workflow.interfaces.ts` | `prefill_*` session fields |
| `workflow-engine.service.ts` | Router prefill branch + `startWorkflowWithSessionData` |
| `purchase-request-create.handler.ts` | Prefill confirm step; extracted submit helper |
| `whatsapp.service.ts` | Pass full message to workflow router |
| `inventory-low-stock-purchase-prefill.integration.spec.ts` | 6 scenario tests |

---

## Flow

```text
Low stock WhatsApp alert
      ↓
/purchase_request_create?itemId=123
      ↓
WorkflowRouterService.startWorkflowFromCommand(fullMessage)
      ↓
PurchaseRequestPrefillService.buildLowStockPrefill()  [read-only]
      ↓
startWorkflowWithSessionData(prefill session + confirm prompt)
      ↓
User: YES | NO | new quantity
      ↓
YES → createFromWorkflowSession(submit: true)  [existing path]
      ↓
Approval workflow unchanged
```

---

## Prefill Session Shape

```typescript
{
  prefill_source: 'low_stock_alert',
  prefill_pending_confirm: true,
  prefill_context: IPurchaseRequestPrefill,
  title: 'Restock {item}',
  item_name, item_quantity, item_unit,
  inventory_item_id,
  description: 'Low stock: ...'
}
```

---

## Safety Rules Enforced

| Rule | Implementation |
|------|----------------|
| No auto PR creation | PR row only on YES / manual NO-submit path |
| No auto-approval | Same `APPROVAL` step as before |
| No inventory writes | Prefill service + router are read-only until submit |
| No suggestion auto-create | Alert CTA does not call `createFromSuggestion()` |

---

## REST Prefill Endpoint

```
GET /purchase-requests/prefill/low-stock?factory_id=3&inventory_item_id=42
```

Returns `IPurchaseRequestPrefill` + `workflow_command` string. 404 if item not in factory.
