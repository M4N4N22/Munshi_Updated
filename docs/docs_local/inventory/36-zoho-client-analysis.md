# Phase 2.5.3 — Zoho Stock Update Client Analysis

**Run date:** 2026-06-04  
**Scope:** Outbound HTTP client only — no push orchestration

---

## 1. Objective

Provide `ZohoInventoryClient.adjustStock()` for future `ZohoPushService` (Phase 2.5.4) to mirror Munshi ledger movements into Zoho Inventory via quantity adjustments.

```text
Inventory Transaction (Munshi ledger — authoritative)
      ↓
(Future) ZohoPushService
      ↓
ZohoInventoryClient.adjustStock()  ← 2.5.3
      ↓
Zoho POST /inventory/v1/inventoryadjustments
```

---

## 2. Zoho API Assumptions

| Assumption | Detail |
|------------|--------|
| Endpoint | `POST {api_domain}/inventory/v1/inventoryadjustments?organization_id={org_id}` |
| Adjustment type | `quantity` (not value-based) |
| STOCK_OUT | `quantity_adjusted` negative (e.g. `-3`) |
| STOCK_IN | `quantity_adjusted` positive (e.g. `5`) |
| Item ID | String (avoids JS integer precision loss for 19-digit Zoho IDs) |
| Organization | `connection.metadata.org_id` required |
| API domain | `connection.metadata.api_domain` or env fallback |
| Warehouse | v1: not specified — Zoho default warehouse; multi-warehouse deferred |
| OAuth scope | Production connect will need `ZohoInventory.inventoryadjustments.CREATE` (not changed in 2.5.3 to preserve 2.2 regression) |

---

## 3. Token Refresh

`adjustStock()` calls `ZohoOAuthService.refreshConnectionIfNeeded(connection.id)` before decrypting the access token. No duplicate refresh logic in the client.

Pull sync already uses the same pattern in `ZohoPullSyncService.runPullSync()`.

---

## 4. Error Model

Structured result — no throws for HTTP failures:

| Condition | Code | Retryable |
|-----------|------|-----------|
| 401 | `unauthorized` | Yes (handler refresh in 2.5.4) |
| 429 | `rate_limited` | Yes |
| 5xx | `server_error` | Yes |
| Timeout / network | `network_error` | Yes |
| Missing org_id / token | `configuration_error` | No |
| Bad transaction type | `invalid_request` | No |
| Other 4xx | `invalid_request` | No |

**No retry in client** for adjustStock — retries belong to Phase 2.5.4 outbox handler. Pull `GET` retries remain unchanged.

---

## 5. R-Z06 Compliance

The client:

- Does **not** import `InventoryTransactionService`
- Does **not** write `inventory_items` or `inventory_transactions`
- Only performs outbound HTTP to Zoho

Munshi ledger remains authoritative; Zoho is a downstream mirror.

---

## 6. Mock Support

`setAdjustStockHandler()` mirrors `setFetchAllHandler()` from pull sync. When set, HTTP is bypassed — used for CI and quantity-mapping verification.

---

## 7. Risks

| ID | Risk | Mitigation | Residual |
|----|------|------------|----------|
| R-Z06 | Client writes Munshi qty | No inventory imports in client | None |
| R-P05-09 | Wrong API endpoint | Documented; mock tests | Staging validation in 2.5.4 |
| R-P05-10 | Missing org_id | configuration_error return | Ops must set metadata at connect |
| R-P05-11 | OAuth scope insufficient | Document scope requirement | Scope update before prod push |
