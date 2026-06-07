# Phase 4 Remediation — Implementation

**Run date:** 2026-06-07

---

## Files changed

| File | Change |
|------|--------|
| `backend/src/services/task-inventory-resolution/task-inventory-nl.orchestrator.ts` | Refactored `buildBootstrap()` to persist inventory **and** worker state before choosing first step |
| `backend/src/services/workflow/handlers/task-inventory-creation.handler.ts` | Route selection steps before global cancel check; allow cancel tokens only when not a valid numeric selection |
| `backend/src/services/workflow/workflow-session.service.ts` | `isExpired()` uses `updated_at` (fallback `created_at`); `toRecord()` maps Sequelize `updatedAt`/`createdAt` |
| `backend/src/services/task-inventory-resolution/task-inventory-nl.constants.ts` | Added `theek hai` confirm token |
| `backend/src/modules/whatsapp/whatsapp.constants.ts` | Added `parseDirectSlashCommand()` |
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Direct slash routing; bypass active workflow for slash commands; `/help` fallback; resilient `finish()` outbound send |

---

## LIVE-001 / LIVE-002 fix

`buildBootstrap()` now:

1. Writes inventory resolved fields or `inventory_candidates`.
2. Writes worker resolved fields or `worker_candidates` (or self-assign for `inventory_count`).
3. Returns `WAITING_INVENTORY_SELECTION` if inventory candidates exist, else `WAITING_WORKER_SELECTION`, else `WAITING_CONFIRMATION`.

Handler change ensures numeric replies `1`/`2` at selection steps are not treated as cancel token `2`.

---

## LIVE-004 fix

```typescript
// isExpired — last activity = updated_at ?? created_at
// toRecord — updated_at: row.updated_at ?? row.updatedAt
```

Expiry on user reply flows through `resolveActiveSession()` → `expireSession()` → expired guidance message.

---

## LIVE-005 fix

1. `parseDirectSlashCommand()` — first token match against `COMMANDS`.
2. Active workflow: slash commands route to `processCommand()` (e.g. `/help` during confirmation).
3. No active workflow: known slash commands skip ML classify.
4. `/help` for owners: try owner-home; on failure return `waHelpText()`.
5. `finish()` wraps `sendOutbound()` in try/catch so OLLI failures return HTTP 201 + `"ok"`.

---

## Confirmation tokens

Added `theek hai` to `TASK_INVENTORY_CONFIRM_REPLIES`. Existing tokens unchanged: `confirm`, `yes`, `1`, `haan`, `ok`, `theek`, etc.

---

## Duplicate confirmation

No code change required — existing `task_created_id` guard retained.

---

*End of implementation report.*
