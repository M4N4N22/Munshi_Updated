# Phase 3–4 — Low Stock Alert Context Cache + Title Fallback

## Purpose

When Olli echoes only the button **title** (`Purchase karein`) without `button_reply.id`, the system must still resolve which inventory item triggered the alert.

## Storage

**Table:** `low_stock_alert_contexts` (migration `014_low_stock_alert_context.sql`)

| Column | Type | Notes |
|--------|------|-------|
| `phone_number` | VARCHAR(32) | Alert recipient |
| `factory_id` | INTEGER | FK → factories |
| `inventory_item_id` | INTEGER | FK → inventory_items |
| `inventory_item_name` | VARCHAR(255) | For disambiguation display |
| `alert_sent_at` | TIMESTAMPTZ | When alert was sent |
| `expires_at` | TIMESTAMPTZ | `alert_sent_at + 24h` |

Index: `(phone_number, expires_at DESC)`

No Redis — follows existing Sequelize/Postgres persistence pattern (same family as `workflow_sessions`).

## Write path

`InventoryLowStockAlertHandler.sendAlertIndependently()` records context **after** successful outbound send per recipient:

```typescript
await this.lowStockAlertContext.recordAlertContext({
  phone,
  factoryId,
  inventoryItemId,
  inventoryItemName,
});
```

## Read path — `LowStockAlertContextService`

| Method | Behaviour |
|--------|-----------|
| `listActiveDistinct(phone)` | Non-expired rows, deduped by `inventory_item_id` (latest alert wins) |
| `resolveCtaTitle(phone)` | 1 item → command; 2+ → disambiguation prompt; 0 active + expired rows → expired msg; 0 ever → none msg |
| `tryResolveDisambiguationSelection(phone, n)` | Maps `1..N` to item when multiple active |

## User messages

| Case | Message |
|------|---------|
| Expired | `Purchase alert expired.\nPlease wait for a new alert.` |
| No context | `Unable to determine inventory item.\nPlease create a purchase request manually.` |
| Multiple | `I found multiple low-stock items.\n\n1. …\n2. …\n\nReply with item number.` |

## TTL

`LOW_STOCK_ALERT_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000` (24 hours).

## Design constraints honoured

- No workflow state changes
- No approval / vendor / procurement schema changes
- No alert generation logic changes (only post-send context write)
