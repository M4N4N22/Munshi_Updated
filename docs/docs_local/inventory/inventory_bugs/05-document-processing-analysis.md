# Phase 5 — Document Processing Investigation

**Date:** 2026-06-10

---

## Question

Does WhatsApp inventory CSV use the document processing job pipeline?

## Answer

**NO.** One upload does **not** create `document_processing_jobs` records.

---

## Evidence

1. **No imports** of `DocumentProcessingOrchestrator`, `DocumentsService`, or document modules in:
   - `whatsapp.service.ts`
   - `inventory-bulk-import.service.ts`
   - `whatsapp.controller.ts`

2. **Product documentation** (`docs/docs_local/inventory/50-document-uat-execution.md`):
   > WhatsApp documents — **CSV bulk import only** (`handleIncomingDocument`) — **NOT** document parsing pipeline

3. **Flow is synchronous:**
   ```
   Webhook → downloadMedia() → parseCsvFile() → buildImportReview() OR processImport()
   ```
   All in-request; no async job queue.

---

## `document_processing_jobs` relevance

| Path | Creates jobs? |
|------|---------------|
| REST `/documents/upload` with `auto_process` | **YES** |
| WhatsApp inventory CSV | **NO** |
| WhatsApp team CSV | **NO** |

---

## Can one upload create multiple jobs?

**N/A for inventory CSV** — jobs are never created.

Duplicate imports are **not** caused by document processing job fan-out. They are caused by **duplicate webhook handling** (see Phase 3).

---

## Confidence

**99%** — code path analysis + existing UAT docs.
