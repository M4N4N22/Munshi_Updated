# UAT — Manager Experience

**Roles:** Manager, Inventory Lead (Manager), Vendor Lead (Manager)  
**Run date:** 2026-06-06  

---

## Task Assignment & Routing

| Journey | Result | Evidence |
|---------|--------|----------|
| Manager listed as department head | **PASS** | 4 departments created with manager_user_id |
| Task created by owner for worker | **PASS** | Task #512 created and completed |
| Manager delegation commands (`/mgrassign`, `/mgrtransfer`) | **NOT LIVE-TESTED** | In scope for structured commands; require active task context |
| Manager self-assign (`/mgrself`) | **NOT LIVE-TESTED** | Documented in `/help` |

---

## Approvals

### Purchase request approval — **PARTIAL**

| Step | Result |
|------|--------|
| Create PR via REST | **PASS** (PR #12, #14) |
| Approve DRAFT without submit | **FAIL** — 400 (expected state machine) |
| Approve with `submit: true` on create | **NOT RE-TESTED** after DRAFT finding |

**Business view:** Manager/owner must **submit** purchase request before approval. Creating without `submit: true` leaves request in DRAFT — approval button/path unclear to business user using REST alone. WhatsApp workflow handles submit implicitly.

---

## Alerts

| Alert type | Live UAT | Integration evidence |
|------------|----------|----------------------|
| Low stock → owner | **PASS** † | Phase 3.1 integration |
| Low stock → manager | **PASS** † | Phase 3.3A integration |
| Zoho sync failure → owner/manager | **PASS** † | Phase 3.2 integration |
| Push delivery failure visibility | **FAIL** live | Route 404 on stale UAT server |

† Validated via integration tests; live alert **delivery** depends on WhatsApp/Messaging provider credentials.

---

## Inventory & Procurement (Manager)

| Action | Result |
|--------|--------|
| CSV import `POST /inventory/import/csv` | **PASS** (2 items added) |
| Invalid CSV rejected | **PASS** (400) |
| Low-stock list | **PASS** (when stock below threshold) |
| PR from low-stock suggestion API | **PASS** (`GET /purchase-requests/suggestions/low-stock`) |

---

## Role Separation

| Check | Result |
|-------|--------|
| Manager vs Owner both access owner home | **PASS** (both OWNER and MANAGER roles) |
| Worker blocked from owner home | **PASS** † (template: `waOwnerOnlyHome`) |
| Manager can approve PR | **PASS** † (validation service) |

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 4 — Task management (manager assign path) | **PARTIAL** |
| 9 — Purchase requests (approval) | **PARTIAL** |
| 10 — Low stock alerts (manager) | **PASS** † |
| 15 — Sync failure alerts | **PASS** † |
| 17 — Role-based (manager) | **PASS** |

---

## Manager Recommendations (Documentation, Not Code)

- Document that REST PR create needs `submit: true` for approval flow.  
- Ensure manager receives same low-stock Hindi copy as owner (validated in integration tests).
