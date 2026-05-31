# Prompt 8 — Document Processing Orchestrator Report

**Date:** 2026-05-29  
**Scope:** `DocumentProcessingOrchestrator`, suggestion queue, workflow auto-trigger

---

## SECTION A — Backend Implementation

### `DocumentProcessingOrchestrator`

Location: `src/services/documents/document-processing.orchestrator.ts`

**Responsibilities (no business rules):**

1. Load document from storage
2. Invoke `MlParserAdapter`
3. `ContractValidationService.validateAndNormalize()`
4. Persist extraction + update document status
5. `SuggestionEngineService.generateFromExtraction()`
6. `SuggestionQueueService.initializeQueue()`
7. `SuggestionWorkflowTriggerService.startQueueForDocument()`

### Suggestion queue

- `SuggestionQueueService` stores state in `document.metadata.suggestion_queue`
- Shape: `{ suggestion_ids, current_index, completed }`
- Sequential approval: one workflow at a time per uploader phone

### Workflow auto-trigger

- `SuggestionWorkflowTriggerService` creates `SUGGESTION_APPROVAL` session on suggestion create
- Notifies uploader via WhatsApp (`MessagingService`)
- `SuggestionApprovalWorkflowHandler` calls `onSuggestionResolved()` after YES/NO to advance queue
- Legacy `POST /documents/suggestions/:id/approve-workflow` retained for manual/debug use

### Job types

| Job | When |
|-----|------|
| `UPLOAD` | File stored |
| `INGEST_PARSE` | Orchestrator run |
| `EXTRACTION` | Legacy manual REST path only |

### Tests

- `document-processing.orchestrator.spec.ts`
- `suggestion-queue.service.spec.ts`
- `suggestion-workflow-trigger.service.spec.ts`
- `suggestion-approval.handler.spec.ts` (queue advance)

**Backend test count:** 102 passing

---

## SECTION B — LLM Requirements

- Parser must return contract-compliant JSON; orchestrator rejects invalid payloads before suggestions.
- Parser latency should stay under workflow session TTL; add timeout handling in production.

---

## SECTION C — Contract Requirements

- Queue ordering follows suggestion creation order from extraction processor registry.
- Workflow session data: `{ suggestion_id, document_id, summary }`.

---

## SECTION D — Training Data Requirements

- Multi-suggestion documents (10+ line items) to stress queue UX copy.
- Scenarios where uploader has active workflow (defer start).

---

## SECTION E — Future Automation Opportunities

- DB-backed queue table for multi-document concurrency.
- Separate queues per domain (Inventory / Procurement / Ledger / AA) using same service.
- Retry orchestrator from admin UI on `FAILED` status.
