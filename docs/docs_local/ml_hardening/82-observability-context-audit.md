# Phase 1 — Observability Context Audit

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Design reference:** `78-production-observability-design.md`  
**Scope:** I1–I5 insertion points (no ML / contract changes)

---

## Message ingress

| Step | File | Function | Observability hook |
|------|------|----------|-------------------|
| Webhook POST | `whatsapp.controller.ts` | `receiveMessage()` | Dedup only today; trace starts in service |
| Test webhook | `whatsapp.controller.ts` | `handleMessage()` | Same service path |
| Core router | `whatsapp.service.ts` | `handleIncomingMessage()` | **I1/I2:** `IntentObservabilityService.createSession` + `runWithSession` |
| Inner logic | `whatsapp.service.ts` | `handleIncomingMessageInner()` | **I2:** `setInboundPath` per branch |

---

## Routing paths (inbound_path)

| Branch | Location (line region) | `inbound_path` value |
|--------|------------------------|------------------------|
| Interactive buttons | `handleIncomingMessageInner` | `interactive` |
| Home trigger | same | `owner_home_trigger` |
| Help | same | `help` |
| Cancel | same | `cancel` |
| CSV awaiting | same | `csv_awaiting` |
| Active workflow session | same | `workflow_session` |
| Slash in session | same | `direct_slash` |
| Manager slash bypass | same | `direct_slash` |
| Workflow start command | same | `workflow_start` |
| Low-stock CTA | same | `low_stock_cta` |
| Disambiguation pick | same | `disambiguation_pick` |
| NL task inventory | same | `nl_task_inventory` |
| ML classify fallback | `routeMlFallback()` | `ml_fallback` |
| Direct slash (no ML) | `handleIncomingMessageInner` | `direct_slash` |

---

## ML classification

| Step | File | Function | Hook |
|------|------|----------|------|
| HTTP classify | `whatsapp.service.ts` | `routeMlFallback()` | **I1:** latency, intent, slots, optional `_telemetry` |
| Response parse | `whatsapp.service.ts` | `parseMlClassifyResponse()` | Unchanged |
| general_chat | `whatsapp.service.ts` | `routeGeneralChat()` | **I2:** outcome `general_chat_routed` |
| Workflow from ML | `workflow-engine.service.ts` | `startWorkflowIfRegistered()` | **I2:** outcome `workflow_started` (annotated in caller) |

ML `bot_engine.py` is **not modified** (per scope). `classification_stage` / `llm_invoked` populated when ML returns optional `_telemetry` block; otherwise null/false.

---

## processCommand

| Step | File | Function | Hook |
|------|------|----------|------|
| Auth + factory | `whatsapp.service.ts` | `processCommand()` entry | **I1:** `setUserContext`, `recordClassification` |
| Role guards | `whatsapp.service.ts` | `ensureManager` / `ensureWorker` | **I2:** `ForbiddenException` → `role_block` (outer catch) |
| Command dispatch | `processCommand()` body | Per-command handlers | Default outcome `success` |
| Unrecognized | end of `processCommand` | fallback replies | outcome remains `success` (response delivered) |

---

## Workflow execution

| Step | File | Function | Hook |
|------|------|----------|------|
| Start | `workflow-engine.service.ts` | `startWorkflowFromCommand()` | Annotated in WhatsApp caller |
| Active session | `workflow-engine.service.ts` | `handleActiveWorkflowMessage()` | `inbound_path=workflow_session` |
| Complete / cancel | `workflow-session.service.ts` | `completeSession` / `cancelSession` | Not separately emitted (session path covers) |

---

## Existing logging / persistence

| Asset | Used for observability? |
|-------|-------------------------|
| `console.log` in WhatsApp | Replaced by structured DB events (stdout retained) |
| `LoggerService` HTTP interceptor | Complementary — no change |
| `whatsapp_webhook_events` | Dedup only — unchanged |
| `domain_events` | Async side-effects — unchanged |
| `purchase_request_audit` | Domain-specific — unchanged |

---

## New persistence (I1)

**Table:** `intent_classification_events` (`017_intent_classification_events.sql`)

**Module:** `backend/src/services/intent-observability/`

| Component | Role |
|-----------|------|
| `intent-classification-event.schema.ts` | Sequelize model |
| `intent-observability.repository.ts` | CRUD + KPI queries |
| `intent-observability.service.ts` | Session ALS, persist, retry, scoring |
| `intent-observability.controller.ts` | I4/I5 REST APIs |

---

## Privacy

- `phone_hash` = SHA-256 with salt (`INTENT_OBSERVABILITY_PHONE_SALT` or `OTP_PEPPER`)
- `raw_hash` = SHA-256 of normalized message
- `raw_redacted` = mention/digit-redacted preview (max 200 chars)
- No raw phone or full message stored by default

---

## Fail-safe

`persistSession()` is fire-and-forget; failures log at `warn` and never throw to WhatsApp handler.
