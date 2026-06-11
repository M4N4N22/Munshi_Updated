# Phase 7 — Inventory + Zoho Status

**Source:** `docs/docs_local/zoho/` verification (2026-06-10)  
**Verdict:** **YELLOW overall** — do **not** mark GREEN

## Feature matrix

| Capability | Code | Unit Test | Integration Test | Live UAT |
|------------|:----:|:---------:|:----------------:|:--------:|
| OAuth Connect | Y | PASS | NOT VERIFIED | NOT TESTED |
| OAuth Disconnect | Y | PASS | NOT VERIFIED | NOT TESTED |
| Token encryption | Y | PASS | NOT VERIFIED | NOT TESTED |
| Token refresh | Y | PASS | NOT VERIFIED | NOT TESTED |
| Pull items | Y | PASS | NOT VERIFIED | NOT TESTED |
| Pull stock (new items) | Y | PASS | NOT VERIFIED | NOT TESTED |
| Item mappings | Y | PASS | NOT VERIFIED | NOT TESTED |
| Scheduled sync (cron) | Y | PASS | NOT VERIFIED | NOT TESTED |
| `integration_sync_runs` logging | Y | PASS | NOT VERIFIED | NOT TESTED |
| Stock-out push (task complete) | Y | PASS | NOT VERIFIED | **BLOCKED** |
| Push retry cron | Y | PASS | NOT VERIFIED | NOT TESTED |
| Push idempotency (`integration_push_deliveries`) | Y | PASS | NOT VERIFIED | NOT TESTED |

## Zoho integration test files (all mocked HTTP)

| Spec | Focus |
|------|-------|
| `zoho-oauth.integration.spec.ts` | Connect/disconnect |
| `zoho-pull-sync.integration.spec.ts` | Pull + mappings |
| `zoho-scheduled-sync.integration.spec.ts` | Cron batch |
| `zoho-stock-push-events.integration.spec.ts` | Domain events |
| `zoho-stock-push-handler.integration.spec.ts` | Handler |
| `zoho-push-retry.integration.spec.ts` | Retry |
| `zoho-inventory-adjust-stock.integration.spec.ts` | Client adjustStock |

## Blockers (push = RED for live)

1. `metadata.org_id` not populated at OAuth
2. OAuth scopes read-only — missing `ZohoInventory.inventoryadjustments.CREATE`
3. No live staging UAT executed

## Distinction

| Signal | Meaning here |
|--------|--------------|
| Unit Test PASS | Client/handler logic with mocks |
| Integration Test PASS | Postgres + mocked Zoho (when DB up) |
| Live UAT PASS | **Not achieved** for push; partial for OAuth/pull untested live |
