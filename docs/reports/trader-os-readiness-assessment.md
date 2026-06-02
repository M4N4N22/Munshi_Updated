# Trader OS Readiness Assessment

**Date:** 2026-06-02  
**Assessment type:** Intent-by-intent functional validation (QA sprint)  
**Decision:** **NOT READY** for Trader OS workflow development  
**Next gate:** Fix P0 execution blockers → re-run full golden E2E → target 24/24 pass

---

## Executive summary

Munshi’s intent **classification** layer is strong (92.5% on 452 expanded phrases; 16/24 intents at 100%), consistent with post-hardening expectations. However, **functional execution** lags significantly: only **13 of 24** golden end-to-end paths succeed when exercising `POST /webhook/test` against live backend, ML, and Postgres.

The platform can answer read-only and simple command intents (inventory status, attendance, task list, issue create, reports, help) in Hindi/Hinglish. It **cannot** reliably start multi-step workflows from natural language or execute core manager delegation on the test factory — both are prerequisites for Trader OS onboarding and operations.

---

## Environment readiness

| Component | Status | Evidence |
|-----------|--------|----------|
| Backend `:4001` | ✅ Ready | `GET /health` → ok |
| ML `:8000` | ✅ Ready | `/health` ok; restart required after LLM deploys |
| Postgres | ✅ Ready | Migrations 001–007 applied; `pending_count=0` |
| Test factory | ✅ Usable | `factory_id=3` with Owner/Manager/Worker phones |
| WhatsApp send (Olli) | ⚠️ Risk | Failures may surface as webhook `error` after handler exceptions |

**Environment gate:** Passed at sprint start. Operational note: verify backend process matches latest source (NL workflow regression observed vs 2026-06-01 logs).

---

## Capability matrix

| Trader OS capability | Intent coverage | NL execution | Slash execution | DB verified | Ready? |
|---------------------|-----------------|--------------|-----------------|-------------|--------|
| Business onboarding / discovery | ✅ | ❌ | ✅ | Partial | **No** |
| Worker onboarding | ✅ | ❌ | Not re-tested | No | **No** |
| Vendor onboarding | ✅ | ❌ | ✅ | No | **No** |
| Inventory bootstrap | ✅ | ❌ | Not re-tested | No | **No** |
| Inventory visibility | ✅ | ✅ | ✅ | Read ok | **Yes** |
| Procurement (PR) | ⚠️ 90% | ❌ | Not re-tested | No | **No** |
| Attendance | ⚠️ 88% avg | ✅ | ✅ | Assumed | **Conditional** |
| Task execution (worker) | ⚠️ | Partial | Partial | Partial | **Conditional** |
| Issue reporting | ✅ create | ✅ | ✅ | ✅ create | **Conditional** |
| Issue management (list/resolve) | ❌ 60–65% | ✅ golden only | — | Assumed | **No** |
| Manager task ops | ✅ class | ❌ 4/5 fail | Partial | No | **No** |
| Department routing | ✅ | ✅ | ✅ | ✅ | **Yes** |
| Team visibility | ✅ | ✅ | ✅ | Read ok | **Yes** |
| Reporting | ✅ 95% | ✅ | ✅ | Read ok | **Yes** |

---

## Module readiness scores (1–10)

| Module | Score | Summary |
|--------|-------|---------|
| Business Discovery | **4** | Classifies well; NL cannot start workflow |
| Attendance | **7** | Works; minor phrase gaps |
| Tasks | **6** | List/complete ok; update/assign broken |
| Issues | **6** | Create ok; list/resolve classification weak |
| Inventory | **6** | Status ok; create workflow blocked |
| Procurement | **5** | Intent mostly right; workflow not startable |
| Vendor Management | **5** | Same onboarding blocker |
| Reporting | **8** | Production-viable |
| Manager Operations | **5** | Classification only |
| Department Routing | **8** | Production-viable |

**Composite readiness: 5.8 / 10**

---

## Critical blockers (P0)

### B1 — Natural language does not start workflow sessions

