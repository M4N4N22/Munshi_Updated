# Phase 2 — Implementation Status

**Legend:** NI = Not Implemented | PI = Partially Implemented | IMP = Implemented | IV = Implemented + Verified (unit/integration)

| Feature | Status | Evidence |
|---------|--------|----------|
| Categories / Locations / Items | **IV** | `inventory.controller.ts`, `inventory.service.ts`, migration `004` |
| Transactions (in/out/adjust) | **IV** | `inventory-transaction.service.ts`, unit specs |
| REST CSV Import | **IV** | `inventory-import-upload.service.ts`, integration `inventory-csv-upload` |
| WhatsApp CSV Review + Confirm | **IV** | `inventory-bulk-import.service.ts`, integration `inventory-import-review` |
| Auto-Provisioning on confirm | **IV** | `ensureMasterData()` in `inventory-import.service.ts` |
| Low Stock Detection + Alerts | **IV** | `inventory-low-stock-alert.handler.ts`, domain events |
| Purchase CTA + Prefill | **IV** | `low-stock-alert-context`, `purchase-request-prefill` integration |
| `/inventory_status` WhatsApp | **IV** | `whatsapp.service.ts` ~1756–1818 |
| `/inventory_create` workflow | **IV** | `inventory-create.handler.ts`, workflow registry |
| Task ↔ Inventory completion | **IV** | `tasks.service.ts` `completeTaskWithAtomicInventory` |
| Task NL + disambiguation | **IV** | Phase 4 signoff `66-phase4-final-signoff.md` FULL PASS |
| Webhook idempotency (import bugs) | **IMP** (branch) | `whatsapp-webhook-dedup.*`, mig `015` — not on main |
| Import locking | **IMP** (branch) | `importing` phase — not on main |
| Stock batch dedup | **IMP** (branch) | mig `016`, `findCsvImportTransaction` — not on main |
| Legacy auto-import (no session CSV) | **Removed on branch** | Was on main; fix branch removes `canAutoImport` |
| Inventory admin web UI | **PI** | Admin client detail panel; no full inventory CRUD UI |
| Inventory reporting (dashboard) | **PI** | WhatsApp list only; no analytics dashboard |
| Zoho OAuth | **IV** | `zoho-oauth.service.ts`, integration `zoho-oauth` |
| Zoho Pull Sync | **IV** (mocked) | `zoho-pull-sync.service.ts`; live UAT pending |
| Zoho Scheduled Sync | **IV** (mocked) | `zoho-scheduled-sync.cron.ts` |
| Zoho Stock-Out Push | **PI** | Code complete; blocked by `org_id` + OAuth scope (YELLOW) |
| Zoho org_id at connect | **NI** | Not stored in OAuth callback metadata |
| Push OAuth write scope | **NI** | Only READ scopes in `zoho-oauth.constants.ts` |

## Summary counts

| Classification | Count |
|----------------|-------|
| Implemented + Verified (unit/integration) | 18 |
| Implemented (branch-only fixes) | 3 |
| Partially Implemented | 5 |
| Not Implemented | 2 |
