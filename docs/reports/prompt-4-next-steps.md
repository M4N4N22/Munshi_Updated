# Prompt 4 — Recommended Next Steps (Prompt 5)

**Date:** 2026-05-29  
**Baseline:** Workflow Engine + vendor onboarding complete

---

## Completed in Prompt 4

- [x] Generic Workflow Session Engine (`WorkflowModule`)
- [x] `workflow_sessions` table + migration `003`
- [x] Session lifecycle (create, update, complete, cancel, expire)
- [x] Pluggable workflow registry
- [x] WhatsApp routing integration (active session interception)
- [x] `/onboard_vendor` workflow using `VendorService.createVendor()`
- [x] 23 new workflow tests + 42 total tests passing
- [x] ML integration untouched
- [x] Existing Munshi commands preserved

---

## Recommended Prompt 5 — Workflow Platform Hardening

### P0 — Session management

| Task | Rationale |
|------|-----------|
| `/cancel` workflow command | Allow users to exit stuck workflows |
| Session TTL + cron job calling `expireSession()` | Prevent indefinite ACTIVE sessions |
| Admin REST endpoint to list/cancel sessions | Factory owner support tooling |

### P0 — Second workflow (validate engine)

| Task | Rationale |
|------|-----------|
| Worker onboarding workflow (`/onboard_worker`) | Proves registry pattern at scale |
| Reuse same session/engine — no engine redesign | |

### P1 — Inventory foundation

| Task | Rationale |
|------|-----------|
| Inventory category + location CRUD | TraderOS core |
| `/inventory_create` workflow | Multi-step inventory setup via WhatsApp |

### P1 — Platform

| Task | Rationale |
|------|-----------|
| REST auth guard on TraderOS routes | Security |
| Apply migration 003 in staging/production | Required before workflow use |
| ML intent mapping verification for `/onboard_vendor` | NL path depends on ML returning correct command |

---

## Deferred (unchanged from Prompt 3)

- Vendor role + authentication
- Procurement / purchase request workflows
- Approval engine
- Financial / Account Aggregator flows
- FK constraints on TraderOS tables

---

## Technical debt from Prompt 4

| Item | Priority |
|------|----------|
| No `/cancel` command | P0 |
| No session expiry cron | P0 |
| `expireSession()` exists but unused | P0 |
| Workflow handlers restricted to OWNER/MANAGER only | Document; extend per workflow |
| `processCommand` still has `/onboard_vendor` fallback | Keep for safety; could simplify later |

---

## Suggested Prompt 5 title

**"Workflow Platform Hardening + Worker Onboarding"**

Scope:

1. `/cancel` + session TTL
2. `/onboard_worker` as second registry workflow
3. Staging migration runbook for `003_workflow_sessions.sql`

---

*See [future-work-report.md](./future-work-report.md) for broader TraderOS roadmap.*
