# Inventory CSV test samples

Use these during **onboarding step 2** or WhatsApp `/inventory_import_csv` to mimic real client uploads.

Download locally: `http://localhost:3000/inventory-import/test-samples/<filename>`

Production: `https://www.munshidada.com/inventory-import/test-samples/<filename>`

## Recommended test order

| File | Scenario | Expected |
|------|----------|----------|
| `05-quick-smoke-3-items.csv` | Fast sanity check (3 rows) | ✅ Added: 3 |
| `01-sharma-mithai-canonical.csv` | Sweet shop — exact Munshi template | ✅ Added: 8, categories/locations auto-created |
| `02-hardware-trader-aliases.csv` | English ERP export (`item_code`, `qty`, `godown`) | ✅ Alias map works |
| `03-hinglish-column-names.csv` | Hinglish headers (`maal`, `shreni`, `matra`) | ✅ Alias map works |
| `04-excel-export-with-extra-columns.csv` | Extra supplier/HSN columns | ✅ Extra cols ignored |
| `06-stock-on-hand-export.csv` | `stock_on_hand`, `reorder_point` aliases | ✅ Alias map works |
| `07-should-fail-missing-qty.csv` | Negative test — no quantity column | ❌ Error: Missing: quantity |

## Re-import note

Uploading the same SKUs again **updates** stock via STOCK_IN (adds quantity), it does not replace totals. Use a fresh factory or change SKUs for a clean count.

## Canonical columns (reference)

```
sku,name,category,location,unit,quantity,reorder_threshold
```

Common aliases also accepted: `item_code`, `product_name`, `qty`, `godown`, `uom`, `maal`, `shreni`, `matra`, `stock_on_hand`, `min_stock`.
