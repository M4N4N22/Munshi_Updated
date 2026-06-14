# ML Hardening V1 — Completion Report

**Branch:** `feature/shantanu-ml-hardening-v1`  
**Spec:** `69-ml-hardening-v1-scope-freeze.md`  
**Status:** Implementation complete — merge-ready (local, not pushed)

---

## 1. Branch

`feature/shantanu-ml-hardening-v1` (from synchronized inventory + main branch)

---

## 2. Phases completed

| Phase | Status |
|-------|--------|
| A Pre-baseline | Done |
| B Smoke harness | Done |
| C Contract v1.1 | Done |
| D ML runtime | Done |
| E Drift protection | Done |
| F Smoke dataset (200) | Done |
| G Testing | Done |
| H Post-baseline | Done |
| I Readiness review | Done |

---

## 3. Files changed / created

### Contracts
- `backend/contracts/intent-types.json` — v1.1, +5 intents
- `ml/contracts/intent-types.json` — mirror
- `backend/contracts/typescript/index.ts` — INTENT_TYPES, CONTRACT_VERSION
- `ml/contracts/typescript/index.ts` — mirror

### ML runtime
- `ml/bot_engine.py` — JSON VALID_INTENTS, CommandParser, regex, prompt

### Evaluation
- `ml/eval/smoke_intent_eval.py` — **new**
- `ml/eval/schemas/smoke_case.schema.json` — **new**
- `ml/eval/run_all.py` — smoke integration
- `ml/eval/contract_drift_eval.py` — v1.1 checks
- `ml/scripts/generate_smoke_v1_1.py` — **new**
- `ml/data/eval/smoke/smoke-v1.1.jsonl` — **new** (200 cases)
- `ml/data/eval/smoke/manifest.json` — **new**
- `ml/eval/reports/baseline-pre-v1.1.json` — **new**
- `ml/eval/reports/baseline-pre-v1.1-summary.md` — **new**
- `ml/eval/reports/baseline-post-v1.1.json` — **new**
- `ml/eval/reports/baseline-v1.1-summary.md` — **new**
- `ml/eval/reports/smoke_intent_eval_deterministic.json` — **new**

### Backend tests
- `backend/src/contracts/contract-drift.spec.ts` — v1.1 assertions

### ML tests
- `ml/tests/test_contract_v1_1_intents.py` — **new**
- `ml/tests/test_smoke_intent_eval.py` — **new**
- `ml/tests/test_workflow_intent.py` — import collision fix

---

## 4. Validation results

### Contract validation
- 30 slash intents + `general_chat` = 31
- Backend/ML JSON identical
- TS INTENT_TYPES synchronized
- VALID_INTENTS loaded from `ml/contracts/intent-types.json`
- No hardcoded VALID_INTENTS set

### ML pytest
- **79 passed**, 0 failed, 0 skipped

### Backend contract drift
- **43 passed** (contract-drift + phase4-contract-drift)

### Smoke eval (deterministic)
- Macro accuracy: **81.00%** (gate ≥75%)
- Contract gap accuracy: **94.55%** (gate ≥80%)
- Cases: 200

### Import collision
- `import inventory` → `/inventory_import_csv` (test + probe + smoke)

### Manager workflow regression
- Workflow eval accuracy: **96.04%** (unchanged vs pre-baseline)

---

## 5. Definition of Done

All Section 6 criteria from doc 69: **SATISFIED**

---

## 6. Open issues / risks

| Item | Severity | Notes |
|------|----------|-------|
| Boundary slices (assign/depart/stock) | Medium | Measured in smoke; V2 hardening |
| LLM path not CI-gated | Low | Per spec; regex gates merge |
| `dispatch 3 unit bolt` → task_inventory_nl edge | Low | Regex without named worker |
| Dual stock path (extract + classify) | Low | Deferred V3 |

---

## 7. Merge readiness

**Ready for local PR review** when user chooses to commit/push.

Not pushed per instructions.
