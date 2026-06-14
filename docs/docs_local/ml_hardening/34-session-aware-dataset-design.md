# Phase 3E — Session-Aware Dataset Design

**Source:** `24-workflow-state-machines.md`  
**Purpose:** Evaluate ML behavior when workflow/import sessions are active.

**Key principle:** Many session messages should **not** invoke global `/classify` — eval must test both classifier and routing policy.

---

## Session eval categories

| Cat ID | Scenario | Target cases |
|--------|----------|-------------|
| SESS-ACTIVE | Active workflow — step input | 25 |
| SESS-CONFIRM | Inventory import CONFIRM | 15 |
| SESS-CANCEL | cancel / CANCEL / `/cancel` | 15 |
| SESS-EXPIRED | Post-expiry message | 10 |
| SESS-CONTINUE | Workflow continuation (discovery pause) | 10 |
| SESS-BYPASS | Slash bypass during active session | 15 |
| SESS-BLOCK | Competing intent during session | 20 |
| **Total** | | **~110** |

---

## SESS-ACTIVE: Active workflow step input

| Workflow | Step | Sample input type | Expected |
|----------|------|-------------------|----------|
| ONBOARD_WORKER | WORKER_NAME | name text | Step handler — **no classify** |
| ONBOARD_WORKER | WORKER_PHONE | phone | Step handler |
| INVENTORY_CREATE | ITEM_SKU | sku text | Step handler |
| ASSIGN_CLARIFY | ASSIGNEE | worker pick | Step handler |
| TASK_INVENTORY_NL | WAITING_CONFIRMATION | yes/no | Step handler |
| PURCHASE_REQUEST | REQUEST_CREATION | item qty | Step handler |
| BUSINESS_DISCOVERY | COLLECT | field value | Step handler |

**Eval target:** Routing layer suppresses classify — if classify runs, mark as **routing failure** not intent failure.

---

## SESS-CONFIRM: Inventory import review

| Case | Message | Session phase | Expected |
|------|---------|---------------|----------|
| CONF-01 | `CONFIRM` | awaiting_confirm | Import execute — not any intent |
| CONF-02 | `confirm` | awaiting_confirm | Same (case insensitive) |
| CONF-03 | `haan` | awaiting_confirm | Policy decision — map or clarify |
| CONF-04 | `CONFIRM` | awaiting_upload | Error/guidance — not import |
| CONF-05 | `CONFIRM` | no session | No import — guidance |

**Cases:** 15

---

## SESS-CANCEL: Cancellation paths

| Case | Message | Context | Expected |
|------|---------|---------|----------|
| CAN-01 | `/cancel` | active onboard | Workflow cancelled |
| CAN-02 | `cancel` | import review | Session cleared |
| CAN-03 | `CANCEL` | import review | Session cleared |
| CAN-04 | `/cancel` | no session | No-op message |
| CAN-05 | `/cancel` | importing phase | Reject duplicate |

**Cases:** 15

---

## SESS-EXPIRED: Expired sessions

| Case | Expected |
|------|----------|
| EXP-01 | Message after TTL → expired notice; next message fresh classify |
| EXP-02 | CSV review expired → re-upload prompt |
| EXP-03 | Workflow session expired → fresh start |

**Cases:** 10

---

## SESS-CONTINUE: Discovery pause/resume

| Case | Message | Expected |
|------|---------|----------|
| CONT-01 | `pause` / `later` in discovery | Session paused |
| CONT-02 | `/continue_discovery` | Resume same handler |
| CONT-03 | "continue setup" | `/continue_discovery` or business_discovery |

**Cases:** 10

---

## SESS-BYPASS: Slash bypass during active session

Per `whatsapp.service.ts` — during active session, direct slash still routes to `processCommand` for:

- `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`, `/assign_delivery`
- Known COMMANDS via `parseDirectSlashCommand`

| Case | Active session | Incoming | Expected |
|------|----------------|----------|----------|
| BYP-01 | ONBOARD_WORKER | `/mgrassign 12 @ram` | processCommand — bypass workflow |
| BYP-02 | ONBOARD_WORKER | `/tasks` | processCommand |
| BYP-03 | INVENTORY_CREATE | free text "machine fix" | Workflow step — not tasks |
| BYP-04 | ASSIGN_CLARIFY | `/cancel` | Cancel workflow |

**Cases:** 15

---

## SESS-BLOCK: Competing intent during session

| Case | Risk | Expected |
|------|------|----------|
| BLK-01 | "present" during onboard | Should NOT start attendance mid-onboard |
| BLK-02 | "assign @ram" during import review | Should NOT assign during CONFIRM wait |
| BLK-03 | NL assign during purchase workflow | Workflow consumes or cancel first |

**Cases:** 20

---

## Session accuracy metrics

| Metric | Definition |
|--------|------------|
| **Session Suppression Rate** | % session inputs not sent to classify |
| **CONFIRM/CANCEL Accuracy** | % correct non-intent handling |
| **Bypass Correctness** | % slash bypass cases routed to processCommand |
| **Cross-session Contamination** | % intents wrongly fired during active session |

---

## JSONL schema (future)

```json
{
  "id": "SESS-CONF-01",
  "message": "CONFIRM",
  "session_context": {
    "type": "inventory_import",
    "phase": "awaiting_confirm"
  },
  "expected_classify": false,
  "expected_handler": "inventory_bulk_import.confirm",
  "forbidden_intents": ["*"]
}
```
