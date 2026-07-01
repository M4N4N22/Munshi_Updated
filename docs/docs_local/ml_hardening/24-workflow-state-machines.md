# Phase 2 — Workflow State Machines

States affecting ML routing when sessions are active. Sources: `workflow.constants.ts`, handlers, `inventory-bulk-import.service.ts`.

---

## 1. Worker Onboarding (`ONBOARD_WORKER`)

**Start:** `/onboard_worker` or home menu `team_onboard_wa`

```
WORKER_NAME → WORKER_PHONE → WORKER_DEPARTMENT → WORKER_ROLE → WORKER_DOJ → [COMPLETED]
     ↑              ↑                ↑                ↑              ↑
   retry          retry            retry            retry          retry
```

| State | Input expected | Transitions |
|-------|----------------|-------------|
| WORKER_NAME | Name text | → WORKER_PHONE |
| WORKER_PHONE | Phone number | → WORKER_DEPARTMENT |
| WORKER_DEPARTMENT | Dept name/slug | → WORKER_ROLE |
| WORKER_ROLE | WORKER / MANAGER | → WORKER_DOJ |
| WORKER_DOJ | Date | → COMPLETED (user created) |

**Terminal:** COMPLETED (workflow session COMPLETED)  
**Cancel:** `/cancel` or `cancel` text → CANCELLED  
**TTL:** 24h default (ACTIVE → EXPIRED)  
**ML impact:** In-session messages are **not** global intents — step handlers consume text.

---

## 2. Vendor Onboarding (`ONBOARD_VENDOR`)

**Start:** `/onboard_vendor`

```
VENDOR_NAME → VENDOR_PHONE → VENDOR_GST → VENDOR_ADDRESS → [COMPLETED]
```

| State | Skippable | Notes |
|-------|-----------|-------|
| VENDOR_GST | yes (skip/none/na) | |
| VENDOR_ADDRESS | yes | Can loop back on validation failure |

**Terminal:** COMPLETED  
**Cancel:** `/cancel`  
**ML impact:** Same as worker — session-bound, not classify.

---

## 3. Inventory Import Review (session — not workflow table)

**Start:** `/inventory_import_csv`

```
awaiting_upload → awaiting_confirm → importing → [done]
       ↑                  ↑               ↑
   CSV attach         CONFIRM          (locked)
                    or CANCEL
```

| Phase | Valid inputs | Transitions |
|-------|--------------|-------------|
| `awaiting_upload` | CSV document | → `awaiting_confirm` + review message |
| `awaiting_confirm` | `CONFIRM` | → `importing` → complete |
| `awaiting_confirm` | `CANCEL` / cancel | → session cleared |
| `importing` | (none) | Reject duplicate CONFIRM |

**TTL:** 15 min per phase (`INVENTORY_CSV_PENDING_TTL_MS`, `REVIEW_TTL_MS`)  
**Terminal:** Import summary message; session deleted  
**Cancel:** Text `cancel` or `/cancel` (via bulk import cancel)  
**ML impact:** `CONFIRM`/`CANCEL` must NOT classify as other intents. CSV without prior command → guidance only (no auto-import).

---

## 4. Purchase Request (`PURCHASE_REQUEST_CREATE`)

**Start:** `/purchase_request_create` or `?itemId=N` or low-stock CTA

```
REQUEST_CREATION → APPROVAL → VENDOR_ASSIGNMENT → CLOSE → [COMPLETED]
```

| State | Input | Notes |
|-------|-------|-------|
| REQUEST_CREATION | Item, qty, title | May be prefilled from low-stock |
| APPROVAL | YES/NO or approval flow | |
| VENDOR_ASSIGNMENT | Vendor selection | |
| CLOSE | Confirmation | |

**Prefill path:** Low-stock alert → `prefill_pending_confirm` → YES submits  
**Terminal:** COMPLETED  
**Cancel:** `/cancel`  
**ML impact:** Low-stock CTA bypasses classify; numeric disambiguation for multiple items.

---

## 5. Business Discovery (`BUSINESS_DISCOVERY`)

**Start:** `/business_discovery`, `/continue_discovery`, discovery phrases

```
MENU ⇄ COLLECT → [COMPLETED or paused]
```

| State | Behavior |
|-------|----------|
| MENU | Choose profile bucket to update |
| COLLECT | Progressive field collection |

**Pause:** `pause`, `/pause`, `later` — session persists  
**Terminal:** Profile updated; session may complete or stay resumable  
**Cancel:** `/cancel`  
**ML impact:** `continue_discovery` aliases same handler. discovery_phrases in contract overlap with inventory import — boundary risk.

---

## 6. Assign Clarify (`ASSIGN_CLARIFY`)

**Start:** ML `/assign_clarify` or backend from description-only `/assign`

```
ASSIGNEE → [task created via /assign] → COMPLETED
```

**Terminal:** Assignee picked → task created  
**Cancel:** `/cancel`  
**ML impact:** Short-lived; single disambiguation step.

---

## 7. Task Inventory NL (`TASK_INVENTORY_CREATION`)

**Start:** `/task_inventory_nl` or `taskInventoryNl.tryHandleFreeText`

```
STARTED → WAITING_INVENTORY_SELECTION? → WAITING_WORKER_SELECTION? → WAITING_CONFIRMATION → COMPLETED
                ↓                              ↓
           (if ambiguous SKU)            (if ambiguous worker)
```

**Terminal:** COMPLETED (task + inventory lines), CANCELLED, EXPIRED  
**ML impact:** Free-text NL path enters workflow without slash; competes with `/assign` at classify time.

---

## 8. Suggestion Approval (`SUGGESTION_APPROVAL`)

**Start:** Document upload → `/suggestion_approve` (workflow auto or command)

```
CONFIRM → [YES/NO] → COMPLETED (executed or skipped)
```

**Terminal:** Suggestion executed or declined  
**ML impact:** Triggered by document pipeline; rarely user-initiated slash.

---

## Cross-workflow routing rules

| Condition | ML behavior |
|-----------|-------------|
| Active `workflow_sessions` row | Prefer step handler over classify |
| Active import CSV session | CONFIRM/CANCEL/import phase only |
| Slash bypass commands during session | mgr*, assign_delivery → `processCommand` |
| `/cancel` | Universal — cancels active workflow |
| Expired session | Expired message; next message fresh classify |
