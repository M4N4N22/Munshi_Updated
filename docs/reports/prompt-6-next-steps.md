# Prompt 6 — Recommended Next Steps (Prompt 7)

**Date:** 2026-05-29  
**Baseline:** Inventory CRUD, transactions, workflow, status queries complete

---

## Completed in Prompt 6

- [x] Category, location, item CRUD
- [x] Transaction engine (STOCK_IN, STOCK_OUT, ADJUSTMENT)
- [x] Option B quantity strategy (transaction-backed cache)
- [x] Low stock detection + status API
- [x] `/inventory_create` workflow (third registry workflow)
- [x] `/inventory_status` command foundation
- [x] Migration `004_inventory_master.sql`
- [x] 80 tests passing

---

## Recommended Prompt 7 — Procurement Foundation

### P0

| Task | Rationale |
|------|-----------|
| Purchase request CRUD (replace skeleton) | Link to vendor master |
| `/purchase_request_create` workflow | Fourth workflow validation |
| Stock-in from purchase receipt reference | Use `reference_type` on transactions |

### P1

| Task | Rationale |
|------|-----------|
| Quantity reconciliation cron | Cache vs ledger at scale |
| WhatsApp stock-in/stock-out commands | Operational UX |
| ML intent mapping for `/inventory_create` | NL path |

### P1 — Approvals (still not full engine)

| Task | Rationale |
|------|-----------|
| Approval request service (basic approve/reject) | Gate purchase requests |

---

## Deferred

- Vendor ordering automation
- Financial ledger
- Account aggregator
- Full conversational inventory assistant

---

## Technical debt

| Item | Priority |
|------|----------|
| Categories/locations created via REST only before workflow | Document; optional category workflow later |
| No REST auth guards | Platform hardening |
| Reconciliation job | P1 after scale |

---

## Suggested Prompt 7 title

**"Purchase Request Foundation + Stock-In from Procurement"**

---

*See [future-work-report.md](./future-work-report.md)*
