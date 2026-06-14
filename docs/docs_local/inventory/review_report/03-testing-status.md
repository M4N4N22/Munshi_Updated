# Phase 3 — Testing Status

**Last unit run (inventory-related):** 2026-06-10 — **113/113 PASS** (24 suites, pattern `inventory|low-stock|task-inventory`)  
**Full backend unit suite:** **386/386 PASS** (prior run on idempotency branch)

## Test layers

| Layer | Status | Notes |
|-------|--------|-------|
| Unit tests | **PASS** | Broad coverage across inventory, import, low-stock, task-inventory |
| Integration tests | **NOT VERIFIED locally** | Require Postgres (`POSTGRES_CONNECTION_STRING`) |
| Manual WhatsApp UAT | **PARTIAL** | Phase 4 live validation Jun 2026 — PARTIAL then remediated FULL PASS for NL workflow |
| Railway live testing | **PARTIAL** | Import duplicate bugs confirmed in logs 2026-06-10 (pre-fix branch) |
| Staging E2E (import idempotency) | **NOT TESTED** | Fix on feature branch; PR pending |

## Per-feature test matrix

| Feature | Unit | Integration | Manual/Live | Overall |
|---------|------|-------------|-------------|---------|
| Master data CRUD | PASS | PARTIAL | NOT TESTED | PARTIAL PASS |
| Transactions | PASS | PASS* | NOT TESTED | PARTIAL PASS |
| REST CSV import | PASS | NOT VERIFIED | NOT TESTED | PARTIAL PASS |
| WhatsApp CSV review | PASS | NOT VERIFIED | BUGS on main | PARTIAL PASS |
| Import idempotency fixes | PASS | NOT VERIFIED | NOT TESTED | PARTIAL PASS |
| Low stock alerts | PASS | NOT VERIFIED | ENV-ONLY (OLLI) | PARTIAL PASS |
| Purchase CTA | PASS | NOT VERIFIED | PASS (Shantanu branch) | PARTIAL PASS |
| `/inventory_status` | PASS | NOT TESTED | PASS (Phase 4) | PARTIAL PASS |
| Task inventory completion | PASS | NOT VERIFIED | PASS (Phase 4) | PARTIAL PASS |
| Task NL workflow | PASS | NOT VERIFIED | FULL PASS (66 signoff) | PASS |
| Zoho OAuth | PASS | NOT VERIFIED | NOT TESTED | PARTIAL PASS |
| Zoho pull sync | PASS | NOT VERIFIED | NOT TESTED | PARTIAL PASS |
| Zoho push + retry | PASS | NOT VERIFIED | NOT TESTED | PARTIAL PASS |

\*Integration PASS when Postgres available per test design.

## Integration test inventory (files)

| Spec | Phase |
|------|-------|
| `inventory-csv-import.integration.spec.ts` | 1.2 import core |
| `inventory-csv-upload.integration.spec.ts` | 1.3 REST upload |
| `inventory-csv-whatsapp.integration.spec.ts` | 1.4 WhatsApp CSV |
| `inventory-import-review.integration.spec.ts` | Review + provision |
| `inventory-import-idempotency.integration.spec.ts` | Idempotency (branch) |
| `inventory-low-stock-alert.integration.spec.ts` | Low stock |
| `inventory-low-stock-manager-alert.integration.spec.ts` | Manager alerts |
| `inventory-low-stock-purchase-prefill.integration.spec.ts` | Purchase CTA |
| `task-inventory-phase0.integration.spec.ts` | Task lines |
| `zoho-*.integration.spec.ts` (7 files) | Zoho stack |
