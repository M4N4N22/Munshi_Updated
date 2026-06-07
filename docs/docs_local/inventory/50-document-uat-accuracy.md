# Document UAT — Parsing Accuracy

**Run date:** 2026-06-06  
**Parser:** ML `InventoryImportParser` (tabular CSV)

---

## Summary

| Metric | Value |
|--------|-------|
| **Average row extraction accuracy** | **100%** (all named rows parsed) |
| **Average inventory creation accuracy (clean docs)** | **100%** (A, C, D, E, F) |
| **Duplicate document inventory accuracy** | **40%** (2/5 rows → 2 items; PVC lost) |
| **Quantity field accuracy (when present)** | **100%** |
| **Unit field accuracy** | **100%** |
| **SKU field accuracy (when present)** | **100%** |

---

## Per-Document Accuracy

| Doc | Rows expected | Rows parsed | Parse accuracy | Items expected (business) | Items created | Create accuracy |
|-----|---------------|-------------|----------------|---------------------------|---------------|-----------------|
| A | 12 | 12 | **100%** | 12 | 12 | **100%** |
| B | 5 | 5 | **100%** | 3 unique SKUs | 2 | **67%** |
| C | 5 | 5 | **100%** | 5 (zero stock OK) | 5 | **100%** |
| D | 5 | 5 | **100%** | 5 | 5 | **100%** |
| E | 25 | 25 | **100%** | 25 | 25 | **100%** |
| F | 7 | 7 | **100%** | 7 | 7 | **100%** |

**Parse accuracy formula:** `parsed_rows / csv_data_rows × 100`

**Create accuracy formula:** `inventory_items_created / expected_unique_items × 100`

---

## Document A — Clean Supplier

| Field | Accuracy | Notes |
|-------|----------|-------|
| Item names | 100% | All 12 matched |
| SKU | 100% | |
| Quantity | 100% | e.g. CEM-001 = 120 |
| Unit | 100% | bags, kg, meter, litre, pcs |
| Category (parsed) | 100% | Captured in extraction; not applied to inventory on approve |

**vs CSV baseline:** Quantities identical. CSV adds reorder_threshold; document path does not.

---

## Document B — Duplicates

| Row | SKU | Qty in file | In inventory | Issue |
|-----|-----|-------------|--------------|-------|
| 1 | CEM-001 | 50 | 50 | First wins |
| 2 | STL-012 | 100 | 100 | First wins |
| 3 | CEM-001 | 30 | — | **Not merged** |
| 4 | PVC-002 | 20 | — | **Missing entirely** |
| 5 | STL-012 | 50 | — | **Not merged** |

**Business impact:** Owner would under-count stock vs supplier sheet; PVC line silently dropped.

---

## Document C — Missing Quantity

| Field | Result |
|-------|--------|
| Items extracted | 5/5 |
| Quantity in extraction | `null` |
| Inventory after approve | 5 items at **0.0000** |

**Acceptable** for “catalog only” import; business must add stock separately.

---

## Document D — Missing SKU

| Item | Derived SKU | Qty |
|------|-------------|-----|
| Cement 50kg Bag | CEMENT507146 | 120 |
| Steel Rod 12mm | STEELROD7164 | 450 |
| … | name-based hash | correct |

**SKU accuracy:** N/A (generated); quantities **100%** correct.

---

## Document E — Large (25 items)

| Metric | Result |
|--------|--------|
| Parse | 25/25 |
| Inventory | 25/25 |
| Units mixed | pcs, kg, litre, meter — all preserved |

---

## Document F — Mixed Units

| Unit | Items | Correct |
|------|-------|---------|
| bags | 1 | Yes |
| kg | 1 | Yes |
| meter | 2 | Yes |
| litre | 2 | Yes |
| pcs | 1 | Yes |

---

## Failure Cases

| Case | Parser behaviour | Quality |
|------|------------------|---------|
| Empty file | 422 — no items | **Good** |
| Corrupt CSV | 422 | **Good** |
| PDF | Upload stores; parse not completed | **Weak** — upload should reject earlier |

---

## Parsing Accuracy Summary

**Structured CSV inventory documents:** **Excellent** (100% row extraction).

**Inventory creation fidelity:** **Excellent** except **duplicate rows in single INITIAL_INVENTORY_IMPORT** (Document B).

**Not tested (not implemented):** OCR, invoice photos, handwritten sheets, PDF tables.

---

## Comparison: CSV Import vs Document Parse (Doc A)

| Dimension | CSV | Document |
|-----------|-----|----------|
| Item count match | 12 | 12 |
| Quantity match | Yes | Yes |
| Reorder threshold | Yes | No |
| Category/location from file | Yes | No (defaults) |
| Approval step | No | Yes (required) |

**Recommendation for business:** Use CSV import when file is already structured; use document path when suggestion review adds value — not yet true for identical CSV content.
