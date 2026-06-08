# Phase 6 — Integration Test Results

**Spec:** `backend/test/integration/procurement-cta-bridge.integration.spec.ts`  
**Run date:** 2026-06-07  
**Environment:** Local — Postgres probe failed (`POSTGRES_CONNECTION_STRING` not reachable)

## Unit tests (executed — PASS)

| Suite | Tests | Result |
|-------|-------|--------|
| `whatsapp-inbound.parser.spec.ts` | 13 | **PASS** |
| `whatsapp-interactive.constants.spec.ts` | 10 | **PASS** |
| `workflow-routing.spec.ts` | — | **PASS** |
| `workflow-hardening.spec.ts` | — | **PASS** |
| `purchase-request-prefill.helper.spec.ts` | — | **PASS** |

**Total unit regression:** 36/36 PASS (related suites)

## Integration scenarios (designed — NOT VERIFIED live DB)

| Scenario | Test name | Expected | Local run |
|----------|-----------|----------|-----------|
| **A** | `button_reply.id starts workflow without ML` | Workflow session + no `axios.post` ML | NOT VERIFIED |
| **B** | `title-only Purchase karein uses context cache` | Context row + workflow session | NOT VERIFIED |
| **C** | `button_reply.id wins over title text` | Parser returns command id | Covered by **unit test PASS** |
| **D** | `multiple active alerts prompt disambiguation` | Disambiguation text, no ML | NOT VERIFIED |
| **E** | `expired context returns expiry message` | Expired user message | NOT VERIFIED |
| **F** | `no context returns manual fallback` | None user message | NOT VERIFIED |
| **UAT** | `alert → Purchase karein → YES creates PR` | `purchase_requests` + APPROVAL step | NOT VERIFIED |

## Scenario C — verified via unit test

Parser test confirms Option C payload resolves to `/purchase_request_create?itemId=N` without DB.

## To verify integration locally

```powershell
cd backend
# Ensure POSTGRES_CONNECTION_STRING is set in .env
npm run test:integration -- --testPathPattern="procurement-cta-bridge"
```

Migration `014` must be applied before integration run (`node scripts/apply-migrations.mjs`).

## TypeScript compile

`npx tsc --noEmit` — **PASS**
