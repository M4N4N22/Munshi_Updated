# 22 — Manager Hardening Changes (Phase 5A)

**Date:** 2026-06-08  
**Primary file:** `ml/bot_engine.py`

---

## New Functions

| Function | Purpose |
|---|---|
| `manager_pre_classify()` | Deterministic router for `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject` |
| `_parse_mgr_typo_command()` | Typo-tolerant `mgrse`, `mgrtr`, `mgrre`, `mgrtrasfer` shorthands |
| `_extract_mgr_task_id()` | Broad task-id extraction (backward compatible with `IntentClassifier.extract_task_id`) |
| `_extract_mgr_worker()` | Worker slug from `priya ko`, `priya task 15 do`, `15 priya ko`, etc. |
| `_extract_transfer_dept_slug()` | Department slug for transfer intents |
| `_extract_reject_reason()` | Reject reason phrase extraction |

---

## Signal Regex Expansions

### Self-assign (`_MGR_SELF_SIGNAL_RE`, `_MGRSELF_RE`)
- `i do task`, `\d+ main`, `mujhe khud`, `khud karna`
- Standalone `main kar lunga` (no task id required)

### Delegation (`_MGRASSIGN_RE`)
- `priya task 15 do` (name-before-task broken English)
- `(\w+) ko (\d+)` task-id extraction

### Transfer (`_MGR_TRANSFER_SIGNAL_RE`, `_MGRTRANSFER_RE`)
- `send to`, `^\d+ send`, `^\d+ (it|sales|...)`, `galat dept`
- Bare `transfer karo` (no task id)

### Reject (`_MGR_REJECT_SIGNAL_RE`, `_MGRREJECT_RE`)
- Existing phrases retained; reject now checked **before** assign when `reject` signal present

---

## Priority Rules (manager_pre_classify)

```
1. Typo commands (mgrse, mgrtr, mgrre, mgrtrasfer)
2. MSME context-reply map (pending N aaj handle, N handle aur next)
3. Reject signal (blocks assign false positives)
4. Worker + task_id → /mgrassign (beats transfer)
5. Transfer signals + dept
6. Self-assign signals
7. Assign regex fallback
8. Reject regex fallback
```

---

## Worker Skip List (`_MGR_WORKER_SKIP`)

Added verb/dept tokens to prevent false worker extraction: `transfer`, `reject`, `do`, `kar`, `karo`, `bhejo`, `sales`, `it`, etc.

---

## Integration Points

| Caller | Change |
|---|---|
| `operational_pre_classify()` | Calls `manager_pre_classify()` instead of inline 4-line mgr block |
| `assign_clarify_pre_classify()` | Returns `None` when `manager_pre_classify()` matches |
| `IntentClassifier.extract_task_id()` | Delegates to `_extract_mgr_task_id()` first |

---

## Tests Added

**File:** `ml/tests/test_manager_intent_hardening.py` (24 tests)

Covers:
- Hindi / Hinglish / English / broken / MSME / typo manager phrases
- Task-id extraction variants
- Regression: attendance, tasks, members unchanged

---

## Benchmark Corpus Expansion

**File:** `ml/data/eval/intents/manager_workflows.json` (29 cases)

Categories: canonical, Hindi, Hinglish, broken English, MSME shorthand, typos.

---

## Files Changed

| File | Change |
|---|---|
| `ml/bot_engine.py` | Manager pre-classifier + regex hardening |
| `ml/tests/test_manager_intent_hardening.py` | New test suite |
| `ml/data/eval/intents/manager_workflows.json` | Expanded eval cases |
| `docs/docs_local/ml_hardening/_phase5a_benchmark.py` | Before/after benchmark runner |

**Not changed:** APIs, DB schemas, business workflows, WhatsApp formats, onboarding, inventory/purchase/attendance handlers.
