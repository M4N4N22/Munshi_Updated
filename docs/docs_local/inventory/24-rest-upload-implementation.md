# Phase 1.3 — REST Upload Implementation

**Run date:** 2026-06-06

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/services/inventory/inventory-import-upload.service.ts` | File gate, parse, delegate to import core |
| `backend/src/services/inventory/inventory-import-upload.service.spec.ts` | Unit tests (file gate + delegation) |
| `backend/test/integration/inventory-csv-upload.integration.spec.ts` | REST upload integration scenarios |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/services/inventory/inventory.controller.ts` | `POST /inventory/import/csv` endpoint |
| `backend/src/services/inventory/inventory.dto.ts` | `ImportInventoryCsvDto` with multipart transforms |
| `backend/src/services/inventory/inventory.module.ts` | Register/export `InventoryImportUploadService` |
| `backend/test/integration/helpers/phase0-fixtures.ts` | Optional `validationPipe` for REST tests |

### Not modified

- Parser, import core, transaction service, repository movement logic
- WhatsApp module, owner home, template download

---

## 3. Endpoint

```http
POST /inventory/import/csv
Content-Type: multipart/form-data

file=<csv>
factory_id=<number>
created_by=<number>
batch_id=<number>   (optional)
```

**Response (200):**

```json
{
  "addedCount": 1,
  "updatedCount": 0,
  "failedCount": 0,
  "skippedCount": 0,
  "rowResults": [
    { "line": 2, "sku": "SKU1", "status": "added", "detail": "item create + stock in" }
  ]
}
```

---

## 4. Service API

```typescript
InventoryImportUploadService.uploadCsv(
  file: InventoryCsvUploadFile | undefined,
  dto: ImportInventoryCsvDto,
): Promise<InventoryImportSummary>
```

Steps:

1. `assertCsvFile` — required buffer, 2 MB cap, `.csv` extension, reject xlsx/pdf/images
2. UTF-8 decode → `parseInventoryCsvText`
3. `batch_id ?? Date.now()-based id`
4. `importService.processImport(factory_id, created_by, rows, batchId)`

---

## 5. Multer Configuration

```typescript
FileInterceptor('file', { limits: { fileSize: INVENTORY_CSV_MAX_BYTES } })
```

Matches parser byte limit constant from `inventory-csv.constants.ts`.

---

## 6. Integration Test Scenarios

| # | Scenario | Assertion |
|---|----------|-----------|
| 1 | Valid CSV upload | 200, `addedCount`, item in DB |
| 2 | `.xlsx` extension | 400 |
| 3 | Bad headers | 400 |
| 4 | Mixed success (missing category row) | 200, partial counts |

Requires Postgres (same harness as Phase 0 / 1.2 integration tests).
