# Phase 1.1 — CSV Parser Implementation

**Run date:** 2026-06-06

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `backend/src/modules/whatsapp/inventory-csv.constants.ts` | Headers, optional header, limits, sample CSV |
| `backend/src/modules/whatsapp/inventory-csv.parse.ts` | `parseInventoryCsvText()`, `InventoryCsvRow` |
| `backend/src/modules/whatsapp/inventory-csv.parse.spec.ts` | 8 unit tests |

---

## 2. Files Modified

**None.**

No changes to:

- `InventoryService`, `InventoryRepository`, `InventoryTransactionService`
- WhatsApp module wiring, owner home, controllers
- Integration test suite

---

## 3. Validation Rules

### Required CSV headers

`sku`, `name`, `category`, `location`, `unit`, `quantity`

### Optional header

`reorder_threshold` — column may be absent; empty cells → `null`

### Limits (`inventory-csv.constants.ts`)

| Constant | Value |
|----------|-------|
| `INVENTORY_CSV_MAX_ROWS` | 200 |
| `INVENTORY_CSV_MAX_BYTES` | 2 × 1024 × 1024 (2 MB) |

### Per-field rules

| Field | Validation |
|-------|------------|
| SKU | Required; `normalizeSku()` → uppercase, max 64 |
| Name | Required; `normalizeInventoryName()` |
| Category | Required; `normalizeInventoryName(..., 'Category')` |
| Location | Required; `normalizeInventoryName(..., 'Location')` |
| Unit | Required; `normalizeUnit()` |
| Quantity | Required; numeric; ≥ 0; stored as `formatQuantity()` |
| Reorder threshold | Optional; `parseNonNegativeThreshold()`; null if blank |

---

## 4. Duplicate Detection Logic

1. Maintain `Map<string, number>` keyed by **normalized SKU** (post-`normalizeSku()`).
2. On each row, after SKU normalization:
   - If SKU already in map → return error:
     ```text
     Line {current}: Duplicate SKU "{SKU}" (pehle line {first} par mila).
     ```
   - Else record `map.set(sku, lineNumber)`.
3. Case equivalence: `cement_50kg` and `CEMENT_50KG` collide after normalization.

Validation stops at **first** row-level error (fail-fast), consistent with team CSV structural errors.

---

## 5. Public API

```typescript
export function parseInventoryCsvText(raw: string): InventoryCsvParseResult;

export type InventoryCsvParseResult =
  | { ok: true; rows: InventoryCsvRow[] }
  | { ok: false; error: string };
```

Ready for Phase 1.3 `InventoryImportService.processRows()` — no DB writes in parser.

---

## 6. Sample template string

Exported as `INVENTORY_CSV_TEMPLATE_SAMPLE` in constants (for future web template / tests).

```csv
sku,name,category,location,unit,quantity,reorder_threshold
CEMENT_50KG,Cement 50kg,Building Materials,Main Warehouse,bag,100,10
STEEL_12MM,Steel 12mm,Building Materials,Main Warehouse,pcs,50,
```
