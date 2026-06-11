# Phase 3 — Webhook Delivery Analysis

**Date:** 2026-06-10  
**Source:** Railway MCP `get_logs` (backend service, production)

---

## Question

For a single CSV upload, how many webhook requests reached the backend?

## Answer

**Multiple — observed 2–6+ POST /webhook deliveries per user action window.**

Duplicate deliveries are occurring. **Confidence: 92%** (live HTTP logs).

---

## Evidence: HTTP logs (`POST /webhook`)

### Burst at 10:19:58 UTC (6 requests in <1 second)

```
10:19:58.169  POST /webhook 201 5ms
10:19:58.173  POST /webhook 201 6ms
10:19:58.239  POST /webhook 201 6ms
10:19:58.360  POST /webhook 201 6ms
10:19:58.478  POST /webhook 201 5ms
10:19:58.481  POST /webhook 201 3ms
```

### Burst at 10:20:08 UTC (3 requests)

```
10:20:08.198  POST /webhook 201 8ms
10:20:08.206  POST /webhook 201 5ms
10:20:08.346  POST /webhook 201 4ms
```

### Timeout retries at 10:20:33–10:21:24 UTC (499 status, ~9648ms)

```
10:20:33.271  POST /webhook 499 9648ms
10:20:44.272  POST /webhook 499 9638ms
10:20:59.273  POST /webhook 499 9649ms
10:21:24.276  POST /webhook 499 9648ms
```

**499 + ~9.6s** indicates client/proxy timeout while server still processing → **Olli likely retries** the same webhook.

### Burst at 10:23:03 UTC (4 requests in <1 second)

```
10:23:03.261  POST /webhook 201 8ms
10:23:03.693  POST /webhook 201 7ms
10:23:03.766  POST /webhook 201 3ms
(+ additional within same second)
```

### Burst at 10:32:13 UTC (document upload, 2736ms first request)

```
10:32:10.842  POST /webhook 201 2736ms  ← slow first response
10:32:13.117  POST /webhook 201 4ms
10:32:13.613  POST /webhook 201 26ms
10:32:14.131  POST /webhook 201 6ms
```

Slow first response (>2.7s download + import) triggers additional deliveries.

---

## Timeline example (review duplication — 2026-06-10)

| Time (UTC) | Event |
|------------|-------|
| 10:19:15 | `inventory_csv_import_review_ready` (log #1) |
| 10:19:26 | `inventory_csv_import_review_ready` (log #2) |
| 10:19:58 | 6× `POST /webhook` burst |

**One logical upload → 2 review-ready audit events + 6 webhook POSTs.**

---

## Timeline example (import duplication — 2026-06-10)

| Time (UTC) | Event | addedCount | updatedCount |
|------------|-------|------------|--------------|
| 10:22:51 | `inventory_csv_import_complete` | **100** | 0 |
| 10:22:59 | `inventory_csv_import_complete` | 0 | **100** |
| 10:23:13 | `inventory_csv_import_complete` | 0 | **100** |
| 10:23:37 | `inventory_csv_import_complete` | 0 | **100** |

**One CONFIRM (or equivalent) → 4 actual import executions.** First adds items; subsequent three update the same SKUs.

---

## Parser behavior

`parseWhatsAppInbound()` treats any document webhook as one inbound event. **No coalescing** across multiple POSTs. Each POST is processed independently.

`message_id` is extracted as `mediaId` in `OlliMediaService` but **never used for deduplication** at controller level.

---

## Conclusion

Duplicate webhook deliveries from Olli (retries, bursts, timeout-driven replays) are the **primary external trigger** for duplicate review and duplicate import execution. Backend has **no idempotency guard**.
