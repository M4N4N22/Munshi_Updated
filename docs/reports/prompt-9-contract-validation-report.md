# Prompt 9 — Contract Validation Report

**Date:** 2026-05-31  
**Scope:** Automated contract drift detection (intent, extraction, suggestion, workflow)

---

## SECTION A — Backend Implementation

### Drift tests

File: `src/contracts/contract-drift.spec.ts`

Validates:

- `DOCUMENT_TYPE` ↔ `contracts/document-types.json`
- `SUGGESTION_TYPE` ↔ `contracts/suggestion-types.json`
- `WORKFLOW_TYPE` ↔ `contracts/workflow-types.json`
- Workflow start commands registered
- Workflow intents in `intent-types.json` (including `/inventory_status`)
- Extraction JSON schemas require `document_type` + `items`

**Tests fail when contracts drift from backend constants.**

---

## SECTION B — LLM Requirements

### Drift harness

File: `eval/contract_drift_eval.py`

Sections:

| Section | Validates |
|---------|-----------|
| `intent_contract` | ClassifyResponse fields + workflow intents |
| `extraction_contracts` | Inventory + stock schema consts |
| `suggestion_workflow_contracts` | Required suggestion/workflow enums |
| `parse_response` | ParseResponse shape |

Run: `python -m eval.contract_drift_eval`  
Report: `eval/reports/contract_drift_eval.json`

---

## SECTION C — Contract Requirements

Single source of truth order:

1. `docs/architecture/backend-llm-contract.md`
2. `contracts/schemas/*.json`
3. TypeScript (`contracts/typescript/index.ts`)
4. Python (`contracts/python/models.py`)

**Prompt 9 change:** Added `/inventory_status` to `intent-types.json` and TS `INTENT_TYPES`.

---

## SECTION D — Training Data Requirements

Contract tests do not require training data. They require:

- Locked JSON schemas in CI
- Sync between backend and LLM `contracts/` directories on every release

---

## SECTION E — Future Automation Opportunities

- Pre-commit hook: regenerate TS/Python from JSON schemas.
- Cross-repo CI job comparing backend ↔ LLM contract hashes.
- Schema version bump automation with migration checklist.

---

## Baseline

| Check | Status |
|-------|--------|
| LLM contract drift eval | **PASS** (compliance 1.0) |
| Backend contract drift spec | **PASS** (7 tests) |
| Pydantic ↔ JSON schema | **Aligned** |
