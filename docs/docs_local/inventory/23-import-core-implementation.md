# Phase 1.2 — Import Processing Core Implementation

**Run date:** 2026-06-06

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/inventory/inventory-import.service.ts` | `processImport()`, upsert engine, per-row transactions, result model |
| `backend/test/integration/inventory-csv-import.integration.spec.ts` | 7 integration scenarios for import processing |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/inventory/inventory.constants.ts` | Added `INVENTORY_REFERENCE_TYPE.CSV_IMPORT` |
| `backend/src/services/inventory/inventory.module.ts` | Registered and exported `InventoryImportService` |

### Not modified (per scope guard)

- WhatsApp module, owner home, controllers (no upload endpoint)
- `InventoryTransactionService`, `InventoryRepository` movement internals
- Task inventory integration
- CSV parser (Phase 1.1 — already complete)

---

## 3. Processing Flow

```text
processImport(factoryId, userId, rows, batchId)
  │
  ├─ assertFactoryId + validate batchId > 0
  ├─ findFactoryById (fail fast if missing)
  │
  └─ for each InventoryCsvRow:
       processRow()
         ├─ normalizeSku(row.sku) — fail row on invalid SKU
         ├─ BEGIN transaction
         ├─ findCategoryByName → fail row if null
         ├─ findLocationByName → fail row if null
         ├─ findItemBySku(factoryId, sku)
         │
         ├─ [new SKU]
         │    createItem(..., current_quantity: '0.0000')
         │    if qty > 0 → recordStockIn(CSV_IMPORT, batchId)
         │    → added
         │
         └─ [existing SKU]
              if metadata unchanged && qty = 0 → skipped
              else update metadata fields
              if qty > 0 → recordStockIn(CSV_IMPORT, batchId)
              → updated
         COMMIT (or ROLLBACK on thrown error → failed)
  │
  └─ buildSummary(rowResults)
```

---

## 4. Reference Types

| Constant | Value | Usage |
|----------|-------|-------|
| `INVENTORY_REFERENCE_TYPE.CSV_IMPORT` | `'CSV_IMPORT'` | `reference_type` on `STOCK_IN` ledger rows created during import |

`reference_id` = `batchId` (positive integer supplied by caller). Enables idempotency tracing and batch-level audit in later phases.

Existing task reference types (`TASK`, etc.) are untouched.

---

## 5. Row Transaction Strategy

| Event | Transaction behavior |
|-------|---------------------|
| Category not found | Return `failed` inside transaction; no writes |
| Location not found | Return `failed` inside transaction; no writes |
| `recordStockIn` throws (e.g. inactive item) | Catch → `failed`; transaction rolls back |
| Success path | `createItem`/`update` + optional `recordStockIn` commit atomically |
| Next row | Independent transaction — prior row outcome does not block |

`recordStockIn` is called with the **parent row transaction** so item creation and first stock movement are never split across commits.

---

## 6. Public API

```typescript
// inventory-import.service.ts
processImport(
  factoryId: number,
  userId: number,
  rows: InventoryCsvRow[],
  batchId: number,
): Promise<InventoryImportSummary>
```

Injected via `InventoryModule` export — available to future REST/WhatsApp orchestration layers (Phase 1.3+).
