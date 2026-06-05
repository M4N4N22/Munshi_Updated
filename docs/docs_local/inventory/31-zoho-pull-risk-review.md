# Phase 2.3 — Zoho Pull Sync Risk Review

**Run date:** 2026-06-04

---

## R-Z06 — Quantity Overwrite from Zoho Pull

| Field | Value |
|-------|-------|
| **Risk** | Zoho `available_stock` directly sets Munshi on-hand quantity |
| **Severity** | **High** (blocker if unmitigated) |
| **Mitigation** | |
| New items | Created with `current_quantity = 0`; stock via `recordStockIn(ZOHO_PULL)` only |
| Existing mapped items | Metadata update only — no quantity field in update patch |
| Re-sync with higher Zoho qty | Quantity unchanged (test: Zoho 50, Munshi stays 7) |
| Direct SQL/DTO overwrite | None in pull sync code path |

**Test evidence:** `zoho-pull-sync.integration.spec.ts` — "uses ledger only for quantity"

**Status:** **MITIGATED**

---

## R-Z07 — SKU Mismatch / Mapping Conflicts

| Field | Value |
|-------|-------|
| **Risk** | Zoho SKU collides with existing Munshi SKU or mapping drift |
| **Severity** | Medium |
| **Mitigation** | |
| Primary join | Zoho `item_id` → `external_id` (not SKU alone) |
| SKU normalization | `normalizeSku()` on ingest |
| Create conflict | DB unique constraint → item fails, sync continues |
| Mapping status | `sync_status = ok` on success |

**Status:** **MITIGATED** (strict fail v1; merge policy deferred)

---

## R-D01 — CSV Import Discipline Preserved

| Field | Value |
|-------|-------|
| **Requirement** | All quantity changes via ledger reference types |
| **Implementation** | Mirrors `InventoryImportService.recordCsvStockIn` pattern |
| **Reference type** | `INVENTORY_REFERENCE_TYPE.ZOHO_PULL` |
| **Reference id** | `syncRunId` |

**Status:** **PRESERVED**

---

## Residual Risks

| ID | Risk | Severity | Notes |
|----|------|----------|-------|
| SR-P23-01 | Re-pull does not sync quantity deltas for mapped items | Low | By design (Case B metadata only); future policy may add additive pull |
| SR-P23-02 | Single-warehouse Zoho → one Munshi location name match | Medium | Multi-warehouse mapping deferred |
| SR-P23-03 | Large catalog pull timeout | Medium | Pagination exists; batch checkpoint in 2.4 |
| SR-P23-04 | Zoho API field name variance | Low | `normalizeItem()` handles multiple field aliases |
| SR-P23-05 | WhatsApp notify not wired | Low | Formatter ready; wiring optional in later phase |

---

## Inventory Service Boundary Review

| Service | Modified? | Used? |
|---------|-----------|-------|
| `InventoryTransactionService` | **No** | Yes — `recordStockIn()` public method |
| `InventoryImportService` | **No** | No |
| `InventoryRepository` | **No** | Yes — via `InventoryModule` export |
| `IntegrationRepository` | Extended | Yes — mappings + sync runs |

---

## Overall Assessment

**R-Z06, R-Z07, and R-D01 requirements satisfied** for Phase 2.3 manual pull sync.

Approved to proceed to **Phase 2.4 Scheduled Sync**.
