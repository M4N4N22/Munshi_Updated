# Prompt 9 — LLM Readiness Report

**Date:** 2026-05-31  
**Scope:** Overall AI layer production readiness assessment

---

## SECTION A — Backend Implementation

The backend AI integration surface is stable:

- Document orchestrator + contract validation (Prompt 8)
- Workflow routing for four workflow intents
- Contract drift tests in CI (**119 backend tests passing**)

Backend does **not** depend on LLM for parsing validation logic — it re-validates all ML output.

---

## SECTION B — LLM Requirements

### Capability matrix

| Capability | Harness | Baseline | Production target |
|------------|---------|----------|-------------------|
| Workflow intents (4) | `workflow_intent_eval.py` | 94.75% deterministic | ≥ 95% live |
| Document parse (CSV/tabular) | `document_quality_eval.py` | 97.73% pass | ≥ 95% |
| Contract compliance | `contract_drift_eval.py` | 100% | 100% |
| E2E scenarios | `e2e_validation.py` | 100% local | Live integration |

### Run all evals

```bash
python -m eval.run_all          # CI-safe
python -m eval.run_all --live   # Requires OPENAI_API_KEY
```

---

## SECTION C — Contract Requirements

All shared contracts validated. No breaking changes in Prompt 9.

Added: `/inventory_status` to intent catalog for completeness.

---

## SECTION D — Training Data Requirements

| Asset | Status |
|-------|--------|
| 400 workflow intent utterances | ✅ Created |
| 44 document fixtures | ✅ Created |
| Live LLM labeled eval set | ⏳ Run `--live` before prod |
| Real factory documents | ⏳ Needed for final sign-off |

---

## SECTION E — Future Automation Opportunities

- Unified quality dashboard from `eval/reports/*.json`
- Block releases when any metric regresses
- Separate readiness gates for intent vs parsing vs e2e

---

## Production readiness verdict

| Layer | Verdict |
|-------|---------|
| **Architecture** | ✅ Production-ready — no redesign needed |
| **Contracts** | ✅ Production-ready |
| **Document parsing (CSV/XLSX/tabular)** | ✅ Near ready (97.7% fixture pass) |
| **Workflow intents (deterministic)** | ✅ Near ready (94.8%) |
| **Workflow intents (full LLM)** | ⚠️ Run `--live` eval before prod |
| **Live backend+ML integration** | ⚠️ Recommended next gate |

### Overall

**The AI layer is architecturally production-ready.** Measurable quality baselines exist. Final go/no-go requires:

1. `python -m eval.workflow_intent_eval --live` ≥ 95% accuracy
2. One live upload → WhatsApp approval → inventory update test
3. Pilot factory fixture pack added to eval corpus

**Not ready for:** Procurement, Ledger, AA — intentionally out of scope.
