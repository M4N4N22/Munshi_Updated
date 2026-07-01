# Regression Report

**Date:** 2026-06-10

## Areas Verified (Unit Level)

| Feature | Spec file | Result |
|---------|-----------|--------|
| Inventory Import Review | `inventory-bulk-import.service.spec.ts` | PASS |
| Inventory Import Confirm | `inventory-bulk-import.service.spec.ts` | PASS |
| REST CSV Import | `inventory-import-upload.service.spec.ts` | PASS |
| Inventory import parsing | `inventory-import.service.spec.ts` | PASS |
| Low stock outbound | `inventory-low-stock-outbound.spec.ts` | PASS |
| Purchase CTA routing | `whatsapp-inbound.parser.spec.ts` | PASS |
| Inventory transactions | `inventory-transaction.service.spec.ts` | PASS |

## Behavior Changes (Expected)

| Area | Change |
|------|--------|
| WhatsApp CSV without session | No longer auto-imports; sends `/inventory_import_csv` guidance |
| Duplicate webhooks | Silently deduplicated at controller |
| Double CONFIRM | Second reply gets "Import already in progress." |

## Not Regression-Tested (Requires Staging + Postgres)

- End-to-end WhatsApp document upload with Olli media download
- Live webhook retry simulation on Railway
- Integration suites (59 inventory-related tests skipped — no local DB)

## Recommendation

After merge, verify on staging:

1. `/inventory_import_csv` → CSV → review → CONFIRM (single complete message)
2. Direct CSV attach without command → guidance only
3. Check `whatsapp_webhook_events` table grows once per message
