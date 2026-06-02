# Intent Improvement Roadmap

**Date:** 2026-06-01  
**Status:** Recommendations only — **not implemented**  
**Baseline:** 44.9% overall accuracy on 385-phrase Hindi/Hinglish dataset (local ML)

---

## Top 10 highest-impact fixes

Ranked by **impact × feasibility**. Effort: S (&lt;1 day regex), M (1–3 days), L (&gt;3 days). Risk: regression probability if misconfigured.

| Rank | Fix | Impact | Effort | Risk | Expected gain |
|------|-----|--------|--------|------|---------------|
| **1** | Add Hindi `/present` + `/absent` regex pre-classifier | **Critical** — daily worker check-in | S | Low | +15% worker accuracy |
| **2** | Add Hindi `/assign` patterns (`{name} ko kaam do`) | **Critical** — manager core | S | Medium | +20% manager accuracy |
| **3** | Add Hindi `/depart_assign` patterns (action + karo) | **Critical** | M | Medium | +15% manager accuracy |
| **4** | Add Hindi `/report` patterns | **High** — owner visibility | S | Low | +10% owner accuracy |
| **5** | Add task-ID regex bundle: `/mgrassign`, `/mgrtransfer`, `/mgrreject`, `/mgrself` | **High** | M | Medium | +25% manager accuracy |
| **6** | Add Hindi `/issue` + `/tasks` patterns | **High** — shop floor | S | Low | +20% worker accuracy |
| **7** | Extend `/purchase_request_create` for colloquial low-stock ("khatam hone wali") | **Medium** | S | Medium | +5% owner/procurement |
| **8** | Add LLM few-shot HI examples for tiers 1–6 (backup when regex misses) | **Medium** | M | Low | +5–10% overall |
| **9** | New backend intent: vendor list lookup (not `/members`) | **Medium** — semantic fix | L | Low | Owner UX clarity |
| **10** | CI intent audit gate on `intent-audit-results.json` threshold | **High** — prevent regression | M | Low | Ongoing quality |

---

## Detailed recommendations

### 1. Hindi attendance regex (Impact: ★★★★★ | Effort: S | Risk: Low)

Add to `deterministic_pre_classify` or new `_PRESENT_RE` / `_ABSENT_RE`:

- present: `present hoon`, `aa gaya`, `pahunch gaya`, `aa gaya hu`
- absent: `nahi aa paunga`, `chutti`, `leave chahiye`, `absent`

**Why first:** 0% accuracy on 30 attendance phrases; highest worker friction.

---

### 2. Hindi assign regex (Impact: ★★★★★ | Effort: S | Risk: Medium)

Pattern: `{hindi_name} ko (kaam|task) (do|assign|karo)` without requiring `@`.

**Risk:** Collision with `/complete` if "kaam ho gaya" — use completion pre-check first.

---

### 3. Department assign Hindi (Impact: ★★★★☆ | Effort: M | Risk: Medium)

Map action verbs + `karo` to departments using existing `_DEPT_KEYWORDS` + Hindi warehouse/production terms.

---

### 4. Report regex (Impact: ★★★★☆ | Effort: S | Risk: Low)

- `report dikhao`, `attendance report`, `aaj ka report`, `daily summary`

---

### 5. Manager task-ID bundle (Impact: ★★★★☆ | Effort: M | Risk: Medium)

Single regex module for:

- `task (\d+) .* ko (do|assign)`
- `task (\d+) .* transfer`
- `task (\d+) reject`
- `task (\d+) main (karunga|karenge)`

---

### 6. Worker issue + tasks (Impact: ★★★★☆ | Effort: S | Risk: Low)

- issue: `machine`, `kharab`, `problem`, `nahi mil raha`, `band padi`
- tasks: `mera kaam`, `task list`, `tasks dikhao`

---

### 7. Procurement colloquial (Impact: ★★★☆☆ | Effort: S | Risk: Medium)

Extend `_PURCHASE_REQUEST_CREATE_RE` with `khatam hone wali`, `order chahiye`, `mangwana hai`.

**Risk:** Overlap with `/issue` (material nahi mil raha).

---

### 8. LLM few-shot expansion (Impact: ★★★☆☆ | Effort: M | Risk: Low)

Add 5–10 Hindi examples per broken intent in `_build_system_prompt()`.

**Do after regex** — regex is deterministic and testable; LLM is backup.

---

### 9. Vendor list intent (Impact: ★★★☆☆ | Effort: L | Risk: Low)

Product change: `/vendor_list` or route "vendor list dikhao" to vendor search API.

Requires backend handler — coordinate backend + ML sprint.

---

### 10. CI audit gate (Impact: ★★★★☆ | Effort: M | Risk: Low)

Run 385-phrase suite on PR; fail if overall &lt; 45% or any Tier C intent regresses.

---

## Suggested sprint order

```
Sprint A (regex only):  #1 attendance → #2 assign → #4 report → #6 issue/tasks
Sprint B (manager):     #5 task-ID bundle → #3 depart_assign
Sprint C (polish):      #7 procurement → #8 few-shot → #10 CI
Sprint D (product):     #9 vendor list intent
```

---

## What NOT to do first

- Do not retrain / fine-tune models — regex + few-shot fixes 80% of gaps cheaper
- Do not add vendor WhatsApp intents before product defines vendor role
- Do not tune discovery regex further — already 63–83% (diminishing returns)

---

## Success targets (next audit)

| Metric | Current | Target |
|--------|---------|--------|
| Overall | 44.9% | **≥75%** |
| Owner | 65.8% | **≥80%** |
| Manager | 20.8% | **≥70%** |
| Worker | 20.0% | **≥75%** |
| `/present` + `/absent` | 0% | **≥90%** |
| `/depart_assign` | 0% | **≥80%** |

---

## Related artifacts

- `intent-audit-results.json` — baseline measurements
- `intent-coverage-scorecard.md` — full scorecards
- `misclassification-analysis.md` — error patterns
