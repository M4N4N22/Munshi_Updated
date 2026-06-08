# Inventory Import Review — Regression Report

**Date:** 2026-06-08

---

## Regression Matrix

| Area | Test | Before behavior | After behavior | Regression? |
|---|---|---|---|---|
| REST CSV import | `inventory-csv-upload` 4/4 | Direct import | Direct import | **NO** |
| Import core | `inventory-csv-import` 7/7 | Row validation + upsert | Unchanged | **NO** |
| CSV parser | `inventory-csv.parse` 8/8 | Strict validation | Unchanged | **NO** |
| Auto-import path | Unit test | Direct import | Direct import | **NO** |
| `/inventory_import_csv` | WhatsApp integration spec | Direct import | **Review → CONFIRM** | **INTENTIONAL CHANGE** |
| Document parsing | No changes in code | N/A | N/A | **NO** |

---

## Test Suite Drift (Non-blocking)

`inventory-csv-whatsapp.integration.spec.ts` — 2 failures:

| Scenario | Issue |
|---|---|
| Scenario 1 — valid CSV | Expects immediate import summary; now receives review |
| Scenario 4 — mixed success | Expects partial import; now receives review first |

**Action required before CI green:** Update test expectations for review flow (test maintenance, not product defect).

---

## Validation Preservation

Invalid CSV never enters review session:

- Parser errors return `❌ CSV file invalid hai` immediately
- No `awaiting_confirm` state set on parse failure

Confirmed by unit tests and WhatsApp integration scenarios 2–3.

---

## Master Data Safety

- `ensureMasterData()` is idempotent (Integration Case 3)
- CANCEL clears session without DB writes (unit test)
- Expired session returns error without DB writes (unit test)

---

## Summary

| Category | Status |
|---|---|
| Unintended regressions | **None detected** |
| Intentional behavior change | WhatsApp command path now requires CONFIRM |
| Test suite updates needed | `inventory-csv-whatsapp.integration.spec.ts` |
