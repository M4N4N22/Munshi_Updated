# Prompt 7 — Next Steps

**Date:** 2026-05-29  
**Baseline:** Document foundation + suggestion engine + inventory bootstrap (95 tests passing)

---

## Deliverables completed

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | DocumentModule + 4 entities | ✅ |
| 2 | Migration `005_document_processing.sql` | ✅ |
| 3 | Document type/status/suggestion enums | ✅ |
| 4 | Extraction contracts (no parsing) | ✅ |
| 5 | Generic suggestion engine | ✅ |
| 6 | Inventory bootstrap (`INITIAL_INVENTORY_IMPORT`) | ✅ |
| 7 | New item detection (`NEW_INVENTORY_ITEM`) | ✅ |
| 8 | Workflow YES/NO approval | ✅ |
| 9 | Document registry (contracts only) | ✅ |
| 10 | LLM specification framework | ✅ |
| 11 | Tests + reports | ✅ |

---

## Files created

```
migrations/005_document_processing.sql
src/services/documents/* (14 files)
src/services/workflow/handlers/suggestion-approval.handler.ts
src/services/workflow/handlers/suggestion-approval.handler.spec.ts
docs/reports/prompt-7-*.md (5 files)
```

## Files modified

```
src/core/services/db-service/models.ts
src/app/api/app.module.ts
src/services/workflow/workflow.constants.ts
src/services/workflow/workflow.interfaces.ts
src/services/workflow/workflow.registry.ts
src/services/workflow/workflow.module.ts
src/services/workflow/workflow.registry.spec.ts
src/services/inventory/inventory.repository.ts
migrations/README.md
docs/reports/future-work-report.md
docs/reports/cumulative-project-report.md
docs/implementation-report.md
```

---

## Schema changes

Four new tables: `documents`, `document_processing_jobs`, `document_extractions`, `document_suggestions`

Apply:

```bash
psql "$POSTGRES_CONNECTION_STRING" -f migrations/005_document_processing.sql
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Circular module dependency (Document ↔ Workflow) | `forwardRef()` on both modules |
| Large extractions (>500 items) | Pagination limit in processor; batch in Prompt 8 |
| No REST auth guards | Same as existing modules — add in hardening sprint |
| WhatsApp message for approval requires REST call to start workflow | Prompt 8: auto-notify uploader on suggestion |
| Sequential suggestion approval only | One active workflow per phone — queue remaining suggestions |

---

## Recommended Prompt 8

### Priority P0 — Document ingestion pipeline

| Task | Description |
|------|-------------|
| File upload endpoint | Store `storage_ref` with S3/local adapter |
| Parser adapter interface | Plug-in registry matching `DocumentRegistry` |
| Auto-start approval workflow | Notify uploader on WhatsApp when suggestions ready |
| Suggestion queue | Process next pending suggestion after workflow completes |

### Priority P1 — Purchase document suggestions

| Task | Description |
|------|-------------|
| `ProcurementSuggestionProcessor` | `CREATE_VENDOR`, `STOCK_IN` from `PURCHASE_INVOICE` |
| Link stock-in to vendor | Reference vendor on transaction metadata |
| ML intent: document upload | Route to document pipeline (classification only) |

### Priority P2 — Platform

| Task | Description |
|------|-------------|
| REST auth guards | Factory-scoped JWT or API key |
| Document status webhooks | Notify external systems on APPROVED |
| Reconciliation job | Verify `current_quantity` vs transactions |

### Explicitly deferred (unchanged)

- OCR / PDF / CSV / Excel parsing implementation
- Procurement ordering
- Ledger / finance / account aggregator
- LLM implementation in backend repo

---

## Test summary

| Suite | Tests |
|-------|-------|
| Document foundation | 7 |
| Suggestion engine + execution + workflow | 8 |
| Regression (inventory, vendor, workflow) | 80 |
| **Total** | **95** |

---

## Success criteria verification

| Criterion | Met |
|-----------|-----|
| Document foundation exists | ✅ |
| Suggestion engine exists | ✅ |
| Inventory bootstrap flow | ✅ |
| New inventory item detection | ✅ |
| No document parser implemented | ✅ |
| No LLM implemented | ✅ |
| Workflow engine reused | ✅ |
| Existing functionality unchanged | ✅ |
| Reports for future LLM dev | ✅ |
| Future parsers plug in without redesign | ✅ |

---

*See also: [prompt-7-document-foundation-report.md](./prompt-7-document-foundation-report.md)*
