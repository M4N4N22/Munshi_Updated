# Phase 4 Live Validation — Defects

**Run date:** 2026-06-07

---

## P4-UAT-010 — CLOSED

| Field | Value |
|-------|-------|
| **Original issue** | Live WhatsApp E2E not completed |
| **Live run** | 2026-06-07 — backend + ML + Postgres + `/webhook/test` |
| **Outcome** | **CLOSED** — live validation executed; evidence in `65-phase4-live-evidence.json` |
| **Caveat** | Not all scenario groups PASS |

---

## New Live Defects (observation only)

### LIVE-001 — Double disambiguation cancels session

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Steps** | `Ram ko 10 cement deliver kar do` → reply `1` |
| **Expected** | Worker selection or confirmation |
| **Actual** | Session **CANCELLED** at `WAITING_INVENTORY_SELECTION` |
| **Evidence** | Session #137 in `65-phase4-live-evidence.json` |

---

### LIVE-002 — Delivery task not created in live run

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Steps** | Any delivery message with ambiguous cement + Ram workers |
| **Expected** | Task with `STOCK_OUT` line |
| **Actual** | 0 delivery tasks in factory 5 |
| **Evidence** | DB snapshot — only tasks #122, #123 |

---

### LIVE-003 — OLLI WhatsApp send failures

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Steps** | Any NL workflow that triggers outbound text |
| **Expected** | Owner/worker receive WhatsApp messages |
| **Actual** | `WhatsApp send failed for 919900000001` in backend logs |
| **Evidence** | Terminal `569733.txt` |

---

### LIVE-004 — Session expiry not enforced on reply

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Steps** | Expire session via SQL → send `CONFIRM` |
| **Expected** | Expiry message, session inactive |
| **Actual** | Session remained ACTIVE; HTTP 400 on one call |
| **Evidence** | G13 in evidence JSON |

---

### LIVE-005 — `/help` regression HTTP 400

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Steps** | `POST /webhook/test` with `/help` |
| **Expected** | 201 ok |
| **Actual** | HTTP 400 |
| **Evidence** | G15 in evidence JSON |

---

## Prior UAT Defects — Live Re-check

| ID | Live status |
|----|-------------|
| P4-UAT-003 (`theek hai`) | Not re-tested at confirm step (delivery never reached) |
| P4-UAT-006 (moon rocks) | **CONFIRMED** — ML still extracts `moon rock`; live block prevents task |
| P4-UAT-011 | N/A |

---

*End of live defects report.*
