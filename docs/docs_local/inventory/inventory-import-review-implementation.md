# Inventory Import Review — Implementation

**Date:** 2026-06-08

---

## Files Changed

| File | Change |
|---|---|
| `inventory-import.service.ts` | `buildImportReview()`, `ensureMasterData()`, extended summary type |
| `inventory-import-upload.service.ts` | `parseCsvFile()`, `buildImportReview()`, `processImportWithProvisioning()` |
| `inventory-bulk-import.service.ts` | Two-phase session, review message, CONFIRM/CANCEL handling |
| `inventory-csv.constants.ts` | `INVENTORY_CSV_REVIEW_TTL_MS` (15 min), upload TTL → 15 min |
| `whatsapp.service.ts` | Route CONFIRM/CANCEL; block upload during review |
| `inventory-import.service.spec.ts` | **New** — review/provision unit tests |
| `inventory-bulk-import.service.spec.ts` | Review flow + session expiry tests |
| `inventory-import-review.integration.spec.ts` | **New** — DB integration cases |

---

## Key APIs

### `InventoryImportService.buildImportReview(factoryId, rows)`

Compares CSV categories, locations, and SKUs against factory master data.

### `InventoryImportService.ensureMasterData(factoryId, categoryNames, locationNames)`

Creates only missing categories/locations inside a transaction. Idempotent.

### `InventoryImportUploadService.processImportWithProvisioning(dto, rows, review)`

Provisions master data, then calls existing `processImport()`. Returns summary with `categoriesCreatedCount` and `locationsCreatedCount`.

### `InventoryBulkImportService`

| Method | Purpose |
|---|---|
| `isAwaitingImportConfirm(phone)` | Review session active |
| `handleReviewReply(phone, message)` | CONFIRM / CANCEL |
| `confirmImport(phone)` | Execute provisioned import |

---

## WhatsApp Message Flow

1. `/inventory_import_csv` → `startAwaitingCsv()` (phase: `awaiting_upload`)
2. CSV document → parse → `buildImportReview()` → phase: `awaiting_confirm` → review summary
3. `CONFIRM` → `processImportWithProvisioning()` → success summary with created counts
4. `CANCEL` → session cleared

---

## Success Message (after CONFIRM)

```
✅ Inventory import complete.

Added: 3
Updated: 0
Failed: 0
Skipped: 0

Categories Created: 3
Locations Created: 3
Items Created: 3
```

---

## Not Modified

- Database schemas
- `processImport()` per-row validation
- REST endpoint contract
- CSV template file
