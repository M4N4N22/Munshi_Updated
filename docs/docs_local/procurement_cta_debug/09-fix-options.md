# Phase 10 — Fix Options (No Implementation)

**Date:** 2026-06-08  
**Status:** Recommendations only

---

## Fix A — Map `Purchase karein` title + prefer `button_reply.id` (Recommended)

### Changes (conceptual)

1. **Parser precedence:** If `button_reply.id` is present, use it **before** `data.text` title fallback
2. **Title map:** Add `Purchase karein` → pass-through of `isPurchaseRequestWorkflowCommand(id)` OR map to a resolver
3. **Router:** Call `isPurchaseRequestWorkflowCommand(msgTrim)` before ML fallback

### Complexity

**Low** — 2–3 files: `whatsapp-inbound.parser.ts`, `whatsapp-interactive.constants.ts`, `whatsapp.service.ts`

### Risk

**Low** — mirrors existing owner-home button pattern

### Compatibility

- Option A (id-only) — still works
- Option B (title-only) — needs itemId strategy (see Fix B partial)
- Option C — fixed by precedence change

### Limitation

Title-only tap still lacks `itemId` unless paired with context cache (Fix B).

---

## Fix B — Alert context cache per phone

### Changes (conceptual)

On `InventoryLowStockAlertHandler.send`, store:

```
{ phone, inventoryItemId, factoryId, expiresAt }
```

On inbound `Purchase karein`, lookup → `startWorkflowFromCommand('/purchase_request_create?itemId=N')`

### Complexity

**Medium** — new cache (Redis or DB table), TTL, multi-alert handling

### Risk

**Medium** — stale context if multiple low-stock alerts; wrong item if user taps old alert

### Compatibility

Works regardless of Olli payload shape

---

## Fix C — Olli configuration / Meta passthrough

### Changes (conceptual)

Configure Olli webhook to forward `button_reply.id` without overwriting via `data.text`, OR use template that preserves id.

### Complexity

**Low** on Munshi side (verify only) — depends on Olli vendor

### Risk

**Medium** — external dependency; may not be configurable

### Compatibility

Fixes root cause at source if Olli can emit Option A shape

---

## Comparison matrix

| Fix | Complexity | Risk | Fixes Option B | Fixes Option C | Needs procurement redesign |
|-----|------------|------|----------------|----------------|---------------------------|
| **A** | Low | Low | Partial* | Yes | **NO** |
| **B** | Medium | Medium | Yes | Yes | **NO** |
| **C** | Low (Munshi) | Medium | Yes | Yes | **NO** |

\*Partial: title-only still needs itemId from cache or user prompt

---

## Recommended approach

**Fix A + live Olli payload verification (Fix C verify)**

1. Reorder parser to prefer `button_reply.id`
2. Wire `isPurchaseRequestWorkflowCommand` in router before ML
3. Capture one live tap post-deploy to confirm shape
4. Add Fix B only if title-only persists without id

---

## Procurement redesign required?

# **NO**

Existing `PURCHASE_REQUEST_CREATE` workflow, prefill service, and approval chain are proven via integration tests. Only inbound routing from CTA → workflow command is broken.
