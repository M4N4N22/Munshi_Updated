# Phase 2.3 — Zoho Pull Sync Implementation

**Run date:** 2026-06-04

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/integrations/zoho/zoho-inventory.types.ts` | Normalized Zoho item types |
| `backend/src/services/integrations/zoho/zoho-inventory.client.ts` | Paginated items API client (mockable) |
| `backend/src/services/integrations/zoho/zoho-pull-sync.types.ts` | Pull sync summary types |
| `backend/src/services/integrations/zoho/zoho-pull-sync.service.ts` | Core pull sync orchestration |
| `backend/src/services/integrations/zoho/zoho-pull-sync.messages.ts` | WhatsApp-style summary formatter |
| `backend/src/services/integrations/zoho/zoho-pull-sync.dto.ts` | Request DTO |
| `backend/src/services/integrations/zoho/zoho-sync.controller.ts` | Pull sync REST endpoint |
| `backend/test/integration/zoho-pull-sync.integration.spec.ts` | Integration tests (mocked Zoho) |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/integrations/integration.repository.ts` | Added `updateMapping()` |
| `backend/src/services/integrations/integration.module.ts` | Import `InventoryModule`; register pull sync providers/controllers |
| `backend/.env.example` | Optional `ZOHO_INVENTORY_API_DOMAIN` fallback |

**Not modified:** `InventoryTransactionService`, `InventoryImportService`, `InventoryRepository`, import/WhatsApp modules, OAuth flow logic.

---

## 3. API Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/integrations/zoho/sync/pull` | `{ factory_id, user_id, connection_id }` | `{ addedCount, updatedCount, failedCount, mappingCount, syncRunId, failures? }` |

Authorization: owner/manager only. Workers receive 403.

---

## 4. Mapping Flow

```text
For each Zoho item:
  findMapping(connectionId, external_id)
      │
      ├─ exists → update inventory metadata + updateMapping(last_synced_at, external_sku)
      │
      └─ missing → createItem(qty=0) + createMapping + optional recordStockIn(ZOHO_PULL)
```

---

## 5. Audit Flow

```text
createSyncRun(status=running, direction=pull, trigger=manual)
    ↓
Process all Zoho items
    ↓
updateSyncRun(
  status = completed | partial | failed,
  items_processed = total items,
  error_summary = JSON failures (truncated),
  finished_at = now
)
```

`reference_id` on `ZOHO_PULL` ledger rows = `syncRunId`.

---

## 6. Client Features

- Pagination via `listItemsPage` / `fetchAllItems`
- Retry on 429/5xx (2 retries)
- `setFetchAllHandler()` / `setListPageHandler()` for tests
- Token passed as `Zoho-oauthtoken` header
- `api_domain` from connection metadata (OAuth callback)
