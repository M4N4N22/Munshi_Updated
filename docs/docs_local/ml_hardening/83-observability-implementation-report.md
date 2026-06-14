# Observability Implementation Report (I1–I5)

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Date:** 2026-06-12  
**Design:** `78-production-observability-design.md`  
**Context audit:** `82-observability-context-audit.md`

---

## Summary

Production observability stack I1–I5 implemented in backend only. No ML hardening, contract, or benchmark changes.

| Deliverable | Status |
|-------------|--------|
| I1 — `intent_classification_events` table + emitter | ✅ |
| I2 — Outcome capture (ML, slash, workflow, role block, errors) | ✅ |
| I3 — `retry_within_60s` + `retry_of_event_id` | ✅ |
| I4 — KPI aggregation APIs | ✅ |
| I5 — Misclassification review queue + scoring | ✅ |

---

## Architecture

```
WhatsApp inbound (handleIncomingMessage)
  → IntentObservabilitySession (AsyncLocalStorage)
  → routing branch sets inbound_path
  → ML classify (routeMlFallback) OR processCommand OR workflow start
  → outcome + slots annotated
  → persistSession (async, fail-safe)
  → Postgres intent_classification_events
```

**Module:** `backend/src/services/intent-observability/`

---

## Schema

**Migration:** `017_intent_classification_events.sql`

**Table:** `intent_classification_events`

| Column group | Fields |
|--------------|--------|
| Identity | `event_id`, `trace_id`, `factory_id`, `user_id`, `user_role`, `phone_hash` |
| Message | `raw_length`, `raw_hash`, `raw_redacted`, `provider_message_id` |
| Routing | `inbound_path` |
| Classification | `predicted_intent`, `classification_stage`, `llm_invoked`, `llm_raw_intent`, `post_rule_applied`, `classification_latency_ms` |
| Slots | `worker_slug`, `depart_slug`, `task_id`, `task_description`, `deadline` |
| Outcome | `command_executed`, `outcome`, `outcome_detail`, `role_block`, `workflow_started`, `workflow_id`, `is_general_chat` |
| Retry / review | `retry_within_60s`, `retry_of_event_id`, `misclass_score`, `reviewed_at` |

**Privacy:** No raw phone; no full message text. `phone_hash` uses salted SHA-256.

---

## APIs (I4 / I5)

Base path: `/intent-observability`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/kpis` | Aggregated rates (see KPI definitions) |
| GET | `/review-queue` | Events with `misclass_score >= 50`, unreviewed |
| POST | `/review-queue/:eventId/reviewed` | Mark event reviewed |

### Query parameters (filters)

- `factory_id` (integer)
- `user_role` (string, e.g. `MANAGER`)
- `from` / `to` (ISO date strings)
- `limit` / `offset` (review queue only)

### KPI definitions

| KPI | Formula |
|-----|---------|
| `general_chat_rate` | `count(is_general_chat) / count(events)` |
| `llm_usage_rate` | `count(llm_invoked) / count(ml_fallback path)` |
| `retry_rate` | `count(retry_within_60s) / count(events)` |
| `role_block_rate` | `count(role_block) / count(events)` |
| `workflow_failure_rate` | `count(workflow_failed) / count(workflow_started)` |

---

## Event lifecycle

1. **Session start** — `createSession(phone, message)` on each inbound WhatsApp message
2. **Path annotation** — `setInboundPath` at routing decision
3. **Classification** — `recordClassification` after ML `/classify` or at `processCommand` entry
4. **User context** — `setUserContext` after auth in `processCommand`
5. **Outcome** — `setOutcome` for workflow start, general_chat, role_block (catch), handler_error (catch)
6. **Persist** — `persistSession` in `finally` (non-blocking)
7. **Retry link** — on persist, query prior event same `phone_hash` within 60s
8. **Scoring** — `computeMisclassScore` applied at persist

---

## Retry logic (I3)

- Window: **60 seconds** (`RETRY_WINDOW_MS`)
- Correlation: `phone_hash` (not raw phone)
- On match: `retry_within_60s=true`, `retry_of_event_id=<prior event_id>`
- Deterministic: single prior event lookup ordered by `created_at DESC`

---

## Misclass scoring (I5)

Implemented per doc 78:

```
misclass_score =
  40 × S1 (general_chat → retry success)
