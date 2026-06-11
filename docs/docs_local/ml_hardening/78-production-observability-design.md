# ML Hardening Closure — Production Observability Design

**Date:** 2026-06-11  
**Branch context:** `feature/shantanu-ml-hardening-v1`  
**Mode:** Design only — closes ML Hardening program (V1 → V2E + audits)  
**Ship confidence (doc 77):** 7.5 / 10 — observability required before scale

---

## Program closure statement

ML Hardening achieved **100% on 629 eval cases** (smoke + workflow, deterministic + live). Real-world audit (doc 77) identified residual risk in typos, voice-to-text, role ambiguity, and LLM-path messages **outside the eval manifold**.

**This document defines how Munshi learns from production** — not further regex/LLM hardening. Implementation of this observability stack is the recommended post-hardening engineering priority before onboarding multiple factories.

---

## Phase 1 — Current visibility audit

### What is logged today

| Layer | What exists | Persistence | Structured? |
|-------|-------------|-------------|-------------|
| **ML `/classify`** | Returns JSON response only | None | N/A |
| **Backend `routeMlFallback`** | `console.log('ml-classify', ml)` | Stdout only | Partial (intent + slots) |
| **Backend `handleIncomingMessage`** | `console.log({ result })`, `console.log(error)` | Stdout only | No |
| **HTTP interceptor** | Method + URL + status + latency | Stdout via `LoggerService` | Yes (HTTP only) |
| **Webhook dedup** | `whatsapp_webhook_duplicate_skipped` event | Stdout | Yes |
| **`WhatsAppWebhookEvent` table** | `provider_message_id`, `event_kind`, `from_phone` | Postgres | Yes — dedup only |
| **Document extraction** | `ExtractionAuditService` metadata trail | Document metadata | Yes — documents only |
| **Purchase requests** | `purchase_request_audit` table | Postgres | Yes — PR domain only |

### What is invisible today

| Decision | Impact |
|----------|--------|
| **Classification stage** (`workflow` / `operational` / `llm` / `slash`) | Cannot measure regex vs LLM reliance in production |
| **LLM invocation** | V2D showed 0% on eval; production rate unknown |
| **Pre/post-processing intent** | LLM raw vs post-rule (`assign`→`mgrassign`) not captured |
| **Role at classify time** | ML called without role; role blocks happen later — unattributable |
| **Routing path** | `direct_slash` / `nl_task_inventory` / `ml_fallback` / `workflow_session` not distinguished |
| **`general_chat` branch** | Owner home vs worker hints vs LLM chat text — not logged |
| **Backend outcome** | `processCommand` success, `ForbiddenException`, workflow start/fail |
| **Slot quality** | `worker_slug`, `depart_slug`, `task_id` returned but not audited against handler use |
| **Retry / correction** | No session linkage between consecutive user messages |
| **Message content** | Not stored for intent replay (privacy aside, no mining pipeline) |
| **Factory segmentation** | Hard to compare intent quality across factories |

### Gap summary

> Production intent quality is **effectively unmeasured**. Stdout logs are ephemeral, non-queryable, and lack stage/outcome context. The eval suite cannot improve without a feedback loop from real traffic.

---

## Phase 2 — Classification telemetry design

### Architecture

```
WhatsApp inbound
  → Backend: routing decision (path)
  → ML /classify (optional)
  → Backend: handler outcome
  → Emit IntentClassificationEvent (single correlated record)
```

**Correlation ID:** `trace_id` = UUID per inbound webhook message (reuse `provider_message_id` where available).

### Event schema: `IntentClassificationEvent`

