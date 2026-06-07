# Phase 4.3 — Conversation Transcripts (NL Task Inventory)

**Run date:** 2026-06-07  
**Factory:** ABC Manufacturing (seed data)  
**Actors:** Priya (Owner/Manager), Ram Kumar (Worker), Shyam (Worker)  
**Format:** Scripted end-to-end WhatsApp flows for Phase 4.3 NL task creation  
**Note:** Munshi replies reflect `TaskInventoryConfirmationService` templates. Task IDs are illustrative.

**Prerequisites:** Backend + ML service + Postgres running; factory seeded with Cement SKUs and team members.

---

## 1. Delivery — resolved worker and inventory (happy path)

**Actor:** Priya (Owner)

**Message:** Ram ko 20 cement deliver kar do

*(ML `/extract/task-inventory` → delivery; Phase 4.2 resolves Ram Kumar + Cement 50kg)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Confirm task*
━━━━━━━━━━━━━━━

I found:

*Task Type:*
Delivery

*Worker:*
Ram Kumar

*Inventory:*
Cement 50kg (CEMENT_50KG)

*Quantity:*
20

Reply:

1. *CONFIRM*
2. *CANCEL*
```

**Actor:** Priya

**Message:** CONFIRM

*(Workflow completes → `TasksService.assignToUser` with `[DELIVERY]` description + `STOCK_OUT` inventory line)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Task created*
━━━━━━━━━━━━━━━

Task created successfully.

*Task ID:* T-512

*Assigned to:*
Ram Kumar

*Inventory:*
Cement 50kg

*Quantity:*
20
```

**Backend effect:** Task #512 assigned to Ram Kumar; inventory line: Cement 50kg × 20, movement `STOCK_OUT`.

---

## 2. Issue — inventory disambiguation, then confirm

**Actor:** Priya (Owner)

**Message:** Shyam ko 5 cement issue karo

*(ML extracts `issue`; resolver finds multiple cement SKUs — ambiguous inventory)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Multiple inventory items*
━━━━━━━━━━━━━━━

I found multiple inventory items:

1. Cement 50kg
2. Cement Premium

Reply with a number.
```

**Actor:** Priya

**Message:** 1

*(Session stores Cement 50kg; worker Shyam already resolved → confirmation step)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Confirm task*
━━━━━━━━━━━━━━━

I found:

*Task Type:*
Issue

*Worker:*
Shyam

*Inventory:*
Cement 50kg (CEMENT_50KG)

*Quantity:*
5

Reply:

1. *CONFIRM*
2. *CANCEL*
```

**Actor:** Priya

**Message:** 1

*(Reply `1` is accepted as CONFIRM)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Task created*
━━━━━━━━━━━━━━━

Task created successfully.

*Task ID:* T-513

*Assigned to:*
Shyam

*Inventory:*
Cement 50kg

*Quantity:*
5
```

**Backend effect:** Task #513 with description `[ISSUE] Cement 50kg (CEMENT_50KG) x5` and `STOCK_OUT` line.

---

## 3. Inventory count — no worker hint (defaults to requester)

**Actor:** Priya (Owner)

**Message:** Inventory count karwa do

*(ML extracts `inventory_count` with null assignee; resolver returns worker `not_found` → orchestrator defaults assignee to Priya)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Confirm task*
━━━━━━━━━━━━━━━

I found:

*Task Type:*
Inventory count

*Worker:*
—

Reply:

1. *CONFIRM*
2. *CANCEL*
```

*(Confirmation UI shows worker as `—` because resolution had no assignee; session assigns Priya internally.)*

**Actor:** Priya

**Message:** haan

*(Hindi confirm alias → task created without inventory lines)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Task created*
━━━━━━━━━━━━━━━

Task created successfully.

*Task ID:* T-514

*Assigned to:*
Priya
```

**Backend effect:** Task #514 assigned to Priya; description `[INVENTORY_COUNT] Inventory count karwa do`; no `inventory_lines`.

---

## 4. Delivery — worker disambiguation (optional edge)

**Actor:** Priya (Owner)

**Message:** Ram ko 10 cement deliver karo

*(Resolver matches two workers: Ram Kumar and Ram Singh)*

**Munshi:**

```
━━━━━━━━━━━━━━━
*Multiple workers*
━━━━━━━━━━━━━━━

I found multiple workers:

1. Ram Kumar
2. Ram Singh

Reply with a number.
```

**Actor:** Priya

**Message:** 1

**Munshi:** *(confirmation prompt as in scenario 1, with Ram Kumar selected)*

**Actor:** Priya

**Message:** CANCEL

**Munshi:**

```
━━━━━━━━━━━━━━━
*Cancelled*
━━━━━━━━━━━━━━━

Task creation cancelled. Send a new message anytime.
```

---

## 5. Non-NL fallback (unchanged behaviour)

**Actor:** Priya (Owner)

**Message:** show my tasks

*(ML `/extract/task-inventory` returns no `task_kind` → pipeline falls through to `/classify` as before Phase 4.3)*

**Munshi:** *(existing classify/command response — task list or help, not confirmation workflow)*

---

## 6. Slash command bypass (unchanged)

**Actor:** Priya (Owner)

**Message:** /assign_delivery Ram 20 cement

**Munshi:** *(legacy slash handler — NL orchestrator is not invoked)*

---

*End of conversation transcripts.*
