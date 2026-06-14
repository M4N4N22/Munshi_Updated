# Phase 3.5 — ML Readiness Assessment

Can current architecture support Phase 2 desired behaviors?

| Capability | Rating | Rationale |
|------------|--------|-----------|
| **Intent boundaries (P1 pairs)** | 🟡 **YELLOW** | Regex + LLM cover many cases; stock-linked and import gaps RED-adjacent |
| **Role-aware routing** | 🔴 **RED** | Role not in classify; backend-only enforcement |
| **Clarification flows** | 🟡 **YELLOW** | assign_clarify only; no general low-confidence clarify |
| **Session awareness** | 🟢 **GREEN** | Backend suppresses ML during workflows/import — works |
| **Stock-linked operations** | 🔴 **RED** | Split extract path; assign_delivery absent from ML; extractor brittle |

---

## Detailed ratings

### Intent boundaries — YELLOW

| Boundary | Support |
|----------|---------|
| assign vs depart | Partial — regex + LLM |
| mgrself vs mgrassign | Partial — manager_pre_classify |
| complete vs update | Partial — ordered regex |
| inventory status vs create | Partial — workflow_pre order |
| inventory import | **RED** — wrong intent family |
| assign vs stock-linked | **RED** — dual path failure |

### Role-aware routing — RED

No role in API. Invalid intents classified then blocked or misrouted (general_chat → home).

### Clarification flows — YELLOW

`assign_clarify` works via pre-classifier + post-LLM rule + backend handler. No clarify for inventory create/import, mgr transfer/reject missing slots, or confidence-based clarify.

### Session awareness — GREEN

Backend correctly prioritizes session handlers, CONFIRM/CANCEL, cancel command before ML. Slash during session works.

### Stock-linked operations — RED

- `/assign_delivery` — slash only
- `/task_inventory_nl` — separate extractor with strict SKU pattern
- Fallback classify → `/assign`

---

## Architecture readiness score

| Dimension | Score (1–5) | Weight | Weighted |
|-----------|------------|--------|----------|
| Coverage of 30 commands | 2.5 | 20% | 0.50 |
| P1 boundary reliability | 3.0 | 25% | 0.75 |
| Context (role/session) | 2.0 | 20% | 0.40 |
| Contract alignment | 2.0 | 15% | 0.30 |
| Observability (confidence) | 1.0 | 10% | 0.10 |
| Eval/benchmark readiness | 4.0 | 10% | 0.40 |
| **Overall** | | | **2.45 / 5** |

**Letter grade: D+ / C-** — functional for core regex-backed intents; structurally weak for P1 hardening goals.

---

## What works today (GREEN areas)

1. Slash commands bypass ML via backend `parseDirectSlashCommand`
2. High-frequency attendance/tasks via operational_pre_classify
3. Manager regex hardening (manager_pre_classify)
4. Workflow session suppression
5. Hybrid LLM fallback for long-tail English/Hinglish
6. Separate eval harness (`classify_hybrid`, contract_drift_eval)

---

## What blocks Phase 4 benchmark success (RED flags)

1. Five intents absent from classifier
2. No confidence metric
3. Role-blind classify invalid for role-aware eval at ML layer
4. import inventory → business_discovery structural bug
5. general_chat masks owner misclassification in E2E UX

---

## Hardening effort estimate (scope only, not solutions)

| Workstream | Relative effort |
|------------|-----------------|
| Contract alignment + VALID_INTENTS sync | Medium |
| P1 regex/LLM prompt tuning | High |
| Role context in classify API | Medium |
| Stock-linked unified routing | High |
| Confidence / clarify signal | High |
| Eval harness + 1200 cases | High |
| Import phrase fix | Low |

**Total hardening:** Large — architecture changes likely needed for RED items, not prompt-only.
