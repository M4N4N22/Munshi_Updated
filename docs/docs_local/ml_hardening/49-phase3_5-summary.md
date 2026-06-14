# Phase 3.5 Summary — Current ML Architecture Audit & Failure Analysis

**Date:** 2026-06-10  
**Status:** Complete (research only — no implementation, no datasets)

---

## 1. ML architecture type

**Hybrid deterministic-regex + LLM (GPT, JSON mode)**

Pipeline: `CommandParser` (slash) → `workflow_pre_classify` → `operational_pre_classify` → `manager_pre_classify` → `assign_clarify_pre_classify` → `deterministic_pre_classify` → `llm_classify` → post-rules → `VALID_INTENTS` gate.

**Parallel path:** `TaskInventoryExtractor` on `/extract/task-inventory` (backend, pre-classify).

**Not:** embeddings, fine-tuned model, hierarchical intents.

---

## 2. Available classifier context

| Present | Absent |
|---------|--------|
| Message text | Role |
| Deadline (extracted) | Factory / department |
| Task id (regex from text) | Active workflow / session |
| worker_slug, depart_slug (extracted) | Conversation history |
| | Inventory / task DB state |
| | Confidence score |

---

## 3. Missing classifier context

Role, factory, department, session state, workflow step, conversation history, inventory catalog, open tasks, user phone/id, attachment type (CSV vs text), confidence.

---

## 4. Confidence handling status

**None in production.**

- No confidence score in API
- Pre-classifier = binary match
- LLM exception → `general_chat`
- Invalid intent → `general_chat`
- Commented "confidence check" LLM call **not implemented**

---

## 5. Top structural weaknesses

1. **Role-blind** `/classify` — role enforced only post-ML
2. **5 intents missing** from VALID_INTENTS and LLM prompt
3. **import inventory** → `business_discovery` regex collision
4. **Stock-linked split** — extract path vs classify path
5. **general_chat sink** — masks errors (owner → home menu)
6. **No confidence / clarify signal** for P1 low-confidence policy
7. **Hardcoded VALID_INTENTS** — JSON contract not consumed at runtime
8. **Flat intent space** — 25+ siblings without hierarchy

---

## 6. Highest-risk failure modes (architecture causes)

| Rank | Boundary | Root cause |
|------|----------|------------|
| 1 | assign ↔ stock-linked | Dual path; extractor null → assign; assign_delivery not in ML |
| 2 | import ↔ create ↔ discovery | import_csv absent; discovery regex captures import phrases |
| 3 | mgrself ↔ mgrassign | Shared task_id extraction; no role; regex overlap |
| 4 | assign ↔ depart_assign | Heuristic person vs dept; LLM flat space |
| 5 | complete ↔ update | Regex order dependent; LLM long-tail |
| 6 | issue ↔ update | Task-scoped vs facility-scoped — weak structural split |

---

## 7. Architecture readiness score

**Overall: 2.45 / 5 (YELLOW-RED)**

| Area | Rating |
|------|--------|
| Session awareness | 🟢 GREEN |
| Intent boundaries | 🟡 YELLOW |
| Clarification | 🟡 YELLOW |
| Role-aware routing | 🔴 RED |
| Stock-linked ops | 🔴 RED |

---

## 8. Recommended next phase

**Phase 4A — Baseline Benchmark (read-only measure)**

Before authoring 1,200 cases or implementing fixes:

1. Run existing `ml/eval/` scripts against current `classify_hybrid` (regex-only baseline)
2. Run LLM-enabled sample (~100 cases) for P1 boundaries
3. Document baseline scores per `37-benchmarking-framework.md`
4. Measure contract-gap intents separately (expected fail)

**Phase 4B — Hardening design (after baseline)**

Separate planning phase for architecture decisions (role in API, contract sync, unified stock path, confidence signal) — **not in scope of 3.5**.

**Do not bulk-author eval dataset until baseline confirms which layers fail.**

---

## Deliverables index

| File | Content |
|------|---------|
| `39-current-ml-architecture-analysis.md` | End-to-end trace |
| `40-classification-pipeline-analysis.md` | Hybrid pipeline |
| `41-context-availability-audit.md` | Context matrix |
| `42-intent-contract-consumption.md` | Contract vs runtime |
| `43-confidence-analysis.md` | No scores today |
| `44-failure-mode-analysis.md` | Architecture failure causes |
| `45-role-awareness-audit.md` | Post-ML role only |
| `46-session-awareness-audit.md` | Backend session suppression |
| `47-structural-limitations.md` | 15 limitations |
| `48-ml-readiness-assessment.md` | GREEN/YELLOW/RED |
| `49-phase3_5-summary.md` | This document |

---

**No implementation. No datasets. No ML/code changes. No git operations.**