- **Affected:** All six workflow-start intents  
- **Evidence:** NL `mera business setup karna hai` → no ACTIVE session; slash `/business_discovery` → session id 6 ACTIVE  
- **Business impact:** WhatsApp-first users cannot begin discovery, vendor/worker onboarding, inventory create, or purchase requests without memorizing slash commands  
- **Recommendation:** Fix backend NL routing before any Trader OS feature sprint; add regression test

### B2 — Manager operations fail at webhook layer

- **Affected:** `/assign`, `/mgrassign`, `/mgrtransfer`, `/mgrself`, `/update`  
- **Evidence:** Golden tests return webhook `error` despite correct classification  
- **Business impact:** Managers cannot delegate work — central to Trader OS  
- **Recommendation:** Align golden fixtures with factory 3 worker slugs and task ids; improve error visibility in test webhook

### B3 — Issue list/resolve classification regression

- **Affected:** `/issues` (60%), `/resolve` (65%)  
- **Impact:** Owners/managers cannot reliably manage issue backlog in Hindi  
- **Recommendation:** LLM operational regex sprint (small, targeted)

---

## Non-blocking improvements (P1–P2)

- Attendance phrase variants (`aaj present hoon`, `aaj chutti`)  
- English task-list phrases (`show my tasks`)  
- Procurement vs department “order karo” disambiguation  
- ML process restart documented in runbooks  

---

## Comparison to prior audits

| Audit | Accuracy | Scope |
|-------|----------|-------|
| Baseline intent audit | 44.9% | Classification only |
| Sprint 1 hardening | 92.7% | 385 phrases |
| Sprint 2 hardening | 99.3% | Merged audit |
| **This functional sprint** | **92.5%** class · **54.2%** E2E | 452 phrases + execution |

The drop vs 99.3% reflects expanded phrase sets and live variance. The **new signal** is execution: high classification does not imply functional readiness.

---

## Success criteria (sprint request vs actual)

| Criterion | Target | Actual |
|-----------|--------|--------|
| 100% supported intents tested | ✅ | 24/24 |
| End-to-end validated | ✅ attempted | 13/24 pass |
| Classification verified | ✅ | 92.5% |
| Workflow execution verified | ❌ | 0/6 NL workflows |
| Database action verified | Partial | Issue create + dept task only |
| Readiness score produced | ✅ | This document |
| No code changes | ✅ | QA + reports only |

---

## Go / no-go recommendation

### **NO-GO** for Trader OS workflow development

**Rationale:**

1. Six onboarding/procurement workflows are non-functional via natural language — the primary Munshi interaction mode.  
2. Manager delegation chain fails on golden paths — blocks operational Trader OS.  
3. Issue lifecycle intents misclassify 35–40% of list/resolve phrases.  

**Conditions to reach GO:**

| # | Condition | Metric |
|---|-----------|--------|
| 1 | NL workflow start | 6/6 golden workflow intents create ACTIVE sessions |
| 2 | Manager ops | 5/5 failing golden intents return `ok` with DB side-effects |
| 3 | Classification | ≥95% on 452-phrase suite; `/issues` and `/resolve` ≥85% |
| 4 | Workflow completion | At least one full workflow per domain reaches COMPLETED + domain row |
| 5 | Re-validation | Re-run `run-functional-intent-validation.mjs` with 24/24 golden SUCCESS |

---

## Artifacts produced

| Report | Path |
|--------|------|
| Functional validation | `docs/reports/intent-functional-validation.md` |
| Workflow execution | `docs/reports/workflow-execution-validation.md` |
| Database actions | `docs/reports/database-action-validation.md` |
| Failure analysis | `docs/reports/intent-failure-analysis.md` |
| Readiness scorecard | `docs/reports/intent-readiness-scorecard.md` |
| Machine results | `docs/reports/intent-functional-validation-results.json` |

---

## Suggested sequence after fixes

```text
1. Fix P0 backend NL workflow start (B1)
2. Fix manager/test fixture errors (B2)
3. LLM regex for issues list/resolve (B3)
4. Re-run functional validation sprint (QA only)
5. If 24/24 golden pass → GO for Trader OS workflow development
```

**Assessment owner:** QA functional validation sprint  
**Valid until:** Next backend or LLM deployment (re-test required)
