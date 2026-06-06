# Backend Health Audit — Confirmed Bugs & Logic Flaws

**Run date:** 2026-06-06  
**Evidence standard:** Code citations only — no speculative defects

---

## CRITICAL

### BUG-C01 — No HTTP authentication on REST API

**Severity:** CRITICAL  
**Category:** Security / authorization  
**Evidence:** `InternalCallGuard` exists (`guards.ts:11–25`) but grep shows **zero** `@UseGuards` usage in `src/`. `AppModule` registers only `HttpExceptionFilter` and `ReqResInterceptor` — no global guard (`app.module.ts:58–66`).

**Impact:** Any client reaching the API can invoke endpoints without proving identity.

**Exploitability:** High if port 3000 (or reverse proxy) is reachable.

---

### BUG-C02 — Unauthenticated user CRUD and phone lookup

**Severity:** CRITICAL  
**Category:** Security / data exposure  
**Evidence:** `UserController` exposes create, list, findByPhone, findOne, update, delete with no guards (`users.service.ts:230–274`).

```typescript
@Get('by-phone')
findByPhone(@Query('phone') phone: string) {
  return this.userService.findByPhone(phone);
}
```

**Impact:** PII enumeration, arbitrary user modification/deletion.

---

### BUG-C03 — Unauthenticated factory listing with members

**Severity:** CRITICAL  
**Category:** Security / tenant isolation  
**Evidence:** `getAllFactories()` returns all factories with eager `members` include, no auth (`factories.service.ts:44–48`).

**Impact:** Full tenant roster disclosure.

---

## HIGH

### BUG-H01 — Issues readable/updatable by ID without factory scope

**Severity:** HIGH  
**Category:** Cross-tenant data access  
**Evidence:**

```144:156:backend/src/services/issues/issues.service.ts
  async findOne(id: number) {
    const issue = await this.IssueModel.findByPk(id, { ... });
```

```158:160:backend/src/services/issues/issues.service.ts
  async update(id: number, dto: UpdateIssueDto) {
    const issue = await this.IssueModel.findByPk(id);
```

No `factory_id` filter on read/update/delete paths.

**Impact:** Cross-factory issue access if issue IDs are guessable.

---

### BUG-H02 — Unauthenticated WhatsApp test webhook

**Severity:** HIGH  
**Category:** Security / abuse  
**Evidence:** `POST /webhook/test` accepts arbitrary body and routes to `handleIncomingMessage` with no verification (`whatsapp.controller.ts:47–49`).

**Impact:** Workflow triggers, messaging side effects, ML classification calls in production if route is exposed.

---

### BUG-H03 — Domain events marked COMPLETED when handler missing

**Severity:** HIGH  
**Category:** Logic flaw / silent data loss  
**Evidence:** `dispatch()` logs warn and returns when optional handler not wired (`domain-events.service.ts:95–99`). Caller always sets `COMPLETED` on success path (`:68–72`). Same for unhandled event types — debug log only (`:127–129`).

**Impact:** `onboarding.registered` and future event types appear processed but nothing ran.

---

### BUG-H04 — Domain events stuck in PROCESSING after crash

**Severity:** HIGH  
**Category:** Operational / lost processing  
**Evidence:** Status set to `PROCESSING` before dispatch (`domain-events.service.ts:65`); no cron or recovery path resets stale `PROCESSING` rows. Schema allows status (`007_p0_finance_foundation.sql:208–210`) but no TTL logic.

**Impact:** Events never retried after process kill mid-handler.

---

### BUG-H05 — Duplicate domain event processing (multi-instance)

**Severity:** HIGH  
**Category:** Race condition  
**Evidence:** `processPendingBatch` selects `PENDING` rows with plain `findAll` — no `FOR UPDATE SKIP LOCKED` (`domain-events.service.ts:54–61`).

**Impact:** Two app instances can pick the same event → duplicate WhatsApp alerts or duplicate push attempts (push has delivery idempotency; alerts do not).

---

### BUG-H06 — REST resources scoped by factory_id only (no caller check)

**Severity:** HIGH  
**Category:** Authorization  
**Evidence:** Examples:
- `InventoryController` — `@Query('factory_id')` only (`inventory.controller.ts:44–48`)
- `PurchaseRequestController.list` — factory_id query only (`purchase-requests.controller.ts:46–54`)
- `VendorController.list` — factory_id query only (`vendors.controller.ts:33–37`)

**Impact:** Knowledge of `factory_id` grants read/write for that tenant on REST (create paths often validate `requested_by` membership, but list/get do not).

---

