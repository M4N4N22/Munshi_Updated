# Phase 3.4 — Purchase Request Prefill Regression

**Run date:** 2026-06-06

---

## Baseline

| Milestone | Integration tests |
|-----------|-------------------|
| Pre–Phase 3.4 | 109 |
| Post–Phase 3.4 | **115** (+6) |

---

## Regression Matrix

| Phase | Area | Change in 3.4 | Regression |
|-------|------|---------------|------------|
| 3.3A | Manager low stock alerts | None (handler CTA only) | **PASS** |
| 3.2 | Sync failure alerts | Test isolation fix (direct handler) | **PASS** |
| 3.1 | Low stock event + alert | CTA now includes `itemId`; test 5 uses direct handler | **PASS** |
| 2.x | Zoho integration | None | **PASS** |
| 1.x | Domain events / inventory | No threshold or publish changes | **PASS** |
| 0.x | Tasks / inventory foundation | None | **PASS** |

---

## Intentional Behavior Change (3.1)

| Before | After |
|--------|-------|
| CTA: `/purchase_request_create` | CTA: `/purchase_request_create?itemId={id}` |
| Generic workflow start | Prefilled confirm when `itemId` present |

Manual `/purchase_request_create` without query param is **unchanged**.

---

## Test Hardening (collateral)

To prevent cross-test pollution from shared `processPendingBatch`:

| File | Fix |
|------|-----|
| `inventory-low-stock-alert.integration.spec.ts` | Test 5: direct `alertHandler.handle(event)` |
| `inventory-low-stock-manager-alert.integration.spec.ts` | `publishLowStockEvent` → direct handler |
| `integration-sync-failed-alert.integration.spec.ts` | Test 6: direct `syncFailedAlertHandler.handle(event)` |
| `inventory-low-stock-purchase-prefill.integration.spec.ts` | Test 1: direct handler dispatch |

---

## Full Suite Result

```
Test Suites: 17 passed, 17 total
Tests:       115 passed, 115 total
```

**Regression gate:** **PASS**
