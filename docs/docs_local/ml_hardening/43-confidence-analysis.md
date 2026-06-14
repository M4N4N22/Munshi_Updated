# Phase 3.5 — Confidence Analysis

---

## Does the system produce confidence scores?

**No.** Neither `/classify` response nor backend parsing includes a confidence or probability field.

`classify-response.json` schema fields: intent, id, worker_slug, depart_slug, deadline, reject_reason, message, task_description — **no confidence**.

---

## How "confidence" is approximated today

| Mechanism | Type | Behavior |
|-----------|------|----------|
| Pre-classifier match | Implicit 100% | Regex hit → skip LLM entirely |
| LLM temperature=0 | Determinism | Reduces variance, not scored |
| VALID_INTENTS gate | Hard reject | Unknown intent → `general_chat` |
| Post-LLM rules | Deterministic override | e.g. assign+task_id → mgrassign |
| TaskInventoryExtractor | Implicit reject | Returns null fields → orchestrator returns null |

---

## Commented / unimplemented

`bot_engine.py` header comments reference:

> "Added a second LLM confidence check call when intent is ambiguous"

This exists only in **commented v1 code block** (lines 1–600 approx). **Not active** in production `IntentClassifier.classify()`.

---

## Low-confidence behavior (actual)

| Path | What happens |
|------|--------------|
| Pre-classifier miss + LLM uncertain | LLM still returns one intent or general_chat |
| LLM exception | `{"intent": "general_chat", ...}` |
| Intent not in VALID_INTENTS | Forced to `general_chat` |
| general_chat | Second LLM generates Hindi/English reply |
| Owner/manager general_chat | Backend sends **owner home menu** (not ML message) |
| Worker general_chat | ML message or default hints |

**No clarification question from ML** on low confidence — except:
- Backend `/assign` handler routes to `assign_clarify` workflow when description-only
- `assign_clarify_pre_classify` regex path
- Post-LLM rule: assign without worker → assign_clarify

---

## Task-inventory extraction

`task_inventory_extractor.py` docstring: "Returns null for any field when confidence is insufficient" — but this is **rule-based null**, not a numeric confidence score exposed to API.

---

## Gap vs Phase 2 strategy

Phase 2 `26-low-confidence-strategy.md` specifies clarify-on-low-confidence for P1. **Current architecture cannot implement this** without new signals (score, explicit ambiguity intent, or backend-side policy).
