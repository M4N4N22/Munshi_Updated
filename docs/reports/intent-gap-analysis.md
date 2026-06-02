# Intent Gap Analysis

**Date:** 2026-06-01  
**Scope:** Local ML classifier — documentation only, no fixes applied

---

## 1. Missing intents (product level)

| Missing capability | User phrase example | Current behavior |
|--------------------|---------------------|------------------|
| Vendor list / search | "vendor list dikhao" | `/members` (employees) |
| Purchase request status | "PR ka status kya hai" | `general_chat` |
| Vendor WhatsApp role | "invoice bhej diya" | `general_chat` (acceptable fallback) |
| Low-stock alert (NL) | "tape khatam hone wali hai" | `general_chat` |
| Discovery progress query | "mera setup kitna complete hai" | `general_chat` or discovery menu |

---

## 2. Missing regex pre-classifier patterns

High-impact gaps in `workflow_pre_classify` / `deterministic_pre_classify`:

| Target intent | Missing Hindi patterns |
|---------------|---------------------|
| `/present` | "aaj main present hoon", "aa gaya hu", "main aa gaya" |
| `/absent` | "aaj nahi aa paunga", "chutti chahiye", "leave chahiye" |
| `/assign` | "{name} ko kaam do", "{name} ko task do" |
| `/depart_assign` | "{dept/action} karo" without English dept keywords |
| `/mgrassign` | "task {id} {name} ko do" |
| `/mgrtransfer` | "task {id} transfer", "{team} ko transfer" |
| `/mgrreject` | "task {id} reject", "hamare department ka nahi" |
| `/mgrself` | "task {id} main karunga" |
| `/issue` | "machine kharab", "problem hai", "nahi mil raha" |
| `/tasks` | "mera kaam dikhao", "task list" |
| `/report` | "report dikhao", "attendance report" |
| `/update` | "task update", "progress update" |

---

## 3. Missing few-shot examples (LLM prompt)

System prompt in `_build_system_prompt()` has strong EN examples but insufficient HI coverage for:

- Attendance (present/absent)
- Manager task operations with Hindi task IDs
- Worker issue reporting
- Report generation requests
- `/tasks`, `/update`, `/issues`, `/resolve`

---

## 4. Missing synonyms

| Intent | Synonyms not covered |
|--------|---------------------|
| `/inventory_status` | "maal kitna", "stock bacha", "warehouse mein kitna" *(partial)* |
| `/purchase_request_create` | "khatam hone wali", "order chahiye", "mangwana hai" |
| `/complete` | "ho chuka", "pura ho gaya" *(partial)* |
| `/present` | "pahunch gaya", "shift start" |

---

## 5. Hindi / Hinglish support gaps

| Area | EN support | HI support |
|------|------------|------------|
| Workflow entry (discovery, inventory, vendor, PR) | Good | **Good** (regex) |
| Manager daily ops | Moderate (LLM) | **Poor** (0% dept assign) |
| Worker daily ops | Moderate | **Poor** (0% attendance) |
| Reports | Moderate | **Poor** (0%) |

---

## 6. Workflow gaps (backend — documented for context)

Not ML fixes but affect perceived intent success:

- No NL vendor list command
- Active workflow session bypasses re-classification (correct) but mid-step Hindi free text hits wrong handlers
- `/members` semantic mismatch for "vendor list"

---

## 7. Classification infrastructure gaps

| Gap | Impact |
|-----|--------|
| No confidence score | Cannot threshold or escalate |
| LLM error → `general_chat` | Silent failures |
| No intent audit CI | Regressions undetected |
| `use_llm=False` tests ≠ production path | Test suite overstates coverage |

---

## 8. Deployment vs local gaps (context)

Production ML at `13.126.57.78:8000` previously **lacked** Prompt 10/11 regex entirely. Local ML includes them. **Deploy parity** remains a separate gap from classifier quality.

---

## Priority matrix

| Gap | Business impact | Fix layer |
|-----|-----------------|-----------|
| Hindi attendance | Daily worker check-in blocked | Regex + few-shot |
| Hindi manager assign/dept | Core manager UX blocked | Regex + few-shot |
| Hindi report | Owner visibility blocked | Regex + few-shot |
| Vendor list intent | Owner confusion | New intent + backend |
| PR colloquial phrases | Procurement friction | Regex extension |
| LLM silent fallback | Debugging difficulty | Observability (future) |

---

## Related

- Roadmap: `intent-improvement-roadmap.md`
- Raw data: `intent-audit-results.json`
