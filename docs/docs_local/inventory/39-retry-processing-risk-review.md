# Phase 2.5.5 — Retry Processing Risk Review

**Run date:** 2026-06-06  
**Reviewer:** Automated implementation + test review

---

## Risk Register

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R-01 | Duplicate Zoho adjustments on retry | High | Idempotency key `(connection_id, inventory_transaction_id)`; handler skips existing deliveries; retry operates on same row | **Mitigated** |
| R-02 | Inventory double-write (Munshi) | Critical | R-Z06: execution service read-only ledger; no `recordStockIn/Out` in retry path | **Mitigated** |
| R-03 | Infinite retry loop | Medium | `MAX_PUSH_DELIVERY_ATTEMPTS = 4`; terminal `next_retry_at = NULL` | **Mitigated** |
| R-04 | Retry on delivered rows | High | Status guard in `retryDelivery()`; test 7 verifies no API call | **Mitigated** |
| R-05 | Retry on unmapped items | Medium | Status guard; mapping check → `skipped_unmapped` | **Mitigated** |
| R-06 | Retry with bad/expired token | Medium | `refreshConnectionIfNeeded()` before push; preserve count on failure | **Mitigated** |
| R-07 | Retry with disconnected integration | Medium | Active connection check; preserve count | **Mitigated** |
| R-08 | Cron thundering herd | Low | Batch limit 50; partial index on due rows | **Accepted** |
| R-09 | Clock skew on `next_retry_at` | Low | Server-side `Date`; single Postgres instance | **Accepted** |
| R-10 | Safety failure consumes retry budget | Medium | `preserveRetryCount: true` for connection/token failures | **Mitigated** |

---

## R-Z06 Compliance Audit

| Code path | Inventory write? |
|-----------|------------------|
| `ZohoPushRetryCron` | No |
| `ZohoPushRetryService` | No |
| `ZohoPushExecutionService.executeForDelivery` | Read-only `findOne` |
| `ZohoPushExecutionService.applyExecutionOutcome` | Delivery row updates only |
| `ZohoInventoryClient.adjustStock` | External Zoho API only |

**Verdict:** **COMPLIANT**

---

## Security Controls

| Control | Implementation |
|---------|----------------|
| Factory scoping | All repo methods filter `factory_id` |
| API auth | `assertCanManageIntegrations` on list endpoint |
| Token encryption | Existing `TokenCryptoService` (2.2) |
| OAuth refresh | Mandatory before push attempt |

---

## Operational Risks (Remaining)

| Item | Notes |
|------|-------|
| No dead-letter alerting | Terminal failed rows visible via API only — no dashboard/alert (by design for 2.5.5) |
| Single-process cron | Relies on one Nest instance running `@nestjs/schedule` — acceptable for v1 |
| Manual re-drive | Unmapped skips require mapping fix + new task event; no admin replay endpoint |

---

## Test Coverage Gaps (Accepted)

| Gap | Rationale |
|-----|-----------|
| End-to-end cron tick in integration test | Batch logic tested via direct `retryDelivery()` calls; cron is thin wrapper |
| Live Zoho API retry | Mock handler used; real API covered in 2.5.3 |

---

## Overall Risk Assessment

**LOW** for production deployment of retry processing within Phase 2 scope.

Critical rules (R-Z06, idempotency) enforced in code and verified by tests.

**Risk review:** **PASS**
