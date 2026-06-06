# Backend Health Audit — Dead Code Findings

**Run date:** 2026-06-06  
**Method:** Import/reference grep + module registration audit

---

## Confirmed Dead Code

### DC-01 — InternalCallGuard (unused)

**Severity:** INFO  
**Evidence:**
- Defined: `backend/src/core/guards/guards.ts:11–25`
- Constants: `backend/src/core/guards/guards.constants.ts`
- Grep: **no** `@UseGuards`, **no** imports of `InternalCallGuard` elsewhere in `src/`

**Conclusion:** Guard scaffold never wired.

---

### DC-02 — Finance application layer (schema only)

**Severity:** INFO  
**Evidence:**
- Migration: `migrations/007_p0_finance_foundation.sql` — bank, ledger, journal, match tables
- Models registered in Sequelize model index
- Files: `finance.schema.ts`, `finance.constants.ts` only under `src/services/finance/`
- Grep: **no** `FinanceModule`, **no** imports of `finance.constants`

**Conclusion:** Database tables exist; no Nest services consume them.

---

### DC-03 — Finance domain event constants (unpublished)

**Severity:** INFO  
**Evidence:** `domain-events.constants.ts:11–14` — `BANK_CONSENT_ACTIVE`, `BANK_STATEMENT_FETCHED`, `MATCH_SUGGESTION_CREATED`, `JOURNAL_ENTRY_POSTED`  
Grep: no `publish()` calls with these types.

---

### DC-04 — ApprovalModule stub

**Severity:** INFO  
**Evidence:** `ApprovalService` methods return `NOT_IMPLEMENTED_RESPONSE` only (`approvals.service.ts:23–37`). `ApprovalRepository` injected but only referenced via `void this.approvalRepository` (`:24`).

**Note:** Module is **registered** in AppModule — dead **implementation**, not dead module.

---

### DC-05 — Unused import in BusinessDiscoveryModule

**Severity:** INFO  
**Evidence:** `business-discovery.module.ts:1` imports `forwardRef` from `@nestjs/common` but `@Module` decorator does not use it.

---

## Reserved / Partially Dead

### DC-06 — Domain event type ONBOARDING_REGISTERED

**Severity:** INFO  
**Evidence:** Published (`onboarding.service.ts:164`); **not** handled in `dispatch()`. Event rows accumulate as COMPLETED with no effect.

**Classification:** Reserved for future handler — currently noop.

---

### DC-07 — AttendanceModule (limited reach)

**Severity:** INFO  
**Evidence:** Not in `AppModule`; imported only via `WhatsAppModule`. No standalone HTTP controller exposure in AppModule chain.

**Conclusion:** Not dead — used for WhatsApp attendance flows; intentionally nested.

---

## NOT Dead (verified)

| Item | Why active |
|------|------------|
| `WorkflowModule` | WhatsApp + DocumentModule |
| `PurchaseRequestPrefillService` | Phase 3.4 — workflow router + REST prefill |
| `formatSyncFailedDirectionLabel` | Used by sync-failed alert handler |
| `MessagingModule` | Used across alerts, issues, onboarding |
| Finance Sequelize models | Registered for DB sync; dormant until finance feature |

---

## Unused API Surface (live but non-functional)

| Endpoint group | Evidence |
|----------------|----------|
| `GET/POST/PATCH /approvals/*` | Returns `{ message: 'Not Implemented Yet' }` |

**Severity:** MEDIUM operational confusion (not dead code — actively returns placeholder).

---

## Migration Tables Without Code

| Migration | Tables | App usage |
|-----------|--------|-----------|
| `007_p0_finance_foundation.sql` | bank_*, ledger_*, journal_*, match_* | None |
| `007_p0_finance_foundation.sql` | domain_events | **Active** |
| `007_business_discovery.sql` | business discovery | Active module |

---

## Summary

| Category | Count |
|----------|-------|
| Confirmed dead (code never referenced) | 5 |
| Reserved / noop (published but unhandled) | 1 |
| Schema-only (no application layer) | 1 finance stack |
| Stub endpoints (live placeholder) | 1 module |

**Recommendation direction (not implemented):** Remove or wire `InternalCallGuard`; either implement `FinanceModule` or document tables as pre-provisioned; add handler or stop publishing `onboarding.registered`; remove `ApprovalModule` from AppModule until implemented.
