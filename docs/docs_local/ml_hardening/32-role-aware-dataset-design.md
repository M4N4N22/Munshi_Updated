# Phase 3C — Role-Aware Dataset Design

**Source:** `22-role-intent-validity-matrix.md`  
**Purpose:** Evaluate role-valid emissions and role-invalid rejection/clarification.

---

## Dataset slices

| Slice ID | Description | Target cases |
|----------|-------------|-------------|
| R-OWNER | Valid owner intents | 80 |
| R-MANAGER | Valid manager intents | 90 |
| R-WORKER | Valid worker intents | 50 |
| R-INVALID | Role-invalid emissions | 60 |
| R-CONDITIONAL | Context-dependent validity | 30 |
| **Total** | | **~310** |

---

## Owner cases (R-OWNER)

| Intent family | Cases | Expected outcome |
|---------------|------:|------------------|
| Delegation (assign, depart, clarify) | 20 | Route to intent |
| Inventory (status, create, import) | 15 | Route to intent |
| Reporting (report, members, issues) | 10 | Route to intent |
| Onboarding/setup | 10 | Workflow start |
| Attendance (present/absent) | 5 | Route (owner may use) |
| general_chat / help | 10 | Fallback/help |
| **Invalid for owner (negative controls)** | 10 | Must NOT emit mgr* or update |

---

## Manager cases (R-MANAGER)

| Intent family | Cases | Expected outcome |
|---------------|------:|------------------|
| mgr* cluster | 25 | Route with task id |
| Delegation (assign, delivery, task_inventory_nl) | 20 | Route |
| Inventory + procurement | 15 | Route |
| Task visibility + issues | 10 | Route |
| Attendance | 5 | Route |
| **Invalid for manager (negative)** | 10 | Must NOT emit update |
| **Dual-hat disambiguation** | 5 | assign vs mgrassign by task id |

---

## Worker cases (R-WORKER)

| Intent family | Cases | Expected outcome |
|---------------|------:|------------------|
| present, absent | 10 | Route |
| tasks, complete | 15 | Route |
| update | 10 | Route |
| issue | 8 | Route |
| help, general_chat | 7 | Route |
| **Invalid for worker (negative)** | 20 | See table below |

---

## Role-invalid cases (R-INVALID)

| Case | Role | Utterance pattern | Expected ML behavior |
|------|------|-------------------|---------------------|
| INV-01 | Worker | assign/delegate phrases | **Not** `/assign`; clarify or role-hint |
| INV-02 | Worker | inventory status | **Not** `/inventory_status` |
| INV-03 | Worker | mgrself/mgrassign | **Not** mgr* |
| INV-04 | Owner | mgrself "main karunga task 12" | **Not** `/mgrself`; prefer assign or clarify |
| INV-05 | Owner | update phrases | **Not** `/update` |
| INV-06 | Manager | update phrases | **Not** `/update`; suggest complete or delegate |
| INV-07 | Worker | report/members | **Not** manager commands |
| INV-08 | Worker | onboard_worker | **Not** workflow start |
| INV-09 | Any | wrong role + slash bypass cmd | Backend enforces; ML should still avoid |
| INV-10 | Worker | purchase_request | **Not** procurement |

**Target:** 6 cases per INV-* pattern = 60 cases

**Pass metrics:**
- **Role Accuracy** = % role-invalid where top intent ∉ invalid set for role
- Alternative pass: top intent invalid BUT confidence below threshold AND clarification triggered

---

## Conditional cases (R-CONDITIONAL)

| Case | Condition | Expected |
|------|-----------|----------|
| COND-01 | Manager + task id + worker name | `/mgrassign` not `/assign` |
| COND-02 | Manager + task id + "main" | `/mgrself` |
| COND-03 | Owner + new work + worker | `/assign` |
| COND-04 | Worker + task id + progress words | `/update` |
| COND-05 | Active session + free text | No re-classify (session slice — see 34) |

---

## JSONL schema (future)

```json
{
  "id": "ROLE-INV-03-001",
  "message": "<utterance>",
  "role": "WORKER",
  "expected_intent": null,
  "expected_behavior": "reject_or_clarify",
  "forbidden_intents": ["/mgrself", "/mgrassign", "/mgrtransfer", "/mgrreject"],
  "category": "role_invalid"
}
```

---

## Coverage requirements

- Every forbidden intent from matrix appears in ≥3 role-invalid cases
- Manager mgr* cases: 100% include `role=MANAGER`
- Worker update cases: 100% include `role=WORKER`
