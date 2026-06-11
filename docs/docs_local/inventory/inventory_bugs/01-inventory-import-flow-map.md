# Phase 1 — Inventory Import Flow Map

**Date:** 2026-06-10  
**Type:** Investigation only

---

## How many inventory import paths exist?

**Four distinct paths** can reach `processImport()` or equivalent import logic:

| # | Entry point | Review? | Provisions categories? | Trigger |
|---|-------------|---------|------------------------|---------|
| **A** | WhatsApp document + `/inventory_import_csv` session | **YES** | On CONFIRM | `startAwaitingCsv` → upload → `buildImportReview` → CONFIRM → `processImportWithProvisioning` |
| **B** | WhatsApp document + `canAutoImport()` (legacy) | **NO** | **NO** | Owner/manager uploads CSV without session |
| **C** | REST `POST /inventory/import/csv` | **NO** | **NO** | API multipart upload |
| **D** | WhatsApp CONFIRM reply | N/A | **YES** | `handleReviewReply` → `confirmImport` → `processImportWithProvisioning` |

Paths **A** and **D** are the intended review flow. Path **B** is the legacy auto-import bypass.

---

## Flow diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVENTORY CSV ENTRY POINTS                   │
└─────────────────────────────────────────────────────────────────┘

PATH A — Review flow (intended WhatsApp)
──────────────────────────────────────
/inventory_import_csv  (text command)
        ↓
startAwaitingCsv()  [in-memory Map, phase=awaiting_upload]
        ↓
User attaches CSV document
        ↓
POST /webhook → parseWhatsAppInbound → handleIncomingDocument()
        ↓
importFromCsvBuffer()  [pending != null → useReview=true]
        ↓
buildImportReview() → phase=awaiting_confirm
        ↓
sendTextMessage("Inventory Import Review…")
        ↓
User replies CONFIRM
        ↓
handleReviewReply() → confirmImport()
        ↓
processImportWithProvisioning() → ensureMasterData() + processImport()
        ↓
sendTextMessage("✅ Inventory import complete…")


PATH B — Legacy auto-import (BUG 1)
───────────────────────────────────
Owner/manager attaches CSV (no /inventory_import_csv)
        ↓
POST /webhook → handleIncomingDocument()
        ↓
canAutoImport() === true
        ↓
importFromCsvBuffer()  [pending=null → useReview=false]
        ↓
uploadCsv() → processImport()  [no category/location provisioning]
        ↓
sendTextMessage(summary with Failed: N / Category not found)


PATH C — REST API
─────────────────
POST /inventory/import/csv
        ↓
InventoryImportUploadService.uploadCsv()
        ↓
processImport()  [direct, no review]


PATH D — CONFIRM only
─────────────────────
(same as PATH A tail)
CONFIRM text → handleIncomingMessage() early branch
        ↓
confirmImport() → processImportWithProvisioning()
```

---

## Key files

| Layer | File |
|-------|------|
| Webhook ingress | `whatsapp.controller.ts` → `receiveMessage()` |
| Parser | `whatsapp-inbound.parser.ts` |
| Document router | `whatsapp.service.ts` → `handleIncomingDocument()` |
| Text router | `whatsapp.service.ts` → `handleIncomingMessage()` |
| Session state | `inventory-bulk-import.service.ts` → `pendingByPhone` Map |
| Review / confirm | `inventory-bulk-import.service.ts` |
| Import core | `inventory-import.service.ts` → `processImport()` |
| Upload wrapper | `inventory-import-upload.service.ts` |

---

## What is NOT in the inventory CSV path

- `document_processing_jobs` — **not used** for WhatsApp inventory CSV
- `workflow_sessions` — **not used** for inventory import
- ML document parsing pipeline — **not used** (docs confirm CSV-only on WhatsApp)

---

## Session storage

Review/upload sessions are **in-memory only** (`Map<string, PendingCsv>` in `InventoryBulkImportService`). Not persisted to Postgres. Lost on process restart; no cross-instance coordination.
