# Prompt 8 — Document Ingestion Report

**Date:** 2026-05-29  
**Scope:** End-to-end document upload, storage, and ingestion pipeline wiring

---

## SECTION A — Backend Implementation

### Delivered

| Component | Location | Purpose |
|-----------|----------|---------|
| `StorageProvider` interface | `src/services/documents/storage/storage-provider.interface.ts` | Abstract storage (local/GCS/S3-ready) |
| `LocalStorageProvider` | `storage/local-storage.provider.ts` | Files under `DOCUMENT_STORAGE_PATH` or `./storage/documents` |
| `POST /documents/upload` | `documents.controller.ts` | Multipart upload + metadata + auto-process |
| `POST /documents/:id/process` | `documents.controller.ts` | Manual orchestrator re-run |
| Upload job | `documents.service.ts` | Creates `UPLOAD` job on successful store |

### Upload flow

```
POST /documents/upload (multipart: file + factory_id + uploaded_by + document_type)
  → LocalStorageProvider.store()
  → Document record (UPLOADED)
  → UPLOAD job (COMPLETED)
  → DocumentProcessingOrchestrator.processDocument() [if auto_process !== false]
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCUMENT_STORAGE_PATH` | `./storage/documents` | Local file root |
| `ML_URL` | `http://localhost:8000` | Parser service base URL |

### Tests

- `storage/local-storage.provider.spec.ts` — store/read round-trip

---

## SECTION B — LLM Requirements

- Backend calls `POST {ML_URL}/parse` with JSON body including `content_base64`.
- Response must include `document_type`, `payload`, optional `warnings`.
- Supported inputs: CSV, XLSX, structured text only (no OCR/PDF in this phase).

---

## SECTION C — Contract Requirements

- Upload stores `mime_type`, `storage_ref`, `uploaded_by`, `factory_id`.
- Parser output validated against `contracts/schemas/*` before persistence.
- Invalid extractions logged to `document.metadata.extraction_audit`.

---

## SECTION D — Training Data Requirements

- Labeled CSV/XLSX samples per factory layout (column aliases: `name`, `item_name`, `qty`, etc.).
- Negative samples: empty files, wrong headers, mixed languages.
- Baseline fixtures in LLM `eval/document_eval.py`.

---

## SECTION E — Future Automation Opportunities

- `GcsStorageProvider` / `S3StorageProvider` implementing same interface.
- Virus scan hook after upload.
- Webhook notification when ingestion completes.
- Procurement invoice upload reuses same upload endpoint with different `document_type`.