Versioned JSON document. Store in Postgres table `intent_classification_events` (recommended) or append-only log sink (Datadog/Cloud Logging).

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "trace_id": "uuid",
  "timestamp": "2026-06-11T12:00:00.000Z",

  "factory_id": 42,
  "user_id": 1001,
  "user_role": "MANAGER",
  "phone_hash": "sha256:…",

  "message": {
    "raw_length": 28,
    "raw_redacted": "priya ko *** bhejo",
    "raw_hash": "sha256:…",
    "language_hint": "hinglish",
    "is_reply": false,
    "provider_message_id": "wamid.…"
  },

  "routing": {
    "inbound_path": "ml_fallback",
    "prior_path_attempted": ["nl_task_inventory"],
    "active_workflow_session": null
  },

  "classification": {
    "contract_version": "v1.1",
    "predicted_intent": "/assign",
    "predicted_intent_source": "operational",
    "classification_stage": "operational",
    "llm_invoked": false,
    "llm_raw_intent": null,
    "post_rule_applied": [],
    "latency_ms": 12
  },

  "slots": {
    "worker_slug": "priya",
    "depart_slug": null,
    "task_id": null,
    "task_description": null,
    "deadline": null,
    "reject_reason": null
  },

  "backend": {
    "command_executed": "/assign",
    "handler": "processCommand",
    "outcome": "success",
    "outcome_detail": null,
    "role_block": false,
    "workflow_started": false,
    "workflow_id": null,
    "http_status": 200
  },

  "signals": {
    "is_general_chat": false,
    "general_chat_branch": null,
    "retry_within_60s": false,
    "retry_of_event_id": null,
    "similar_prior_message_hash": null
  }
}
```

### Field definitions

#### `routing.inbound_path` (enum)

| Value | Meaning |
|-------|---------|
| `direct_slash` | User sent explicit `/command` |
| `workflow_session` | Active multi-step workflow consumed message |
| `nl_task_inventory` | `taskInventoryNl.tryHandleFreeText` handled |
| `ml_fallback` | `routeMlFallback` → `/classify` |
| `disambiguation_pick` | Numeric disambiguation reply |
| `owner_home_trigger` | Pre-ML owner menu trigger |

#### `classification.classification_stage` (enum)

| Value | ML layer |
|-------|----------|
| `slash` | `CommandParser` |
| `workflow` | `workflow_pre_classify` |
| `operational` | `operational_pre_classify` |
| `assign_clarify` | `assign_clarify_pre_classify` |
| `deterministic` | `deterministic_pre_classify` |
| `anti_sink` | `delegation_anti_sink_pre_classify` (eval/CI only today) |
| `llm` | `llm_classify` |
| `none` | No classification (e.g. NL inventory path) |

#### `classification.post_rule_applied` (array)

Examples: `assign_to_mgrassign`, `assign_to_clarify`, `invalid_intent_to_general_chat`.

#### `backend.outcome` (enum)

| Value | Meaning |
|-------|---------|
| `success` | Command/workflow completed |
| `role_block` | `ensureManager` / `ensureWorker` ForbiddenException |
| `workflow_started` | Multi-step workflow entered |
| `workflow_failed` | Workflow start returned error |
| `handler_error` | Uncaught handler exception |
| `general_chat_routed` | Routed to owner home / worker hints |
| `unrecognized` | No handler matched |

### Companion event: `IntentSessionSignal` (lightweight)

Emitted on subsequent message from same `phone_hash` within 120s:

```json
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "prior_event_id": "uuid",
  "timestamp": "…",
  "phone_hash": "sha256:…",
  "signal_type": "retry_suspected",
  "time_delta_ms": 45000,
  "message_hash_changed": true,
  "prior_outcome": "general_chat_routed",
  "current_outcome": "success"
}
```

### Privacy controls (mandatory)

| Rule | Implementation |
|------|----------------|
| PII minimization | Store `raw_hash` + `raw_redacted`; full text opt-in per factory |
| Retention | 90 days raw redacted; 1 year aggregates |
| Access | Factory-scoped RBAC; no cross-factory message browsing |
| Opt-out | Factory flag `intent_logging_enabled` default true with consent |

### ML service instrumentation (design)

`/classify` response should **optionally** include debug block (behind `X-Debug-Telemetry: 1` or internal network only):

```json
{
  "intent": "/assign",
  "worker_slug": "priya",
  "_telemetry": {
    "classification_stage": "operational",
    "llm_invoked": false,
    "latency_ms": 11
  }
}
```

Backend merges ML telemetry with handler outcome into `IntentClassificationEvent`.

---

## Phase 3 — Misclassification detection

Automated inference **without manual labels**. Signals ranked by confidence.

### Signal catalog

| Signal ID | Detection logic | Confidence | Indicates |
|-----------|-----------------|------------|-----------|
| **S1: general_chat → retry success** | `general_chat_routed` then within 60s different message → non-general success | High | Wrong sink or greeting misroute |
| **S2: role_block after confident ML** | `predicted_intent` in mgr* family + `role_block` + `user_role=WORKER` | High | Role-intent mismatch (product gap) |
| **S3: handler_error after classify** | `outcome=handler_error` + valid intent | High | Slot extraction or handler bug |
| **S4: workflow abandon** | `workflow_started` + no session progress + `cancel` or silence >10min | Medium | Wrong workflow or UX confusion |
| **S5: rapid repeat** | Same `raw_hash` within 30s | Medium | User impatience or failed first attempt |
| **S6: slash after ML** | User sends `/command` within 120s after `ml_fallback` failure path | High | User self-corrected |
| **S7: help after operational** | `/help` or owner home within 60s of non-chat outcome | Medium | Confusion |
| **S8: LLM path cluster** | `llm_invoked=true` rate spike per factory | Medium | Regex coverage gap |
| **S9: intent entropy spike** | Factory's top intent drops below 40% weekly | Low | Onboarding noise or classifier drift |
| **S10: slot null on slot-required intent** | `/assign` without `worker_slug` reaching handler | High | Classification or post-rule bug |

### Scoring model: `misclass_score` (0–100)

```
misclass_score =
  40 * S1 + 30 * S2 + 25 * S3 + 15 * S6
  + 10 * S5 + 10 * S8 + 10 * S10
  (capped at 100)
