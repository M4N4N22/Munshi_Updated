# Phase 3 — Payload Comparison

**Date:** 2026-06-08

---

## Summary verdict

| Shape | Matches expected? | Procurement workflow starts? |
|-------|-------------------|---------------------------|
| **Option A** — `button_reply.id` only (no `data.text`) | ✅ Yes | ✅ Yes (parser trace) |
| **Option B** — `data.text: "Purchase karein"` (Olli documented shape) | ❌ No | ❌ No → ML fallback |
| **Option C** — both `data.text` + `button_reply.id` | ❌ No | ❌ No — **id ignored** |
| **Live captured** — plain `type: text` commands | N/A (not a button tap) | Depends on text content |

**No live `Purchase karein` tap captured in Railway logs.** Comparison uses parser unit tests + dist parser-trace (investigation run 2026-06-08).

---

## Expected vs actual

### Expected (design intent)

```json
{
  "data": {
    "type": "interactive",
    "interactive": {
      "button_reply": {
        "id": "/purchase_request_create?itemId=42",
        "title": "Purchase karein"
      }
    }
  }
}
```

**Resolved message:** `/purchase_request_create?itemId=42`

### Option A — Meta-native (works)

Same as expected. Parser test `parses interactive button_reply` confirms behavior for `TEAM_ONBOARD_WA` id passthrough.

**Purchase karein trace result:**
- `resolvedMessage`: `/purchase_request_create?itemId=42`
- `matchWorkflowStartCommand`: `/purchase_request_create`

### Option B — Olli title echo (fails)

Documented in `whatsapp-inbound.parser.spec.ts` test `parses GetOlli interactive taps (title in data.text)` for `Google Form se add`.

Adapted for purchase button:

```json
{
  "event": "message",
  "data": {
    "type": "interactive",
    "from": "918604856137",
    "text": "Purchase karein"
  }
}
```

**Resolved message:** `Purchase karein` (raw title — **not mapped**)

`resolveInteractiveActionId('Purchase karein')` → `null` because `Purchase karein` is absent from `TITLE_TO_ACTION_ID` (only owner-home and team-setup titles are mapped).

### Option C — Both text and id (fails — parser precedence)

```json
{
  "data": {
    "type": "interactive",
    "text": "Purchase karein",
    "interactive": {
      "button_reply": {
        "id": "/purchase_request_create?itemId=42"
      }
    }
  }
}
```

**Parser code order** (`whatsapp-inbound.parser.ts` lines 70-88):

1. If `data.type === 'interactive'` AND `data.text` is non-empty → return immediately
2. Only if no `data.text` → read `button_reply.id`

**Result:** Same as Option B — `Purchase karein` — **button id discarded**.

---

## Live Olli envelope (captured)

From Railway `controller_body` 2026-06-08T19:32:20Z:

- `event`: `message`
- `data.type`: **`text`** (not `interactive`)
- `data.text`: slash command string
- No `interactive` object

This proves Olli **does** deliver webhooks to Munshi, but **this window contains no interactive/button tap** for purchase CTA.

---

## Outbound vs inbound mismatch

| Direction | Purchase button payload |
|-----------|------------------------|
| **Munshi → Olli (outbound)** | `reply.id = /purchase_request_create?itemId=N` |
| **Olli → Munshi (inbound, if title echo)** | `data.text = Purchase karein` |
| **Munshi parser expectation for CTA** | Slash command string in `message` |

Owner-home buttons work with title echo because titles are registered in `TITLE_TO_ACTION_ID`. **Purchase karein is not registered** despite `WA_LOW_STOCK_BUTTON_TITLES` constant existing unused.

---

## Database corroboration

Staging Postgres query (2026-06-08):

| Evidence | Finding |
|----------|---------|
| `domain_events` `inventory.low_stock` | 10+ events `COMPLETED` — alerts fire |
| `workflow_sessions` `prefill_source=low_stock_alert` | Present for **integration-test phones only** (`+9100...` masked) |
| Owner `918604856137` / Manager `919456157007` | **No** `PURCHASE_REQUEST_CREATE` session with `low_stock_alert` prefill |
| User `917452897444` | Completed PR workflows exist — **manual** path (no prefill_source) |

**Conclusion:** Low-stock alerts dispatch; real factory users have **not** successfully entered prefilled PR workflow via CTA in DB history examined.
