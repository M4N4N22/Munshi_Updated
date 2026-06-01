# Procurement Smoke Test Report

**Date:** 2026-06-01  
**Script:** `node scripts/swagger-smoke-test.mjs`

## Before fix

| Metric | Value |
|--------|-------|
| Total tests | 23 |
| Passed | 21 |
| Failed | 2 |
| Pass rate | 91.3% |

### Failures

1. `GET /purchase-requests?factory_id=3` → **500** (`requester_id does not exist`)
2. `POST /purchase-requests` → **400** (missing `requested_by`; smoke used `requester_id`)

## After fix

| Metric | Value |
|--------|-------|
| Total tests | 23 |
| Passed | 23 |
| Failed | 0 |
| Pass rate | **100%** |

### Procurement-specific results

| Method | Path | Status | ms | Note |
|--------|------|--------|-----|------|
| GET | `/purchase-requests?factory_id=3` | 200 | 45 | `{"data":[],"total":0,...}` or populated list |
| POST | `/purchase-requests` | 201 | 438 | Creates draft with `requested_by: 18` |

### Smoke test changes

1. Bootstrap `requested_by` from `GET /factories/{F}/users` (fallback 18).
2. POST body:

```json
{
  "factory_id": 3,
  "requested_by": 18,
  "title": "Smoke PR",
  "items": [{ "item_name": "Smoke test item", "requested_quantity": "1", "unit": "pcs" }]
}
```

## Latency summary (full smoke run)

| Stat | ms |
|------|-----|
| min | 3 |
| max | 438 |
| avg | 79 |
| p95 | 274 |

## Full audit (`swagger-full-audit.mjs`)

Procurement-tagged routes pass after payload fix. Remaining audit failures are unrelated (vendor phone validation, duplicate inventory seed data 409s).
