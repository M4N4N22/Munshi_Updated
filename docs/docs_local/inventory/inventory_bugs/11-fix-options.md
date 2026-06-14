# Phase 11 — Fix Options (Proposals Only)

**Date:** 2026-06-10  
**No implementation in this task.**

---

## Fix A — Inbound webhook idempotency (message_id cache)

**Description:** At `receiveMessage()`, extract `data.message_id` (or composite `from+message_id`). If seen within TTL (e.g. 24h), return `ok` immediately without processing. Store in Redis or Postgres `processed_webhook_events` table.

| Attribute | Rating |
|-----------|--------|
| Complexity | **Medium** |
| Risk | **Low** — standard pattern |
| Fixes | BUG 2, BUG 3 (primary) |
| Does not fix alone | BUG 1 |

---

## Fix B — Remove or gate `canAutoImport()` legacy path

**Description:** Delete lines 181–189 in `handleIncomingDocument()` OR require `isAwaitingCsv(from)` before any inventory import. Direct CSV without `/inventory_import_csv` → prompt only (existing fallback message).

| Attribute | Rating |
|-----------|--------|
| Complexity | **Low** |
| Risk | **Low** — aligns with documented UX |
| Fixes | BUG 1 |
| Breaking change | Owners who relied on silent auto-import |

---

## Fix C — Mutex / idempotent `confirmImport`

**Description:**
- Set `phase: 'importing'` before `processImportWithProvisioning`
- Reject duplicate CONFIRM while importing
- Or use DB idempotency: `import_batch_id` + unique constraint on transactions

| Attribute | Rating |
|-----------|--------|
| Complexity | **Medium** |
| Risk | **Low–Medium** |
| Fixes | BUG 3 (CONFIRM duplicates) |
| Pair with | Fix A |

---

## Fix D — Async processing + fast ACK

**Description:** Return 201 immediately; queue document download/import to worker. Reduces 499 timeouts and Olli retries.

| Attribute | Rating |
|-----------|--------|
| Complexity | **High** |
| Risk | **Medium** — new queue infra |
| Fixes | Amplifier D |
| Long-term | Recommended for large CSVs |

---

## Fix E — Document upload debounce per phone

**Description:** In-memory `lastProcessedMediaId` per phone; ignore same `mediaId` within 60s.

| Attribute | Rating |
|-----------|--------|
| Complexity | **Low** |
| Risk | **Medium** — fails across instances; weaker than Fix A |
| Fixes | Partial BUG 2/3 |

---

## Recommended approach (preferred)

**Phase 1 (quick, high impact):**
1. **Fix B** — Remove `canAutoImport` auto-import path
2. **Fix A** — `message_id` dedup at webhook ingress (Postgres table acceptable; no Redis required)
3. **Fix C** — `importing` phase lock on `confirmImport`

**Phase 2 (hardening):**
4. **Fix D** — Async import for CSVs > N rows or download > 2s

---

## Testing requirements for fix PR

- Unit: duplicate `message_id` ignored
- Unit: CSV without session → no `processImport`
- Integration: double CONFIRM → single import
- Integration: concurrent document webhooks → single review
- UAT: one upload → one review → one complete