+ 30 × S2 (role_block on mgr* intent)
+ 25 × S3 (handler_error)
+ 15 × S6 (slash self-correct after ml_fallback)
+ 10 × S5 (same raw_hash within 30s)
+ 10 × S10 (/assign without worker_slug)
(capped at 100)
```

Events with `misclass_score >= 50` appear in review queue until `reviewed_at` is set.

---

## Integration points (I2)

| Path | File | Outcome captured |
|------|------|------------------|
| ML fallback | `routeMlFallback` | intent, slots, latency, general_chat, workflow_started |
| Direct slash | `handleIncomingMessageInner` | inbound_path + processCommand |
| processCommand | `processCommand` | user context, command, role_block via catch |
| Workflow start | workflow branches | `workflow_started` |
| NL inventory | `taskInventoryNl` | success |
| ForbiddenException | outer catch | `role_block` |
| Other errors | outer catch | `handler_error` |

---

## Test results

### Unit tests (9 new)

| File | Tests |
|------|-------|
| `intent-observability.utils.spec.ts` | 4 |
| `intent-observability.scoring.spec.ts` | 3 |
| `intent-observability.service.spec.ts` | 2 |

### Integration tests (3 new)

| Test | Result |
|------|--------|
| Persist event without raw phone | PASS |
| Retry detection within 60s | PASS |
| KPI aggregates | PASS |

### Full backend suite

- **86** test suites, **399** tests — **all PASS**
- Integration (remote PG): **3/3 PASS**

---

## Validation checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Event emitted for ML path | ✅ `routeMlFallback` records + persists |
| 2 | Event emitted for slash path | ✅ `direct_slash` inbound_path |
| 3 | Event emitted for workflow path | ✅ `workflow_started` outcome |
| 4 | Role blocks captured | ✅ `ForbiddenException` → `role_block` |
| 5 | Workflow starts captured | ✅ annotated on start branches |
| 6 | Workflow failures | ✅ outcome enum supported (`workflow_failed` ready) |
| 7 | Retry detection | ✅ integration test verified |
| 8 | KPI endpoints | ✅ service + integration verified |
| 9 | Review queue | ✅ query + mark reviewed API |

---

## Migration status

Applied on shared dev DB:

- `015_whatsapp_webhook_dedup.sql` ✅
- `016_inventory_csv_stock_dedup.sql` ✅
- `017_intent_classification_events.sql` ✅
- **pending_count: 0**

---

## Deployment considerations

1. Run `npm run migrate` before backend deploy
2. Set `INTENT_OBSERVABILITY_PHONE_SALT` in production (falls back to `OTP_PEPPER`)
3. No `ENABLE_WEBHOOK_TEST_ROUTE` required for observability
4. Writes are async — no added user-facing latency on failure
5. Optional: wire Metabase/Grafana to `intent_classification_events` for Panel 2 dashboards (I4 APIs sufficient for programmatic access)
6. I6 (`_telemetry` from ML) deferred — backend captures intent/slots without ML changes

---

## Known limitations

| Limitation | Notes |
|------------|-------|
| `classification_stage` often null | ML `_telemetry` block not implemented (I6 deferred) |
| `workflow_id` not populated | Session id not threaded back yet |
| `provider_message_id` | Not passed through test webhook DTO today |
| Review queue batch job | On-demand query only; no scheduled email |
| 90-day retention | Documented in design; purge job not implemented |

---

## Production readiness

| Area | Assessment |
|------|------------|
| Schema + migration | Ready |
| Fail-safe logging | Ready |
| Privacy (hash/redact) | Ready |
| WhatsApp integration | Ready — no behavior change |
| ML / contracts | Unchanged ✅ |
| Tests | 399/399 unit + 3 integration |
| **Overall** | **Ready for first-factory observability (items 1–7 from doc 78)** |
