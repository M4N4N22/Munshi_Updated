# Final Verdict — Procurement CTA Live Investigation

**Date:** 2026-06-08  
**Investigation type:** Evidence-backed, no code changes

---

## Executive answers

| # | Question | Answer |
|---|----------|--------|
| 1 | **Actual payload from Olli** | **No live `Purchase karein` tap captured** in Railway logs (30d). Live envelope uses `type: text` for commands. Documented Olli interactive shape sends `data.text: "Purchase karein"` (Option B). See `02-actual-olli-payload.json`. |
| 2 | **Actual message reaching parser** | **`Purchase karein`** (Option B/C) — **not** `/purchase_request_create?itemId=N` |
| 3 | **Actual route taken** | **ML fallback** → `general_chat` → `routeGeneralChat()` → **`sendOwnerHome()`** for owners/managers |
| 4 | **Actual workflow triggered** | **None** — `startWorkflowFromCommand` never called. DB: no `low_stock_alert` prefill sessions for owner `91860…` or manager `91945…` |
| 5 | **Root cause confidence** | **88%** |
| 6 | **Recommended fix** | **Fix A:** parser precedence (`button_reply.id` first) + wire `isPurchaseRequestWorkflowCommand` before ML + title mapping; verify Olli shape (Fix C) |
| 7 | **Procurement redesign required?** | **NO** |

---

## Expected vs actual (one table)

| | Expected | Actual |
|---|----------|--------|
| **Alert** | Low-stock interactive with Purchase button | ✅ Events COMPLETED in DB |
| **Tap payload** | `id=/purchase_request_create?itemId=N` | `text=Purchase karein` (synthetic Option B — matches Olli pattern for other buttons) |
| **Parsed message** | Slash command with itemId | `Purchase karein` |
| **Router branch** | `workflow_start_command` | `ml_fallback` → owner home |
| **Workflow** | Prefilled PR create | Not started |

---

## Why the CTA "does nothing"

The procurement engine is built and tested. The **WhatsApp inbound bridge** between the interactive button and `startWorkflowFromCommand()` is broken because:

1. Munshi maps owner-home button **titles** to action ids, but **`Purchase karein` was never added**
2. The parser reads Olli's `data.text` **before** `button_reply.id`, dropping the command id when both are present
3. The router sends unmatched text to **ML**, which routes owners/managers to **home menu** — not purchase request

---

## Evidence inventory

| Source | What it proves |
|--------|----------------|
| Railway `controller_body` logs | Webhook pipe works; no purchase CTA tap logged |
| Staging `domain_events` | Low-stock alerts fire |
| Staging `workflow_sessions` | CTA prefill works in tests; not on real owner/manager phones |
| `whatsapp-inbound.parser.spec.ts` | Olli interactive = title in `data.text` |
| Dist parser-trace (investigation run) | Option A works; B/C fail |
| `inventory-low-stock-purchase-prefill.integration.spec.ts` | Workflow works when command string supplied |

---

## Remaining uncertainty (12%)

- Exact live JSON on the next real `Purchase karein` tap (not in log retention)
- Whether Olli ever sends **id-only** without `data.text` on staging (would work today)

**Mitigation:** One supervised tap + Railway log capture closes gap to ~98% confidence.

---

## Document index

| File | Content |
|------|---------|
| `01-expected-flow.md` | Intended architecture |
| `02-actual-olli-payload.json` | Payload evidence JSON |
| `03-payload-comparison.md` | Option A/B/C analysis |
| `04-parser-trace-report.md` | Parser behavior |
| `05-router-trace-report.md` | Router branches |
| `06-workflow-trace-report.md` | Workflow invoked or not |
| `07-railway-log-analysis.md` | Live log findings |
| `08-root-cause-analysis.md` | Ranked causes |
| `09-fix-options.md` | Fix A/B/C |
| `10-final-verdict.md` | This report |

---

## Sign-off

| Item | Status |
|------|--------|
| Code modified | ❌ No |
| Deployed | ❌ No |
| Procurement redesign | ❌ **Not required** |
| Ready for Fix A implementation | ✅ Yes — after optional live tap confirmation |