```

Events with `misclass_score >= 50` enter **review queue** automatically.

### User confusion proxies (no labels)

| Proxy | Definition |
|-------|------------|
| **Retry rate** | % sessions with S1 or S5 |
| **Self-correction rate** | % sessions with S6 |
| **Abandon rate** | % workflows started but not completed in 24h |
| **Chat sink rate** | % inbound → `general_chat` (non-greeting) |

### Weekly auto-report (no ML changes)

Top 20 messages by `misclass_score` with redacted text, intended cluster guess from retry outcome, factory_id, role.

---

## Phase 4 — Dataset evolution plan

### Pipeline: production → eval

```
IntentClassificationEvent (misclass_score >= 50)
  → Weekly review queue (ML owner + 1 product reviewer)
  → Label: expected_intent + slice tag
  → Add to ml/data/eval/production/mined-YYYY-MM.jsonl
  → PR to eval suite + regression run
  → Promote to smoke if boundary-critical
```

### Cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Auto-queue high-score events | Daily aggregation | System |
| Human review session | **Weekly** (30 min) | ML + Product |
| Eval PR merge | **Bi-weekly** max | ML engineer |
| Smoke promotion | When ≥3 similar failures same cluster | ML lead sign-off |
| Full benchmark run | Every eval PR | CI |

### Promotion criteria

| Tier | Criteria | Destination |
|------|----------|-------------|
| **P0** | S1/S6 with clear expected intent; reproducible | `smoke-v1.x.jsonl` within 2 weeks |
| **P1** | S2 role mismatch; document only | `docs/known-gaps.md` + backend ticket |
| **P2** | S8 LLM cluster ≥10 cases/week | `workflow` intent JSON file |
| **P3** | Low score, ambiguous | Archive 90 days; no eval add |

### Thresholds triggering eval updates

| KPI breach | Action |
|------------|--------|
| `general_chat` rate >15% (non-greeting) | Mandatory review within 7 days |
| `llm_invoked` rate >5% | Investigate regex gap |
| `misclass_score≥50` events >20/week/factory | Factory-specific eval slice |
| Smoke/workflow regression on mined case PR | Block merge |

### Review checklist (per case)

1. What did user likely want?
2. Is failure ML, role gate, or handler?
3. Add positive case, negative case, or document-only?
4. Privacy OK to store verbatim in eval?

---

## Phase 5 — Dashboard design

### Dashboard: **Munshi Intent Health**

#### Panel 1 — Volume & distribution

| KPI | Definition | Target |
|-----|------------|--------|
| **Inbound messages/day** | Count `IntentClassificationEvent` | Baseline per factory |
| **Intent distribution** | Stacked bar by `predicted_intent` | Stable week-over-week |
| **Routing path mix** | % `ml_fallback` vs `direct_slash` vs `workflow_session` | Inform UX |

#### Panel 2 — Classification quality

| KPI | Definition | Alert |
|-----|------------|-------|
| **general_chat rate** | % `is_general_chat` excluding greeting lexicon | >15% |
| **LLM usage rate** | % `llm_invoked=true` | >5% |
| **LLM-path general_chat rate** | % LLM invocations ending `general_chat` | >50% |
| **Stage coverage** | % by `classification_stage` | Detect drift |
| **Retry rate** | % events with `retry_within_60s` | >10% |
| **Self-correction rate** | S6 / inbound | >5% |

#### Panel 3 — Backend execution

| KPI | Definition | Alert |
|-----|------------|-------|
| **Role-block rate** | % `role_block=true` | >3% |
| **Handler error rate** | % `handler_error` | >1% |
| **Workflow failure rate** | % `workflow_failed` | >2% |
| **Workflow abandon rate** | S4 proxy | >20% |

#### Panel 4 — Factory comparison

| KPI | Definition |
|-----|------------|
| **Misclass score P50/P95** | Per factory |
| **Top failing intents** | Per factory weekly |
| **New intent clusters** | Embedding cluster count vs prior week |

#### Panel 5 — Eval freshness

| KPI | Definition | Target |
|-----|------------|--------|
| **Mined cases pending review** | Queue depth | <50 |
| **Days since last eval PR** | Calendar | <14 |
| **Production cases in eval** | Count tagged `source:production` | Growing |

### SLIs for on-call (optional)

| SLI | SLO |
|-----|-----|
| Classify P95 latency | <500ms |
| Event emit success | >99.9% |
| Dashboard data lag | <15 min |

---

## Phase 6 — Release readiness

### Mandatory before first real factory

| # | Capability | Rationale |
|---|------------|-----------|
| 1 | **`IntentClassificationEvent` emit** from `routeMlFallback` + `processCommand` outcome | Core feedback loop |
| 2 | **`routing.inbound_path` + `predicted_intent` + `backend.outcome`** | Minimum viable debug |
| 3 | **`phone_hash` + `factory_id` + `user_role`** | Segment failures |
| 4 | **Retry signal (S5/S1 basic)** | Detect misclass without labels |
| 5 | **Weekly review process + owner assigned** | Human gate for eval mining |
| 6 | **Privacy policy + redaction** | Legal prerequisite |
| 7 | **Dashboard Panel 2** (general_chat, LLM rate, retry) | Operability |

### Can wait until factory 2–3 or 30 days post-launch

| # | Capability | Rationale |
|---|------------|-----------|
| 8 | ML `_telemetry` debug block (classification_stage) | Backend-only outcome often sufficient initially |
| 9 | Full slot audit | Lower volume early |
| 10 | Embedding clustering (Panel 4) | Needs data mass |
| 11 | Automated eval PR from queue | Manual JSONL OK at low volume |
| 12 | `IntentSessionSignal` separate table | Can derive from events table |
| 13 | Factory comparison dashboard | Single factory first |
| 14 | Datadog/APM integration | Postgres + Metabase sufficient |

### First-factory go/no-go

| Criterion | Required |
|-----------|----------|
| Eval suite 100% (smoke + workflow) | ✅ Done |
| Contract drift green | ✅ Done |
| Observability items 1–7 | **Required before scale** |
| On-call runbook for intent failures | Required |

---

## 1. Logging schema (summary)

**Primary:** `IntentClassificationEvent` v1.0 (see Phase 2)  
**Secondary:** `IntentSessionSignal` v1.0 for retry/correction linkage  
**Storage:** Postgres `intent_classification_events` + 90-day retention on redacted text

---

## 2. KPI definitions (summary)

| KPI | Formula |
|-----|---------|
| general_chat rate | `count(is_general_chat) / count(inbound)` |
| LLM usage rate | `count(llm_invoked) / count(ml_fallback)` |
| Retry rate | `count(retry_within_60s) / count(inbound)` |
| Role-block rate | `count(role_block) / count(inbound)` |
| Workflow failure rate | `count(workflow_failed) / count(workflow_started)` |
| Misclass queue depth | `count(misclass_score >= 50) unreviewed` |
| Eval freshness | `days since last mined-case PR merged` |

---

## 3. Misclassification detection plan (summary)

Automated signals S1–S10 with composite `misclass_score`. High-confidence triggers: general_chat→retry success, role block on mgr intent, slash self-correction within 120s. Weekly top-20 review queue — no manual labeling required for triage.

---

## 4. Dataset evolution workflow (summary)

```
Production events → misclass_score filter → weekly human review
  → mined JSONL → bi-weekly eval PR → CI regression → optional smoke promotion