### BUG-H07 — Integration REST trusts user_id parameter

**Severity:** HIGH  
**Category:** Impersonation  
**Evidence:** `IntegrationAuthValidationService.assertCanManageIntegrations(factoryId, userId)` validates membership (`integration-auth.validation.ts:34–52`) but **does not** bind `userId` to an authenticated session — it trusts the client-supplied `user_id`.

**Impact:** Caller who knows owner/manager user IDs can invoke OAuth/sync APIs as that user.

---

## MEDIUM

### BUG-M01 — Zoho pull does not reconcile quantity for existing mappings

**Severity:** MEDIUM  
**Category:** Data consistency  
**Evidence:** Existing mapping branch updates name/category/location/threshold only; returns `'metadata update'` without stock adjustment (`zoho-pull-sync.service.ts:282–311`). Initial stock-in only on create (`:329–337`).

**Impact:** Munshi quantity can diverge from Zoho for mapped items after first import.

---

### BUG-M02 — onboarding.registered published but never handled

**Severity:** MEDIUM  
**Category:** Logic flaw  
**Evidence:** Published in `onboarding.service.ts:164`; no branch in `dispatch()` (`domain-events.service.ts:93–129`); event completes with no handler.

**Impact:** Downstream onboarding automations never fire; false COMPLETED status.

---

### BUG-M03 — Workflow session create race returns DB error not ConflictException

**Severity:** MEDIUM  
**Category:** Race / UX  
**Evidence:** Application check-then-insert (`workflow-session.service.ts:32–37`); DB has `uq_workflow_sessions_active_phone` (`003_workflow_sessions.sql:27–30`) but concurrent creates may throw Sequelize unique violation instead of friendly conflict message.

**Impact:** Rare 500 on simultaneous workflow starts for same phone.

---

### BUG-M04 — Low stock alert publish failure after inventory commit

**Severity:** MEDIUM  
**Category:** Eventual consistency  
**Evidence:** `scheduleLowStockAlertIfNeeded` uses `transaction.afterCommit()` (`inventory-transaction.service.ts:258+`); publish failure logged, inventory already committed.

**Impact:** Stock deducted but owner not alerted (acceptable for alerting, but operational gap).

---

### BUG-M05 — CSV import row-by-row without batch transaction

**Severity:** MEDIUM  
**Category:** Partial failure state  
**Evidence:** `processImport` loops rows calling `processRow` individually (`inventory-import.service.ts:57–61`).

**Impact:** Mid-import failure leaves partial catalog state; no all-or-nothing import.

---

### BUG-M06 — Approval module returns success placeholder

**Severity:** MEDIUM  
**Category:** Logic / API contract  
**Evidence:** All `ApprovalService` methods return `NOT_IMPLEMENTED_RESPONSE` (`approvals.service.ts:23–37`) while controller routes are live (`:41–73`).

**Impact:** Clients receive `{ message: 'Not Implemented Yet' }` with HTTP 200 — misleading success.

---

### BUG-M07 — Incoming WhatsApp POST logs full body

**Severity:** MEDIUM  
**Category:** Security / privacy  
**Evidence:** `console.log({ controller_body: body })` (`whatsapp.controller.ts:27`).

**Impact:** Message content in logs; PII retention risk.

---

## LOW

### BUG-L01 — CORS defaults to allow all origins

**Severity:** LOW  
**Evidence:** `origin: true` when `CORS_ORIGIN` unset (`main.ts:54–58`).

---

### BUG-L02 — Swagger exposed without protection

**Severity:** LOW  
**Evidence:** `SwaggerModule.setup('api/docs', ...)` (`main.ts:74`).

---

### BUG-L03 — ValidationPipe whitelist disabled

**Severity:** LOW  
**Evidence:** `forbidUnknownValues: false` only; no `whitelist: true` (`main.ts:61–65`).

---

### BUG-L04 — Worker pending tasks query unbounded

**Severity:** LOW (perf)  
**Evidence:** `findAll` without `limit` for WORKER role (`tasks.service.ts:756–765`); MANAGER/OWNER paths use limits (`:798`, `:819`).

---

## INFO

### BUG-I01 — Domain event types declared for finance, never used

**Severity:** INFO  
**Evidence:** `BANK_*`, `MATCH_*`, `JOURNAL_*` in `domain-events.constants.ts:11–14`; no publishers or handlers.

---

## Summary Table

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 7 |
| MEDIUM | 7 |
| LOW | 4 |
| INFO | 1 |

**Note:** Several HIGH findings share root cause (missing REST auth). Fixing authentication would downgrade H06, H07 substantially.
