# Phase 7 — Integration Feasibility

**Date:** 2026-06-07  
**Scope:** Can existing procurement flow launch from Create Order CTA without redesign?

---

## Verdict: **YES — with minimal wiring fixes, not a procurement redesign**

The procurement workflow, low-stock prefill, PR creation, approval, and vendor assignment are **already implemented and integration-tested**. The low-stock alert **already embeds** the correct workflow command in the button reply `id`.

What is missing is **reliable inbound routing** from button tap to `startWorkflowFromCommand()` — not a new procurement engine.

---

## 1. What Already Works (No Redesign Needed)

| Capability | Status | Evidence |
|------------|--------|----------|
| Low-stock event → alert | ✅ Built | `inventory-low-stock-alert.handler.ts` |
| Interactive purchase button on alert | ✅ Built | `inventory-low-stock-outbound.ts` |
| Button carries `itemId` | ✅ Built | `buildPurchaseRequestCreateCommand()` |
| Workflow registry matches `?itemId=` | ✅ Built | `workflow.registry.ts` line 77 |
| Low-stock prefill service | ✅ Built | `purchase-request-prefill.service.ts` |
| Prefill session + YES/NO prompt | ✅ Built | `purchase-request-prefill.helper.ts` |
| PR create from session | ✅ Built | `createFromWorkflowSession()` |
| Approval + vendor + close steps | ✅ Built | `purchase-request-create.handler.ts` |
| E2E integration test | ✅ Passes | `inventory-low-stock-purchase-prefill.integration.spec.ts` |

**Conclusion:** Procurement does **not** need to be redesigned. The CTA → procurement bridge was built in Phase 3.4 (see `docs/docs_local/inventory/45-purchase-request-prefill-regression.md`).

---

## 2. Required Integration Points (Fix Layer Only)

### P0 — Inbound routing (root cause of "nothing happens")

| # | Integration point | File | Action needed |
|---|-------------------|------|---------------|
| 1 | Map `Purchase karein` title → workflow command | `whatsapp-inbound.parser.ts` or `whatsapp-interactive.constants.ts` | Wire `WA_LOW_STOCK_BUTTON_TITLES` / `isPurchaseRequestWorkflowCommand()` into inbound resolution |
| 2 | Or preserve `button_reply.id` through Olli | Olli / WABA config | Verify Olli forwards Meta `button_reply.id` not just title |
| 3 | Workflow start before ML fallback | `whatsapp.service.ts` | Already at step ⑧ — ensure message reaches this step |

### P1 — Operational robustness

| # | Integration point | File | Action needed |
|---|-------------------|------|---------------|
| 4 | Active session conflict UX | `workflow-session.service.ts` | When CTA tapped with active session, return actionable message (complete/cancel) |
| 5 | Role gate error surfacing | `workflow-engine.service.ts` | Ensure `ForbiddenException` reaches user clearly (worker tapping manager alert) |
| 6 | Alert send failures | `inventory-low-stock-alert.handler.ts` | Already logs per-recipient failures |

### P2 — Product alignment (labeling)

| # | Integration point | Notes |
|---|-------------------|-------|
| 7 | "Create Order" vs "Purchase karein" | User-facing label mismatch — cosmetic rename only |
| 8 | Suggested qty visibility | Could show suggested qty in alert body (optional UX) |

---

## 3. Integration Architecture (Minimal Fix)

```
[Existing — no change]
Low-stock alert → button id=/purchase_request_create?itemId=N

[Fix layer — inbound only]
parseWhatsAppInbound / handleIncomingMessage:
  IF message matches:
    - isPurchaseRequestWorkflowCommand(message) OR
    - title "Purchase karein" → resolve to last known itemId (?)
  THEN route to startWorkflowFromCommand

[Existing — no change]
Prefill → YES → PR → approval → vendor → close
```

**Note:** Title-only routing cannot recover `itemId` without additional state (e.g. store last alert context per phone). **Preferred fix:** ensure `button_reply.id` is preserved end-to-end.

---

## 4. Alternative Integration Paths (Already Exist — No CTA Required)

| Path | When to use |
|------|-------------|
| `GET /purchase-requests/prefill/low-stock` | Web/dashboard integration |
| `POST /purchase-requests/from-suggestion` | Backend automation |
| Manual `/purchase_request_create` | WhatsApp without alert |
| ML "purchase request bana do" | Natural language |

These do not replace CTA but prove procurement is decoupled from alert delivery.

---

## 5. What Does NOT Need to Change

| Component | Reason |
|-----------|--------|
| `purchase_requests` schema | Sufficient for PR lifecycle |
| PR status machine | Complete |
| `approval_requests` table | Not on critical path |
| Domain event pipeline | Alert delivery works |
| Suggested quantity formula | Shared and tested |
| Vendor module | Downstream of PR approval |

---

## 6. If Full Redesign Were Required (It Is Not)

Hypothetical triggers that **would** require redesign (none apply today):

- No PR workflow exists → **false**, workflow exists
- No item context in alert → **false**, `itemId` in button id
- No approval path → **false**, APPROVAL step exists
- Purchase Order required → **not in current product scope**

---

## 7. Recommended Integration Approach

### Approach A (Preferred): Fix Olli inbound id passthrough

1. Verify staging/production Olli webhook payload on button tap
2. If `button_reply.id` missing → fix Olli adapter
3. No backend logic change beyond optional defensive title fallback

### Approach B (Backend defensive): Wire existing dead helpers

1. Call `isPurchaseRequestWorkflowCommand()` in inbound parser or early router
2. Add `Purchase karein` → cannot recover itemId alone; need **session/context store** from alert send time OR require id passthrough
3. Partial fix: title maps to generic `/purchase_request_create` without prefill (degraded UX)

### Approach C (Hybrid): Alert context cache

1. On alert send, store `{ phone → { itemId, factoryId, ts } }` in Redis/DB (new component)
2. On title tap `Purchase karein`, lookup context → start prefill workflow
3. More moving parts — only if Olli cannot pass `button_reply.id`

**Recommendation:** **Approach A first**, Approach B for generic fallback, Approach C only if Olli is unfixable.

---

## 8. Effort Estimate (Implementation — Out of Scope for This Doc)

| Item | Relative effort |
|------|-----------------|
| Olli id passthrough verification | Low |
| Wire `isPurchaseRequestWorkflowCommand` in router | Low |
| Title → workflow without itemId (degraded) | Low |
| Per-phone alert context cache | Medium |
| Procurement redesign | **Not needed** |
