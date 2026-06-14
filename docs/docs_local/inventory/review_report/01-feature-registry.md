# Phase 1 — Inventory Feature Registry

**Report date:** 2026-06-10  
**Codebase reference:** `main` + feature branch `feature/shantanu-inventory-import-idempotency` (unmerged)  
**Method:** Read-only audit

| # | Feature | Description | Implemented | Prod Code | UI | WhatsApp |
|---|---------|-------------|:-----------:|:---------:|:--:|:--------:|
| 1 | Inventory Categories | CRUD + deactivate per factory | Y | Y | Partial (admin) | N |
| 2 | Inventory Locations | CRUD + deactivate per factory | Y | Y | Partial (admin) | N |
| 3 | Inventory Items | CRUD, SKU lookup, pagination | Y | Y | Partial (admin) | N |
| 4 | Inventory Transactions | STOCK_IN, STOCK_OUT, ADJUSTMENT ledger | Y | Y | N | N |
| 5 | Inventory Status (REST) | Per-item status, quantity endpoints | Y | Y | N | N |
| 6 | Inventory Status (WhatsApp) | `/inventory_status` SKU or list | Y | Y | N | Y |
| 7 | Low Stock Detection | Threshold crossing on movements | Y | Y | N | N |
| 8 | Low Stock Alerts (WhatsApp) | Domain event → outbound message | Y | Y | N | Y |
| 9 | Low Stock Purchase CTA | Button → purchase request prefill | Y | Y | N | Y |
| 10 | Inventory Create Workflow | `/inventory_create` → workflow session | Y | Y | N | Y |
| 11 | REST CSV Import | `POST /inventory/import/csv` direct import | Y | Y | N | N |
| 12 | WhatsApp CSV Import (session) | `/inventory_import_csv` → upload → review | Y | Y | N | Y |
| 13 | Import Review | Category/location/item preview before import | Y | Y | N | Y |
| 14 | Import CONFIRM | User confirms → provision + import | Y | Y | N | Y |
| 15 | Auto-Provisioning | Create missing categories/locations on confirm | Y | Y | N | Y |
| 16 | CSV Template (static) | Public template URL + parser validation | Y | Y | Y (static) | Y (link in help) |
| 17 | Webhook Idempotency (import) | Dedup `message_id` on `/webhook` | Y* | Y* | N | Y* |
| 18 | Import Locking (`importing`) | Block parallel CONFIRM | Y* | Y* | N | Y* |
| 19 | Stock Dedup (CSV batch) | Unique CSV_IMPORT txn per item+batch | Y* | Y* | N | Y* |
| 20 | Task Inventory Lines | Lines on tasks, completion movements | Y | Y | N | Y |
| 21 | Task NL Inventory | Natural-language task+inventory creation | Y | Y | N | Y |
| 22 | Task Inventory Disambiguation | Item/worker resolution sessions | Y | Y | N | Y |
| 23 | Inventory ML Intent | ML orchestrator for inventory NL | Y | Y | N | Y |
| 24 | Purchase Request Prefill | Low-stock → PR workflow with item | Y | Y | N | Y |
| 25 | Purchase Approval Workflow | Existing PR approval (procurement) | Y | Y | N | Partial |
| 26 | Inventory Reporting | `/inventory_status` list + low-stock summary | Y | Y | N | Y |
| 27 | Inventory APIs (full REST) | Categories, locations, items, transactions | Y | Y | N | N |
| 28 | Zoho OAuth | Connect/disconnect Zoho Inventory | Y | Y | Y | N |
| 29 | Zoho Pull Sync | Items + stock → mappings | Y | Y | N | N |
| 30 | Zoho Scheduled Sync | Cron pull every 10 min (interval gated) | Y | Y | N | N |
| 31 | Zoho Stock-Out Push | Task complete → Zoho adjustment | Y | Y | N | N |
| 32 | Document Inventory Suggestions | Document pipeline inventory suggestions | Y | Y | N | N |

\*Rows 17–19: on branch `feature/shantanu-inventory-import-idempotency` only — **not on `main`**.

**Total features discovered:** 32
