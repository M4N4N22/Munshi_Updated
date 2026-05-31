# Prompt 8 — Evaluation Harness Report

**Date:** 2026-05-29  
**Scope:** Intent, extraction, and contract compliance baselines

---

## SECTION A — Backend Implementation

Backend contract tests:

- `contract-validation.service.spec.ts`
- `document-extraction-contract.service.spec.ts` (Prompt 7, still valid)
- Orchestrator integration unit test mocks ML adapter

No separate backend ML eval runner — backend validates contracts at runtime.

---

## SECTION B — LLM Requirements

### Harness location

```
eval/
├── intent_eval.py       # CommandParser baseline (no API key)
├── document_eval.py     # Parser pass rates
├── contract_eval.py     # Pydantic model compliance
└── run_all.py           # Aggregated metrics JSON
```

Run: `python -m eval.run_all`

---

## SECTION C — Contract Requirements

`contract_eval.py` checks:

1. `ClassifyResponse` includes `reject_reason`
2. `InventoryImportExtraction` shape
3. `ParseResponse` shape

---

## SECTION D — Training Data Requirements

### Baseline fixtures (current)

| Suite | Cases | Notes |
|-------|-------|-------|
| Intent (command parser) | 4 | yes/no/showinventory/addworker |
| Inventory parser | 1 | 2-row CSV |
| Stock parser | 1 | dated CSV |
| Contract | 3 | model field checks |

### Expansion targets

- 50+ intent utterances from `intent-classification-strategy.md`
- 20+ document fixtures per type
- Golden files for regression in CI

---

## SECTION E — Future Automation Opportunities

- GitHub Action: `pytest tests` + `python -m eval.run_all` on LLM repo
- Backend contract test importing JSON schemas via `ajv`
- Nightly eval against production-like samples

---

## Baseline metrics (initial)

| Metric | Value |
|--------|-------|
| Intent command-parser accuracy | 1.0 (4/4) |
| Inventory parser pass rate | 1.0 |
| Stock parser pass rate | 1.0 |
| Contract compliance rate | 1.0 (3/3) |
| Backend unit tests | 102 passing |

*Note: Intent eval uses deterministic `CommandParser` only; full LLM classifier eval requires `OPENAI_API_KEY` and separate labeled set.*
