# Phase 2.5.2 — Push Idempotency Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/migrations/012_integration_push_deliveries.sql` | Delivery table + unique constraint + indexes |
| `backend/src/services/integrations/integration-push-delivery.helper.ts` | `ensurePushDelivery()` idempotency helper |
| `backend/test/integration/push-idempotency.integration.spec.ts` | Phase 2.5.2 integration tests (7 scenarios) |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/integrations/integration.constants.ts` | Added `PUSH_DELIVERY_STATUS` enum |
| `backend/src/services/integrations/integration.schema.ts` | Added `IntegrationPushDelivery` model + associations |
| `backend/src/services/integrations/integration.repository.ts` | Push delivery CRUD methods |
| `backend/src/core/services/db-service/models.ts` | Registered `IntegrationPushDelivery` |

**Not modified:**

- `domain-events.service.ts`
- Task completion / event capture (2.5.1)
- Zoho OAuth, pull sync, scheduled sync
- `inventory-transaction.service.ts`

---

## 3. Schema

**Table:** `integration_push_deliveries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `connection_id` | INTEGER FK | → `integration_connections` |
| `factory_id` | INTEGER FK | → `factories` |
| `inventory_transaction_id` | INTEGER FK | → `inventory_transactions` |
| `status` | VARCHAR(32) | Default `pending` |
| `zoho_reference` | VARCHAR(256) | Set on deliver |
| `last_error` | TEXT | Set on fail |
| `delivered_at` | TIMESTAMPTZ | Set on deliver |
| `created_at` / `updated_at` | TIMESTAMPTZ | Sequelize timestamps |

**Constraint:** `UNIQUE (connection_id, inventory_transaction_id)`

**Indexes:** `connection_id`, `factory_id`, `status`, `inventory_transaction_id`

---

## 4. Status Enum

```typescript
PUSH_DELIVERY_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  SKIPPED_UNMAPPED: 'skipped_unmapped',
}
```

---

## 5. Repository Methods

| Method | Description |
|--------|-------------|
| `findDelivery(factoryId, connectionId, inventoryTransactionId)` | Factory-scoped lookup |
| `createDelivery(data)` | Insert PENDING row |
| `markDelivered(id, factoryId, zohoReference?)` | Set DELIVERED + `delivered_at` |
| `markFailed(id, factoryId, lastError)` | Set FAILED + `last_error` |
| `listDeliveries(factoryId, criteria?)` | Factory-scoped list with optional filters |

---

## 6. Idempotency Helper

```typescript
ensurePushDelivery(repository, {
  factoryId,
  connectionId,
  inventoryTransactionId,
}) → { delivery, created }
```

First call creates; subsequent calls (including race losers on unique constraint) return the existing delivery without throwing.

---

## 7. Not Implemented (Phase 2.5.3+)

- Zoho stock adjustment API
- Push handler wiring
- Dispatch registry
- Automatic status transitions from events
