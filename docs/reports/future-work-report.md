# Future Work Report — Post Prompt 4

**Date:** 2026-05-29  
**Baseline:** Workflow Engine + vendor onboarding complete; inventory/procurement/approval remain skeletons

---

## Completed in Prompt 4

- [x] Generic Workflow Session Engine (`WorkflowModule`)
- [x] Migration `003_workflow_sessions.sql`
- [x] Pluggable workflow registry
- [x] WhatsApp routing with active session interception
- [x] `/onboard_vendor` workflow via `VendorService.createVendor()`
- [x] 23 workflow tests; 42 total tests passing
- [x] ML integration untouched
- [x] Existing Munshi commands preserved

---

## Completed in Prompt 3

- [x] Vendor CRUD fully implemented with tests (19 tests)
- [x] Soft deactivate, search, pagination, factory isolation
- [x] Migration `002_vendors_master.sql`

---

## Prompt 5 — Recommended Implementation Order

### Phase A: Workflow platform hardening

| Task | Priority |
|------|----------|
| `/cancel` workflow command | P0 |
| Session TTL + cron calling `expireSession()` | P0 |
| Admin REST to list/cancel active sessions | P1 |

### Phase B: Second workflow (engine validation)

| Task | Priority |
|------|----------|
| Worker onboarding (`/onboard_worker`) | P0 |
| Reuse registry pattern — no engine redesign | P0 |

### Phase C: Inventory foundation

| Task | Priority |
|------|----------|
| Apply migrations 001 + 002 + 003 if not done | P0 |
| Inventory category + location CRUD | P0 |
| Inventory item CRUD + SKU uniqueness | P0 |
| `/inventory_create` workflow | P1 |

### Phase D: Procurement + approvals

| Task | Priority |
|------|----------|
| Purchase request CRUD | P0 |
| Link optional `vendor_id` to vendor master | P0 |
| Approval engine + status transitions | P1 |
| WhatsApp notifications on approval | P2 |

### Phase E: Platform hardening

| Task | Priority |
|------|----------|
| REST auth guard on TraderOS routes | P1 |
| FK migration for TraderOS tables | P1 |
| Staging environment | P1 |
| ML intent mapping for `/onboard_vendor` NL path | P1 |

---

## Deferred

- Manager onboarding workflow
- Vendor role + authentication
- Quotation / purchase order workflows
- Financial ledger + expense tracking
- Account aggregator

---

## Technical Debt Remaining

| Item | Target |
|------|--------|
| No `/cancel` or session TTL | Prompt 5 |
| Inventory/procurement/approval skeleton endpoints | Prompt 5+ |
| No FK constraints on TraderOS tables | Later migration |
| No auth on REST routes | Prompt 5 or infra |
| `expireSession()` implemented but no cron | Prompt 5 |

---

*See [prompt-4-next-steps.md](./prompt-4-next-steps.md) for Prompt 5 scope.*
