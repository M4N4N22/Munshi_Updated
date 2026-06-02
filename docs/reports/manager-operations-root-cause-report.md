# Manager Operations Root Cause Report

**Date:** 2026-06-02  
**Scope:** `/assign`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`, `/mgrself`, `/update`

---

## Summary

| Operation | Root cause | Fix | Post-fix |
|-----------|------------|-----|----------|
| `/assign` | `resolveMention` threw `NotFoundException` for non-existent worker "rahul"; webhook returned `error` | Return `not_found` mention result with user-facing message; use real worker names in validation | ✅ PASS |
| `/mgrassign` | Golden used task IDs not in `AWAITING_MANAGER_ACTION` for test manager | Dynamic setup: owner assigns routing task to Shantanu before mgr tests | ✅ PASS |
| `/mgrtransfer` | Same task eligibility + department slug | Same setup + sales dept phrase | ✅ PASS |
| `/mgrself` | Same task eligibility | Same setup | ✅ PASS |
| `/update` | Slash-oriented parsing (`parts.slice(2)`) ignored NL word order and ML `id` | `resolveUpdateTaskId` + `resolveUpdateMessage` | ✅ PASS |
| `/mgrreject` | Golden phrase used wrong task; some phrases → `general_chat` (ML) | Setup task + regex hardening (LLM) | ✅ golden PASS |

---

## Root cause detail: `/assign`

### Symptom

Phrase `rahul ko kaam do` → ML correct (`/assign`, `worker_slug: rahul`) → webhook **`error`**.

### Root cause

`TasksService.resolveMention` threw `NotFoundException` when no user named "rahul" exists in factory 3. `WhatsAppService.handleIncomingMessage` catch block returned `error` after failed outbound send attempt.

Factory 3 workers: Anmol, prateek — no Rahul.

### Why tests missed it

Golden phrases copied from Sprint 1 audit dataset without binding to factory seed data.

### Fix

1. **`tasks.service.ts`:** `resolveMention` returns `{ kind: 'not_found', message: waSection(...) }` instead of throw.
2. **`tasks.service.ts`:** `handleAssign` and `applyManagerDelegateWorker` return message for `not_found`.
3. **`whatsapp.service.ts`:** `stripAssigneeFromDescription` for Hindi `X ko kaam` patterns.
4. **`whatsapp.service.ts`:** HttpException with status &lt; 500 returns webhook `ok` after user message (expected business failures, not system failures).

### Production risk

Low — behaviour is correct for unknown names; users receive actionable message instead of silent failure.

---

## Root cause detail: manager routing ops

### Symptom

`/mgrassign`, `/mgrtransfer`, `/mgrself` webhook `error` on golden phrases with task 5, 8, 20.

### Root cause

`assertTaskEligibleForManagerRouting` requires:

- `routing_status = AWAITING_MANAGER_ACTION`
- `assigned_to = current manager user id`

Golden task IDs were arbitrary or pointed at DIRECT/MANAGER_SELF tasks.

### Fix

Validation harness creates owner→manager routing task before mgr golden tests:

```text
Owner: "shantanu ko P0 routing validation task assign karo"
→ task #54 AWAITING_MANAGER_ACTION assigned to manager 21
```

Production code unchanged — eligibility rules are correct.

---

## Root cause detail: `/update`

### Symptom

`progress update task 2` → webhook `error` or invalid format.

### Root cause

```typescript
const updateMessage = parts.slice(2).join(' '); // assumes "/update 12 message"
```

NL phrase puts task id at end; ML `id` not always parsed into body.

### Fix

- `resolveUpdateTaskId(body.id, rawMessage)` — ML id + regex patterns.
- `resolveUpdateMessage(rawMessage, taskId)` — strips task tokens; defaults to `"Progress update on task N"`.

Golden phrase updated to `progress update task 34` (task assigned to worker Anmol).

---

## Validation results (P0 run)

| Op | Phrase | Webhook | Pass |
|----|--------|---------|------|
| `/assign` | prateek ko loading ka kaam do | ok | ✅ tasks 34→35 |
| `/mgrassign` | task 54 prateek ko do | ok | ✅ |
| `/mgrtransfer` | task 54 sales ko transfer karo | ok | ✅ |
| `/mgrself` | task 54 main khud karunga | ok | ✅ |

**Manager operations: 6/6 PASS** (assign + 4 mgr ops + update in golden E2E)
