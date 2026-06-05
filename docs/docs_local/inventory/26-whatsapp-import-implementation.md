# Phase 1.4 — WhatsApp Import Implementation

**Run date:** 2026-06-06

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/modules/whatsapp/inventory-bulk-import.service.ts` | WhatsApp orchestration, pending state, summary formatting, audit logs |
| `backend/src/modules/whatsapp/inventory-bulk-import.service.spec.ts` | 6 unit tests |
| `backend/test/integration/inventory-csv-whatsapp.integration.spec.ts` | 5 integration scenarios |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `whatsapp.service.ts` | Document routing, `/inventory_import_csv`, cancel + awaiting reminders |
| `whatsapp.module.ts` | Register `InventoryBulkImportService` |
| `whatsapp.constants.ts` | `INVENTORY_IMPORT_CSV` command |
| `owner-home.service.ts` | Cancel inventory pending when team bulk CSV starts |
| `inventory-csv.constants.ts` | `INVENTORY_CSV_PENDING_TTL_MS` |

### Not modified

- `InventoryImportService`, `InventoryTransactionService`, `InventoryRepository` movement logic
- `parseInventoryCsvText()`, `InventoryImportUploadService` internals
- Phase 0 task inventory integration

---

## 3. Message Flow

```text
Owner sends CSV document (or /inventory_import_csv then CSV)
  → handleIncomingDocument
  → downloadMedia (OlliMediaService)
  → InventoryBulkImportService.importFromCsvBuffer
  → InventoryImportUploadService.uploadCsv
  → sendTextMessage(summary)
```

**Entry points:**

| Trigger | Path |
|---------|------|
| `/inventory_import_csv` | Sets pending → user attaches CSV |
| Direct CSV from owner/manager | Auto-import without pending |
| Inventory pending + document | Import via pending context |

---

## 4. Validation Rules

| Rule | Where |
|------|-------|
| Extension `.csv` only | Bulk service + upload service |
| Reject xlsx, xls, pdf, images, video mime | Pre-download + post-download |
| Max 2 MB | Bulk service buffer check + upload service |
| Parser rules | Unchanged `parseInventoryCsvText()` |
| Import rules | Unchanged `processImport()` |

---

## 5. Response Formats

### Success (no failures)

```text
✅ Inventory import complete.

Added: 12
Updated: 5
Failed: 0
Skipped: 0

Batch imported successfully.
```

### Partial success

```text
⚠️ Inventory import complete.

Added: 10
Updated: 3
Failed: 2
Skipped: 0

Kuch rows import nahi ho paayi.
• Line 12 (SKU): Category "X" nahi mila
```

### Parser failure

```text
❌ CSV file invalid hai.

Reason:
Galat CSV format. Ye columns chahiye: ...
```

### Unsupported file

```text
❌ Sirf CSV inventory files supported hain.
```
