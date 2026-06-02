# Inventory & Procurement Intent Hardening — Audit Report

**Date:** 2026-06-01  
**Sprint:** Inventory, Procurement, Complete, Update, Discovery Resume, Members, Help  
**Engine:** Local ML (`classify_hybrid`, full pipeline)  
**Dataset:** 409 phrases (385 baseline + 24 sprint-2 expansion)

---

## Executive summary

| Metric | Sprint 1 (post hardening) | Sprint 2 | Target | Status |
|--------|---------------------------|----------|--------|--------|
| **Overall accuracy** | **92.7%** | **99.3%** | ≥97% | ✅ |
| Inventory | 82.8% | **100%** (34/34) | ≥95% | ✅ |
| Procurement | 68.8% | **100%** (22/22) | ≥90% | ✅ |
| Complete | 66.7% | **100%** (21/21) | ≥95% | ✅ |
| Update | 62.5%* | **100%** (14/14) | ≥90% | ✅ |
| Discovery | 93.3% | **100%** (30/30) | — | ✅ |
| Members | 0% | **100%** (3/3) | — | ✅ |
| Help | 0% | **100%** (4/4) | — | ✅ |

*Update baseline recalculated on merged dataset (8 original + 6 expansion phrases).

**No regressions** on sprint-1 operational intents:

| Category | Sprint 2 |
|----------|----------|
| Attendance | 100% (30/30) |
| Tasks | 100% (13/13) |
| Reporting | 100% (12/12) |
| Issue management | 100% (15/15 issues + 4/4 list + 2/2 resolve) |
| Assign | 100% (34/34) |
| Manager ops (mgr*) | 100% (74/74) |
| Department routing | 100% (18/18) |

---

## Role accuracy

| Role | Sprint 1 | Sprint 2 |
|------|----------|----------|
| Owner | 86.8% | **99.2%** |
| Manager | 98.3% | **98.3%** |
| Worker | 91.6% | **100%** |
| Vendor | 98.2% | **100%** |

---

## Category before → after (Sprint 2 focus)

| Category | Sprint 1 | Sprint 2 | Δ |
|----------|----------|----------|---|
| discovery | 93.3% | 100% | +6.7 |
| inventory | 82.8% | 100% | +17.2 |
| procurement | 68.8% | 100% | +31.2 |
| complete | 66.7% | 100% | +33.3 |
| update | 100%** | 100% | — |
| members | 0% | 100% | +100 |
| help | 0% | 100% | +100 |
| depart_assign | 100% | 100% | 0 |

**Sprint 1 update was 100% on 8 phrases; sprint 2 adds 6 expansion phrases all passing.

---

## Implementation summary (LLM `bot_engine.py` only)

### Workflow layer (inventory / procurement / discovery)

1. **Inventory status before create** — prevents `stock register status` → `/inventory_create`
2. **Expanded `_INVENTORY_STATUS_RE`** — typo-tolerant `invntry sttus`, `kitna hai`, `printing ink kitna`, `available stock`
3. **Expanded `_INVENTORY_CREATE_RE`** — SKU register, warehouse item add, stock item create
4. **Expanded `_PROCUREMENT_INTENT_RE`** — order karo/chahiye, khatam hone wali, mangwana, shortage, quantity+order patterns
5. **Depart collision guard** — `raw material order karo` stays `/depart_assign`; procurement shortage phrases win over dept keywords
6. **Expanded `_CONTINUE_DISCOVERY_RE`** — `setup phir se shuru`, `onboarding resume`

### Operational layer (complete / update / members / help)

7. **Fixed `_COMPLETION_CONFIRMED_RE`** — task finish/khatam, job complete, kaam poora (removed empty-regex bug)
8. **Expanded `_UPDATE_PROGRESS_RE`** — aadha ho gaya, almost complete, chal raha hai, percent progress
9. **Update before complete** — prevents `task 5 update packing done` → `/complete`
10. **Vendor notification guard before update** — `order status update karo` stays `general_chat`
11. **New `_MEMBERS_RE`**, **`_HELP_RE`** — lightweight list/help routing

Existing manager/worker/attendance/report/issue regex **unchanged**.

---

## Remaining failures (3 / 409)

Out of sprint scope — worker/vendor onboarding phrasing:

| Phrase | Expected | Predicted | Category |
|--------|----------|-----------|----------|
| supplier list mein naya naam | `/onboard_vendor` | `general_chat` | vendor |
| rahul ko worker banao | `/onboard_worker` | `general_chat` | onboard_worker |
| team member register karo | `/onboard_worker` | `general_chat` | onboard_worker |

---

## Test evidence

| Check | Result |
|-------|--------|
| ML pytest | **38/38** pass |
| Sprint 2 intent tests | **8/8** pass |
| Full audit (409 phrases) | **406/409** (99.3%) |

Re-run:

```powershell
cd Munshi-Dada-Phase-1-main
python scripts/run_intent_audit.py
```

Output: `docs/reports/intent-audit-results-sprint2.json`

---

## Files changed

| Repo | File |
|------|------|
| LLM | `bot_engine.py` |
| LLM | `tests/test_sprint2_intent.py` |
| LLM | `scripts/run_intent_audit.py` |
| Backend | `docs/reports/intent-audit-sprint2-expansion.json` |
| Backend | `docs/reports/intent-audit-results-sprint2.json` |
| Backend | `docs/reports/intent-sprint2-hardening-report.md` (this file) |

---

## Next sprint recommendation

1. Onboard worker/vendor Hindi patterns (`{name} ko worker banao`, `team member register`)
2. CI gate at 97% on merged audit suite
3. Restart local ML `:8000` to pick up changes for backend webhook testing
