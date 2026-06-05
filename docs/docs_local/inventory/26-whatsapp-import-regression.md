# Phase 1.4 — WhatsApp Import Regression Report

**Run date:** 2026-06-06  
**Change scope:** WhatsApp orchestration only (`InventoryBulkImportService` + document routing)

---

## Phase Verification

| Phase | Unchanged logic? | Regression tests |
|-------|------------------|------------------|
| **0** Task inventory | **YES** | **12 / 12 PASS** |
| **1.1** CSV parser | **YES** (file untouched) | **8 / 8 PASS** |
| **1.2** Import core | **YES** (`inventory-import.service.ts` untouched) | **7 / 7 PASS** |
| **1.3** REST upload | **YES** (controller/upload service untouched) | **4 / 4 PASS** |

---

## Forbidden Areas

| Component | Modified? |
|-----------|-----------|
| `InventoryTransactionService` | **No** |
| `InventoryRepository` movement logic | **No** |
| `InventoryImportService` | **No** |
| `parseInventoryCsvText()` | **No** |
| `InventoryImportUploadService` | **No** |
| Task inventory integration | **No** |
| Phase 0 integration assertions | **No** |

---

## Allowed Changes

| File | Change |
|------|--------|
| `inventory-bulk-import.service.ts` | **New** — orchestration only |
| `whatsapp.service.ts` | Document routing + command |
| `whatsapp.module.ts` | Provider registration |
| `whatsapp.constants.ts` | New command constant |
| `owner-home.service.ts` | Pending mutual exclusion |

---

## Behavioral Checks

| Case | Expected | Verified |
|------|----------|----------|
| REST `POST /inventory/import/csv` | Unchanged | Integration **PASS** |
| Import upsert + ledger | Unchanged | Integration **PASS** |
| Parser validation | Unchanged | Unit **PASS** |
| Task completion STOCK_OUT | Unchanged | Phase 0 **PASS** |
| Team CSV flow | Still works when team pending | Code path preserved |

---

## Integration Evidence

```text
yarn test:integration
Test Suites: 4 passed, 4 total
Tests:       28 passed, 28 total
Exit code:   0
```

---

## Verdict

**No Phase 0 or Phase 1.1–1.3 regression detected.** Phase 1.4 adds WhatsApp orchestration that delegates to the existing upload → parse → import pipeline.

**Phase 1.4 (WhatsApp CSV import) is complete.**
