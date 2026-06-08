# Procurement CTA Fix — Implementation Summary

**Date:** 2026-06-07  
**Scope:** Bridge Low Stock Alert CTA → Purchase Request Workflow only  
**Status:** Implementation complete — not pushed, not merged, not deployed

## Problem

`Purchase karein` taps from low-stock alerts did not start the purchase request workflow. Inbound messages resolved to plain title text, missed `matchWorkflowStartCommand()`, and fell through to ML `general_chat` → Owner Home.

## Solution (three layers)

| Layer | Change | Handles |
|-------|--------|---------|
| **Parser** | Prefer `button_reply.id` before `data.text` | Option A, Option C |
| **Routing** | `isPurchaseRequestWorkflowCommand()` + `isLowStockPurchaseCtaTitle()` before ML | Slash commands + title CTAs |
| **Context cache** | `low_stock_alert_contexts` table (24h TTL) | Option B title-only taps |

## Files changed

| File | Change |
|------|--------|
| `backend/migrations/014_low_stock_alert_context.sql` | New table |
| `backend/src/services/inventory/low-stock-alert-context.schema.ts` | Sequelize model |
| `backend/src/services/inventory/low-stock-alert-context.service.ts` | Context CRUD + CTA resolution |
| `backend/src/services/inventory/low-stock-alert-context.constants.ts` | TTL + user messages |
| `backend/src/services/inventory/inventory-low-stock-alert.handler.ts` | Save context on alert send |
| `backend/src/services/inventory/inventory.module.ts` | Register + export service |
| `backend/src/core/services/db-service/models.ts` | Register model |
| `backend/src/modules/whatsapp/whatsapp-inbound.parser.ts` | Parser hardening |
| `backend/src/core/messaging/whatsapp-interactive.constants.ts` | `isLowStockPurchaseCtaTitle()` |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Routing + `routeMlFallback()` extract |
| `backend/src/modules/whatsapp/whatsapp-inbound.parser.spec.ts` | Scenarios A, C |
| `backend/src/core/messaging/whatsapp-interactive.constants.spec.ts` | CTA title + PR command tests |
| `backend/test/integration/procurement-cta-bridge.integration.spec.ts` | Scenarios A–F + UAT |

## Preserved (unchanged)

- Purchase Request Create / Approve / Vendor Assignment / Close workflow states
- Approval logic and procurement schemas
- Low-stock detection and alert generation
- Owner Home interactive button IDs

## Success path (post-fix)

```
Low Stock Alert sent
  → context saved (phone, factory_id, itemId, name, expires_at)
  → User taps Purchase karein
  → Parser: button_reply.id OR title → command OR context lookup
  → startWorkflowFromCommand(/purchase_request_create?itemId=N)
  → Prefill prompt
  → YES → Purchase request created (PENDING_APPROVAL)
```

## Test summary

| Suite | Result |
|-------|--------|
| Parser + constants unit tests | **21/21 PASS** |
| Regression unit tests (workflow, prefill) | **36/36 PASS** |
| Integration (`procurement-cta-bridge`) | **NOT VERIFIED** — Postgres unavailable in local test env |
| TypeScript `tsc --noEmit` | **PASS** |

## Deployment recommendation

1. Apply migration `014_low_stock_alert_context.sql` on staging first.
2. Deploy backend; no frontend changes required.
3. Run one live low-stock alert + `Purchase karein` tap on owner phone.
4. Confirm `workflow_sessions` row with `prefill_source: low_stock_alert` and no ML classify log for the tap.

See reports 02–08 for phase detail, test design, and sign-off.
