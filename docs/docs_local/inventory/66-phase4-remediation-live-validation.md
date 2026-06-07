# Phase 4 Remediation — Live Re-Validation

**Run date:** 2026-06-07  
**Stack:** Backend `:4001`, ML `:8000`, Postgres `65.1.128.181:5431/munshi_data`  
**Endpoint:** `POST /webhook/test`  
**Owner phone:** `919900000001` (ABC Manufacturing factory **5**)

**Evidence:** `66-phase4-remediation-live-evidence.json`

---

## Scenario results

| Group | Scenario | Result | Notes |
|-------|----------|--------|-------|
| G1 | Delivery happy path (double disambiguation + confirm) | **PASS** | Task **#127** `[DELIVERY]` + `task_inventory_lines` |
| G4 | Inventory disambiguation | **PASS** | Pick `1` → `WAITING_WORKER_SELECTION` |
| G5 | Worker disambiguation | **PASS** | SKU-resolved inventory → worker pick → confirm step |
| G6 | Double disambiguation | **PASS** | Inventory `2` + worker `2` → `WAITING_CONFIRMATION` |
| G7 | Confirm `theek hai` | **PASS** | Session **COMPLETED** |
| G12 | Duplicate confirm | **PASS** | Task count unchanged after second `CONFIRM` |
| G13 | Expired session | **PASS** | SQL aged `updated_at`; reply → session **EXPIRED** |
| G15 | `/help` | **PASS** | HTTP **201**, `"data":"ok"` |

**Summary:** **8 / 8 PASS**

---

## G1 lifecycle (session #163)

```
START → WAITING_INVENTORY_SELECTION → WAITING_WORKER_SELECTION → WAITING_CONFIRMATION → COMPLETED
```

| Step | Message | Step after |
|------|---------|------------|
| 1 | `Ram ko 20 cement deliver kar do` | `WAITING_INVENTORY_SELECTION` (+ worker_candidates stored) |
| 2 | `1` | `WAITING_WORKER_SELECTION` |
| 3 | `1` | `WAITING_CONFIRMATION` |
| 4 | `CONFIRM` | **COMPLETED** — task **#127** |

---

## G13 expiry

1. Started delivery workflow (session ACTIVE).
2. `UPDATE workflow_sessions SET updated_at = NOW() - INTERVAL '25 hours'`.
3. Sent `CONFIRM`.
4. Session status → **EXPIRED** (verified in DB and evidence JSON).

---

## Notifications

OLLI rate-limit errors observed during heavy webhook bursts (same as LIVE-003). Outbound send failures no longer fail the webhook response after `finish()` hardening. Worker/owner notification delivery remains **environment-dependent** — not a Phase 4 workflow blocker.

---

*End of live re-validation report.*
