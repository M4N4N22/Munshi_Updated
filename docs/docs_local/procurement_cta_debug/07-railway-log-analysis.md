# Phase 8 — Railway Log Analysis

**Date:** 2026-06-08  
**Source:** Railway MCP `get_logs` — project `043b8a36-21f6-422b-82af-fd7831269075`, backend service `5adcc79f-a9fb-41bf-a0d4-d635293063e9`

---

## Search summary

| Search term | Window | Result |
|-------------|--------|--------|
| `Purchase karein` | 30d | **No matches** |
| `purchase_request_create` | 30d | **No inbound webhook matches** (only route registration at boot) |
| `type: 'interactive'` | 30d | **No matches** |
| `Low Stock Alert` | 30d | **No matches** in message webhooks |
| `controller_body` | 2026-06-08 19:32–19:34 UTC | **13 message webhooks captured** |
| `ml-classify` | same window | 2 entries (`/complete` intents) |

---

## Key finding

**No retained deploy log contains a `Purchase karein` button tap** in the searched retention window.

Investigation cannot cite a 100% live captured interactive CTA payload. Evidence relies on:
- Live Olli **text** message envelope (captured)
- Parser unit tests for Olli **interactive title** shape
- Dist parser-trace for Option A/B/C

---

## Captured webhook activity (2026-06-08 19:32–19:33 UTC)

### Message webhooks (user actions)

| UTC time | Phone (masked) | `data.type` | Message / content |
|----------|----------------|-------------|-------------------|
| 19:32:20 | `917452897444` | `text` | `/assign_delivery @Shantanu2 SKU001 2000` |
| 19:32:57 | `919456157007` | `text` | `Task 13 done` → ML `/complete` id 13 |
| 19:33:14 | `919456157007` | `text` | `Task 15 done` → ML `/complete` id 15 |

### Status webhooks (delivery receipts)

Majority of POST /webhook volume — `event: status`, `sent` / `delivered` / `read`. These return `ok` immediately (parser returns null).

### HTTP layer

| Metric | Value |
|--------|-------|
| POST /webhook status | **201** consistently |
| Client | `GetOlli-Webhook/1.0` |
| Signature header | `x-getolli-signature` present |
| Response times | 0ms (status) to 2622ms (assign_delivery) |

**Webhook pipe is healthy** — Olli reaches Munshi.

---

## Errors in window (unrelated to CTA)

| Error | Context |
|-------|---------|
| `BadRequestException: Insufficient stock` | Task 13/15 completion — inventory-linked delivery |
| No stack traces for purchase / interactive | — |

No `Unknown workflow command`, `ForbiddenException` workflow, or `ConflictException` session errors for purchase CTA (none attempted in logs).

---

## Low-stock alert generation

`domain_events` staging DB shows `inventory.low_stock` events `COMPLETED` on 2026-06-08 — alerts processed.

Railway logs do **not** log outbound `sendInteractiveButtons` body text at INFO level — cannot confirm alert button payload from logs alone (code + integration tests confirm).

---

## Gap for follow-up live capture

To obtain 100% live `Purchase karein` payload:

1. Trigger real low-stock cross on staging (SKU with `reorder_threshold`)
2. Tap **Purchase karein** on owner/manager phone
3. Immediately pull Railway deploy logs for `controller_body` with `Purchase` or `interactive`

**Recommended filter:** `search: "Purchase"` or `search: "interactive"` in 5-minute window after tap.

---

## Log evidence supporting root cause (indirect)

1. **Zero** `purchase_request_create` strings in inbound webhook logs → CTA id path not reaching backend from real taps
2. Live Olli messages use **`type: text`** envelope for user commands
3. Parser spec documents Olli interactive → **title in `data.text`** (proven for other buttons)
4. DB shows **no** `low_stock_alert` prefill sessions for real factory phones
