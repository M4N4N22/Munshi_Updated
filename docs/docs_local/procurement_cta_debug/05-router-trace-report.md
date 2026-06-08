# Phase 5 — Router Trace

**Date:** 2026-06-08  
**File:** `backend/src/modules/whatsapp/whatsapp.service.ts` → `handleIncomingMessage()`

---

## Router priority (when `msgTrim = "Purchase karein"`)

| Step | Check | Result for `Purchase karein` |
|------|-------|------------------------------|
| ① | `resolveInteractiveActionId(msgTrim)` | `null` — not in `WA_INTERACTIVE_ID` or title map |
| ② | `isChatHomeTrigger` | `false` |
| ③ | `/cancel` | `false` |
| ④ | Inventory CSV CONFIRM | `false` |
| ⑤ | CSV awaiting upload | `false` |
| ⑥ | Active workflow session? | If yes → `handleActiveWorkflowMessage` (unrelated to CTA unless session exists) |
| ⑦ | Slash bypass (`assign_delivery`, etc.) | `false` |
| ⑧ | `matchWorkflowStartCommand(msgTrim)` | **`null`** — requires `/purchase_request_create` prefix |
| ⑨ | NL task inventory handler | `false` for this string |
| ⑩ | Direct slash parse | `false` |
| ⑪ | **ML POST /classify** | **EXECUTES** |

**Branch executed:** **⑪ ML fallback**

---

## When `msgTrim = "/purchase_request_create?itemId=42"` (Option A)

| Step | Result |
|------|--------|
| ① `resolveInteractiveActionId` | `null` |
| ⑧ `matchWorkflowStartCommand` | **`/purchase_request_create`** |
| Branch | **`startWorkflowFromCommand(body.from, msgTrim)`** |
| ML classify | **Skipped** |

---

## ML fallback behavior for owners/managers

When ML returns `general_chat` (likely for `Purchase karein` — not in benchmark corpus as PR intent):

```typescript
if (intentLc === 'general_chat') {
  await this.routeGeneralChat(body.from, ml.message);
  return 'ok';  // finish() NOT called — no result message from handler
}
```

**`routeGeneralChat` for OWNER/MANAGER:**

```typescript
await this.ownerHomeService.sendOwnerHome(phone, ...);
```

### User-visible symptom

Owner/manager tapping **Purchase karein** may receive **owner home menu** (interactive buttons) instead of procurement prefill — easily perceived as **"nothing happened"** or wrong screen.

**This is not silent failure** — a message is sent — but it is **not the expected procurement prompt**.

---

## `isPurchaseRequestWorkflowCommand()` — unused

Defined in `whatsapp-interactive.constants.ts`:

```typescript
export function isPurchaseRequestWorkflowCommand(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    trimmed === '/purchase_request_create' ||
    trimmed.startsWith('/purchase_request_create?')
  );
}
```

**Grep result:** Never called from `whatsapp.service.ts`, `whatsapp-inbound.parser.ts`, or router.

If wired before ML fallback, Option A-shaped messages would be defensively routed even without `matchWorkflowStartCommand` — but **would not fix Option B/C** (`Purchase karein` title).

---

## Active session conflict (secondary)

If user has ACTIVE `workflow_sessions` row:

- New `startWorkflowFromCommand` → `createSession` → `ConflictException`
- User would get error text (not silent)

**DB check:** No evidence that owner/manager phones have blocking ACTIVE PR sessions from CTA attempts. Secondary risk only.

---

## Role gate (not reached on failure path)

`ensureCanRunWorkflow()` blocks WORKER — not evaluated when routing fails at ML step.

Alerts go to owners/managers — role gate is OK when workflow **does** start.

---

## Router stop point

```
handleIncomingMessage()
  msgTrim = "Purchase karein"
  matchWorkflowStartCommand() === null
  → ML /classify
  → general_chat (expected)
  → routeGeneralChat()
  → sendOwnerHome()   [OWNER/MANAGER]
  → return 'ok'       [no procurement workflow]
```

**Workflow engine never invoked.**
