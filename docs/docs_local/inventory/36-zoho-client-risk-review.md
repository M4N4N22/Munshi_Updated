# Phase 2.5.3 — Zoho Stock Update Client Risk Review

**Run date:** 2026-06-04

---

## R-Z06 — Munshi Ledger Authority

| Check | Status |
|-------|--------|
| Client imports InventoryTransactionService? | **No** |
| Client writes inventory_items? | **No** |
| Client calls recordStockIn/Out? | **No** |
| Outbound HTTP only? | **Yes** |

**Verdict:** R-Z06 **PRESERVED**

---

## Scope Boundaries (2.5.3)

| Forbidden item | Present? |
|----------------|----------|
| ZohoPushHandler | **No** |
| Dispatch registry | **No** |
| Event processing | **No** |
| Munshi inventory writes | **No** |
| adjustStock retry loop | **No** (structured errors only) |
| ZohoPushService | **No** |

---

## Token Refresh

| Check | Status |
|-------|--------|
| Uses `refreshConnectionIfNeeded()` | **Yes** |
| Duplicated refresh logic | **No** |
| Expired token refreshed before API | **Verified** (test 7) |

---

## Error Handling

| HTTP condition | Handled | Retry in client |
|----------------|---------|-----------------|
| 401 | Yes | No (2.5.4) |
| 429 | Yes | No (2.5.4) |
| 5xx | Yes | No (2.5.4) |
| Network timeout | Yes | No (2.5.4) |

Pull GET requests retain existing 429/5xx retry — adjustStock POST does not retry per phase scope.

---

## Residual Risks (Deferred to 2.5.4+)

| ID | Risk | Notes |
|----|------|-------|
| R-P05-08 | Unmapped items | Handler skips before adjustStock |
| R-P05-04 | Duplicate push | ensurePushDelivery + handler in 2.5.4 |
| R-P05-11 | OAuth scope | `inventoryadjustments.CREATE` needed at connect |
| R-P05-12 | Multi-warehouse | Single default warehouse v1 |

---

## Summary

Phase 2.5.3 delivers a safe outbound-only client. R-Z06 is preserved. Handler wiring, idempotency integration, and retry processing remain appropriately deferred to Phase 2.5.4.
