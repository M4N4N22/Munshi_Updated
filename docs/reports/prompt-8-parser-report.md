# Prompt 8 — Parser Adapter Report

**Date:** 2026-05-29  
**Scope:** LLM parser architecture (CSV/XLSX/text only)

---

## SECTION A — Backend Implementation

### Parser adapter (backend side)

| File | Role |
|------|------|
| `parser/parser-adapter.interface.ts` | `IParserAdapter` contract |
| `parser/ml-parser.adapter.ts` | HTTP client to LLM `POST /parse` |

Backend does **not** parse files locally in this phase — delegates to ML service.

---

## SECTION B — LLM Requirements

### Architecture

```
parsers/
├── base.py              # DocumentParserAdapter ABC
├── common.py            # CSV/XLSX/tabular helpers
├── inventory_import_parser.py
├── stock_register_parser.py
└── router.py            # ParserRouter
```

### Endpoint

`POST /parse`

```json
{
  "factory_id": 1,
  "file_name": "inventory.csv",
  "mime_type": "text/csv",
  "document_type": "INVENTORY_IMPORT",
  "content_base64": "..."
}
```

Response: `ParseResponse` (`document_type`, `payload`, `warnings?`).

### Supported formats

- CSV (comma or tab)
- XLSX (via `openpyxl` / pandas)
- Structured text fallback

**Not supported:** OCR, PDF, images, vision models.

### Column aliases

| Field | Accepted headers |
|-------|------------------|
| name | name, item, item_name, product, material |
| quantity | quantity, qty, stock, balance, closing |
| sku | sku, code, item_code |
| unit | unit, uom |
| category | category_name, category |
| location | location_name, location, warehouse |

---

## SECTION C — Contract Requirements

| Document type | Schema | Parser |
|---------------|--------|--------|
| `INVENTORY_IMPORT` | `inventory-import-extraction.json` | `InventoryImportParser` |
| `STOCK_REGISTER` | `stock-register-extraction.json` | `StockRegisterParser` |

Output must include `document_type` const and non-empty `items[]`.

---

## SECTION D — Training Data Requirements

- Real factory export samples (anonymized) for column mapping tuning.
- Hindi/English mixed headers.
- Stock register files with `as_of_date` in column or filename.

---

## SECTION E — Future Automation Opportunities

- `PurchaseInvoiceParser`, `LedgerExportParser` plug into same router.
- Header detection LLM assist (optional) while keeping deterministic CSV path.
- Parser confidence scores in `warnings` array.

---

## Tests

LLM: `tests/test_inventory_import_parser.py`, `tests/test_stock_register_parser.py` (4 passing)
