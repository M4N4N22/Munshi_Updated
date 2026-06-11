# Phase 8 — Notification / Message Sending Investigation

**Date:** 2026-06-10

---

## Question

Are duplicate messages caused by duplicate execution OR duplicate notification sending?

## Answer

**Duplicate execution** — each webhook triggers a full handler that sends exactly one message per successful path.

---

## Review messages

Path: `handleIncomingDocument()` → `importFromCsvBuffer()` → returns review string → `sendTextMessage(from, summary)`

- **One send per webhook invocation**
- No loop, no broadcast, no retry inside `sendTextMessage`
- Duplicate reviews = **duplicate `importFromCsvBuffer` calls**

---

## Complete messages

Path A — auto-import:
`handleIncomingDocument` → `importFromCsvBuffer` (no review) → `sendTextMessage(summary)`

Path B — CONFIRM:
`handleIncomingMessage` → `handleReviewReply` → `confirmImport` → `sendTextMessage(reviewReply)`

- **One send per successful import execution**
- 4 complete messages = 4 `confirmImport` / `uploadCsv` completions

---

## `MessagingService.sendText`

No internal duplicate-send logic found. Outbound is 1:1 with handler calls.

---

## Message content explains execution count

| Message pattern | Meaning |
|-----------------|---------|
| First: Added 100, Categories Created 5 | `processImportWithProvisioning` first run |
| Later: Updated 100, Categories Created 0 | Re-import; master data already exists |
| Failed 100, Category not found | Auto-import without provisioning |

Different summary content across duplicates **confirms** imports ran with different outcomes — not a single import with duplicate notifications.

---

## Slow response → more webhooks → more messages

First document webhook at 10:32:10 took **2736ms** (download + parse + review/import). Olli/proxy may fire additional deliveries before ACK, each producing another outbound message.

---

## Confidence

**93%** — one-message-per-handler-call architecture; log correlation.
