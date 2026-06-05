# Phase 1.3 — REST Upload Analysis

**Run date:** 2026-06-06  
**Scope:** REST orchestration only — no WhatsApp, owner-home, or template download

---

## 1. Existing Building Blocks

| Layer | Component | Role |
|-------|-----------|------|
| Parser (1.1) | `parseInventoryCsvText()` | Validates CSV text → `InventoryCsvRow[]` or single error |
| Import core (1.2) | `InventoryImportService.processImport()` | Upsert + ledger STOCK_IN per row |
| REST precedent | `DocumentController.upload` | `FileInterceptor`, multipart, Swagger `@ApiConsumes` |
| Limits | `INVENTORY_CSV_MAX_BYTES` (2 MB) | Shared with parser |

Phase 1.3 adds a thin orchestration layer between HTTP and these existing modules.

---

## 2. Endpoint Design

| Field | Value |
|-------|-------|
| Method / path | `POST /inventory/import/csv` |
| Content type | `multipart/form-data` |
| File field | `file` (`.csv` only) |
| Form fields | `factory_id`, `created_by`, optional `batch_id` |
| HTTP status | `200 OK` on success (`@HttpCode`) |
| Response body | `InventoryImportSummary` JSON |

### Why extend `InventoryController`

- Keeps inventory REST surface under `/inventory/*`
- Matches existing module layout (`InventoryModule` already exports services)
- Avoids a second controller tag for a single endpoint

---

## 3. Orchestration Flow

```text
POST /inventory/import/csv
        │
        ▼
InventoryImportUploadService.uploadCsv()
        │
        ├─ assertCsvFile()     extension, size, required buffer
        ├─ parseInventoryCsvText()   parser failure → 400
        ├─ resolve batchId     dto.batch_id ?? generateBatchId()
        └─ processImport()     factory/user/rows/batchId
                │
                ▼
        InventoryImportSummary JSON
```

**No business logic in controller** — controller delegates to `InventoryImportUploadService`.

---

## 4. File Validation

| Rule | Implementation |
|------|----------------|
| Required file | Reject empty/missing buffer → 400 |
| Max size | Multer `limits.fileSize` + buffer length check (2 MB) |
| Allowed extension | `.csv` only (case-insensitive via `path.extname`) |
| Rejected extensions | `.xlsx`, `.xls`, `.pdf`, common image formats |
| Parser limits | Row count / field rules unchanged in parser |

WhatsApp may allow `.txt` in a later phase; REST v1 is **CSV-only** per roadmap.

---

## 5. Error Mapping

| Condition | HTTP |
|-----------|------|
| Missing file, bad extension, oversize | `400 Bad Request` |
| Parser failure (headers, duplicates, invalid qty) | `400 Bad Request` |
| Factory not found | `404 Not Found` |
| Row-level import failures | `200` with `failedCount` in summary (partial success) |

---

## 6. Guardrails (unchanged)

| Component | Modified? |
|-----------|-----------|
| `InventoryTransactionService` | **No** |
| `InventoryRepository` movement logic | **No** |
| `InventoryImportService` | **No** |
| Parser | **No** |
| Task inventory integration | **No** |
| Phase 0 behavior | **No** |

---

## 7. Sequence Diagram

```mermaid
sequenceDiagram
  participant Client
  participant Ctrl as InventoryController
  participant Up as InventoryImportUploadService
  participant Par as parseInventoryCsvText
  participant Imp as InventoryImportService

  Client->>Ctrl: POST multipart CSV
  Ctrl->>Up: uploadCsv(file, dto)
  Up->>Up: assertCsvFile
  Up->>Par: parse text
  alt parse fail
    Up-->>Client: 400
  else parse ok
    Up->>Imp: processImport(...)
    Imp-->>Up: summary
    Up-->>Client: 200 JSON summary
  end
```
