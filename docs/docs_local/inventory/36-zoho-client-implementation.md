# Phase 2.5.3 — Zoho Stock Update Client Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/test/integration/zoho-inventory-adjust-stock.integration.spec.ts` | 7 client integration scenarios |
| `backend/src/services/integrations/zoho/zoho-inventory.client.spec.ts` | Unit tests for quantity mapping + config errors |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/integrations/zoho/zoho-inventory.client.ts` | `adjustStock()`, error mapping, mock handler |
| `backend/src/services/integrations/zoho/zoho-inventory.types.ts` | Input/output types, handler context |

**Not modified:**

- `inventory-transaction.service.ts`
- `tasks.service.ts`
- `domain-events.service.ts`
- `zoho-pull-sync.service.ts` (pull path unchanged)
- No `ZohoPushService` / `ZohoPushHandler`

---

## 3. adjustStock() API

**Input:**

```typescript
{
  connection: IntegrationConnection;
  externalItemId: string;
  quantity: string | number;
  transactionType: string;  // STOCK_IN | STOCK_OUT
  referenceId: string | number;
}
```

**Success output:**

```typescript
{ success: true, externalReference: string }
```

**Failure output:**

```typescript
{
  success: false;
  code: ZohoAdjustStockErrorCode;
  message: string;
  httpStatus?: number;
  retryable: boolean;
}
```

---

## 4. Request Mapping

```typescript
POST /inventory/v1/inventoryadjustments?organization_id={org_id}
{
  "date": "2026-06-04",
  "reason": "Munshi sync ref {referenceId}",
  "description": "Munshi inventory transaction {referenceId}",
  "adjustment_type": "quantity",
  "line_items": [{
    "item_id": "{externalItemId}",
    "quantity_adjusted": "-3" | "5"
  }]
}
```

| Munshi type | Zoho sign |
|-------------|-----------|
| STOCK_OUT | Negative |
| STOCK_IN | Positive |

---

## 5. Dependencies Injected

`ZohoInventoryClient` now receives:

- `ZohoOAuthService` — token refresh
- `TokenCryptoService` — access token decrypt

Nest `IntegrationModule` resolves both without circular dependency.

---

## 6. Mock Handler

```typescript
zohoInventoryClient.setAdjustStockHandler(async (ctx) => {
  // ctx.requestBody, ctx.signedQuantity, ctx.accessToken, ...
  return { success: true, externalReference: 'mock-ref' };
});
```

Set `null` to restore live HTTP path.

---

## 7. Not Implemented (Phase 2.5.4+)

- `ZohoPushService` orchestration
- Domain event handler / dispatch registry
- `ensurePushDelivery` wiring
- Retry / outbox processing
- `integration_sync_runs` push direction
