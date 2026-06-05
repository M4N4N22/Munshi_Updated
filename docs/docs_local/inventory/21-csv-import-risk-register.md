# Phase 1.0 — CSV Import Risk Register

**Run date:** 2026-06-06  
**Scope:** Pre-implementation risks for Phase 1 CSV inventory import

---

## Risk summary matrix

| ID | Category | Severity | Likelihood | Phase 1 blocker? |
|----|----------|----------|------------|------------------|
| R-T01 | Technical | Medium | Medium | No |
| R-T02 | Technical | Low | High | No |
| R-T03 | Technical | Medium | Low | No |
| R-D01 | Data integrity | **High** | Medium | **Yes** if unmitigated |
| R-D02 | Data integrity | Medium | Medium | No |
| R-D03 | Data integrity | Medium | Low | No |
| R-P01 | Performance | Medium | Low | No |
| R-P02 | Performance | Low | Medium | No |
| R-U01 | UX | Medium | High | No |
| R-U02 | UX | Low | Medium | No |

---

## Technical risks

### R-T01 — Category/location resolution ambiguity

| Field | Value |
|-------|-------|
| **Description** | CSV provides free-text `category` and `location`. Multiple partial matches or typos cause row failures or wrong assignment. |
| **Impact** | Failed imports; items in wrong warehouse/category |
| **Mitigation** | Case-insensitive exact match first (`findCategoryByName` / `findLocationByName`); fail with line number + suggestion to use `/inventory_create` or admin API to seed masters; document required master data in template README |
| **Optional** | Phase 1.3+ auto-create category/location on import (flag) |

### R-T02 — WhatsApp document handler collision

| Field | Value |
|-------|-------|
| **Description** | `handleIncomingDocument` currently only checks team CSV pending state. Inventory CSV needs separate pending map or unified dispatcher. |
| **Impact** | Wrong import pipeline or "file received" generic message |
| **Mitigation** | Separate `InventoryBulkImportService.pendingByPhone`; check inventory pending before team pending; mutual exclusion in owner home (only one bulk flow active) |

### R-T03 — OLLI outbound failure after successful import (DEF-ACC-001 carry-forward)

| Field | Value |
|-------|-------|
| **Description** | From Phase 0 acceptance: empty `OLLI_KEY` causes HTTP 401 on summary send; import may succeed while user sees error. |
| **Impact** | Owner uncertainty whether import worked |
| **Mitigation** | Decouple import commit from send (team import already sends after processing); return summary in webhook handler try/catch; configure OLLI in prod; log batch_id for support lookup |

---

## Data integrity risks

### R-D01 — Quantity semantics on re-import (upsert)

| Field | Value |
|-------|-------|
| **Description** | If re-import **overwrites** `current_quantity` instead of additive `STOCK_IN`, ledger and on-hand diverge; task completion guards break trust. |
| **Impact** | **Critical** — stock levels wrong; insufficient-stock blocks misfire |
| **Mitigation** | **Mandatory:** never SET `current_quantity` from CSV; only `recordStockIn` for qty column; document "quantity = add stock" in template; integration test re-import adds ledger row |
| **Owner** | Phase 1.3 implementation |

### R-D02 — Duplicate SKU within single CSV

| Field | Value |
|-------|-------|
| **Description** | Two rows with same SKU (after normalize) could double-count stock if both processed. |
| **Impact** | Inflated inventory |
| **Mitigation** | Pre-scan dedupe in parser (1.2); fail all but first occurrence with line refs |

### R-D03 — Import during active task movements

| Field | Value |
|-------|-------|
| **Description** | Worker completes delivery while owner imports same SKU. |
| **Impact** | Race on `FOR UPDATE` row lock — one operation waits or fails |
| **Mitigation** | Per-row transactions already serialize on item row; acceptable for v1; failed row reported in summary |

---

## Performance risks

### R-P01 — Large CSV memory load

| Field | Value |
|-------|-------|
| **Description** | Loading entire file into memory as UTF-8 string. |
| **Impact** | OOM on very large files |
| **Mitigation** | Enforce `INVENTORY_CSV_MAX_BYTES = 2MB` and `MAX_ROWS = 200` (match team CSV); reject early |

### R-P02 — Sequential row processing latency

| Field | Value |
|-------|-------|
| **Description** | 200 rows × (lookup + create + stock-in) may exceed WhatsApp webhook timeout. |
| **Impact** | Timeout + retry → duplicate risk if idempotency missing |
| **Mitigation** | Batch id in reference_id; consider idempotent batch token in Phase 1.4; for v1 keep 200 row cap; log duration |

---

## User experience risks

### R-U01 — Excel users upload .xlsx

| Field | Value |
|-------|-------|
| **Description** | MSME owners often save Excel directly without CSV export. |
| **Impact** | High failure rate on first attempt |
| **Mitigation** | Hinglish error: *Excel? "Download as CSV" karein* (team pattern); template page with screenshots; defer native XLSX to ML document path |

### R-U02 — Template column mismatch

| Field | Value |
|-------|-------|
| **Description** | User renames headers or adds Hindi columns. |
| **Impact** | Parse failure |
| **Mitigation** | Strict header check with missing column list; provide single canonical template URL; optional Hindi header alias map in 1.2+ (ML parser already supports aliases for documents — not for Nest v1) |

---

## Recommended mitigations (priority order)

1. **R-D01** — Additive STOCK_IN only; never direct quantity write — **non-negotiable**
2. **R-D02** — Intra-file SKU dedupe in parser
3. **R-T02** — Separate inventory pending state from team CSV
4. **R-U01** — Clear file-type errors + web template
5. **R-T03** — OLLI config + graceful summary failure handling
6. **R-T01** — Master data setup guide in template header comments

---

## Regression risks (Phase 0)

| Area | Risk | Mitigation |
|------|------|------------|
| Task inventory completion | Import modifies repository internals | **Forbidden** — use public service APIs only |
| Integration 12/12 | New tests break harness | Run full suite in Phase 1.5 CI |
| `/assign_delivery` | Import creates invalid item shape | Reuse same validation as `createItem` |
| assignToAll guard | None | No change |

---

## Open decisions (resolve before Phase 1.3)

| # | Question | Recommended default |
|---|----------|---------------------|
| 1 | Auto-create category/location if missing? | **No** for v1 — fail row with setup hint |
| 2 | Re-import qty = add vs replace? | **Add** via STOCK_IN |
| 3 | Deactivate missing items on full replace import? | **No** — out of scope |
| 4 | REST-only vs WhatsApp-first? | **WhatsApp-first** per P2; REST for tests/admin |

---

## References

- `99-phase0-defects.md` — DEF-ACC-001, DEF-ACC-002
- `21-csv-import-analysis.md` — architecture
- `21-csv-import-mapping.md` — workflows
- `21-csv-import-roadmap.md` — phased delivery
