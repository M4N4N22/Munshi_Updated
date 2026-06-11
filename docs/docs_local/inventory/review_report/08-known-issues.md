# Phase 8 — Known Issues

| ID | Issue | Severity | Status | Owner |
|----|-------|----------|--------|-------|
| INV-001 | Duplicate WhatsApp import review/complete on main | **P0** | Fix on branch, **not merged** | Reviewer |
| INV-002 | Legacy auto-import bypasses review on main | **P0** | Fixed on branch | Reviewer |
| INV-003 | Parallel CONFIRM race on main | **P0** | Fixed on branch | Reviewer |
| INV-004 | Duplicate CSV stock-in on retry | **P1** | Fixed on branch (mig 016) | Reviewer |
| INV-005 | Migrations 015–016 not on staging/main | **P1** | Pending deploy | Ops |
| INV-006 | Import idempotency PR not merged | **P1** | Pending review | Second dev |
| ZOHO-001 | `org_id` missing at OAuth | **P1** | Open | Dev |
| ZOHO-002 | Push OAuth scope insufficient | **P1** | Open | Dev |
| ZOHO-003 | Live Zoho UAT not executed | **P2** | Open | Reviewer |
| PROC-001 | Full purchase approval E2E not UAT'd | **P2** | Open | QA |
| OPS-001 | OLLI rate limits blocked notification UAT | **P2** | Env | Ops |
| TECH-001 | No inventory admin CRUD web UI | **P2** | Accepted | Product |
| TECH-002 | Zoho pull requires pre-existing Munshi categories | **P2** | By design | Docs |
| TECH-003 | `whatsapp_webhook_events` table unbounded growth | **P3** | Future TTL | Dev |

## Pending PRs

| PR | Branch | Status |
|----|--------|--------|
| Inventory import idempotency | `feature/shantanu-inventory-import-idempotency` | **Open / not created via gh** — pushed, awaiting review |

## Technical debt

- Inventory reporting limited to WhatsApp `/inventory_status`
- Zoho re-sync does not update stock qty for mapped items
- Integration tests skip when no local Postgres (CI gap)
- Document inventory suggestions path separate from CSV import
