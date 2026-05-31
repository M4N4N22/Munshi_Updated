# Prompt 9 — Next Steps

**Date:** 2026-05-31

---

## SECTION A — Backend Implementation

1. Add live integration test script (backend + ML + Postgres in Docker).
2. Wire CI to run `src/contracts/contract-drift.spec.ts` on every PR.
3. Expose eval metrics endpoint or artifact upload in CI (optional).

---

## SECTION B — LLM Requirements

1. Run `python -m eval.workflow_intent_eval --live` and archive baseline.
2. Fix remaining 21 deterministic intent failures (see `eval/reports/workflow_intent_eval_deterministic.json`).
3. Tune one failing stock register edge fixture if pass rate must hit 100%.
4. Add GitHub Action: `pytest tests` + `python -m eval.run_all`.

---

## SECTION C — Contract Requirements

1. Sync `contracts/` to LLM repo on every backend contract change (CI hash check).
2. Document `/inventory_status` in `backend-llm-contract.md` workflow intent table.

---

## SECTION D — Training Data Requirements

1. Collect 10 anonymized real factory CSV exports.
2. Add 50 live-LLM eval utterances per workflow intent from pilot users.
3. Label instruction-vs-completion pairs separately (existing ops intents).

---

## SECTION E — Future Automation Opportunities

| Priority | Item |
|----------|------|
| P0 | Live integration test |
| P0 | `--live` intent baseline ≥ 95% |
| P1 | CI eval gates |
| P2 | Procurement parser fixtures (when module starts) |

---

## Success criteria checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Workflow intent dataset | ✅ 400 examples |
| 2 | Intent evaluation framework | ✅ |
| 3 | Inventory document datasets | ✅ 22 fixtures |
| 4 | Document evaluation framework | ✅ |
| 5 | Contract drift detection | ✅ |
| 6 | E2E validation scenarios | ✅ 12 scenarios |
| 7 | Workflow intent quality improved | ✅ ~95% deterministic |
| 8 | Readiness reports | ✅ |
| 9 | Measurable metrics | ✅ |
| 10 | Production readiness known | ✅ See llm-readiness report |
