# Phase 4 — Message Deduplication Audit

**Date:** 2026-06-10

---

## Question

Do we currently deduplicate inbound media uploads / webhook messages?

## Answer

**NO — gap confirmed.**

---

## Search results

| Identifier | Where captured | Used for dedup? |
|------------|----------------|-----------------|
| `message_id` / `wamid` | `OlliMediaService.refFromMessageId()`, `whatsapp-contact.extract.ts` ignore list | **NO** |
| `media.id` | `refFromObject()` as `mediaId` | **NO** |
| `media_id` | Webhook payload fields | **NO** |
| `provider_message_id` | Not found in codebase | **N/A** |

---

## Webhook controller

`whatsapp.controller.ts`:

```typescript
@Post()
async receiveMessage(@Body() body: any) {
  const inbound = parseWhatsAppInbound(body);
  if (!inbound) return 'ok';
  if (inbound.kind === 'document') {
    return await this.whatsappService.handleIncomingDocument(...);
  }
  return await this.whatsappService.handleIncomingMessage(...);
}
```

- No `message_id` extraction at controller level
- No Redis/DB/memory cache of processed IDs
- No idempotency key header check
- Always returns `'ok'` / `'error'` string (201) — no dedup window

---

## Text message dedup

`handleIncomingMessage()` — no deduplication for CONFIRM/CANCEL or commands either.

Duplicate `CONFIRM` webhooks can each call `confirmImport()` if they arrive before session is deleted.

---

## Session-level "protection" (insufficient)

`inventory-bulk-import.service.ts`:

- `getPending()` checks TTL expiry
- `confirmImport()` deletes session **after** import completes
- **No lock** during import execution
- **No "already processing" flag** for document uploads

Race window: two concurrent `handleIncomingDocument` calls both see `phase === 'awaiting_upload'` or `awaiting_confirm`.

---

## Comparison to other modules

| Module | Dedup |
|--------|-------|
| `integration-sync-failed.helper` | Dedup by aggregate id |
| `inventory-low-stock-alert.recipients` | Phone dedup |
| WhatsApp inbound | **None** |

---

## Gap summary

| Required for fix | Status |
|------------------|--------|
| Store processed `message_id` with TTL | **Missing** |
| Reject duplicate document webhooks | **Missing** |
| Mutex on `confirmImport` per phone | **Missing** |
| Idempotent import by `batch_id` + content hash | **Missing** |

---

## Confidence

**98%** — full codebase search; no inbound dedup implementation exists.
