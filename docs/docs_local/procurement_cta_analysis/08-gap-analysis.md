# Phase 8 — Gap Analysis

**Date:** 2026-06-07  
**Scope:** Identify gaps only — no fixes

---

## 1. Technical Gaps

| ID | Gap | Severity | Evidence |
|----|-----|----------|----------|
| T1 | **Olli may echo button title instead of `button_reply.id`** | **Critical** | `parseWhatsAppInbound` Olli path uses `resolveInteractiveActionId`; `Purchase karein` not mapped. `isPurchaseRequestWorkflowCommand()` unused. |
| T2 | **No handler for title-only "Purchase karein" tap** | **Critical** | `matchWorkflowStartCommand` requires `/purchase_request_create` prefix |
| T3 | **`WA_LOW_STOCK_BUTTON_TITLES` defined but not wired** | High | `whatsapp-interactive.constants.ts` lines 35–38 |
| T4 | **Active workflow blocks new PR from CTA** | Medium | `createSession()` ConflictException — no CTA-specific override |
| T5 | **Low-stock alert bypasses `WhatsAppService.sendOutbound`** | Low | Direct `MessagingService` call — inconsistent but functional |
| T6 | **CTA URL (`cta_url`) may fail on Olli** | Low | Documented fallback to plain text — affects team CSV, not procurement |
| T7 | **No production Olli tap payload logging in discovery** | Medium | Cannot confirm T1 without staging trace |
| T8 | **Google Form / Dashboard button ids orphaned** | Low | Legacy stubs — unrelated to procurement |

---

## 2. Data Gaps

| ID | Gap | Severity | Notes |
|----|-----|----------|-------|
| D1 | **Suggested quantity not shown in alert body** | Low | User only sees it after successful CTA tap |
| D2 | **No per-user alert context persisted** | Medium | If title-only tap, `itemId` is lost — cannot prefill |
| D3 | **`unit` not in domain event payload** | Low | Loaded at prefill time from DB |
| D4 | **No factory name in alert body** | Low | Available via `getFactoryName` if needed |
| D5 | **Generic `approval_requests` unused** | Low | PR uses own status column — not blocking |

---

## 3. State-Management Gaps

| ID | Gap | Severity | Notes |
|----|-----|----------|-------|
| S1 | **No "pending CTA" state between alert and tap** | Medium | Relies entirely on button `id` carrying `itemId` |
| S2 | **One session per phone — no priority for procurement CTA** | Medium | User in onboarding cannot start PR without `/cancel` |
| S3 | **In-memory CSV state vs DB workflow inconsistency** | Low | Different TTL models — confusing for operators |
| S4 | **No expiry on "last alert context"** | N/A | Feature doesn't exist yet |

---

## 4. Workflow Gaps

| ID | Gap | Severity | Notes |
|----|-----|----------|-------|
| W1 | **"Create Order" label not in codebase** | Low | Product language vs `Purchase karein` — UX mismatch |
| W2 | **Purchase Order lifecycle absent** | Out of scope | PR-only procurement |
| W3 | **Document `CREATE_PURCHASE_REQUEST` suggestion not executed** | Low | Parallel path not wired |
| W4 | **Worker cannot start PR workflow** | By design | Alerts go to owners/managers — aligned |
| W5 | **No auto-PR on threshold breach** | By design | Manual CTA confirm required |
| W6 | **Degraded path: title tap → generic PR without prefill** | Medium | Not implemented as fallback |

---

## 5. Observability Gaps

| ID | Gap | Notes |
|----|-----|-------|
| O1 | No metric for CTA tap → workflow start conversion | Cannot measure failure rate |
| O2 | Alert send failures logged but not aggregated | `inventory-low-stock-alert.handler.ts` warn logs |
| O3 | No structured log when `matchWorkflowStartCommand` misses purchase command | Hard to debug "nothing happens" |

---

## 6. Test Gaps

| ID | Gap | Notes |
|----|-----|-------|
| E1 | Integration tests use direct handler + simulated command string | Do not test full Olli `data.text` title echo path |
| E2 | No E2E test for Olli interactive inbound shape | Gap between unit/integration and production |
| E3 | No test for active-session conflict on CTA tap | |

---

## 7. Gap Priority Matrix

```
                    IMPACT
                 High    Low
              ┌────────┬────────┐
        High  │ T1 T2  │ W1 W6  │
 EFFORT       ├────────┼────────┤
        Low   │ T3 T7  │ D1 D4  │
              └────────┴────────┘
```

**Fix first:** T1, T2, T7 (confirm production payload, then wire routing)

---

## 8. Gaps That Are NOT Gaps (Common Misconceptions)

| Assumption | Reality |
|------------|---------|
| "Procurement workflow doesn't exist" | Exists — `PURCHASE_REQUEST_CREATE` |
| "CTA was never implemented" | Implemented in Phase 3.4 with `itemId` |
| "Alert doesn't include purchase action" | Includes `Purchase karein` button |
| "Approval flow missing" | PR approval step + REST approve exist |
| "Need new DB tables for CTA" | `workflow_sessions` + `purchase_requests` sufficient |
