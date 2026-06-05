# Phase 1.4A — Static Template Analysis

**Run date:** 2026-06-06  
**Scope:** Parser requirements review + template design (no import logic changes)

---

## 1. Parser Requirements

Source: `inventory-csv.parse.ts`, `inventory-csv.constants.ts`, `inventory-csv.parse.spec.ts`

| Stage | Rule |
|-------|------|
| File size | ≤ 2 MB (`INVENTORY_CSV_MAX_BYTES`) |
| Row count | 1–200 data rows |
| BOM | UTF-8 BOM stripped |
| Header normalize | lowercase, spaces → `_` |
| SKU | `normalizeSku()` → uppercase, max 64, required |
| Name | `normalizeInventoryName()`, required |
| Category | `normalizeInventoryName(..., 'Category')`, required |
| Location | `normalizeInventoryName(..., 'Location')`, required |
| Unit | `normalizeUnit()`, required |
| Quantity | Non-negative number, `formatQuantity()` (4 decimals) |
| Reorder threshold | Optional; `parseNonNegativeThreshold()` or null |
| Duplicate SKU | Fail entire file on duplicate normalized SKU |

---

## 2. Header Requirements

### Required (exact names after header normalization)

| Header | Notes |
|--------|-------|
| `sku` | Upsert key |
| `name` | Item display name |
| `category` | Must match existing factory category name at import |
| `location` | Must match existing factory location name at import |
| `unit` | e.g. bag, pcs |
| `quantity` | Additive stock on import (0 allowed for metadata-only) |

### Optional

| Header | Notes |
|--------|-------|
| `reorder_threshold` | Column may be present; empty cell → null |

**Template header row (canonical):**

```text
sku,name,category,location,unit,quantity,reorder_threshold
```

Matches `INVENTORY_CSV_HEADERS` + `INVENTORY_CSV_OPTIONAL_HEADERS`.

---

## 3. Existing Import UX

| Surface | Template reference today | Notes |
|---------|-------------------------|-------|
| `/inventory_import_csv` (WhatsApp) | Lists column names only | Suitable for future URL — **not modified in 1.4A** |
| `handleIncomingDocument` | No template URL | Import orchestration unchanged |
| `POST /inventory/import/csv` | JSON summary only | REST unchanged |
| Owner home `HOME_ADD_STOCK` | Starts single-item workflow | Not bulk CSV |
| Team `HOME_BULK_CSV` | Has template CTA via `getTeamCsvTemplateDownloadUrl()` | Pattern to mirror later |
| `web/README.md` | **Updated in 1.4A** | Documents inventory template URL |
| `backend/.env.example` | **Updated in 1.4A** | Documents `MUNSHI_WEB_URL` + path |

**Discoverability decision:** Document URL in web README and `.env.example` (Part 3). No new UX flows or WhatsApp copy changes per Phase 1.4A scope (template + documentation only).

---

## 4. Template Design

| Row | Industry | SKU | Purpose |
|-----|----------|-----|---------|
| 1 | Construction | `CEMENT_50KG` | Bulk material, bag unit, reorder threshold |
| 2 | Retail | `SHIRT_MED` | Apparel SKU, moderate qty |
| 3 | Manufacturing | `BOLT_M10` | Fastener, high qty, reorder threshold |

All rows use realistic category/location names (resolved at import time against factory masters).

**File path:** `web/public/inventory-import/munshi-inventory-template.csv`

**Public URL pattern:**

```text
${MUNSHI_WEB_URL}/inventory-import/munshi-inventory-template.csv
```

Constants added: `INVENTORY_CSV_PUBLIC_TEMPLATE_PATH`, `INVENTORY_CSV_PUBLIC_TEMPLATE_URL` (mirrors team CSV pattern).
