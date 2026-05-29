# Future Work Report — Post Prompt 5

**Date:** 2026-05-29  
**Baseline:** Workflow engine hardened; vendor + worker onboarding live

---

## Completed in Prompt 5

- [x] `/cancel` workflow command
- [x] Configurable session TTL + hourly expiry cron
- [x] Expired session recovery messaging
- [x] `/onboard_worker` workflow (second registry workflow)
- [x] Worker creation via existing Factory + Department services
- [x] Worker welcome WhatsApp message
- [x] 67 tests passing; vendor onboarding regression verified

---

## Completed in Prompt 4

- [x] Generic Workflow Session Engine
- [x] `/onboard_vendor` workflow
- [x] WhatsApp routing with active session interception

---

## Recommended Prompt 6 — Inventory Foundation

### Phase A: Inventory CRUD

| Task | Priority |
|------|----------|
| Inventory category + location CRUD | P0 |
| Inventory item CRUD + SKU uniqueness | P0 |
| Transaction service (single quantity write path) | P0 |

### Phase B: Third workflow

| Task | Priority |
|------|----------|
| `/inventory_create` workflow via hardened engine | P0 |
| Validate cancel/expiry/registry with third workflow type | P0 |

### Phase C: Procurement + approvals

| Task | Priority |
|------|----------|
| Purchase request CRUD | P1 |
| Approval engine + status transitions | P1 |

### Phase D: Platform

| Task | Priority |
|------|----------|
| REST auth guard on TraderOS routes | P1 |
| ML intent mapping for `/onboard_worker` | P1 |
| Admin REST for workflow session management | P2 |
| `/onboard_manager` workflow | P2 |

---

## Deferred

- Financial ledger + expense tracking
- Account aggregator
- DB foreign key migration
- Vendor role + authentication

---

## Technical Debt Remaining

| Item | Target |
|------|--------|
| Inventory/procurement/approval skeleton endpoints | Prompt 6 |
| Multiple onboarding messages on worker create | Optional flag in Prompt 6+ |
| No REST workflow admin API | Prompt 6+ |
| Cron in-process only | Scale planning |

---

*See [prompt-5-next-steps.md](./prompt-5-next-steps.md) for Prompt 6 scope.*
