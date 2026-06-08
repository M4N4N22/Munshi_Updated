# Phase 1 — Expected Procurement CTA Flow

**Date:** 2026-06-08  
**Scope:** Investigation only — documents intended code path

---

## End-to-end expected flow

```
1. InventoryTransactionService.recordStockOut()
2. didCrossLowStockThreshold() → true
3. DomainEventsService.publish('inventory.low_stock')
4. DomainEventsService.processEventById() → InventoryLowStockAlertHandler.handle()
5. resolveLowStockAlertRecipientPhones() → owners + dept managers
6. buildInventoryLowStockAlertOutbound()
7. MessagingService.sendInteractiveButtons() → Olli WABA API
8. User taps [Purchase karein]
9. Olli POST /webhook → WhatsAppController.receiveMessage()
10. parseWhatsAppInbound() → { message: '/purchase_request_create?itemId=N' }
11. WhatsAppService.handleIncomingMessage()
12. resolveInteractiveActionId() → null
13. matchWorkflowStartCommand() → '/purchase_request_create'
14. WorkflowRouterService.startWorkflowFromCommand()
15. parsePurchaseRequestItemIdFromCommand() → N
16. PurchaseRequestPrefillService.buildLowStockPrefill()
17. workflow_sessions INSERT (prefill_pending_confirm: true)
18. User receives prefilled YES/NO prompt
19. YES → PurchaseRequestService.createFromWorkflowSession() → PENDING_APPROVAL
20. APPROVAL → VENDOR_ASSIGNMENT → CLOSE
```

---

## Component map

| Step | File | Function |
|------|------|----------|
| Threshold | `inventory.low-stock.helper.ts` | `didCrossLowStockThreshold` |
| Event | `inventory-transaction.service.ts` | `scheduleLowStockAlertIfNeeded` |
| Dispatch | `domain-events.service.ts` | `dispatch` → alert handler |
| Recipients | `inventory-low-stock-alert.recipients.ts` | `resolveLowStockAlertRecipientPhones` |
| Outbound | `inventory-low-stock-outbound.ts` | `buildInventoryLowStockAlertOutbound` |
| Send | `messaging.service.ts` | `sendInteractiveButtons` |
| Webhook | `whatsapp.controller.ts` | `receiveMessage` |
| Parse | `whatsapp-inbound.parser.ts` | `parseWhatsAppInbound` |
| Route | `whatsapp.service.ts` | `handleIncomingMessage` |
| Workflow | `workflow-engine.service.ts` | `startWorkflowFromCommand` |
| Prefill | `purchase-request-prefill.service.ts` | `buildLowStockPrefill` |
| Handler | `purchase-request-create.handler.ts` | `handlePrefillConfirmation` |

---

## Critical assumption in expected flow

**Step 10 requires** inbound `message` to be:

```
/purchase_request_create?itemId={inventoryItemId}
```

This happens when `parseWhatsAppInbound` reads `interactive.button_reply.id` **and** Olli does **not** supply a competing `data.text` title field that takes parser precedence.

---

## Button outbound contract

| Field | Value |
|-------|-------|
| `title` | `Purchase karein` |
| `id` | `/purchase_request_create?itemId={id}` |

Built by `buildInventoryLowStockPurchaseButton()` in `inventory-low-stock-outbound.ts`.

---

## Router branch expectation (happy path)

```
handleIncomingMessage(msgTrim)
  ① resolveInteractiveActionId → null
  ⑧ matchWorkflowStartCommand → '/purchase_request_create'
  → startWorkflowFromCommand(msgTrim)
  → finish() sends prefill prompt
```

**Must NOT reach:** ML `/classify` fallback (step ⑪).
