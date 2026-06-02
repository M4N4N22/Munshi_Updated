# Workflow Root Cause Report

**Date:** 2026-06-02  
**Sprint:** P0 Execution Readiness & Foundation Validation

---

## Executive summary

The original NL workflow-start failure was **not a missing registry handler**. Root causes were **architectural duplication**, **stale runtime**, and **test harness gaps**. Production-safe fixes unify workflow creation through `WorkflowRouterService.startWorkflowIfRegistered()` and remove duplicate `processCommand` onboarding paths.

Post-fix validation: **6/6 NL workflow starts PASS**, **5/5 workflow completions PASS**.

---

## Blocker 1 — Natural language workflow start

### Observed symptom

| Layer | Before fix |
|-------|------------|
| ML classify | Correct (`/business_discovery`, `/onboard_vendor`, etc.) |
| Webhook | `ok` |
| `workflow_sessions` | No ACTIVE row (intermittent / stale backend) |
| Slash command | ACTIVE session created reliably |

### Root cause

**Primary:** Duplicate execution paths for workflow intents.

1. **Slash path:** `matchWorkflowStartCommand` → `startWorkflowFromCommand` → `WorkflowEngineService.startWorkflow` → DB INSERT.
2. **NL path:** ML classify → `startWorkflowFromMlCommand` (same engine when handler found) **OR** fallback `processCommand`.
3. **Gap:** `processCommand` had handlers for `/onboard_vendor`, `/onboard_worker`, `/inventory_create` but **not** for `/business_discovery`, `/continue_discovery`, or `/purchase_request_create`. When `startWorkflowFromMlCommand` returned null (stale instance / timing), NL phrases for those intents fell through to `waUnknownCommand()` — webhook `ok`, no session.

**Secondary:** Validation runs against a **stale backend process** not running latest compiled code produced false negatives (sessions created in logs on 2026-06-01 but not during 2026-06-02 golden run until backend restart).

### Why it happened

- Workflow routing evolved with slash-first design; ML path added later with parallel `processCommand` fallbacks for only some intents.
- `startWorkflowFromMlCommand` returning `null` silently delegated to `processCommand` without guaranteed workflow coverage.
- No integration test asserted NL phrase → ACTIVE session for all six workflow intents.

### Why existing tests missed it

- `workflow-routing.spec.ts` mocks registry; tests slash and null ML path separately.
- Golden E2E script checked session 800 ms after webhook but did not require backend/ML process freshness.
- Unit tests never exercised full `WhatsAppService.handleIncomingMessage` NL path end-to-end.

### Fix applied (production-safe)

| File | Change |
|------|--------|
| `workflow-engine.service.ts` | Added `isRegisteredWorkflowCommand()` and `startWorkflowIfRegistered()` — single entry for ML and slash |
| `whatsapp.service.ts` | NL branch calls `startWorkflowIfRegistered`; removed duplicate `processCommand` handlers for onboard/create intents |
| `whatsapp.service.ts` | Added `normalizeIntentCommand()` for consistent slash normalization |

### Why recurrence is prevented

- **Single source of truth:** All workflow starts go through `startWorkflowFromCommand` → `WorkflowEngineService.startWorkflow`.
- No duplicate onboarding paths in `processCommand`.
- P0 script `run-p0-readiness-validation.mjs` asserts NL → ACTIVE session for all six intents on every sprint run.

### Production risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Duplicate session creation | Low | `WorkflowSessionService.createSession` throws `ConflictException` if ACTIVE exists |
| Worker running forbidden workflow | Low | `ensureCanRunWorkflow` unchanged |
| Regression on slash commands | Low | Slash path unchanged; validated 6/6 NL + slash manual checks |

---

## Blocker 2 — Manager execution (cross-reference)

See `manager-operations-root-cause-report.md`. Summary: assign failures were **missing factory user "rahul"** (NotFoundException → webhook `error`) and **HttpException bubbling** before user message delivery. Fixed via graceful `not_found` mention resolution and 4xx → user message with webhook `ok`.

---

## Blocker 3 — Issue lifecycle (cross-reference)

See `issue-lifecycle-report.md`. Expanded `operational_pre_classify` regex in `bot_engine.py`; requires **ML process restart** after deploy.

---

## Verification evidence

Source: `docs/reports/p0-readiness-results.json` (2026-06-02T08:47:25Z)

| Intent | Session ID | ACTIVE |
|--------|------------|--------|
| `/business_discovery` | 20 | ✅ |
| `/continue_discovery` | 21 | ✅ |
| `/onboard_vendor` | 22 | ✅ |
| `/onboard_worker` | 23 | ✅ |
| `/inventory_create` | 24 | ✅ |
| `/purchase_request_create` | 25 | ✅ |

**Result: 6/6 PASS**
