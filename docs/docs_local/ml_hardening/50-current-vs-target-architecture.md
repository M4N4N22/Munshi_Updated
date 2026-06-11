# Phase 4 — Current vs Target Architecture

**Purpose:** Define where the ML system is today vs where it must be after hardening.

---

## Architecture comparison

| Dimension | CURRENT (as-built) | TARGET (hardened) |
|-----------|-------------------|-------------------|
| **Intent classification** | Hybrid regex chain → LLM → flat `VALID_INTENTS` gate | Layered: session guard → regex (high-precision) → LLM (long-tail) → hierarchy validation → slot validation |
| **Contract management** | `intent-types.json` + hardcoded `VALID_INTENTS` drift | Single source of truth; runtime loads contract; drift tests gate CI |
| **Role awareness** | Role absent from `/classify`; enforced post-ML in NestJS | Role (and optionally factory) in classify request; invalid intents suppressed at source |
| **Session awareness** | Backend suppresses ML during workflows/import | Classify API accepts `session_context`; explicit `suppress_classify` + step hints when needed |
| **Stock-linked operations** | Dual path: `/extract/task-inventory` then `/classify`; slash-only `assign_delivery` | Unified stock-linked family; single routing decision; all 3 intents in contract + prompt |
| **Clarification flows** | `assign_clarify` only via rules + backend | Explicit `clarify` behavior: missing slots, ambiguous P1, structured follow-up contract |
| **Confidence handling** | None; `general_chat` as sink | Confidence or tier (high/medium/low); low → clarify not home menu for P1 |
| **Intent hierarchy** | 25+ flat siblings in LLM prompt | Tier-1 capability → tier-2 intent; disambiguation within cluster |
| **Evaluation framework** | Partial eval scripts; no 1200-case suite | Versioned JSONL suites; layered metrics; baseline + regression gates |

---

## Intent classification

### Current

```
message → CommandParser (slash subset)
       → workflow_pre → operational → mgr → assign_clarify → deterministic
       → LLM (optional)
       → post-rules (assign→mgrassign, assign→assign_clarify)
       → VALID_INTENTS gate → general_chat sink
```

### Target

```
message + context envelope
       → session_policy (skip | step-only | full classify)
       → slash_passthrough (full COMMANDS set)
       → cluster_router (delegation | mgr | inventory | execution | meta)
       → cluster-specific pre + LLM
       → slot_validator (role, depart_slug, task_id rules)
       → output: intent + slots + confidence_tier + clarify_hint?
```

---

## Contract management

### Current

- 30 backend commands; 25 in `intent-types.json`
- `bot_engine.VALID_INTENTS` hardcoded (26 entries)
- `document_types.INTENT_TYPES` loaded but unused in classify
- 5 intents unreachable via NL classify

### Target

- 30 commands ↔ 30 intents (or documented exclusions with alternate routes)
- Classifier reads `intent-types.json` at startup
- `VALID_INTENTS` = contract intents + `general_chat`
- Contract version in classify response for traceability
- CI: `contract-drift.spec` + eval intent coverage

---

## Role awareness

### Current

`POST /classify?message=` only. Owner `general_chat` → home menu masks errors.

### Target

```json
{
  "message": "...",
  "role": "MANAGER",
  "factory_id": 1,
  "session_context": { ... }
}
```

- Role×intent validity matrix applied before or inside classifier
- Invalid combos → `clarify` or `role_rejected` — not silent `general_chat` for P1 phrases

---

## Session awareness

### Current

Backend blocks classify when `workflow_sessions` active (except slash). CONFIRM/CANCEL pre-ML.

### Target

- Backend remains primary session router (unchanged responsibility)
- Classify API documents `session_context` for eval replay and future step-aware NL
- Benchmark suite includes session cases (doc 34) as routing tests, not classify tests

---

## Stock-linked operations

### Current

1. `tryHandleFreeText` → `/extract/task-inventory` (strict SKU regex)
2. Else `/classify` → often `/assign`
3. `/assign_delivery` slash bypass only

### Target

- **Single decision point:** stock_signals(message) → stock-linked cluster
- Intents: `/task_inventory_nl`, `/assign_delivery`, with shared slot schema (worker, sku, qty, task_kind)
- Extractor becomes slot-filling helper, not parallel router
- NL and slash converge on same backend handlers

---

## Clarification flows

### Current

`assign_clarify` via regex + post-LLM + backend handler. No general clarify policy.

### Target

| Trigger | Target behavior |
|---------|-----------------|
| Missing assignee | `assign_clarify` workflow |
| Missing task id (mgr*) | `clarify` with prompt template |
| create vs import | `clarify` one-turn |
| Low confidence P1 | `clarify` not `general_chat` |
| Social greeting | `general_chat` OK |

Optional response field: `clarify_prompt` (business text, not implementation).

---

## Confidence handling

### Current

Binary: regex hit or LLM single shot. No score.

### Target

| Tier | Meaning | Action |
|------|---------|--------|
| high | Pre-match or LLM + slot complete | Route intent |
| medium | Intent clear, slot missing | Clarify slot |
| low | Cluster ambiguous | Clarify cluster |
| none | Off-topic | `general_chat` |

Implementation options left to Phase 5 — blueprint requires **tier in contract**, not necessarily float probability.

---

## Intent hierarchy

### Current

Flat list in LLM prompt.

### Target (logical, not necessarily separate models)

```
Operations
├── Attendance (present, absent)
├── Tasks (tasks, complete, update)
├── Delegation (assign, depart_assign, assign_clarify)
├── Manager (mgrself, mgrassign, mgrtransfer, mgrreject)
├── Issues (issue, issues, resolve)
Inventory
├── Read (inventory_status)
├── Write (inventory_create, inventory_import_csv)
├── Stock-tasks (assign_delivery, task_inventory_nl)
Procurement (purchase_request_create)
Setup (onboard_*, business_discovery, continue_discovery)
Meta (help, cancel, general_chat)
```

LLM first selects cluster, then intent within cluster (design option for Phase 5).

---

## Evaluation framework

### Current

`classify_hybrid`, `contract_drift_eval`, manager/workflow tests. No production benchmark gate.

### Target

- JSONL suites per docs 31–35 (~1,200 min cases)
- Metrics per doc 37: intent, boundary, role, ambiguity, session
- Baseline → hardening iterations → regression suite (~2,800)
- Benchmark blocks release when P1 metrics below threshold
