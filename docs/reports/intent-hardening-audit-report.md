# Intent Hardening — Before vs After Audit Report

**Date:** 2026-06-01  
**Sprint:** Intent Recognition Hardening  
**Engine:** Local ML (`classify_hybrid`, full pipeline)  
**Dataset:** 385 Hindi/Hinglish phrases (`intent-audit-results.json`)  
**Implementation:** `operational_pre_classify()` in LLM `bot_engine.py`

---

## Executive summary

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| **Overall accuracy** | **44.9%** | **92.7%** | ≥80% | ✅ |
| Owner | 65.8% | 86.8% | — | ✅ |
| Manager | 20.8% | 98.3% | — | ✅ |
| Worker | 20.0% | 91.6% | — | ✅ |
| Vendor (NOT_SUPPORTED → `general_chat`) | 96.4% | 98.2% | — | ✅ |

**+47.8 percentage points** overall. All 10 sprint priority categories meet or exceed acceptance thresholds.

---

## Acceptance criteria scorecard

| Category | Before | After | Target | Status |
|----------|--------|-------|--------|--------|
| Attendance (`/present`, `/absent`) | 0% | **100%** (30/30) | >90% | ✅ |
| Tasks (`/tasks`) | 0% | **100%** (13/13) | >90% | ✅ |
| Reports (`/report`) | 0% | **100%** (12/12) | >90% | ✅ |
| Issue management (`/issue`, `/issues`, `/resolve`) | 0% | **100%** (21/21) | >85% | ✅ |
| Assign (`/assign`) | 29.4% | **100%** (34/34) | >85% | ✅ |
| Manager actions (assign+mgr*) | ~5% avg | **100%** (74/74) | >80% | ✅ |
| Task update (`/update`) | 0% | **100%** (8/8) | — | ✅ |

---

## Category-wise improvements

| Category | Before | After | Δ |
|----------|--------|-------|---|
| attendance | 0.0% | 100.0% | +100.0 |
| tasks | 0.0% | 100.0% | +100.0 |
| reporting | 0.0% | 100.0% | +100.0 |
| issue | 0.0% | 100.0% | +100.0 |
| issues | 0.0% | 100.0% | +100.0 |
| resolve | 0.0% | 100.0% | +100.0 |
| assign | 29.4% | 100.0% | +70.6 |
| mgrassign | 25.0% | 100.0% | +75.0 |
| depart_assign | 0.0% | 100.0% | +100.0 |
| mgrtransfer | 0.0% | 100.0% | +100.0 |
| mgrreject | 0.0% | 100.0% | +100.0 |
| mgrself | 0.0% | 100.0% | +100.0 |
| update | 0.0% | 100.0% | +100.0 |
| discovery | 63.3% | 93.3% | +30.0 |
| vendor_ops | 96.4% | 98.2% | +1.8 |
| inventory | 82.8% | 82.8% | 0 |
| procurement | 68.8% | 68.8% | 0 |
| complete | 66.7% | 66.7% | 0 |
| onboard_worker | 83.3% | 83.3% | 0 |
| members | 0.0% | 0.0% | 0 |
| help | 0.0% | 0.0% | 0 |

---

## Pipeline change

**Before:**

```text
slash command → workflow regex → deterministic → LLM → general_chat
```

**After:**

```text
slash command
→ workflow regex
→ operational regex (attendance, reports, tasks, issues, manager ops, update)
→ deterministic (complete, @mention)
→ LLM
→ general_chat
```

Key addition: `operational_pre_classify()` with 15+ Hindi/Hinglish regex bundles, ordered to resolve collisions (e.g. issue before complete, report before issues list).

---

## What was implemented

1. **Attendance** — `/present`, `/absent` Hindi patterns  
2. **Tasks** — task list retrieval phrases  
3. **Reports** — report/summary request phrases  
4. **Issues** — create, list, resolve patterns  
5. **Manager assign** — `{name} ko kaam do` without `@`  
6. **Manager task ops** — `/mgrassign`, `/mgrtransfer`, `/mgrreject`, `/mgrself`  
7. **Department routing** — extended dept keywords + action verbs  
8. **Task update** — progress/status update patterns  
9. **Discovery expansion** — additional business intro Hindi phrases  
10. **Collision guards** — vendor notifications excluded from `/complete` and `/depart_assign`; issue reports skip purchase-request regex

---

## Remaining failures (28 / 385)

Out of sprint scope — mostly owner workflow edge cases and LLM-only intents:

| Category | Failures | Example phrases | Root cause |
|----------|----------|-----------------|------------|
| procurement | 5 | `50 rolls packaging tape order`, `khatam hone wali hai order karo` | PR regex gap / depart collision |
| inventory | 5 | `invntry sttus batao`, `printing ink kitna hai` | typo / colloquial stock query |
| complete | 6 | `job complete`, `task khatam`, `task finish` | English shorthand not in completion regex |
| discovery | 2 | `setup phir se shuru`, `onboarding resume` | continue_discovery gap |
| onboard_worker | 2 | `rahul ko worker banao`, `team member register karo` | worker onboard phrasing |
| members | 1 | `team members dikhao` | no `/members` regex |
| help | 2 | `help chahiye` | no `/help` regex |
| vendor | 1 | `supplier list mein naya naam` | onboard vs list ambiguity |

Full list: `intent-audit-results-after.json` → `remaining_failures`

---

## Test evidence

| Check | Result |
|-------|--------|
| ML pytest | **30/30** pass |
| Operational intent tests | **13/13** pass |
| Full audit suite | **357/385** correct (92.7%) |

Re-run audit:

```powershell
cd Munshi-Dada-Phase-1-main
python scripts/run_intent_audit.py
```

---

## Files changed

| Repo | File | Change |
|------|------|--------|
| LLM | `bot_engine.py` | `operational_pre_classify()`, regex bundles, pipeline order |
| LLM | `tests/test_operational_intent.py` | New operational intent tests |
| LLM | `scripts/run_intent_audit.py` | Audit re-runner |
| Backend | `docs/reports/intent-audit-results-after.json` | Post-sprint results |
| Backend | `docs/reports/intent-hardening-audit-report.md` | This report |

---

## Recommendation for next sprint

1. Procurement colloquial regex (`khatam hone wali`, quantity+order patterns)  
2. `/members` and `/help` deterministic patterns  
3. Completion shorthand EN patterns (`task finish`, `job complete`)  
4. Continue-discovery Hindi variants (`setup phir se shuru`)  
5. CI gate: fail PR if audit suite drops below 90%
