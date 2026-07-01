# Fix B — Auto-Import Removal

## Before

`handleIncomingDocument()` in `whatsapp.service.ts` called `canAutoImport(from)` for owner/manager phones. This invoked `importFromCsvBuffer()` **without** an active import session, skipping review and importing immediately.

## After

1. Removed `canAutoImport()` method from `InventoryBulkImportService`
2. `importFromCsvBuffer()` requires an active `awaiting_upload` session; otherwise returns `WA_INVENTORY_CSV_NO_SESSION`
3. `whatsapp.service.ts` sends guidance when a CSV document arrives without session:

```
I detected an inventory CSV.

Please send:
/inventory_import_csv

before uploading inventory.
```

## Unaffected Paths

- REST CSV import (`inventory.controller.ts` → `uploadCsv`) unchanged
- Review flow: `/inventory_import_csv` → upload → review → CONFIRM unchanged
- Team bulk CSV import unchanged

## Test Coverage

- `inventory-bulk-import.service.spec.ts` — `rejects CSV upload without active import session`
