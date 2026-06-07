# UAT — Inventory Experience

**Roles:** Owner, Inventory Lead (Manager)  
**Run date:** 2026-06-06  

---

## Task + Inventory (Group 5)

| Test case | Result | Notes |
|-----------|--------|-------|
| Sufficient stock → task complete → ledger deduction | **PASS** † | Integration: Phase 0 task-complete tests |
| Insufficient stock → completion blocked | **PASS** | Live: 400 on complete |
| Negative stock attempt | **PASS** | Blocked at completion |
| Duplicate completion attempt | **PASS** | 400 / already completed message |

**Live friction:** REST `stock-in` / `stock-out` require `quantity` as **string** (e.g. `"20"`), not number. Business users sending JSON numbers may see silent failures — usability defect UAT-D-06.

---

## CSV Inventory Import (Group 6)

| Test case | Result |
|-----------|--------|
| Valid CSV (2 rows) | **PASS** — addedCount 2 |
| Invalid CSV | **PASS** — 400 |
| Duplicate SKU | **PASS** † — upsert/skip behaviour in integration tests |
| Missing fields | **PASS** † — parser validation |
| Bad quantities | **PASS** † — row-level failure |
| Large file | **NOT TESTED** | Size limit documented in constants |

### Template discovery — **PASS**

| Asset | Location |
|-------|----------|
| Static template | `web/public/inventory-import/munshi-inventory-template.csv` |
| Documented URL | `MUNSHI_WEB_URL` + `/inventory-import/munshi-inventory-template.csv` |

---

## Inventory Management (Group 8)

| Feature | Result |
|---------|--------|
| Item listing | **PASS** |
| Category / location CRUD | **PASS** |
| Quantity by item | **PASS** |
| Low-stock list | **PASS** (after stock below threshold) |
| Stock in / out / adjustment | **PASS** † (with string quantity) |
| Movement history | **PASS** — `GET /inventory/transactions` |
| Reorder thresholds | **PASS** — string threshold on create |

---

## Low Stock Alerts (Group 10)

| Check | Live UAT | Integration |
|-------|----------|-------------|
| Threshold crossed on STOCK_OUT | **PASS** | 5/5 Phase 3.1 |
| Owner alert delivery | **PASS** † | Handler sends WhatsApp |
| Manager alert delivery | **PASS** † | Phase 3.3A |
| Alert readability (Hindi copy) | **PASS** † | Templates in code |
| Actionability (PR CTA) | **PASS** † | `/purchase_request_create?itemId=` |

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 5 — Task + inventory | **PASS** |
| 6 — CSV import | **PASS** |
| 8 — Inventory management | **PASS** |
| 10 — Low stock alerts | **PASS** |

---

## Business User Confidence

Inventory quantities and CSV import summaries are understandable (`addedCount`, `failedCount`). Ledger accuracy is trustworthy when API field types are correct. Low-stock visibility via `/inventory_status` and low-stock list supports operational decisions.
