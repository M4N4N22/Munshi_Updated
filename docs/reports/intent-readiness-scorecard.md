# Intent Readiness Scorecard

**Date:** 2026-06-02  
**Scoring:** 1–10 per module (10 = production-ready for Trader OS workflows)  
**Inputs:** 452-phrase classification + 24 golden E2E + live NL/slash verification

---

## Overall scores

| Module | Classification | Execution | DB proof | **Score** | Trend |
|--------|----------------|-----------|----------|-----------|-------|
| Business Discovery | 10/10 | 2/10 | 3/10 | **4** | ⚠️ Blocked on NL workflow start |
| Attendance | 8/10 | 9/10 | 6/10 | **7** | Acceptable with regex gaps |
| Tasks | 9/10 | 6/10 | 6/10 | **6** | Update + assign paths fail |
| Issues | 7/10 | 8/10 | 8/10 | **6** | List/resolve classification weak |
| Inventory | 10/10 | 5/10 | 5/10 | **6** | Status ok; create blocked |
| Procurement | 9/10 | 2/10 | 2/10 | **5** | PR workflow not startable (NL) |
| Vendor Management | 10/10 | 2/10 | 2/10 | **5** | Onboard workflow blocked (NL) |
| Reporting | 9.5/10 | 9/10 | 8/10 | **8** | Strong |
| Manager Operations | 9/10 | 4/10 | 4/10 | **5** | 4/5 golden mgr ops fail |
| Department Routing | 10/10 | 9/10 | 8/10 | **8** | Strong |

**Weighted platform intent readiness: 5.8 / 10**

---

## Score justification

### Business Discovery — 4/10

- **Strengths:** 100% classification on 21 phrases; slash `/business_discovery` creates ACTIVE session and menu prompt.  
- **Gaps:** NL golden phrase does not create session; continue/resume same; no end-to-end profile completion tested.  
- **Justification:** Discovery is intelligible to ML but not executable via natural language on current runtime — core Trader OS onboarding risk.

### Attendance — 7/10

- **Strengths:** Golden `/present` and `/absent` pass; most Hindi attendance phrases classify correctly.  
- **Gaps:** 15% absent and 9.5% present misroutes to `general_chat` on shorter phrasing.  
- **Justification:** Operational path works when classified; regex polish needed for edge phrases.

### Tasks — 6/10

- **Strengths:** List and complete golden pass; `/complete` 100% classification.  
- **Gaps:** `/update` 80% classification + webhook error; manager assign path fails.  
- **Justification:** Read/update/assign chain incomplete for workers and managers.

### Issues — 6/10

- **Strengths:** Create golden pass with DB count verification; `/issue` 100% classification.  
- **Gaps:** `/issues` 60%, `/resolve` 65%; many list/resolve phrases → `general_chat`.  
- **Justification:** Create works; lifecycle management (list/resolve) unreliable in Hindi.

### Inventory — 6/10

- **Strengths:** `/inventory_status` 100% class + golden pass; `/inventory_create` 100% classification.  
- **Gaps:** Create workflow never started (NL); no new SKU row verified.  
- **Justification:** Read path Trader-ready; write/bootstrap blocked.

### Procurement — 5/10

- **Strengths:** 90% classification; golden phrase classifies correctly.  
- **Gaps:** 2 phrases misroute to `/depart_assign`; PR workflow session not created (NL).  
- **Justification:** Procurement intent recognized but not functionally startable.

### Vendor Management — 5/10

- **Strengths:** 100% classification on 20 phrases.  
- **Gaps:** NL onboard does not open vendor workflow (slash does).  
- **Justification:** Same blocker as inventory/procurement onboarding flows.

### Reporting — 8/10

- **Strengths:** 95% classification; golden pass; aggregated read path stable.  
- **Gaps:** `monthly summary chahiye` → `general_chat`.  
- **Justification:** Near-ready; minor regex addition.

### Manager Operations — 5/10

- **Strengths:** `/assign`, `/mgrassign`, `/mgrtransfer`, `/mgrself` 100% classification; `/mgrreject` golden pass.  
- **Gaps:** Assign, delegate, transfer, self golden webhooks return `error`; reject reason phrases partially misclassified.  
- **Justification:** Intent layer ready; execution layer broken on test factory data / handler errors.

### Department Routing — 8/10

- **Strengths:** 100% classification; golden `/depart_assign` pass with task count check.  
- **Gaps:** Overlap with procurement “order karo” phrasing (procurement module concern).  
- **Justification:** Strongest manager-adjacent path after reporting.

---

## Classification-only scorecard (452 phrases)

| Intent | Accuracy | Grade |
|--------|----------|-------|
| 16 intents at 100% | — | A |
| 4 intents at 95–99% | — | A- |
| 4 intents at 80–90% | — | B |
| 2 intents at 60–65% | `/issues`, `/resolve` | D |

**Mean classification accuracy:** 92.5%  
**Intents below 85%:** `/issues`, `/resolve`, `/update`, `/absent`, `/mgrreject`

---

## Execution-only scorecard (24 golden)

| Result | Intents |
|--------|---------|
| ✅ SUCCESS (13) | inventory_status, present, absent, tasks, complete, issue, issues, resolve, report, mgrreject, depart_assign, members, help |
| ❌ FAILURE (11) | business_discovery, continue_discovery, onboard_vendor, onboard_worker, inventory_create, purchase_request_create, update, assign, mgrassign, mgrtransfer, mgrself |

**Execution pass rate:** 54.2%

---

## Readiness gates (Trader OS)

| Gate | Threshold | Actual | Pass |
|------|-----------|--------|------|
| All intents tested | 100% | 24/24 | ✅ |
| Classification | ≥95% overall | 92.5% | ❌ |
| Golden E2E execution | 100% | 54.2% | ❌ |
| Workflow NL start | 100% | 0/6 | ❌ |
| Zero critical failures | 0 | 6 workflow | ❌ |

**Verdict:** Not ready — see `trader-os-readiness-assessment.md`.

---

## Re-test checklist (post-fix)

1. Re-run `node scripts/run-functional-intent-validation.mjs`  
2. Confirm NL golden phrases create ACTIVE `workflow_sessions`  
3. Confirm manager golden phrases return webhook `ok` with seeded slugs/task ids  
4. Target ≥98% classification on expanded suite  
5. Target 24/24 golden SUCCESS  
