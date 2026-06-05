# Phase 0 — Defects Report (Acceptance Run)

**Run date:** 2026-06-06

---

## DEF-ACC-001 — Webhook test returns HTTP 401 when OLLI outbound fails

| Field | Value |
|-------|-------|
| **Scenario** | 2 (assign_delivery via live `POST /webhook/test`) |
| **Severity** | **Low** (environment / integration config — not Phase 0 inventory logic) |
| **Root cause** | `OLLI_KEY` is empty in `backend/.env`. After successful command processing, `handleIncomingMessage` → `sendOutbound` calls OLLI WABA API, which returns **401 Unauthorized**. HTTP response to client is 401 even when task/inventory side effects already committed. |
| **Reproduction** | 1. Start backend on `:4001` with empty `OLLI_KEY`. 2. Seed owner user with factory link. 3. `POST /webhook/test` body: `{"from":"<owner_phone>","message":"/assign_delivery @ramesh CEMENT_50KG 5"}`. 4. Observe HTTP **401** and OLLI unauthorized message. 5. Query DB — task and `task_inventory_lines` may still exist (confirmed factory_id 115, task_id 74 from partial run). |
| **Impact on Phase 0** | Inventory task creation, lines, completion, and stock movement **not affected**. Owner/worker may not receive WhatsApp reply in dev without valid OLLI credentials. |
| **Fix scope** | Out of Phase 0 acceptance — configure `OLLI_KEY` or degrade outbound gracefully in dev (not implemented per “test only” mandate). |

---

## DEF-ACC-002 — Worker assignment WhatsApp send not verified

| Field | Value |
|-------|-------|
| **Scenario** | 2 (Worker assignment sent) |
| **Severity** | **Low** |
| **Root cause** | Same as DEF-ACC-001 — `notifyWorkerTaskAssigned` uses `MessagingService.sendText` via `fireAndForget`; without valid OLLI credentials send fails silently (logged warn). |
| **Reproduction** | Complete Scenario 2 with empty `OLLI_KEY`; no message delivered to worker phone. Task assignment in DB succeeds. |
| **Impact** | Assignment **logic** PASS; **delivery** NOT VERIFIED in this environment. |

---

## Inventory / Phase 0 logic defects

**NO DEFECTS FOUND** in:

- `task_inventory_lines` persistence
- STOCK_OUT on completion
- Insufficient stock guard
- Reopen guard
- assignToAll protection
- Duplicate completion idempotency
- Non-inventory task workflow
- Integration suite (12/12)

---

## Summary

| ID | Phase 0 blocker? |
|----|------------------|
| DEF-ACC-001 | **No** — env config |
| DEF-ACC-002 | **No** — env config |

**Phase 0 inventory task integration:** no functional defects found during acceptance testing.
