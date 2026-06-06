# Backend Health Audit — Risks Register

**Run date:** 2026-06-06

---

## Architectural Risks

### ARCH-R01 — Dual identity models (WhatsApp vs REST)

**Severity:** HIGH  
**Evidence:** WhatsApp resolves user by phone in `WorkflowRouterService.resolveUserContext()`; REST accepts `factory_id` / `user_id` query params without session binding.  
**Impact:** Inconsistent security posture; REST cannot be safely exposed while WhatsApp works.  
**Direction:** Unified auth middleware before controller layer.

---

### ARCH-R02 — Circular module graph (DomainEvents ↔ Integration ↔ Inventory)

**Severity:** MEDIUM  
**Evidence:** `forwardRef` in `domain-events.module.ts`, `integration.module.ts`, `inventory.module.ts`; `@Optional()` + `@Inject(forwardRef())` on publishers/handlers.  
**Impact:** Bootstrap order sensitivity; harder testing and reasoning.  
**Direction:** Event handler registry pattern decoupled from feature modules (Phase 3 roadmap noted partial registry in `40-phase3-gap-analysis.md`).

---

### ARCH-R03 — Monolithic WhatsApp orchestrator

**Severity:** MEDIUM  
**Evidence:** `whatsapp.service.ts` — large single service handling ML routing, workflows, commands, CSV, team setup.  
**Impact:** Change blast radius; difficult to test (no spec file).  
**Direction:** Continue extracting handlers (pattern used for workflow module).

---

### ARCH-R04 — Finance schema without application layer

**Severity:** MEDIUM  
**Evidence:** Migration `007_p0_finance_foundation.sql` creates bank/ledger/match tables; models in `finance.schema.ts`; no `FinanceModule`, services, or controllers.  
**Impact:** Schema drift vs code; migration applies tables unused by app.  
**Direction:** Either implement module or document as dormant until Phase 4+.

---

### ARCH-R05 — Stub ApprovalModule in production graph

**Severity:** MEDIUM  
**Evidence:** `ApprovalModule` imported in `AppModule:51`; all endpoints return placeholder (`approvals.service.ts:23–37`). Purchase request approvals live in `PurchaseRequestService` + workflow handler instead.  
**Impact:** API surface confusion; duplicate approval concepts.  
**Direction:** Remove from AppModule or implement.

---

### ARCH-R06 — In-memory OAuth nonce store

**Severity:** MEDIUM  
**Evidence:** `ZohoOAuthStateService.nonces = new Map()` (`zoho-oauth-state.service.ts:28`).  
**Impact:** OAuth callback fails after restart; replay window on multi-instance (documented SR-01 in `30-zoho-oauth-security-review.md`).  
**Direction:** Redis or DB-backed nonce table with TTL.

---

### ARCH-R07 — Dispatch via if/else chain, not registry

**Severity:** LOW  
**Evidence:** `DomainEventsService.dispatch()` — three `if` branches (`domain-events.service.ts:93–125`).  
**Impact:** Adding event types requires editing core service; risk of silent no-handler completion.  
**Direction:** Handler map keyed by `event_type` (noted in `40-phase3-gap-analysis.md`).

---

## Operational Risks

### OPS-R01 — Single-threaded domain event batch

**Severity:** HIGH  
**Evidence:** Serial `for` loop in `processPendingBatch` (`domain-events.service.ts:64–89`); cron every minute (`domain-events.processor.cron.ts`).  
**Impact:** Backlog under alert storms; delayed Zoho pushes.

---

### OPS-R02 — No PROCESSING recovery job

**Severity:** HIGH  
**Evidence:** See BUG-H04.  
**Impact:** Silent event loss after OOM/kill.

---

### OPS-R03 — Boot-time migration requirement

**Severity:** MEDIUM  
**Evidence:** `ensureDatabaseMigrations()` exits process on failure (`main.ts:16–45`).  
**Impact:** Correct for consistency; failed migration blocks all traffic (no degraded mode).

---

