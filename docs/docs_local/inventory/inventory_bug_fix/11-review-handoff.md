# Review Handoff Package

**From:** Shantanu
**To:** Second developer (reviewer)
**Date:** 2026-06-10

## Branch

`feature/shantanu-inventory-import-idempotency`

## PR

**Title:** fix(inventory): webhook idempotency, remove auto-import, confirm locking

**Link:** https://github.com/M4N4N22/Munshi_Updated/compare/main...feature/shantanu-inventory-import-idempotency

(Create formal PR if not yet open — branch is pushed to origin.)

## Summary

Fixes duplicate inventory import execution from WhatsApp webhook retries and parallel CONFIRM processing.

## Files Changed (26)

### Migrations (2 new)
- `backend/migrations/015_whatsapp_webhook_dedup.sql`
- `backend/migrations/016_inventory_csv_stock_dedup.sql`

### Backend (12)
- `whatsapp.service.ts` — remove auto-import, CSV guidance
- `whatsapp.controller.ts` — webhook dedup gate
- `inventory-bulk-import.service.ts` — session required, importing lock
- `whatsapp-webhook-dedup.*` — new dedup service/schema/extract
- `inventory-import.service.ts` — skip duplicate stock-in
- `inventory.repository.ts` — findCsvImportTransaction
- `models.ts`, `whatsapp.module.ts`

### Tests (5)
- `inventory-bulk-import.service.spec.ts` (updated)
- `whatsapp-webhook-dedup.*.spec.ts` (new)
- `whatsapp.controller.spec.ts` (new)
- `inventory-import-idempotency.integration.spec.ts` (new)
- `inventory-csv-whatsapp.integration.spec.ts` (updated)

### Docs (11 in inventory_bug_fix/)

## Migrations Added

| # | File | Purpose |
|---|------|---------|
| 015 | whatsapp_webhook_dedup.sql | `whatsapp_webhook_events` unique on provider_message_id |
| 016 | inventory_csv_stock_dedup.sql | Partial unique index on CSV_IMPORT per item+batch |

**Total after apply:** 18/18 migrations

## Tests Executed

| Suite | Result |
|-------|--------|
| Unit (`npm test`) | **386/386 PASS** |
| New webhook dedup specs | PASS |
| Bulk import double-CONFIRM | PASS |
| Controller dedup spec | PASS |

## Tests Pending (require Postgres)

| Suite | Status |
|-------|--------|
| `inventory-import-idempotency.integration.spec.ts` | NOT VERIFIED — no local Postgres |
| `inventory-csv-whatsapp.integration.spec.ts` | NOT VERIFIED — no local Postgres |
| Staging WhatsApp E2E | Pending reviewer UAT |

## Deployment Risks

1. **UX change:** Owners must `/inventory_import_csv` before CSV upload
2. Webhooks without `message_id` cannot be deduplicated
3. `whatsapp_webhook_events` table grows without TTL cleanup
4. Migrations must run before/with deploy

## Reviewer Actions Required

1. [ ] Code review — focus on dedup claim, importing lock, stock guard
2. [ ] Apply migrations 015–016 on staging
3. [ ] Deploy feature branch to staging
4. [ ] Complete checklist: `09-reviewer-validation-checklist.md`
5. [ ] Complete UAT: `10-staging-uat-plan.md`
6. [ ] Approve and merge to main (reviewer only)
7. [ ] Do **not** merge without staging validation

## Related Docs

- `01-implementation-summary.md` through `08-pr-summary.md` — implementation detail
- `09-reviewer-validation-checklist.md` — staging test checklist
- `10-staging-uat-plan.md` — Railway + DB verification