```

P0 failures added to smoke within 2 weeks. Threshold breaches force review within 7 days.

---

## 5. Release readiness assessment

| Area | Status |
|------|--------|
| Classifier quality (eval) | **Ready** — 629/629 |
| Real-world generalization | **Acceptable with monitoring** — 7.5/10 |
| Production learning loop | **Not ready** — must implement mandatory telemetry (items 1–7) |
| Multi-factory scale | **Blocked** until dashboard + review cadence live |

**Verdict:** Ship first factory with hardened classifier **after** mandatory observability is implemented. Eval saturation is not a substitute for production telemetry.

---

## 6. Recommended implementation order

| Phase | Deliverable | Effort | Dependency |
|-------|-------------|--------|------------|
| **I1** | Postgres table + event emitter in `whatsapp.service.ts` | 2–3 days | None |
| **I2** | `backend.outcome` + `role_block` capture in `processCommand` | 1–2 days | I1 |
| **I3** | Retry detection (same phone, 60s window) | 1 day | I1 |
| **I4** | Metabase/Grafana dashboard Panel 2 KPIs | 1–2 days | I1 |
| **I5** | Weekly review runbook + queue query | 0.5 day | I1 |
| **I6** | ML `_telemetry` block (classification_stage) | 1–2 days | I1 |
| **I7** | Mined eval JSONL template + CI hook | 1 day | I5 |
| **I8** | misclass_score batch job | 1–2 days | I3 |
| **I9** | Panel 3–4 dashboards | 2 days | I1, 30d data |
| **I10** | Automated eval PR tooling | 3 days | I7, I8 |

**Critical path:** I1 → I2 → I3 → I4 → I5 (≈1 week) before factory onboarding at scale.

---

## ML Hardening program index (complete)

| Doc | Title | Status |
|-----|-------|--------|
| 69 | V1 scope freeze | ✅ |
| 70 | V1 completion | ✅ |
| 71 | V1 audit | ✅ |
| 72 | V2A boundary analysis | ✅ |
| 73 | V2B sink hardening | ✅ |
| 74 | V2C task lifecycle | ✅ |
| 75 | V2D production validation | ✅ |
| 76 | V2E inventory/vendor | ✅ |
| 77 | Real-world robustness audit | ✅ |
| **78** | **Production observability design** | ✅ **Closure** |

---

## References

- Robustness audit: `77-real-world-robustness-audit.md`
- Role post-classify pattern: `45-role-awareness-audit.md`
- Backend ML routing: `backend/src/modules/whatsapp/whatsapp.service.ts` (`routeMlFallback`)
- Document audit precedent: `backend/src/services/documents/extraction-audit.service.ts`
