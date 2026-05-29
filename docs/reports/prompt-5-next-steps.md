# Prompt 5 — Recommended Next Steps (Prompt 6)

**Date:** 2026-05-29  
**Baseline:** Workflow engine hardened; vendor + worker onboarding live

---

## Completed in Prompt 5

- [x] `/cancel` workflow command
- [x] Configurable session TTL (default 24h)
- [x] Session expiry on access + hourly cron
- [x] Expired session recovery messaging
- [x] `/onboard_worker` workflow (second registry workflow)
- [x] Reuses FactoryService, DepartmentsService, MessagingService
- [x] Worker welcome WhatsApp message
- [x] 67 tests passing (44 workflow-related)
- [x] Vendor onboarding regression verified

---

## Recommended Prompt 6 — Inventory Foundation

### P0 — Inventory CRUD

| Task | Rationale |
|------|-----------|
| Inventory category + location CRUD | TraderOS core |
| Inventory item CRUD + SKU uniqueness | Stock master |
| Transaction service (single quantity write path) | Data integrity |

### P0 — Third workflow (engine validation at scale)

| Task | Rationale |
|------|-----------|
| `/inventory_create` workflow | Multi-step inventory setup via WhatsApp |
| Reuse hardened engine (cancel, expiry, registry) | No engine redesign |

### P1 — Platform

| Task | Rationale |
|------|-----------|
| REST auth guard on TraderOS routes | Security |
| ML intent mapping for `/onboard_worker` | NL path |
| Admin REST to list/cancel workflow sessions | Operations tooling |
| `/cancel` in help text + ML optional mapping | UX |

### P1 — Manager onboarding

| Task | Rationale |
|------|-----------|
| `/onboard_manager` workflow | Third persona type; validates role assignment step |

---

## Deferred

- Procurement / purchase request workflows
- Approval engine implementation
- Financial / Account Aggregator flows
- DB foreign key migration

---

## Technical debt from Prompt 5

| Item | Priority |
|------|----------|
| assignMember sends owner broadcast + worker template + welcome text | Document; optional flag later |
| Expiry cron runs in-process only | P1 if horizontal scaling |
| No REST endpoint for workflow session admin | P1 |

---

## Suggested Prompt 6 title

**"Inventory Foundation + `/inventory_create` Workflow"**

---

*See [future-work-report.md](./future-work-report.md) for broader roadmap.*
