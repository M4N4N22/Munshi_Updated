# Phase 7/9 — Stop-Point & Root Cause Analysis

**Date:** 2026-06-08

---

## Ranked root causes

| Rank | Stop point | Evidence | Likelihood | Impact |
|------|------------|----------|------------|--------|
| **1** | **Parser + title map gap** — Olli sends `data.text: "Purchase karein"`; not in `TITLE_TO_ACTION_ID` | Parser spec test for Olli title shape; parser trace Option B; owner-home buttons work via title map | **90%** | Critical — no workflow command reaches router |
| **2** | **Parser precedence** — `data.text` checked before `button_reply.id` | Parser trace Option C: id present but ignored | **85%** | Critical — even dual payloads fail |
| **3** | **Router ML fallback** — `matchWorkflowStartCommand` null → `/classify` → `general_chat` → `sendOwnerHome` | Router code path; ML benchmark shows PR intent weak; owner/manager get home menu | **80%** | High — user sees wrong UX ("nothing happens") |
| **4** | **`isPurchaseRequestWorkflowCommand` never wired** | Grep: zero call sites | **75%** | Medium — defensive routing missing |
| **5** | Active workflow session conflict | DB: no real-user evidence | **15%** | Low |
| **6** | Role gate (WORKER) | Alerts target owners/managers | **5%** | Low |
| **7** | Alert not sent | DB: low_stock events COMPLETED | **<5%** | Ruled out |
| **8** | Procurement workflow broken | Integration tests pass; manual PR on 917452897444 | **<5%** | Ruled out |

**Composite confidence: 88%** that root cause is inbound routing (parser/title map/precedence + ML fallback), not procurement logic.

---

## Expected vs actual

| Dimension | Expected | Actual (evidence) |
|-----------|----------|-------------------|
| **Flow** | Alert → tap → prefill PR workflow | Alert fires; tap does not start PR on real phones |
| **Payload** | `message = /purchase_request_create?itemId=N` | `message = Purchase karein` (Option B/C) |
| **Route** | `matchWorkflowStartCommand` → workflow | ML fallback → `general_chat` → owner home |
| **Workflow** | `PURCHASE_REQUEST_CREATE` session | **Not created** for owner/manager |

---

## Stop-point diagram (failure)

```
POST /webhook
  → parseWhatsAppInbound()
  → message = "Purchase karein"     ← STOP: not a slash command
  → handleIncomingMessage()
  → resolveInteractiveActionId() = null
  → matchWorkflowStartCommand() = null   ← STOP: no workflow match
  → ML /classify
  → general_chat
  → routeGeneralChat() → sendOwnerHome()   ← STOP: wrong outbound
  → return 'ok'
  ✗ startWorkflowFromCommand NEVER CALLED
```

---

## Why "nothing happens" from user perspective

| User role | What they likely receive | Feels like |
|-----------|--------------------------|------------|
| Owner/Manager | Owner home menu (again) | "Button does nothing" / "same screen" |
| If ML returns non-general_chat | Unrelated command response or error | Confusing |
| If outbound send fails | True silence | Rare — no send errors in logs for this path |

---

## Answer

**Why does clicking Purchase karein result in no procurement workflow?**

Because Olli (per documented GetOlli interactive shape used for other buttons) delivers the button **title** `"Purchase karein"` to `parseWhatsAppInbound`, and Munshi:

1. Does **not** map that title to `/purchase_request_create?itemId=…`
2. Checks `data.text` **before** `button_reply.id`, discarding the id if both exist
3. Falls through to **ML classification**, which does not reliably route `Purchase karein` to the purchase workflow
4. For owners/managers, ML `general_chat` sends **owner home** instead of procurement prefill

**Procurement redesign required:** **NO**
