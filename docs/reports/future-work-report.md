# Future Work Report — Post Prompt 3

**Date:** 2026-05-29  
**Baseline:** Vendor Master complete; inventory/procurement/approval remain skeletons

---

## Completed in Prompt 3

- [x] Apply migration `002_vendors_master.sql` (documented)
- [x] Vendor CRUD fully implemented with tests (19 tests)
- [x] Soft deactivate via `PATCH /vendors/:id/deactivate`
- [x] Search, pagination, factory isolation
- [x] No regression in WhatsApp/task/attendance flows
- [x] Documentation updated in `docs/reports/`

---

## Prompt 4.0 — Recommended Implementation Order

### Phase A: Inventory foundation

| Task | Priority |
|------|----------|
| Apply migrations 001 + 002 if not done | P0 |
| Inventory category + location CRUD | P0 |
| Inventory item CRUD + SKU uniqueness | P0 |
| Transaction service (single quantity write path) | P0 |

### Phase B: Procurement header

| Task | Priority |
|------|----------|
| Purchase request CRUD | P0 |
| Link optional `vendor_id` to vendor master | P0 |
| Submit → create `ApprovalRequest` | P1 |

### Phase C: Approval engine

| Task | Priority |
|------|----------|
| `ApprovalService` approve/reject/cancel | P0 |
| Purchase request status transitions | P1 |
| WhatsApp notifications on approval | P2 |

### Phase D: Platform hardening

| Task | Priority |
|------|----------|
| REST auth guard on TraderOS routes | P1 |
| FK migration for TraderOS tables | P1 |
| Staging environment | P1 |

---

## Deferred (see prompt-3-next-steps.md)

- Vendor role + WhatsApp onboarding
- Vendor authentication
- Quotation workflow
- Purchase orders + goods receipts
- Financial ledger + expense tracking
- Account aggregator

---

## Technical Debt Remaining

| Item | Target |
|------|--------|
| Inventory/procurement/approval skeleton endpoints | Prompt 4 |
| No FK constraints on TraderOS tables | Prompt 4 migration |
| No auth on REST routes | Prompt 4 or infra |
| `current_quantity` without transaction logic | Prompt 4 inventory |

---

*See [prompt-3-next-steps.md](./prompt-3-next-steps.md) for vendor role and procurement design.*
