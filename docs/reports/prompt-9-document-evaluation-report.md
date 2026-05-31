# Prompt 9 — Document Evaluation Report

**Date:** 2026-05-31  
**Scope:** Document parsing fixtures and quality evaluation

---

## SECTION A — Backend Implementation

- Backend validates extractions via `ContractValidationService` (unchanged architecture).
- E2E scenario mocks: `src/services/documents/document-ingestion-scenarios.spec.ts` (10 document scenarios + 2 intent scenarios in fixture file).
- Fixtures copied to `test/fixtures/e2e-scenarios.json` for backend CI.

---

## SECTION B — LLM Requirements

### Fixture corpora

| Type | Fixtures | Location |
|------|----------|----------|
| INVENTORY_IMPORT | 22 | `data/eval/documents/inventory_import/` |
| STOCK_REGISTER | 22 | `data/eval/documents/stock_register/` |

Includes: alias headers, Hindi/Hinglish columns, optional fields, invalid files, edge cases.

Generator: `scripts/generate_document_fixtures.py`

### Evaluation harness

- `eval/document_quality_eval.py`
- Metrics: schema compliance, field extraction accuracy, parser pass rate, failure rate, contract compliance, latency.
- Report: `eval/reports/document_quality_eval.json`
- Run: `python -m eval.document_quality_eval --write-report`

### Parser hardening

- Extended column aliases in `parsers/common.py` (`samagri`, `matra`, `maal`, `tareekh`, etc.).
- Tab-separated CSV detection.
- Stock register date column detection via shared `DATE_COLUMNS`.

---

## SECTION C — Contract Requirements

- Valid payloads must satisfy Pydantic models matching `contracts/schemas/*`.
- Invalid fixtures (`inv-021`, `inv-022`, `stk-021`, `stk-022`) must fail parse/validation.

---

## SECTION D — Training Data Requirements

| Corpus | Count | Purpose |
|--------|-------|---------|
| Inventory fixtures | 22 | Regression + edge cases |
| Stock fixtures | 22 | Regression + edge cases |
| Golden extractions | Future | Per-factory layout tuning |

Add real factory exports (anonymized) before production.

---

## SECTION E — Future Automation Opportunities

- CI gate on `overall_pass_rate >= 0.95`.
- Visual diff for extraction JSON on fixture changes.
- PDF/XLSX layout clustering for auto header mapping (future phase).

---

## Baseline metrics

| Metric | Value |
|--------|-------|
| Overall pass rate | **0.9773** |
| Inventory import parser pass rate | **1.0** |
| Stock register parser pass rate | **0.9545** |
| Mean parse latency | ~3–4 ms (local) |

**Assessment:** Parser layer is **near production-ready** for CSV/tabular inputs; one stock edge fixture may need tuning.
