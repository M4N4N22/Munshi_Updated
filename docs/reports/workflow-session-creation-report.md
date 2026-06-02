# Workflow Session Creation Report

**Date:** 2026-06-02  
**Scope:** NL + slash workflow session creation  
**Sources:** `p0-readiness-results.json`, `intent-functional-validation-results.json`

---

## Session creation path (canonical)

```text
User message
  → WhatsAppService.handleIncomingMessage
      → [cancel?] cancelWorkflow
      → [ACTIVE session?] handleActiveWorkflowMessage
      → [slash workflow cmd?] startWorkflowFromCommand
      → [else] ML /classify
            → normalizeIntentCommand
            → startWorkflowIfRegistered (NEW unified path)
                  → startWorkflowFromCommand
                        → WorkflowEngineService.startWorkflow
                              → WorkflowSessionService.createSession (INSERT ACTIVE)
```

Slash and natural language now converge on **`startWorkflowIfRegistered` → `startWorkflowFromCommand`**.

---

## NL workflow start validation (6/6 PASS)

| Intent | Phrase | Predicted | Webhook | Session ID | Workflow type | Status |
|--------|--------|-----------|---------|------------|---------------|--------|
| `/business_discovery` | mera business setup karna hai | ✅ | ok | 20 | BUSINESS_DISCOVERY | ACTIVE |
| `/continue_discovery` | setup phir se shuru | ✅ | ok | 21 | BUSINESS_DISCOVERY | ACTIVE |
| `/onboard_vendor` | naya vendor add karo | ✅ | ok | 22 | ONBOARD_VENDOR | ACTIVE |
| `/onboard_worker` | naya worker add karo | ✅ | ok | 23 | ONBOARD_WORKER | ACTIVE |
| `/inventory_create` | SKU register karo | ✅ | ok | 24 | INVENTORY_CREATE | ACTIVE |
| `/purchase_request_create` | purchase request bana do | ✅ | ok | 25 | PURCHASE_REQUEST_CREATE | ACTIVE |

---

## Golden E2E (24 intents)

After fixes + backend restart: **24/24 SUCCESS** including all six workflow intents above.

Golden script improvements (validation harness, not production code):

- `/cancel` + 800 ms wait before session snapshot
- Manager routing task setup before mgr* golden phrases
- Factory-realistic assign phrase: `prateek ko loading ka kaam do`

---

## Session lifecycle (completion runs)

| Workflow | Start session | End session | Final status | Domain entity |
|----------|---------------|-------------|--------------|---------------|
| BUSINESS_DISCOVERY | 26 | 26 | COMPLETED | profile PAUSED |
| ONBOARD_VENDOR | 27 | 27 | COMPLETED | vendor #2 |
| ONBOARD_WORKER | 28 | 28 | COMPLETED | user #28 |
| INVENTORY_CREATE | 29 | 29 | COMPLETED | item #1 |
| PURCHASE_REQUEST_CREATE | 30 | 30 | COMPLETED | PR #9 |

---

## Conflict / concurrency behaviour

`WorkflowSessionService.createSession`:

- Rejects second ACTIVE session per phone with `ConflictException` (409).
- No factory-specific or user-specific bypass.
- `/cancel` sets session to CANCELLED before new start.

---

## Operational requirement

After backend or ML code deploy:

1. Restart NestJS backend (`yarn dev` / production deploy).
2. Restart ML uvicorn on `:8000`.
3. Run `node scripts/run-p0-readiness-validation.mjs`.

Stale processes were the main source of false NO-GO in the prior functional sprint.
