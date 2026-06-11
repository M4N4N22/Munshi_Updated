# Phase 6 — Review Session Investigation

**Date:** 2026-06-10

---

## Session model

`InventoryBulkImportService.pendingByPhone: Map<string, PendingCsv>`

| Phase | Set by | TTL |
|-------|--------|-----|
| `awaiting_upload` | `startAwaitingCsv()` | 15 min (`INVENTORY_CSV_PENDING_TTL_MS`) |
| `awaiting_confirm` | After CSV parsed in review flow | 15 min (`INVENTORY_CSV_REVIEW_TTL_MS`) |

**Not persisted** to Postgres. No `workflow_sessions` involvement.

---

## State transitions

```
[none]
  → /inventory_import_csv → awaiting_upload
  → CSV upload (review path) → awaiting_confirm (+ rows, review, batchId stored)
  → CONFIRM → deleted (import runs)
  → CANCEL → deleted
  → TTL expiry → deleted (getPending returns null)
```

---

## Question

Can the same upload create multiple review sessions?

## Answer

**Effectively YES** — multiple review **messages** and session overwrites, not multiple Map keys.

---

## Race scenarios

### Scenario 1: Concurrent document webhooks (observed)

Two webhooks arrive while `phase === 'awaiting_upload'`:

1. Both pass `inventoryAwaitingUpload` check
2. Both call `importFromCsvBuffer()`
3. Both call `buildImportReview()` and `formatReviewMessage()`
4. Both call `sendTextMessage()` → **duplicate review messages**
5. Last write to `pendingByPhone` wins (same phone key)

**Railway evidence:** 2× `inventory_csv_import_review_ready` at 10:19:15 and 10:19:26.

### Scenario 2: After first review

If `phase === 'awaiting_confirm'`, subsequent document webhooks hit:

```typescript
if (inventoryAwaitingConfirm) {
  await this.sendTextMessage(from, 'Pehle import review complete karein…');
}
```

This sends a **reminder**, not a duplicate review — unless webhooks are concurrent with the first review build.

### Scenario 3: Duplicate CONFIRM

Two CONFIRM webhooks while `awaiting_confirm`:

1. Both enter `handleReviewReply()` → `confirmImport()`
2. Both read pending before delete
3. Both run `processImportWithProvisioning()`
4. **Duplicate imports** (see Phase 7)

---

## Session states documented vs implemented

| State | Implemented? |
|-------|--------------|
| PENDING (upload) | `awaiting_upload` |
| PENDING (review) | `awaiting_confirm` |
| CONFIRMED | Transient — deleted on confirm |
| COMPLETED | No explicit state (session deleted) |
| EXPIRED | Implicit via TTL in `getPending()` |

No `COMPLETED` guard prevents re-processing.

---

## Confidence

**90%** — code race analysis + 2 review_ready log events for one upload window.
