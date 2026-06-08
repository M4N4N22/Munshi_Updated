# Phase 1 — Parser Hardening

## Audit finding

In `whatsapp-inbound.parser.ts`, interactive messages checked `data.text` **before** `interactive.button_reply.id`. When Olli sent both (Option C), the title `Purchase karein` won and the slash command id was dropped.

## Change

Reordered the interactive branch:

1. `interactive.button_reply.id`
2. `interactive.list_reply.id`
3. Legacy `interactive.id` (button_reply type)
4. `data.text` → `resolveInteractiveActionId()` (owner-home title map)

## Behaviour matrix

| Payload | Resolved `message` | Router path |
|---------|-------------------|-------------|
| **A** — `button_reply.id` only | `/purchase_request_create?itemId=42` | `workflow_start_command` |
| **B** — `data.text` = `Purchase karein` only | `Purchase karein` | `low_stock_cta_title` → context |
| **C** — text + `button_reply.id` | `/purchase_request_create?itemId=42` | `workflow_start_command` |

## Tests

`whatsapp-inbound.parser.spec.ts`:

- `prefers button_reply.id over data.text for low-stock purchase CTA (scenario C)` — **PASS**
- `parses low-stock purchase button_reply.id only (scenario A)` — **PASS**

## Backward compatibility

Owner-home buttons still resolve via `data.text` when no `button_reply.id` is present (Olli title-only behaviour unchanged).
