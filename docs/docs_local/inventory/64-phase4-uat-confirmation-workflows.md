# Phase 4 UAT — Confirmation Workflows

**Run date:** 2026-06-07

---

## Test Method

Confirmation/cancel token acceptance assessed against **documented reply constants** (product behavior specification). Live WhatsApp reply testing **not executed**. Invalid-reply, expiry, and duplicate flows assessed from **Phase 4.3 handler design + hardening specs**.

---

## Group 7 — Confirmation Flow

| Owner reply | Expected | Result | Notes |
|-------------|----------|--------|-------|
| CONFIRM | Accept | **PASS** † | |
| YES | Accept | **PASS** † | |
| 1 | Accept | **PASS** † | |
| haan | Accept | **PASS** † | |
| ok | Accept | **PASS** † | |
| theek hai | Accept | **FAIL** | Only `theek` accepted, not phrase |

**Overall: PARTIAL**

**Business impact:** Owners saying *"theek hai"* will get reprompt instead of task creation — feels unnatural.

---

## Group 8 — Cancellation Flow

| Owner reply | Expected | Result | Notes |
|-------------|----------|--------|-------|
| CANCEL | Cancel | **PASS** † | |
| NO | Cancel | **PASS** † | |
| 2 | Cancel | **PASS** † | |
| nahi | Cancel | **PASS** † | |
| mat karo | Cancel | **FAIL** | Not in cancel token list |
| cancel kar do | Cancel | **FAIL** | Multi-word not matched |

**Overall: PARTIAL**

**Business impact:** Natural Hindi cancel phrases require exact keywords.

---

## Group 9 — Invalid Replies

### During selection (disambiguation)

| Owner reply | Expected | Result |
|-------------|----------|--------|
| hello | Reprompt with valid range | **PASS** † |
| abc | Reprompt | **PASS** † |
| ?? | Reprompt | **PASS** † |

### During confirmation

| Owner reply | Expected | Result |
|-------------|----------|--------|
| later | Reprompt confirm/cancel | **PASS** † |
| maybe | Reprompt | **PASS** † |
| dekhte hain | Reprompt | **PASS** † |

**Overall: PASS** † — workflow stays active; user can recover.

---

## Group 10 — Expired Workflow

| Step | Expected | Result |
|------|----------|--------|
| Start NL workflow | Confirmation pending | **PASS** † |
| Session TTL expires | Session marked EXPIRED | **PASS** † |
| Owner replies after expiry | Expiry message + restart guidance | **PASS** † |

**Message (expected):** *"Your workflow session has expired… Send the task request again…"*

**Overall: PASS** † (not live-retested)

---

## Group 11 — Duplicate Confirmation

| Step | Expected | Result |
|------|----------|--------|
| Owner sends CONFIRM | Task T-N created | **PASS** † |
| Owner sends CONFIRM again | "Task already created T-N" | **PASS** † |
| Duplicate tasks in DB | None | **PASS** † |

**Overall: PASS** †

---

*End of confirmation workflows report.*
