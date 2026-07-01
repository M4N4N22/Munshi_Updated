# Phase 10 — Root Cause Analysis

**Date:** 2026-06-10

---

## Root Cause A — No inbound webhook idempotency

| Field | Value |
|-------|-------|
| **Confidence** | **92%** |
| **Evidence** | No `message_id` dedup in controller/parser; Railway shows 2–6 POST /webhook per action; 499 timeout retries |
| **Impact** | BUG 2 (duplicate review), BUG 3 (duplicate import/complete) |
| **Mechanism** | Each duplicate POST runs full `handleIncomingDocument` or `handleIncomingMessage` |

---

## Root Cause B — Legacy `canAutoImport()` bypasses review flow

| Field | Value |
|-------|-------|
| **Confidence** | **95%** |
| **Evidence** | `whatsapp.service.ts:181-189`; unit test `imports valid CSV for owner via auto context without review`; BUG 1 symptoms match `processImport` without `ensureMasterData` |
| **Impact** | BUG 1 — immediate import, Failed:100 Category not found |
| **Mechanism** | Owner/manager CSV without `/inventory_import_csv` → `uploadCsv()` → `processImport()` with no category provisioning |

---

## Root Cause C — Race on `confirmImport()` / review build (no mutex)

| Field | Value |
|-------|-------|
| **Confidence** | **88%** |
| **Evidence** | Session deleted only after import completes; parallel CONFIRM webhooks; 4× `import_complete` with added→updated pattern |
| **Impact** | BUG 3 — multiple Added/Updated complete messages; potential stock inflation |
| **Mechanism** | Two+ handlers read `awaiting_confirm` before either deletes session |

---

## Root Cause D — Slow synchronous processing encourages retries

| Field | Value |
|-------|-------|
| **Confidence** | **75%** |
| **Evidence** | POST /webhook 2736ms; 499 @ ~9648ms; bursts after slow requests |
| **Impact** | Amplifies A and C |
| **Mechanism** | Olli/proxy timeout → retry same event |

---

## Ranking

| Rank | Cause | Confidence |
|------|-------|------------|
| 1 | **B** — Legacy auto-import path | 95% |
| 2 | **A** — No webhook dedup | 92% |
| 3 | **C** — confirmImport race | 88% |
| 4 | **D** — Timeout-driven retries | 75% |

---

## BUG mapping

| Bug | Primary cause | Secondary |
|-----|---------------|-----------|
| BUG 1 — Direct CSV import without command | **B** | — |
| BUG 2 — Duplicate review messages | **A** | C (concurrent upload handlers) |
| BUG 3 — Duplicate complete + Added→Updated | **A + C** | D |

---

## What is NOT the root cause

| Ruled out | Confidence |
|-----------|------------|
| Document processing job fan-out | 99% |
| `workflow_sessions` replay | 99% |
| Duplicate notification API calls in one handler | 93% |
| ML classification path | 99% |

---

## Final conclusion

Inventory CSV import duplication is a **compound failure**:

1. **Product bug:** Legacy auto-import path should not exist (or must require session).
2. **Reliability bug:** No idempotency on WhatsApp `message_id` allows Olli duplicate/retried webhooks to re-execute imports.
3. **Concurrency bug:** In-memory session has no lock; `confirmImport` is not atomic.

All three should be addressed in a fix. Removing auto-import alone does not stop duplicate CONFIRM retries.
