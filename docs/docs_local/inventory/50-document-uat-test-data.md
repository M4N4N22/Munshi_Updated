# Document UAT — Test Data

**Run date:** 2026-06-06  
**Location:** `docs/docs_local/inventory/uat-documents/`

---

## Important Scope Note

**OCR is not implemented.** Test documents are **structured tabular CSV** files — the format the ML parser (`POST /parse`) actually supports. This matches implementation reality, not scanned invoices.

---

## Document Test Files

| ID | File | Purpose | Rows |
|----|------|---------|------|
| A | `doc-a-clean-supplier-inventory.csv` | Clean supplier inventory | 12 |
| B | `doc-b-duplicate-items.csv` | Repeated SKUs in same file | 5 |
| C | `doc-c-missing-quantity.csv` | Rows without quantity column values | 5 |
| D | `doc-d-missing-sku.csv` | Rows without SKU column | 5 |
| E | `doc-e-large-inventory.csv` | Large import stress | 25 |
| F | `doc-f-mixed-units.csv` | Mixed units (bags, kg, meter, litre, pcs) | 7 |

---

## CSV Baseline Files

| File | Purpose |
|------|---------|
| `baseline-a-clean.csv` | Munshi template-format equivalent of Document A (with category, location, reorder_threshold) |
| `baseline-b-duplicate.csv` | Partial baseline for duplicate scenario |

---

## Failure Test Files

| File | Purpose |
|------|---------|
| `fail-empty.csv` | Empty file |
| `fail-corrupt.csv` | Invalid CSV content |
| `fail-unsupported.pdf` | Non-tabular PDF |

---

## Document A — Clean Supplier Inventory

**Columns:** `name, sku, quantity, unit, category`

Sample rows:

| name | sku | quantity | unit |
|------|-----|----------|------|
| Cement 50kg Bag | CEM-001 | 120 | bags |
| Steel Rod 12mm | STL-012 | 450 | kg |
| PVC Pipe 2 inch | PVC-002 | 85 | meter |
| … | … | … | … |

Full file: `doc-a-clean-supplier-inventory.csv` (12 items)

---

## Document B — Duplicate Items

Same SKUs appear twice with different quantities:

- CEM-001: 50 + 30  
- STL-012: 100 + 50  
- PVC-002: 20 (once)

---

## Document C — Missing Quantity

All rows have name, sku, unit — **no quantity values**.

---

## Document D — Missing SKU

All rows have name, quantity, unit — **no SKU column**.

---

## Document E — Large Inventory

25 industrial consumables, tools, safety items.

---

## Document F — Mixed Units

Units used: `bags`, `kg`, `meter`, `litre`, `pcs`

---

## Baseline A — CSV Import Format

Uses Munshi inventory template columns:

```
sku,name,category,location,unit,quantity,reorder_threshold
```

Requires pre-created category **Raw Materials** and location **Main Warehouse** (created in UAT setup before import).

---

## Execution Artifacts

| File | Description |
|------|-------------|
| `uat-execution-results.json` | Machine-readable results from live UAT run |
| `run-doc-uat-v2.mjs` | Execution script (testing only, not production code) |

---

## Realistic Inventory Items Used

Cement, Steel Rod, PVC Pipe, Paint, Electrical Wire, Fasteners (Bolts/Nuts), Safety Gloves, Industrial Consumables (Cutting Oil, Welding Rod, Tape), Tools (Grinder Disc), and extended items in Document E.
