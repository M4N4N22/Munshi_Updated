# Backend Health Audit — Test Coverage Gaps

**Run date:** 2026-06-06

---

## Current Test Inventory

| Layer | Count | Location |
|-------|-------|----------|
| Integration specs | 18 | `backend/test/integration/*.integration.spec.ts` |
| Integration tests (latest) | **115** | Per `45-purchase-request-prefill-validation.md` |
| Unit specs | ~65 | `backend/src/**/*.spec.ts` |
| Build gate | PASS | `npm run build` |

---

## Well-Covered Critical Paths

| Path | Evidence |
|------|----------|
| Zoho OAuth | `zoho-oauth.integration.spec.ts`, `zoho-oauth-state.service.spec.ts` |
| Zoho pull sync | `zoho-pull-sync.integration.spec.ts` |
| Zoho push + idempotency | `zoho-stock-push-events.integration.spec.ts`, `push-idempotency.integration.spec.ts` |
| Push handler runtime | `zoho-stock-push-handler.integration.spec.ts`, `zoho-stock-push.handler.spec.ts` |
| Push retry | `zoho-push-retry.integration.spec.ts`, `zoho-push-retry.constants.spec.ts` |
| Integration foundation | `integration-foundation.integration.spec.ts` |
| Inventory CSV pipeline | `inventory-csv-import`, `inventory-csv-upload`, `inventory-csv-whatsapp` |
| Task ↔ inventory (Phase 0) | `task-inventory-phase0.integration.spec.ts` |
| Low stock alerts (3.1) | `inventory-low-stock-alert.integration.spec.ts` (5 tests) |
| Manager alerts (3.3A) | `inventory-low-stock-manager-alert.integration.spec.ts` (6 tests) |
| Sync failure alerts (3.2) | `integration-sync-failed-alert.integration.spec.ts` (6 tests) |
| PR prefill (3.4) | `inventory-low-stock-purchase-prefill.integration.spec.ts` (6 tests) |
| Domain event routing | `domain-events.service.spec.ts` |
| Inventory transactions | `inventory-transaction.service.spec.ts` (negative stock) |
| Low stock helper | `inventory.low-stock.helper.spec.ts` |
| Workflow handlers (5/7) | vendor, worker, inventory-create, suggestion-approval, business-discovery |
| Documents pipeline | Extensive unit specs under `documents/` |

---

## Critical Gaps — No Automated Tests

### GAP-C01 — whatsapp.service.ts orchestration

**Severity:** CRITICAL (coverage gap)  
**Evidence:** No `whatsapp.service.spec.ts`; file is primary inbound message router (~1800 lines).  
**Missing scenarios:**
- ML classify fallback routing
- Workflow vs command vs slash bypass
- Document inbound handling integration with workflows
- Error paths when ML service down

---

### GAP-C02 — REST security / authorization

**Severity:** CRITICAL (coverage gap)  
**Evidence:** No tests assert 401/403 on REST endpoints without credentials.  
**Missing scenarios:**
- Unauthenticated access to `/users`, `/factories`, `/inventory`
- Cross-factory issue access by ID
- Integration API impersonation attempts

**Note:** Absence of tests mirrors absence of auth implementation — both are gaps.

---

### GAP-C03 — Domain event processor concurrency

**Severity:** HIGH  
**Evidence:** `domain-events.service.spec.ts` tests routing only — no multi-instance, stuck PROCESSING, or duplicate batch tests.  
**Missing scenarios:**
- Two workers same event
- Crash mid-dispatch recovery
- Handler missing → should not COMPLETE (behavior undocumented in tests)

---

## High-Priority Gaps

### GAP-H01 — Workflow handlers without specs

| Handler | Spec file |
|---------|-----------|
| `purchase-request-create.handler.ts` | **Missing** |
| `assign-clarify.handler.ts` | **Missing** |

Prefill flow partially covered by integration spec (3.4) but handler unit edge cases not isolated.

---

### GAP-H02 — WorkflowEngineService

