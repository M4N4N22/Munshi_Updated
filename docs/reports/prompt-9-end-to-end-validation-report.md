# Prompt 9 — End-to-End Validation Report

**Date:** 2026-05-31  
**Scope:** Cross-layer scenarios from upload/intent through approval

---

## SECTION A — Backend Implementation

### Scenario fixture

`test/fixtures/e2e-scenarios.json` — **12 scenarios** (≥10 required)

Examples:

| ID | Flow |
|----|------|
| e2e-01 | Inventory CSV → parse → validate → suggest → queue → workflow → inventory update |
| e2e-02 | Stock register → parse → suggest → approval → inventory update |
| e2e-06/07 | Invalid files fail at parse with `FAILED` status |
| e2e-10/11/12 | Workflow intent → backend workflow routing |

### Backend runner

`src/services/documents/document-ingestion-scenarios.spec.ts` — mocked orchestrator tests for document paths.

---

## SECTION B — LLM Requirements

### LLM-local runner

`eval/e2e_validation.py` — executes parse + intent steps locally.

Report: `eval/reports/e2e_validation.json`

Measured per scenario:

- Success / failure
- Failure point (step name)
- Latency (parse/classify steps)
- Contract violations

Backend-only steps marked `simulated` with note pointing to NestJS specs.

---

## SECTION C — Contract Requirements

Each successful document scenario must:

1. Produce parser output matching Pydantic extraction model.
2. Pass backend validation when forwarded (tested via mocked orchestrator).
3. Not violate `document_type` const in schema.

---

## SECTION D — Training Data Requirements

E2E scenarios reuse evaluation fixtures and intent utterances. Expand with:

- Multi-suggestion documents (queue sequencing)
- Active workflow deferral cases
- Missing uploader phone cases

---

## SECTION E — Future Automation Opportunities

- Docker-compose integration test: backend + ML + Postgres.
- Record/replay HTTP fixtures for `/parse` and `/classify`.
- Latency SLO dashboard per pipeline stage.

---

## Baseline metrics

| Metric | Value |
|--------|-------|
| LLM-local e2e success rate | **1.0** (12/12) |
| Backend mocked orchestrator scenarios | **PASS** |
| Invalid file rejection | **Verified** |

**Assessment:** Pipeline architecture validates end-to-end; full live integration test recommended before production cutover.
