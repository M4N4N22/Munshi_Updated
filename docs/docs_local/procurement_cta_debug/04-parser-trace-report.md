# Phase 4 — Inbound Parser Trace

**Date:** 2026-06-08  
**Method:** Compiled `dist/` parser executed in investigation-only trace (no code changes)

---

## `parseWhatsAppInbound()` logic

**File:** `backend/src/modules/whatsapp/whatsapp-inbound.parser.ts`

### Input → output

| Input condition | Output `message` |
|-----------------|------------------|
| `data.type === 'text'` | `data.text` trimmed |
| `data.type === 'interactive'` + `data.text` set | `resolveInteractiveActionId(text)` or raw `text` |
| `data.type === 'interactive'` + `button_reply.id` (no text) | `button_reply.id` trimmed |
| `event === 'status'` | `null` (ignored) |

### Interactive precedence (critical)

```
IF data.type === 'interactive':
  IF data.text present:
    RETURN resolveInteractiveActionId(data.text) ?? data.text   ← STOPS HERE
  ELSE IF button_reply.id:
    RETURN button_reply.id
```

---

## Trace results

### Option A — Meta `button_reply.id`

| Field | Value |
|-------|-------|
| Raw payload | `interactive.button_reply.id = /purchase_request_create?itemId=42` |
| `inbound.kind` | `text` |
| **Resolved message** | `/purchase_request_create?itemId=42` |
| `resolveInteractiveActionId` | `null` |
| `isPurchaseRequestWorkflowCommand` | `true` (helper exists but **not called by router**) |
| **Router branch** | `workflow_start_command` |

### Option B — Olli `data.text` title

| Field | Value |
|-------|-------|
| Raw payload | `type: interactive`, `text: Purchase karein` |
| **Resolved message** | `Purchase karein` |
| `resolveInteractiveActionId` | `null` |
| `matchWorkflowStartCommand` | `null` |
| **Router branch** | `ml_fallback_or_nl_task` |

### Option C — Both text and id

| Field | Value |
|-------|-------|
| Raw payload | `text: Purchase karein` + `button_reply.id: /purchase_request_create?itemId=42` |
| **Resolved message** | `Purchase karein` (**id never read**) |
| **Router branch** | `ml_fallback_or_nl_task` |

### Live Olli text (reference)

| Field | Value |
|-------|-------|
| Raw payload | `type: text`, `text: /assign_delivery ...` |
| **Resolved message** | `/assign_delivery @Shantanu2 SKU001 2000` |
| **Router branch** | `processCommand_direct_slash` |

---

## What message reaches `handleIncomingMessage()`?

**Controller wiring** (`whatsapp.controller.ts`):

```typescript
return await this.whatsappService.handleIncomingMessage({
  from: inbound.from,
  message: inbound.message,  // ONLY these two fields
});
```

No raw payload, no `button_reply` metadata, no `itemId` — **only the parsed string**.

For failed CTA path: `body.message === "Purchase karein"`.

---

## `resolveInteractiveActionId` mapping gap

Registered title mappings (work):
- `Employee jodiyein` → `home_add_employee`
- `Google Form se add` → `team_google_form`
- etc.

**Not registered:**
- `Purchase karein` → (nothing)
- `/purchase_request_create?itemId=N` → (not a title lookup; needs workflow matcher)

`WA_LOW_STOCK_BUTTON_TITLES` and `isPurchaseRequestWorkflowCommand()` exist in `whatsapp-interactive.constants.ts` but are **not invoked** by parser or router.

---

## Parser stop point (failure path)

```
parseWhatsAppInbound()
  → message = "Purchase karein"
  → passes to handleIncomingMessage
  → NOT a workflow command string
```

**Execution does not stop in parser** (parser succeeds). Failure is **downstream in router** when `matchWorkflowStartCommand` returns null.
