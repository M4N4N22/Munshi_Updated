# Phase 9 — Implementation Readiness Report

**Date:** 2026-06-07  
**Task:** Procurement CTA Flow Discovery & Architecture Analysis  
**Status:** Discovery complete — **no code changes made**

---

## 1. Existing CTA Mechanisms Found

| Mechanism | Location | Procurement relevance |
|-----------|----------|----------------------|
| **Reply buttons** (`interactive_buttons`) | `MessagingService.sendInteractiveButtons` | ✅ Low-stock `Purchase karein` |
| **CTA URL** (`interactive_cta_url`) | `MessagingService.sendInteractiveCtaUrl` | ❌ Team CSV only |
| **Stable `WA_INTERACTIVE_ID` map** | `whatsapp-interactive.constants.ts` | ❌ Not used for purchase button |
| **Title → id resolution** | `resolveInteractiveActionId()` | ✅ Owner home; ❌ low-stock |
| **Workflow command as button id** | `inventory-low-stock-outbound.ts` | ✅ `/purchase_request_create?itemId=N` |
| **Workflow start from command** | `WorkflowRouterService.startWorkflowFromCommand` | ✅ Prefill path |
| **ML intent → workflow** | `startWorkflowIfRegistered` | ✅ Manual NL procurement |
| **List reply parsing** | `whatsapp-inbound.parser.ts` | ❌ No outbound lists |

**User-facing label note:** Business context says "Create Order"; codebase uses **"Purchase karein"**.

---

## 2. Existing Procurement Entry Points Found

| Entry | Channel | Prefill from low stock |
|-------|---------|------------------------|
| `/purchase_request_create?itemId=N` | WhatsApp button / slash | ✅ |
| `/purchase_request_create` | WhatsApp slash / ML | ❌ manual |
| `POST /purchase-requests` | REST | ❌ |
| `POST /purchase-requests/from-suggestion` | REST | ✅ via suggestion key |
| `GET /purchase-requests/prefill/low-stock` | REST | ✅ read-only |
| `GET /purchase-requests/suggestions/low-stock` | REST | ✅ list |

**No Purchase Order module exists.**

---

## 3. Existing Reusable Approval Patterns Found

| Pattern | Maturity | Reuse for CTA |
|---------|----------|---------------|
| PR status machine + `assertStatusTransition` | Production | ✅ Post-CTA lifecycle |
| WhatsApp YES/NO tokens (`isYes`/`isNo`) | Production | ✅ Prefill + approval |
| Prefill confirm before DB write | Production | ✅ Already on CTA path |
| `/cancel` global | Production | ✅ |
| `purchase_request_audit` trail | Production | ✅ |
| `approval_requests` polymorphic layer | Stub | ❌ |
| Suggestion approval workflow | Production | ❌ Different domain |
| Inventory CSV CONFIRM/CANCEL | Production | ❌ Different pattern |

---

## 4. Recommended Integration Approach

### Summary

**Do not rebuild procurement.** Fix inbound routing so button tap reliably reaches `startWorkflowFromCommand('/purchase_request_create?itemId=N')`.

### Step-by-step (when implementation is approved)

1. **Capture production Olli webhook payload** on `Purchase karein` tap (staging trace).
2. **If `button_reply.id` present** → confirm it reaches `matchWorkflowStartCommand` (may already work; bug may be environmental).
3. **If only title echoed** → wire `Purchase karein` in inbound parser:
   - **Option A:** Fix Olli to pass `id` (preferred).
   - **Option B:** Store alert context per phone at send time; resolve title tap to `itemId`.
   - **Option C:** Degraded fallback to generic `/purchase_request_create` without prefill.
4. **Wire `isPurchaseRequestWorkflowCommand()`** into early router (defensive).
5. **Improve UX** when active session blocks CTA (actionable error message).
6. **Optional:** Rename button to "Create Order" if product requires (20 char limit).
7. **Add E2E test** simulating Olli `data.text` title echo path.

**Estimated scope:** Small integration fix (routing layer), not procurement redesign.

---

## 5. Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Olli never passes `button_reply.id` | Medium | High | Alert context cache or Olli fix |
| Active workflow blocks CTA | Medium | Medium | Clear `/cancel` messaging |
| Manager receives alert but session expired before tap | Low | Low | 24h TTL sufficient |
| Duplicate PR if user taps twice | Low | Medium | Session conflict already throws |
| WhatsApp 24h window for proactive messages | Low | Medium | Alert is response to system event; recipients are active users |
| Worker receives alert (misconfigured role) | Low | Low | `ensureCanRunWorkflow` blocks |

---

## 6. Missing Information

| # | Information needed | How to obtain |
|---|-------------------|---------------|
| 1 | Actual Olli webhook JSON on button tap | Staging log / `/webhook/test` simulation |
| 2 | Whether failure is 100% or intermittent | User reports + correlation with Olli version |
| 3 | Whether users have active workflows when tapping | Session table query at failure time |
| 4 | Whether "Create Order" is a different button than `Purchase karein` | Product/screenshot confirmation |
| 5 | ML behavior when message = `Purchase karein` | ML classify trace |
| 6 | Olli `cta_url` support status for other flows | Already partially known — 500 risk |

---

## 7. Readiness Score

### **7 / 10 — Ready for targeted integration fix, not greenfield build**

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Procurement workflow completeness | 9/10 | Full PR lifecycle + WA steps exist |
| Low-stock alert completeness | 9/10 | Event, recipients, button all built |
| CTA → workflow wiring (code) | 8/10 | Code path exists; integration tests pass with simulated id |
| Inbound routing reliability | **4/10** | Olli title-echo gap unaddressed |
| Observability / production evidence | 5/10 | No confirmed tap payload from staging |
| Documentation / test coverage for edge cases | 7/10 | Good integration tests; missing Olli shape tests |

**Overall: 7/10**

**Interpretation:**
- **High readiness** to connect CTA to existing procurement — architecture is already there.
- **Low readiness** to deploy without first confirming inbound payload shape — "nothing happens" likely routing/Olli, not missing procurement.

---

## 8. Document Index

| # | Document |
|---|----------|
| 01 | `01-whatsapp-interactive-flow.md` |
| 02 | `02-approval-flow-analysis.md` |
| 03 | `03-procurement-flow-analysis.md` |
| 04 | `04-low-stock-alert-analysis.md` |
| 05 | `05-conversation-state-analysis.md` |
| 06 | `06-flow-mapping.md` |
| 07 | `07-integration-feasibility.md` |
| 08 | `08-gap-analysis.md` |
| 09 | `09-implementation-readiness-report.md` (this file) |

---

## 9. Key Conclusion

The desired flow:

```
Low-stock alert → Create Order / Purchase karein → Procurement workflow → Purchase request
```

is **already architected and largely implemented**. The reported failure ("nothing happens on click") is most likely a **WhatsApp inbound routing gap** when the button reply `id` (`/purchase_request_create?itemId=N`) is not preserved through the Olli webhook — not absent procurement functionality.

**Next step when implementation is authorized:** Confirm Olli tap payload → apply minimal inbound routing fix → validate on staging with owner/manager test accounts.
