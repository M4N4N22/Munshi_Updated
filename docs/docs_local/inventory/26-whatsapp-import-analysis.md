# Phase 1.4 — WhatsApp Import Analysis

**Run date:** 2026-06-06  
**Scope:** WhatsApp CSV orchestration only — no template download, no import core changes

---

## 1. Existing WhatsApp Architecture

| Component | Role |
|-----------|------|
| `WhatsAppController` | `POST /webhook` → `parseWhatsAppInbound()` |
| `parseWhatsAppInbound` | Text vs document dispatch via `OlliMediaService.extractMediaFromWebhook` |
| `WhatsAppService.handleIncomingMessage` | Commands, owner home, workflows |
| `WhatsAppService.handleIncomingDocument` | Document download + bulk import routing |
| `TeamBulkImportService` | Team CSV pending state + row import (pre-existing pattern) |
| `OlliMediaService.downloadMedia` | URL or mediaId download via OLLI API |
| `OwnerHomeService` | Interactive home actions including team bulk CSV |

Phase 1.4 mirrors the team bulk-import pattern for inventory, delegating parse/import to validated Phase 1.1–1.3 layers.

---

## 2. Media Download Flow

```text
Webhook payload (document/file)
  → parseWhatsAppInbound → { kind: 'document', media: InboundMediaRef }
  → WhatsAppService.handleIncomingDocument
  → Pre-check filename/mime (reject xlsx/pdf/images before download when not team-pending)
  → OlliMediaService.downloadMedia(ref) → Buffer
  → InventoryBulkImportService.importFromCsvBuffer
```

**Reuse:** `OlliMediaService.downloadMedia()` — no new downloader.

---

## 3. Import Orchestration Design

```text
InventoryBulkImportService
  ├── pendingByPhone (TTL 30 min) — optional via /inventory_import_csv
  ├── canAutoImport — owner/manager direct CSV attach
  ├── importFromCsvBuffer
  │     ├── size gate (2 MB)
  │     ├── extension gate (.csv only)
  │     └── InventoryImportUploadService.uploadCsv()
  │           ├── parseInventoryCsvText()
  │           └── InventoryImportService.processImport()
  └── formatSummary → Hinglish WhatsApp text
```

### Document routing priority (`handleIncomingDocument`)

1. Reject unsupported types (when not team-pending)
2. Download media
3. **Inventory pending** → inventory import
4. **Team pending** → team import
5. **Owner/manager auto-import** → inventory import
6. Else → guidance message

### Mutual exclusion

- `/inventory_import_csv` cancels team pending
- Owner home `HOME_BULK_CSV` cancels inventory pending

---

## 4. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-T02 | Team vs inventory pending collision | Separate pending maps; explicit cancel on start; routing priority |
| R-T03 | OLLI download failure (DEF-ACC-001) | try/catch in handleIncomingDocument; user sees error message |
| R-D01 | Quantity overwrite | Unchanged — delegates to validated `InventoryImportService` |
| UX | Worker sends CSV | Rejected unless owner/manager role for auto-import |

---

## 5. Audit Trail

Structured log via Nest `Logger` (no new DB tables):

```json
{
  "event": "inventory_csv_import_complete",
  "batchId": 1234567890,
  "phone": "+91...",
  "factoryId": 1,
  "userId": 42,
  "addedCount": 10,
  "updatedCount": 2,
  "failedCount": 1,
  "skippedCount": 0
}
```

Parse failures log `inventory_csv_import_parse_failed`; oversize logs `inventory_csv_import_rejected`.
