# Prompt 10 — Next Steps

## SECTION A — Backend Implementation

1. Run `node scripts/apply-migrations.mjs` on staging/production.
2. E2E test PR workflow via `POST /webhook/test` with `/purchase_request_create`.
3. Seed inventory items with reorder thresholds to exercise low-stock suggestions.

## SECTION B — LLM Requirements

1. Add `data/eval/intents/purchase_request_create.json` (100 examples).
2. Extend `workflow_intent_eval.py` coverage for procurement phrases.
3. Run eval and target ≥95% accuracy on `/purchase_request_create`.

## SECTION C — Contract Requirements

1. Sync LLM repo `contracts/workflow-types.json` copy if split from backend.
2. Document PR contracts in `backend-llm-contract.md` §11 (done).

## SECTION D — Training Data Requirements

Negative examples distinguishing:
- `/purchase_request_create` vs `/onboard_vendor`
- `/purchase_request_create` vs `/depart_assign` (department tasks)

## SECTION E — Future Automation Opportunities

| Prompt | Scope |
|--------|--------|
| **11** | Vendor procurement operations (quotations, vendor comms) |
| **12** | Goods receipt + inventory update from PR |
| **13** | Invoice processing + ledger foundation |

**Do not implement** quotations, GRN, invoices, ledger, or AA in current phase.
