# Prompt 11 — Contract Report

## SECTION A — Backend Implementation

Shared contracts under `contracts/`:

| File | Purpose |
|------|---------|
| `discovery-types.json` | Bucket definitions, future buckets, document map |
| `intent-types.json` | `/business_discovery`, `/continue_discovery` |
| `workflow-types.json` | `BUSINESS_DISCOVERY` |
| `typescript/index.ts` | Typed exports for drift tests |

`contract-drift.spec.ts` validates workflow intents and types.

## SECTION B — LLM Requirements

LLM `contracts/intent-types.json` synced with backend. `bot_engine.py` `VALID_INTENTS` must match.

## SECTION C — Contract Requirements

Documented in `docs/architecture/backend-llm-contract.md` §12:

- Business Discovery Intent Contract
- Business Discovery Progress Contract
- Discovery Bucket Contract
- Readiness Score Contract
- Reminder stage contract

## SECTION D — Training Data Requirements

Contract examples should mirror few-shot prompt outputs exactly (JSON shape with null slugs).

## SECTION E — Future Automation Opportunities

Version `discovery-types.json` when BOOKKEEPING bucket activates; add OpenAPI schemas for progress DTO export.
