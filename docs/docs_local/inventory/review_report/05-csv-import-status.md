# Phase 5 — CSV Import Status

## Timeline

| Phase | Capability | Status |
|-------|------------|--------|
| 1.2 | Core import (`processImport`, stock-in per row) | **Live on main** |
| 1.3 | REST `POST /inventory/import/csv` | **Live on main** |
| 1.4 | WhatsApp bulk import service | **Live on main** |
| Review | `/inventory_import_csv` → review → CONFIRM | **Live on main** |
| Provisioning | `ensureMasterData` on confirm | **Live on main** |
| Bug investigation | Duplicate review/complete (Jun 2026) | **Documented** |
| Idempotency fix | Branch `feature/shantanu-inventory-import-idempotency` | **Implemented, not merged** |

## Import paths (4)

| Path | Review? | On main today | After fix branch |
|------|---------|---------------|------------------|
| A — WhatsApp session + review | Yes | Yes (with bugs) | Yes (fixed) |
| B — Legacy auto-import | No | **Yes (bug)** | **Removed** |
| C — REST API | No | Yes | Unchanged |
| D — CONFIRM | Yes | Yes (race bug) | Locked |

## Known bugs (main — pre-merge)

| Bug | Severity | Root cause | Fix status |
|-----|----------|------------|------------|
| BUG 1 Direct CSV without command | HIGH | `canAutoImport()` | **Fixed on branch** |
| BUG 2 Duplicate review messages | HIGH | Webhook retries, no dedup | **Fixed on branch** (mig 015) |
| BUG 3 Duplicate complete (Added→Updated) | HIGH | CONFIRM race + webhooks | **Fixed on branch** (lock + mig 016) |
| Duplicate stock-in side effect | HIGH | Same batch retry | **Fixed on branch** |

## Fix branch details

| Item | Detail |
|------|--------|
| Branch | `feature/shantanu-inventory-import-idempotency` |
| Commits | `00ebd73` (fix), `5565e2e` (handoff docs) |
| Migrations | `015_whatsapp_webhook_dedup.sql`, `016_inventory_csv_stock_dedup.sql` |
| Unit tests | 386/386 PASS (includes new dedup + lock specs) |
| Integration | NOT VERIFIED (no local Postgres) |
| PR | **Not merged** — compare link prepared, awaiting reviewer |
| Review status | **Pending second developer** |

## Auto-provisioning

- **Implemented:** `processImportWithProvisioning()` creates missing categories/locations from review
- **Tested:** `inventory-import-review.integration.spec.ts` (when Postgres up)
- **Live:** Yes on main for CONFIRM path

## Recommended next steps

1. Reviewer executes `inventory_bug_fix/09-reviewer-validation-checklist.md` on staging with fix branch deployed
2. Apply migrations 015–016 on staging
3. Merge PR to main after PASS
4. Redeploy backend
