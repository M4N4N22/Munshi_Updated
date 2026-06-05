# Phase 2.1 — Integration Foundation Regression

**Run date:** 2026-06-04  
**Purpose:** Confirm Phase 0 and Phase 1 behavior unchanged after Phase 2.1

---

## Method

1. Git diff on forbidden files — no modifications.
2. Full integration test suite re-run with Phase 2.1 migration applied.
3. Phase 1 parser/template unit tests re-run.

---

## Forbidden File Diff

The following files were **not modified** in Phase 2.1:

| File | Status |
|------|--------|
| `backend/src/services/inventory/inventory-transaction.service.ts` | **UNCHANGED** |
| `backend/src/services/inventory/inventory-import.service.ts` | **UNCHANGED** |
| `backend/src/modules/whatsapp/inventory-bulk-import.service.ts` | **UNCHANGED** |
| `backend/src/services/inventory/inventory.repository.ts` | **UNCHANGED** |
| Task inventory helpers / Phase 0 logic | **UNCHANGED** |

---

## Phase 0 — Task Inventory Integration

**Suite:** `task-inventory-phase0.integration.spec.ts`

| Area | Tests | Result |
|------|-------|--------|
| Phase 0.1 foundation (table, model, lines) | — | **PASS** |
| Phase 0.2 stock movements on task complete | — | **PASS** |
| Ledger reference_type = TASK | — | **PASS** |
| Factory isolation | — | **PASS** |

**Total:** 12/12 PASS — **UNCHANGED**

---

## Phase 1.1 — CSV Parser & Template

**Suites:** `inventory-csv.parse.spec.ts`, `inventory-csv.template.spec.ts`

| Check | Result |
|-------|--------|
| Header validation | **PASS** |
| Row parsing / normalization | **PASS** |
| Static template contract | **PASS** |

**Total:** 11/11 PASS — **UNCHANGED**

---

## Phase 1.2 — CSV Import Core

**Suite:** `inventory-csv-import.integration.spec.ts`

| Check | Result |
|-------|--------|
| R-D01: stock via `recordStockIn(CSV_IMPORT)` | **PASS** |
| SKU normalization | **PASS** |
| Category/location resolution | **PASS** |
| Partial failure handling | **PASS** |

**Total:** 7/7 PASS — **UNCHANGED**

---

## Phase 1.3 — REST CSV Upload

**Suite:** `inventory-csv-upload.integration.spec.ts`

| Check | Result |
|-------|--------|
| `POST /inventory/import/csv` | **PASS** |
| Auth / factory scoping | **PASS** |
| Import summary response | **PASS** |

**Total:** 4/4 PASS — **UNCHANGED**

---

## Phase 1.4 — WhatsApp CSV Import

**Suite:** `inventory-csv-whatsapp.integration.spec.ts`

| Check | Result |
|-------|--------|
| Document routing to bulk import | **PASS** |
| Owner auto-import path | **PASS** |
| Summary message format | **PASS** |

**Total:** 5/5 PASS — **UNCHANGED**

---

## Phase 2.1 Additive Surface

Only additive inventory change:

```typescript
INVENTORY_REFERENCE_TYPE.ZOHO_PULL
INVENTORY_REFERENCE_TYPE.ZOHO_PUSH
```

No import or movement code references these constants yet.

New code isolated under `backend/src/services/integrations/` and migration `011_*`.

---

## Summary

| Phase | Prior count | Result |
|-------|-------------|--------|
| Phase 0 | 12/12 | **PASS — unchanged** |
| Phase 1.1 | 11/11 | **PASS — unchanged** |
| Phase 1.2 | 7/7 | **PASS — unchanged** |
| Phase 1.3 | 4/4 | **PASS — unchanged** |
| Phase 1.4 | 5/5 | **PASS — unchanged** |
| **Regression total** | **39/39** | **PASS** |

---

## Verdict

**Phase 0 and Phase 1 remain fully green.** Phase 2.1 is isolated to new integration persistence with no behavioral impact on existing inventory flows.
