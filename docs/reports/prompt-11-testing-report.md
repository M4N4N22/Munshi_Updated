# Prompt 11 — Testing Report

## SECTION A — Backend Implementation

| Test file | Coverage |
|-----------|----------|
| `business-discovery.scoring.spec.ts` | Readiness score computation, bucket progress |
| `business-discovery.service.spec.ts` | Pause, resume, first reminder |
| `business-discovery-document.service.spec.ts` | Document bucket boost, future bucket skip |
| `business-discovery.handler.spec.ts` | Workflow metadata, pause command |
| `workflow.registry.spec.ts` | `/business_discovery`, `/continue_discovery` registration |
| `contract-drift.spec.ts` | Intent contract includes discovery intents |
| `document-processing.orchestrator.spec.ts` | `contributeFromDocument` called after ingestion |

Run: `yarn test` (Jest).

## SECTION B — LLM Requirements

| Test file | Coverage |
|-----------|----------|
| `tests/test_workflow_intent.py` | EN/HI/Hinglish discovery + continue + import inventory |

Run: `pytest tests/test_workflow_intent.py` from LLM repo.

## SECTION C — Contract Requirements

Drift tests fail if discovery intents removed from `contracts/intent-types.json`.

## SECTION D — Training Data Requirements

Add regression cases when new phrases mis-route to procurement or vendor onboarding.

## SECTION E — Future Automation Opportunities

E2E scenario in `test/fixtures/e2e-scenarios.json` for discovery API + WhatsApp flow; Swagger smoke entries for `/business-discovery/*`.