**Severity:** HIGH  
**Evidence:** Partial coverage via `workflow-routing.spec.ts`, `workflow-hardening.spec.ts` — mocks only. No integration test for full step transitions across all 7 workflows.

---

### GAP-H03 — Onboarding service

**Severity:** HIGH  
**Evidence:** Only `onboarding-otp.crypto.spec.ts`; no tests for `onboarding.service.ts` OTP flow, domain event publish, or SMS dispatch.

---

### GAP-H04 — Integration services (unit layer)

**Severity:** HIGH  
**Missing unit specs for:**
- `ZohoOAuthService`
- `ZohoPullSyncService`
- `ZohoPushExecutionService`
- `ZohoPushRetryService`
- `ZohoScheduledSyncService`
- `IntegrationRepository`
- `IntegrationAuthValidationService`

**Mitigation:** Strong integration test coverage reduces but does not replace unit isolation.

---

### GAP-H05 — Co-located REST controllers

**Severity:** HIGH  
**Untested controllers (service + HTTP in same file pattern):**

| Module | Controller |
|--------|------------|
| Users | `UserController` in `users.service.ts` |
| Factories | `FactoryController` in `factories.service.ts` |
| Issues | `IssueController` in `issues.service.ts` |
| Tasks | `TasksController` in `tasks.service.ts` |
| Reports | `ReportController` in `reports.service.ts` |
| Attendance | `AttendanceController` in `attendance.service.ts` |
| Departments | partial — `departments-owner-head.spec.ts` only |

---

### GAP-H06 — inventory-import.service.ts

**Severity:** MEDIUM  
**Evidence:** Upload service has spec; core `InventoryImportService.processImport` row logic covered only via integration CSV tests — no dedicated unit tests for edge cases (duplicate SKU, partial row failure).

---

## Medium-Priority Gaps

### GAP-M01 — Purchase request REST API

**Evidence:** `purchase-requests.service.spec.ts` exists; no HTTP e2e for approve/reject/assign vendor paths.

### GAP-M02 — Vendor service

**Evidence:** `vendors.service.spec.ts` — limited; no controller tests.

### GAP-M03 — MessagingService

**Evidence:** Outbound template specs exist; core `sendText`, `fireAndForget` error handling untested.

### GAP-M04 — DbService / core infrastructure

**Evidence:** No unit tests for `DbService`, `LoggerService`, health modules.

### GAP-M05 — Zoho pull quantity drift

**Evidence:** No test asserting existing mapping pull does **not** change `current_quantity` (documents known behavior gap).

---

## Regression Coverage by Phase

| Phase | Integration tests | Status |
|-------|-------------------|--------|
| 0 — Task inventory | `task-inventory-phase0` | Covered |
| 1 — CSV import | 3 integration specs | Covered |
| 2 — Zoho stack | 10+ integration specs | Covered |
| 3.1 — Low stock | 5 tests | Covered |
| 3.2 — Sync failed | 6 tests | Covered |
| 3.3A — Manager alert | 6 tests | Covered |
| 3.4 — PR prefill | 6 tests | Covered |

**Gap:** No single "full regression" script beyond `test:integration --runInBand`; phase reports document counts but no automated phase tagging in Jest.

---

## Recommendations (analysis only)

1. Add auth integration test suite (even if initially expected to fail until auth ships).
2. Add `whatsapp.service` spec with mocked ML + workflow router — highest ROI.
3. Add domain event processor concurrency tests with two parallel `processPendingBatch` calls.
4. Add unit specs for `purchase-request-create.handler` (prefill confirm, NO restart, quantity edit).
5. Add e2e smoke test for `POST /webhook/test` — assert disabled in production config or 403.
6. Tag integration tests by phase (`@Phase3.1`) for targeted regression.

---

## Summary

| Gap severity | Count |
|--------------|-------|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 5 |

**Overall test posture:** Strong on **inventory integrations and Zoho**; weak on **REST security**, **WhatsApp orchestration**, and **core auth**. Integration count (115) exceeds Phase 2 signoff (92) and Phase 3.4 target — quantity is good; **breadth** has holes.
