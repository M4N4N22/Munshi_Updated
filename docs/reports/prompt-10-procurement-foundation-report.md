# Prompt 10 — Procurement Foundation Report

## SECTION A — Backend Implementation

- **Migration `006_procurement_foundation.sql`**: extends `purchase_requests`, adds `purchase_request_items` and `purchase_request_audit`.
- **Domain models**: `PurchaseRequest`, `PurchaseRequestItem`, `PurchaseRequestAudit` with factory scoping.
- **Status lifecycle**: `DRAFT → PENDING_APPROVAL → APPROVED → ASSIGNED_TO_VENDOR → CLOSED` (+ `REJECTED`).
- **Services**: `PurchaseRequestService`, `PurchaseRequestSuggestionService`, `PurchaseRequestValidationService`.
- **Workflow**: `PURCHASE_REQUEST_CREATE` handler registered in existing workflow engine (4 steps).
- **Stubs removed**: purchase request REST endpoints fully implemented with Swagger DTOs.

## SECTION B — LLM Requirements

- Intent `/purchase_request_create` added to `bot_engine.py` pre-classifier and few-shot examples.
- English, Hindi, Hinglish patterns for procurement need phrases.
- Slash command `/purchase_request_create` bypasses LLM when typed directly.

## SECTION C — Contract Requirements

- Updated `contracts/intent-types.json`, `workflow-types.json`, `suggestion-types.json`.
- Added `CREATE_PURCHASE_REQUEST` suggestion type and `PURCHASE_REQUEST_CREATE` workflow type.
- Contract drift tests extended for new workflow command.

## SECTION D — Training Data Requirements

- Add eval dataset `purchase_request_create.json` (recommended 100 examples) mirroring Prompt 9 pattern.
- Include: "need cement", "steel kharidna hai", "procurement request banao", negative examples vs `/onboard_vendor`.

## SECTION E — Future Automation Opportunities

- Prompt 11: vendor-side procurement operations (quotations, PO send).
- Prompt 12: goods receipt → inventory stock-in linked to PR.
- Prompt 13: invoice processing + ledger foundation.
- Document-driven PR suggestions from purchase invoices (extend suggestion engine).
