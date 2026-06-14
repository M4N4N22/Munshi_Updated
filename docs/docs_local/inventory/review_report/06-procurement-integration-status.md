# Phase 6 — Inventory + Procurement Status

| Capability | Implemented | Unit Test | Integration | Live Verified | Pending |
|------------|:-----------:|:---------:|:-----------:|:-------------:|:-------:|
| Low stock threshold detection | Y | PASS | NOT VERIFIED | Y (logic) | — |
| Low stock WhatsApp notification | Y | PASS | NOT VERIFIED | ENV-ONLY | OLLI smoke test |
| Low stock context persistence | Y | PASS | NOT VERIFIED | Y (mig 014) | — |
| Purchase Karein CTA button | Y | PASS | NOT VERIFIED | PASS | — |
| CTA → purchase request prefill | Y | PASS | NOT VERIFIED | PASS | — |
| Purchase request creation workflow | Y | PASS | NOT VERIFIED | Partial | Full PR UAT |
| Purchase approval workflow | Y | PASS | NOT VERIFIED | NOT TESTED | End-to-end approval UAT |
| Inventory writes during prefill | N (by design) | PASS | NOT VERIFIED | PASS | — |

## Flow

```
Stock movement crosses threshold
  → INVENTORY_LOW_STOCK domain event
  → WhatsApp alert to owner/manager
  → "Purchase Karein" button (interactive)
  → purchase request workflow with prefilled item
  → user edits + submits
  → approval workflow (existing procurement)
```

## Evidence

- `inventory-low-stock-outbound.spec.ts` — PASS
- `inventory-low-stock-purchase-prefill.integration.spec.ts` — exists
- Procurement CTA fix on `Shantanu` branch / merged paths (parser prefers `button_reply.id`)

## Classification

| Area | Status |
|------|--------|
| Low stock → notification | **Near Production Ready** |
| CTA → PR prefill | **Near Production Ready** |
| Full procurement approval E2E | **Pending UAT** |
