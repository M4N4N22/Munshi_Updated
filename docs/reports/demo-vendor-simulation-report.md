# Demo Vendor Simulation Report

## Important Constraint

There is **no separate vendor WhatsApp onboarding path** for order acceptance. The demo uses the **existing** `PURCHASE_REQUEST_CREATE` workflow — not demo-only procurement logic.

## Demo Story (Owner-led)

```
Owner → "purchase request bana do"
Munshi → PR workflow (title, items, approval)
Owner → YES (approve)
Munshi → Vendor assignment step
Owner → "Gupta Metals"
Munshi → Vendor assigned; asks to close
Owner → YES
Munshi → PR CLOSED — vendor confirmation complete
```

## Services Triggered

1. `WorkflowRouterService` → `PURCHASE_REQUEST_CREATE` handler
2. `PurchaseRequestsService.createPurchaseRequest`
3. `PurchaseRequestsService.approvePurchaseRequest`
4. `VendorService.listVendors` + `PurchaseRequestsService.assignVendor`
5. `PurchaseRequestsService.closePurchaseRequest`

## Database Updates

| Step | Table | Change |
|------|-------|--------|
| Create | `purchase_requests`, `purchase_request_items` | New PR row |
| Approve | `purchase_requests`, `approval_requests` | Status → approved |
| Assign vendor | `purchase_requests.assigned_vendor_id` | → Gupta Metals (id 12) |
| Close | `purchase_requests.status` | → `CLOSED` |
| Session | `workflow_sessions` | → `COMPLETED` |

## Workflow States

`REQUEST_CREATION` → `APPROVAL` → `VENDOR_ASSIGNMENT` → `CLOSE`

## Future Real Vendor Mapping

When vendor WhatsApp is implemented, an inbound vendor message should trigger the same **assign + acknowledge + close** state transitions (or a dedicated vendor-ack step inserted before `CLOSE`). Today, **owner confirmation at CLOSE** simulates vendor order acceptance for the demo narrative.

## Dry Run Proof

PR **"Demo PR 1780412076699"** closed with `assigned_vendor_id=12`.
