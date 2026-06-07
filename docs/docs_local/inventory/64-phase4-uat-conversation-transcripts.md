# Phase 4 UAT — Conversation Transcripts

**Run date:** 2026-06-07  
**Factory:** ABC Manufacturing  
**Format:** Live extraction + documented workflow responses  
**Note:** Messages marked **(live)** were run through ML extractor. Munshi replies marked **(design)** come from Phase 4.3 templates — WhatsApp not live-tested.

---

## 1. Happy Path — Delivery (Group 1)

**Actor:** Owner (Priya)

**Message (live):** Ram ko 20 cement deliver kar do

**Munshi (design):**

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

**Actor:** CONFIRM

**Munshi (design):** Task T-XXX created → Ram Kumar → Cement 50kg × 20

**Result:** **PASS** (extraction live; E2E design)

---

## 2. Issue — Happy Path (Group 2)

**Message (live):** Shyam ko 5 PVC pipes issue karo

**Extraction:** issue, Shyam, PVC pipe, qty 5 → confirmation → task **PASS**

---

## 3. Inventory Count (Group 3)

**Message (live):** Inventory count karwa do

**Munshi (design):** Confirm inventory count → assignee defaults to Priya → task created **PASS**

---

## 4. Inventory Disambiguation (Group 4)

**Message (live):** Ram ko 10 cement deliver kar do

**Munshi (design):**

```
I found multiple inventory items:

1. Cement 50kg
2. Cement Premium
3. White Cement

Reply with a number.
```

**Actor:** 1 → confirmation → CONFIRM → task **PASS** (design)

---

## 5. Worker Disambiguation (Group 5)

**Munshi (design):**

```
I found multiple workers:

1. Ram Kumar
2. Ram Singh

Reply with a number.
```

**Actor:** 1 → confirm → **PASS** (design)

---

## 6. Unknown Inventory (Group 12)

**Message (live):** Ram ko 10 moon rocks deliver kar do

**Extraction (live):** item=`moon rock` — **problematic parse**

**Munshi (design):** *Could not find inventory matching moon rock…*

**Result:** **PARTIAL** — user eventually informed, but ML should not invent item

---

## 7. Unknown Worker (Group 13)

**Message (live):** Batman ko 10 cement deliver kar do

**Munshi (design):** *Could not find worker matching Batman…*

**Result:** **PASS** (design) — clear recovery

---

## 8. Confirmation Synonym Failure (Group 7)

**Actor:** Owner at confirmation step

**Message:** theek hai

**Munshi (design):**

```
Please confirm
Reply *CONFIRM* (or *YES* / *1*) to create the task.
```

**Result:** **FAIL** — owner expected acceptance

---

## 9. Cancel Synonym Failure (Group 8)

**Message:** mat karo

**Munshi (design):** Reprompt (not cancelled)

**Result:** **FAIL**

---

## 10. Incomplete Intent (Group 14D)

**Message (live):** ram ko de do

**Extraction:** issue, Ram, no item

**Munshi (design):** *Could not find inventory matching your request…*

**Result:** **PARTIAL** — blocks but does not ask clarifying questions

---

## 11. Real-World Failure (Group 14A)

**Message (live):** ram se cement bhijwa do

**Extraction:** all null

**Munshi:** *(falls through to /classify — not NL task flow)*

**Result:** **FAIL** — owner expectation unmet

---

## 12. Slash Bypass (Group 15)

**Message:** /assign_delivery Ram 20 cement

**Munshi:** Legacy assign delivery handler — NL not invoked **PASS** (design)

---

## 13. Invalid Selection Recovery (Group 9)

**Munshi (design):** *Please reply with a number between 1 and 3, or send CANCEL.*

**Actor:** 2 → continues workflow **PASS** (design)

---

## 14. Expired Session (Group 10)

**Munshi (design):** *Your workflow session has expired… Send the task request again…*

**Result:** **PASS** (design)

---

## 15. Duplicate Confirm (Group 11)

**Actor:** CONFIRM → CONFIRM

**Munshi (design):** *This workflow already created Task T-512…*

**Result:** **PASS** (design)

---

*End of conversation transcripts.*
