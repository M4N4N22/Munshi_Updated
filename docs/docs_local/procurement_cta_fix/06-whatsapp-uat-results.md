# Phase 7 — WhatsApp UAT Simulation

## Simulated flow (integration spec)

`procurement-cta-bridge.integration.spec.ts` → `UAT — alert → Purchase karein → YES creates purchase request`

```
1. Seed factory + inventory item (reorder_threshold = 10, qty = 10)
2. recordStockOut(2) → INVENTORY_LOW_STOCK domain event
3. InventoryLowStockAlertHandler.handle(event)
   → sendInteractiveButtons mocked
   → low_stock_alert_contexts row inserted
4. WhatsAppService.handleIncomingMessage({ message: 'Purchase karein' })
   → resolveCtaTitle → /purchase_request_create?itemId=N
   → startWorkflowFromCommand → prefill session
5. WhatsAppService.handleIncomingMessage({ message: 'YES' })
   → purchase_requests count +1
   → workflow session current_step = APPROVAL
   → PR status = PENDING_APPROVAL
```

## Verification points

| Check | Assertion |
|-------|-----------|
| `workflow_sessions` | `session_data.inventory_item_id` = item id |
| `workflow_sessions` | `prefill_pending_confirm` = true before YES |
| `workflow_sessions` | `current_step` = `APPROVAL` after YES |
| `purchase_requests` | New row, `PENDING_APPROVAL` |
| ML bypass | `axios.post` to `/classify` not called on CTA tap |

## Live UAT status

**NOT EXECUTED** — local Postgres unavailable during implementation run.

## Recommended live UAT (staging)

1. Apply migration `014` on staging DB.
2. Deploy backend to staging (not done per instructions).
3. Reduce an item below reorder threshold for factory `1`.
4. Owner `918604856137` receives low-stock alert.
5. Tap **Purchase karein**.
6. Confirm prefill prompt in WhatsApp.
7. Reply **YES**.
8. SQL checks:

```sql
SELECT * FROM low_stock_alert_contexts
WHERE phone_number = '918604856137' ORDER BY id DESC LIMIT 5;

SELECT workflow_type, current_step, session_data
FROM workflow_sessions
WHERE phone_number = '918604856137' ORDER BY id DESC LIMIT 1;

SELECT id, status FROM purchase_requests
WHERE factory_id = 1 ORDER BY id DESC LIMIT 1;
```

## Expected outcome

Prefilled purchase request created with approval pending — same as pre-existing Phase 3.4 prefill tests when command string is supplied directly.
