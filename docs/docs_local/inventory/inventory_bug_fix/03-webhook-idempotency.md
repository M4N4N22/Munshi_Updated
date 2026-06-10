# Fix A — Webhook Idempotency

## Problem

Olli/WABA retries duplicate `POST /webhook` deliveries (~9.6s timeouts observed). Each delivery re-processed the same message, causing duplicate review and import messages.

## Solution

Postgres-backed deduplication using provider `message_id`.

### Schema (`015_whatsapp_webhook_dedup.sql`)

```sql
CREATE TABLE whatsapp_webhook_events (
  provider_message_id VARCHAR(256) UNIQUE,
  event_kind VARCHAR(32),
  from_phone VARCHAR(32),
  processed_at TIMESTAMPTZ
);
```

### Flow

```
POST /webhook
  → extractWebhookDedupeKey(body)  // data.message_id or nested media id
  → WhatsAppWebhookDedupService.tryClaim()
      → first delivery: INSERT, process
      → duplicate: skip, return 'ok'
```

### Key Identifier

`message_id` from webhook `data` is preferred (matches Olli production payloads). Falls back to `document.id` / `media_id`.

### Files

- `whatsapp-webhook-dedup.extract.ts`
- `whatsapp-webhook-dedup.service.ts`
- `whatsapp-webhook-dedup.schema.ts`
- `whatsapp.controller.ts`

## Test Coverage

- `whatsapp-webhook-dedup.extract.spec.ts`
- `whatsapp-webhook-dedup.service.spec.ts`
- `whatsapp.controller.spec.ts`
- `inventory-import-idempotency.integration.spec.ts` (Postgres required)
