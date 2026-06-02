# Demo 400 / Error Root Cause Report

Investigation date: 2026-06-02T15:19:24.263Z

## Executive Summary

The user-visible **"Request failed with status code 400"** message is **not** from inbound command logic failing first. It originates from the **outbound Olli WhatsApp send** (`MessagingService.sendText`) or from **HttpException** types (403 Forbidden, 400 Bad Request) raised inside handlers after ML routing.

Current `handleIncomingMessage` catches most errors and returns HTTP 201 with body `ok` or `error` — the user may still see nothing on WhatsApp when Olli fails.

---

## Error 1: task complete inventory check ho gaya

| Field | Value |
|-------|-------|
| **Incoming message** | `task complete inventory check ho gaya` |
| **User** | `919876543211` |
| **Intent (ML)** | `/inventory_status` |
| **Router** | processCommand → ensureManager (inventory_status path) |
| **Workflow** | none |
| **Handler** | InventoryService.handleInventoryStatus |
| **Exception** | ForbiddenException: Only managers and owners can perform this action |
| **Webhook body** | `ok` |
| **Root cause** | ML classifies "inventory" keyword as /inventory_status; workers cannot run inventory_status |
| **Production impact** | Worker task complete fails silently with permission error message |
| **Confidence** | HIGH |

## Error 2: main khud yeh kaam karunga

| Field | Value |
|-------|-------|
| **Incoming message** | `main khud yeh kaam karunga` |
| **User** | `919456157007` |
| **Intent (ML)** | `general_chat` |
| **Router** | processCommand(/general_chat) |
| **Workflow** | none |
| **Handler** | waUnknownCommand expected; may get undefined if chat path broken |
| **Exception** | AxiosError 500 from Olli when outbound message invalid (observed in logs) |
| **Webhook body** | `error` |
| **Root cause** | ML returns general_chat → no structured handler; intermittent Olli 500 on send |
| **Production impact** | Manager self-assign NL fails |
| **Confidence** | HIGH |

## Error 3: Rahul ko loading ka kaam do

| Field | Value |
|-------|-------|
| **Incoming message** | `Rahul ko loading ka kaam do` |
| **User** | `919456157007` |
| **Intent (ML)** | `/assign` |
| **Router** | /assign → TasksService.handleAssign |
| **Workflow** | none |
| **Handler** | TasksService.handleAssign |
| **Exception** | Multiple people found (@rahul matches Rahul Verma + Rahul Kumar) |
| **Webhook body** | `ok` |
| **Root cause** | Ambiguous worker slug "rahul" — two users match |
| **Production impact** | Assign/delegate fails until full name or @id used |
| **Confidence** | HIGH |

## Error 4: task 88 Rahul Kumar ko do (repeat on delegated task)

| Field | Value |
|-------|-------|
| **Incoming message** | `task 88 Rahul Kumar ko do (repeat on delegated task)` |
| **User** | `919456157007` |
| **Intent (ML)** | `/mgrassign` |
| **Router** | TasksService.applyManagerDelegateWorker |
| **Workflow** | none |
| **Handler** | TasksService.assertTaskEligibleForManagerRouting |
| **Exception** | BadRequestException: Task already assigned to a worker |
| **Webhook body** | `n/a` |
| **Root cause** | Re-delegating after DELEGATED_TO_WORKER state |
| **Production impact** | 400-class error if manager repeats delegate on same task |
| **Confidence** | HIGH |


---

## Additional Error Class: Manager Task List Olli Failure

| Field | Value |
|-------|-------|
| **Message** | `mere tasks dikhao` (Manager) |
| **Intent** | `/tasks` |
| **Handler** | `TasksService.getTasks` → long formatted list |
| **Webhook body** | `error` |
| **Root cause** | Handler succeeded; Olli outbound failed (intermittent — observed during certification) |
| **Production impact** | Manager sees no task list on WhatsApp despite DB read succeeding |
| **Confidence** | MEDIUM |

---

## Historical HTTP 400 (from prior audit)

When Olli returned OAuth 190 / 400, uncaught axios errors could propagate to `HttpExceptionFilter`, producing:

```json
{ "meta": { "message": "Request failed with status code 400", "failures": { "error": "whatsapp_api_error", "code": 190 } } }
```

At audit time Olli probe returned **200**. Failures are **intermittent** and tied to outbound delivery, not ML or Postgres.

---

## Recommendations (documentation only — no fixes applied)

1. Rotate/verify Olli API key before recording.
2. Avoid manager task list in video if Olli fails on long messages — owner can speak task ID aloud.
3. Never use "inventory" in worker task phrases.
4. Always cancel stale workflows before switching commands.