### OPS-R04 — Encryption key in environment variable

**Severity:** MEDIUM  
**Evidence:** `INTEGRATION_TOKEN_ENCRYPTION_KEY` (`token-crypto.service.ts`); SR-04 in OAuth security review.  
**Impact:** Key leakage from env dumps, logs, misconfigured CI.

---

### OPS-R05 — Zoho scheduled sync serial per connection

**Severity:** LOW  
**Evidence:** `ZohoScheduledSyncService` iterates connections sequentially (per explore agent + Phase 2 docs).  
**Impact:** Long nightly runs for many factories.

---

### OPS-R06 — Workflow expiry loads all ACTIVE sessions

**Severity:** LOW  
**Evidence:** `expireStaleActiveSessions` — unbounded ACTIVE query (`workflow-session.service.ts:96–98`).  
**Impact:** Memory/time growth with abandoned sessions.

---

## Security Risks

### SEC-R01 — REST API open by default

**Severity:** CRITICAL  
**Evidence:** See BUG-C01 through C03.  
**Exploitability:** High on public network.

---

### SEC-R02 — User impersonation via user_id query param

**Severity:** HIGH  
**Evidence:** Integration APIs (`integration-auth.validation.ts`); purchase request create validates membership but trusts `requested_by` from body (`purchase-requests.service.ts:80–83`).  
**Exploitability:** Medium — requires knowledge of valid IDs.

---

### SEC-R03 — Webhook test endpoint

**Severity:** HIGH  
**Evidence:** `POST /webhook/test` (`whatsapp.controller.ts:47–49`).  
**Exploitability:** High if exposed.

---

### SEC-R04 — findByPhone information disclosure

**Severity:** HIGH  
**Evidence:** `GET /users/by-phone?phone=` (`users.service.ts:254–257`).  
**Exploitability:** Phone enumeration.

---

### SEC-R05 — Default permissive CORS

**Severity:** MEDIUM  
**Evidence:** `main.ts:54–58`.  
**Exploitability:** Browser-based abuse if cookies added later.

---

### SEC-R06 — Swagger API enumeration

**Severity:** LOW  
**Evidence:** `/api/docs` unauthenticated (`main.ts:74`).

---

## Data Consistency Risks

### DATA-R01 — Munshi/Zoho quantity drift on pull

**Severity:** MEDIUM  
**Evidence:** BUG-M01.  
**Impact:** Reporting mismatch; low-stock alerts based on Munshi ledger only (by design per Phase 2 audit).

---

### DATA-R02 — Duplicate low-stock / sync-failed alerts

**Severity:** MEDIUM  
**Evidence:** Sync failure dedup exists (`integration-sync-failed.helper.ts`); low stock has no aggregate dedup on event publish (Phase 3.1 threshold-cross only prevents repeat while low).  
**Impact:** Multiple alerts if multiple threshold crossings after restock.

---

### DATA-R03 — Ledger vs current_quantity

**Severity:** LOW  
**Evidence:** `calculateQuantityFromTransactions()` exists for audit (`inventory-transaction.service.ts:97+`); no automated reconciliation cron.  
**Impact:** Manual drift detection only.

---

## Production Deployment Risks

| Risk | Condition | Mitigation direction |
|------|-----------|---------------------|
| Horizontal scaling | 2+ API instances | OAuth nonces + domain event locking |
| Public REST | API behind load balancer | Auth gateway mandatory |
| Postgres unavailable | Boot migration fail | Health check before traffic |
| Zoho token expiry | Refresh failure | Sync-failed alert (Phase 3.2) + manual reconnect |

---

## Risk Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW |
|----------|----------|------|--------|-----|
| Architectural | 0 | 1 | 5 | 1 |
| Operational | 0 | 2 | 2 | 2 |
| Security | 1 | 3 | 1 | 1 |
| Data consistency | 0 | 0 | 2 | 1 |

**Highest priority:** SEC-R01 (REST auth) → OPS-R02 (event recovery) → ARCH-R06 (OAuth HA).
