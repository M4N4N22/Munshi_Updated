# Phase 1.1 — CSV Parser Analysis

**Run date:** 2026-06-06  
**Scope:** Validation engine design (parser only — no import processing)

---

## 1. Existing Team CSV Parser Review

### Architecture (`team-csv.parse.ts`)

| Mechanism | Behavior |
|-----------|----------|
| BOM strip | `\uFEFF` removed from start |
| Line split | `\r?\n`, empty lines skipped in body |
| `parseCsvLine` | RFC-style quoted fields, escaped `""` |
| `normalizeHeader` | lowercase, spaces → `_` |
| Header gate | All `TEAM_CSV_HEADERS` must be present |
| Row gate | At least one data row |
| Output | Raw string cells — **no field validation in parser** |

Team import validates per-row in `TeamBulkImportService.importOneRow()`.

### Phase 1.1 difference

Inventory parser validates **inside** `parseInventoryCsvText()` so downstream import receives only normalized, validated `InventoryCsvRow[]` or a single clear error. This matches the roadmap decision to keep import processing thin.

### Reuse

- Copied `parseCsvLine` and `normalizeHeader` verbatim (isolated module — no shared export to avoid coupling)
- Error message style: Hinglish + English technical detail (same tone as team CSV)
- Limits pattern: `MAX_ROWS`, `MAX_BYTES` from `team-csv.constants.ts`

---

## 2. Parser Design

### Module layout

```text
inventory-csv.constants.ts   → headers, limits, sample template string
inventory-csv.parse.ts         → parseInventoryCsvText(), InventoryCsvRow
inventory-csv.parse.spec.ts    → unit tests
```

### Parse pipeline

```text
raw string
  → byte size check (2 MB)
  → BOM strip + trim
  → header validation (6 required)
  → row extraction (optional reorder_threshold column)
  → row count cap (200)
  → per-row validation + duplicate SKU scan
  → { ok: true, rows } | { ok: false, error }
```

### Output type `InventoryCsvRow`

| Field | Post-validation form |
|-------|---------------------|
| `sku` | Uppercase via `normalizeSku()` |
| `name` | Trimmed via `normalizeInventoryName()` |
| `category` | Trimmed via `normalizeInventoryName(..., 'Category')` |
| `location` | Trimmed via `normalizeInventoryName(..., 'Location')` |
| `unit` | Trimmed via `normalizeUnit()` |
| `quantity` | `formatQuantity()` string (4 decimal places) |
| `reorder_threshold` | `formatQuantity()` or `null` |

---

## 3. Validation Design

### Helpers reused (from `inventory.validation.ts`)

| Field | Helper |
|-------|--------|
| SKU | `normalizeSku()` |
| Name | `normalizeInventoryName()` |
| Category | `normalizeInventoryName(..., 'Category')` |
| Location | `normalizeInventoryName(..., 'Location')` |
| Unit | `normalizeUnit()` |
| Reorder threshold | `parseNonNegativeThreshold()` + `formatQuantity()` |

### Local helper (parser-only)

| Field | Rule |
|-------|------|
| Quantity | `parseNonNegativeQuantity()` — finite, **≥ 0** (0 allowed for metadata-only rows) |

**Note:** `parsePositiveQuantity()` was **not** used because import may accept qty=0 for upsert-metadata-only rows per Phase 1 analysis.

### Error format

- File-level: single `error` string (empty file, bad headers, too many rows)
- Row-level: `Line N: <message from BadRequestException or duplicate rule>`

---

## 4. Risks

| Risk | Mitigation in 1.1 |
|------|-----------------|
| R-D02 duplicate SKU in file | Normalized SKU map; second row fails with first line ref |
| Divergence from team parser | Same CSV mechanics; documented copy |
| Category/location not in DB | Parser only validates non-empty names — DB lookup deferred to Phase 1.3 |
| Quantity overwrite semantics | Parser outputs validated qty string; import service must use STOCK_IN only (Phase 1.3) |

### Out of scope (this phase)

- Database access
- `InventoryService` / repository / transaction changes
- REST, WhatsApp, template download

---

## References

- `21-csv-import-analysis.md` — upsert strategy
- `21-csv-import-mapping.md` — validation workflow
- `team-csv.parse.ts` — reference implementation
