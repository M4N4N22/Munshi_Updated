# 21 — Manager Intent Path Audit (Phase 5A)

**Date:** 2026-06-08  
**Scope:** Intent classification only — `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject`

---

## Pipeline Order

```
classify_hybrid(message)
  └─ CommandParser.parse()           # slash commands (/mgrself 12, /mgrtransfer 15 it)
  └─ IntentClassifier.classify()
       1. workflow_pre_classify()    # inventory, purchase, onboard, etc.
       2. operational_pre_classify()  # attendance, tasks, members, manager_pre_classify()
       3. assign_clarify_pre_classify()
       4. deterministic_pre_classify()
       5. LLM fallback (use_llm=True)
```

`manager_pre_classify()` runs inside `operational_pre_classify()` **before** `assign_clarify_pre_classify()` and **before** the LLM.

---

## Pre-Hardening Failure Modes

| Failure mode | Root cause | Example |
|---|---|---|
| **LLM → `general_chat`** | Narrow `_MGRSELF_RE` / `_MGRASSIGN_RE` / `_MGRTRANSFER_RE` / `_MGRREJECT_RE`; most NL fell through to LLM (9.2% LLM accuracy) | `12 main karunga` → `general_chat` |
| **`assign_clarify` interception** | `assign_clarify_pre_classify()` fired on `karna`/`kaam` signals before manager routing | `owner ne diya 12 mujhe khud karna hai` → `/assign_clarify` |
| **`/assign` instead of `/mgrassign`** | `operational_pre_classify()` person-assign block ran when `manager_pre_classify()` returned `None`; `_HAS_TASK_ID_RE` missed `priya ko 15` | `priya ko 15 do aur ram ko 16` → `/assign` |
| **Task ID not extracted** | `_extract_mgr_task_id()` lacked `ko 15`, `15 send`, `15 it`, `galat dept 15` patterns | `15 send to it` → no task id → no transfer |
| **Transfer vs assign confusion** | Transfer regex matched before worker+task delegation | `owner ne diya tha 15 priya ko transfer karo` → `/mgrtransfer` |
| **Worker false positives** | `(\w+) task (\d+)` captured verbs (`transfer`, `reject`, `do`) as worker slugs | `reject task 18` → `/mgrassign` |
| **Typo commands missed** | No tolerance for `mgrse`, `mgrtr`, `mgrre`, `mgrtrasfer` | `mgrtr 15` → `general_chat` |
| **Context reply shorthands** | MSME in-thread replies (`pending 12 aaj handle`) have no lexical workflow signal | `pending 15 aaj handle` → `general_chat` |

---

## Why Manager Intents Fell Through to `general_chat`

1. **Regex coverage gap** — Pre-Phase-5A manager rules only matched a handful of canonical English/Hindi phrases. MSME shorthand (`15 priya ko`, `15 it`, `18 reject`) was not covered.

2. **LLM unreliable** — Baseline eval showed LLM path at **9.2%** accuracy on 142 free-text cases. Manager NL was the largest confusion cluster.

3. **`assign_clarify` competing path** — Task-draft regex (`karna`, `kaam`, `karega`) intercepted manager self-assign phrases containing `karna`.

4. **`/assign` competing path** — Person + `ko` patterns routed to `/assign` when task id was not detected by `_HAS_TASK_ID_RE`.

---

## Why Manager Intents Fell Through to `assign_clarify`

- `assign_clarify_pre_classify()` triggers on `_ASSIGN_DRAFT_RE` when no task id, no mention, no manager match.
- Phrases like `owner ne diya 12 mujhe khud karna hai` contain `karna` (draft signal) and task id `12` was not in `_HAS_TASK_ID_RE` format.
- Fix: `manager_pre_classify()` now runs first (via `operational_pre_classify`) and `assign_clarify` explicitly skips when `manager_pre_classify()` matches.

---

## Why Manager Intents Fell Through to `/assign`

- `operational_pre_classify()` line ~1520: `_extract_person_assignee()` + no `_HAS_TASK_ID_RE` → `/assign`.
- `priya ko 15 do` has person but task id `15` was not recognized → `/assign` instead of `/mgrassign`.

---

## Audit Conclusion

Manager workflow failures were **deterministic-layer gaps**, not business-logic bugs. Phase 5A addressed this by:

1. Adding `manager_pre_classify()` as a dedicated pre-LLM router
2. Expanding task-id, worker, dept, and signal regexes
3. Reordering reject → assign → transfer priority
4. Adding typo-command and MSME context-reply handling
5. Skipping verb tokens in worker extraction

No API, schema, workflow, or WhatsApp format changes were required.
