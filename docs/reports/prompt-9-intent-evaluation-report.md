# Prompt 9 — Intent Evaluation Report

**Date:** 2026-05-31  
**Scope:** Workflow intent datasets and evaluation harness (no new business modules)

---

## SECTION A — Backend Implementation

- Backend consumes ML intents `/onboard_vendor`, `/onboard_worker`, `/inventory_create`, and backend command `/inventory_status`.
- Added `/inventory_status` to shared `contracts/intent-types.json` for drift detection alignment.
- Contract drift tests: `src/contracts/contract-drift.spec.ts` (7 tests).
- Backend tests total: **119 passing** (includes e2e scenario mocks).

---

## SECTION B — LLM Requirements

### Datasets (`data/eval/intents/`)

| File | Examples | Languages |
|------|----------|-----------|
| `onboard_vendor.json` | 100 | EN / HI / Hinglish |
| `onboard_worker.json` | 100 | EN / HI / Hinglish |
| `inventory_create.json` | 100 | EN / HI / Hinglish |
| `inventory_status.json` | 100 | EN / HI / Hinglish |

**Total:** 400 labeled utterances.

Generator: `scripts/generate_intent_datasets.py`

### Harness

- `eval/workflow_intent_eval.py` — accuracy, precision, recall, F1, confusion matrix, false positives/negatives.
- Reports: `eval/reports/workflow_intent_eval_deterministic.json`
- Run: `python -m eval.workflow_intent_eval` (CI-safe, no API key)
- Optional live LLM: `python -m eval.workflow_intent_eval --live`

### Classifier improvements (Part G)

- Added `workflow_pre_classify()` with regex rules for all four workflow intents.
- Added slash fast-path for `/onboard_vendor`, `/onboard_worker`, `/inventory_create`, `/inventory_status`.
- Extended `VALID_INTENTS` and few-shot examples in `bot_engine.py`.
- Lazy OpenAI client init — eval/tests run without `OPENAI_API_KEY`.

---

## SECTION C — Contract Requirements

- Workflow intents must match backend `WORKFLOW_START_COMMANDS` exactly.
- `/inventory_status` added to intent contract catalog (backend-only command, ML-classified).
- Drift test fails if workflow intents removed from `intent-types.json`.

---

## SECTION D — Training Data Requirements

Current dataset is a **baseline** for regression. Production readiness targets:

| Intent | Current deterministic accuracy | Target |
|--------|------------------------------|--------|
| `/onboard_vendor` | see per-intent in report | ≥ 0.95 |
| `/onboard_worker` | see per-intent in report | ≥ 0.95 |
| `/inventory_create` | see per-intent in report | ≥ 0.95 |
| `/inventory_status` | see per-intent in report | ≥ 0.95 |

**Baseline (deterministic, no API key):**

| Metric | Value |
|--------|-------|
| Accuracy | **0.9475** |
| Macro precision | **0.9835** |
| Macro recall | **0.9475** |
| Failures | 21 / 400 |

Expand with live LLM eval (`--live`) before production sign-off.

---

## SECTION E — Future Automation Opportunities

- CI gate: fail if workflow intent accuracy drops below 0.90.
- Nightly `--live` eval with labeled set versioning.
- Active learning loop from misclassified production messages.
- Fine-tuned small model for workflow intents only (lower cost than full classifier).

---

## Production readiness (intent layer)

| Status | Assessment |
|--------|------------|
| Deterministic workflow coverage | **Strong** (~95%) |
| Full LLM coverage | **Requires `--live` baseline** |
| Architecture | **Ready** — no redesign needed |
