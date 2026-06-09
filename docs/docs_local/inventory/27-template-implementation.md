# Phase 1.4A — Static Template Implementation

**Run date:** 2026-06-06

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `web/public/inventory-import/munshi-inventory-template.csv` | Static downloadable template (3 sample rows) |
| `backend/src/modules/whatsapp/inventory-csv.template.spec.ts` | Template existence + parser compatibility tests |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `backend/src/modules/whatsapp/inventory-csv.constants.ts` | Public template path + default URL constants |
| `backend/.env.example` | `MUNSHI_WEB_URL` uncommented; inventory template URL documented |
| `.env.example` (repo root) | Inventory template URL comment |
| `web/README.md` | Inventory CSV template section |

### Not modified

- `InventoryImportService`, `InventoryImportUploadService`, `InventoryBulkImportService`
- `InventoryTransactionService`, `InventoryRepository`
- WhatsApp import orchestration, REST upload, parser logic

---

## 3. Template Contents

```csv
sku,name,category,location,unit,quantity,reorder_threshold
CEMENT_50KG,Cement 50kg Bag,Building Materials,Main Warehouse,bag,100,10
SHIRT_MED,Medium Cotton Shirt,Apparel,Store Front,pcs,25,5
BOLT_M10,M10 Hex Bolt,Fasteners,Assembly Line,pcs,500,100
```

| Row | Industry | Validates |
|-----|----------|-----------|
| 1 | Construction | SKU normalize, threshold present |
| 2 | Retail | Mid qty, threshold present |
| 3 | Manufacturing | High qty, threshold present |

---

## 4. URL Structure

| Component | Value |
|-----------|--------|
| Static path | `/inventory-import/munshi-inventory-template.csv` |
| Web file | `web/public/inventory-import/munshi-inventory-template.csv` |
| Default host | `https://www.munshidada.com` |
| Full default URL | `https://www.munshidada.com/inventory-import/munshi-inventory-template.csv` |
| Override env | `MUNSHI_INVENTORY_CSV_TEMPLATE_URL` (documented, optional) |
| Base env | `MUNSHI_WEB_URL` |

**`.env.example` documentation:**

```text
MUNSHI_WEB_URL=https://www.munshidada.com
# Default: ${MUNSHI_WEB_URL}/inventory-import/munshi-inventory-template.csv
# MUNSHI_INVENTORY_CSV_TEMPLATE_URL=
```
