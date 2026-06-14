# ML Hardening V2C — Task Lifecycle Intent Hardening

**Date:** 2026-06-11  
**Branch:** `feature/shantanu-ml-hardening-v1`  
**Basis:** V2B remaining 5 smoke failures  
**Scope:** update, mgrassign, mgrself, complete, cancel — no assign/inventory/procurement/role changes

---

## Summary

V2C resolves all 5 remaining smoke failures. Smoke accuracy reached **100%** (200/200).

| Metric | V2B | V2C | Delta |
|--------|-----|-----|-------|
| Smoke accuracy | 97.5% | **100%** | +2.5 pp |
| Smoke failures | 5 | **0** | −5 |
| complete_update slice | 80% | **100%** | +20 pp |
| Workflow eval | 96.04% | **96.04%** | 0 |
| ML pytest | 91 | **98** | +7 |
| Contract drift | pass | **pass** | 0 |

---

## Phase 1 — Failure analysis

### 1. `band karo` → `general_chat` (expected `/cancel`)

| Stage | Result |
|-------|--------|
| workflow | None — `_CANCEL_RE` only matched slash/English cancel |
| operational | None |
| classify | `general_chat` |

**Root cause:** Hindi cancel vocabulary not in `_CANCEL_RE`.

---

### 2. `main task 3` → `general_chat` (expected `/mgrself`)

| Stage | Result |
|-------|--------|
| manager | None — `_MGR_SELF_SIGNAL_RE` lacked `main task N` shorthand |
| operational | None |
| classify | `general_chat` |

**Root cause:** Manager self-assign regex missing compact `main task <id>` pattern. Task id 3 was extracted but no self signal matched.

---

### 3–5. Update phrases → `/mgrassign` (expected `/update`)

Examples: `80 percent done task 5`, `status update task 7`, `half complete task 2`

| Stage | Result |
|-------|--------|
| manager | `/mgrassign` — runs **before** update in `operational_pre_classify` |
| update regex | Would match — but never reached |

**Root cause:** `_extract_mgr_worker()` false positives:
- `done task 5` → worker `done`
- `update task 7` → worker `update`
- `complete task 2` → worker `complete`

Manager rule `worker + task_id → mgrassign` fired before `_UPDATE_PROGRESS_RE` check.

---

## Phase 2 — Update intent hardening

1. **`manager_pre_classify`** — early return `None` when `_UPDATE_PROGRESS_RE` matches (progress wins over delegation).
2. **`_MGR_WORKER_SKIP`** — added `done`, `complete`, `update`, `status`, `progress`, `percent`, `half`, `almost`, `partial`, `packing`.
3. **`_UPDATE_PROGRESS_RE`** — added generic patterns:
   - `\d+\s*percent\s+done`
   - `\d+\s*percent\s+done\s+task\s*\d+`
   - `half\s+complete\s+task\s*\d+`

---

## Phase 3 — Mgrself hardening

Extended `_MGR_SELF_SIGNAL_RE`:
- `main\s+task\s*\d+` — `main task 3`
- `main\s+kar\s+leta\s+hoon` — `main kar leta hoon`

Existing patterns already covered `main dekh lunga`, `main sambhal lunga`, `main karunga`.

---

## Phase 4 — Cancel hardening

Expanded `_CANCEL_RE`:
- `band karo`, `cancel karo`, `rok do`, `stop karo`, `mat karo`

Added `_CANCEL_ISSUE_BARRIER_RE` + `_is_cancel_intent()`:
- Blocks cancel on issue/breakdown phrases (`machine band`, `kharab`, etc.)
- Blocks cancel when update progress regex matches (`progress update karo` stays `/update`)

Verified: `machine band karo` → `/issue` (issue create regex), not `/cancel`.

---

## Files changed

| File | Change |
|------|--------|
| `ml/bot_engine.py` | Update/mgr/cancel lifecycle hardening |
| `ml/tests/test_v2c_task_lifecycle.py` | **New** — V2C regression tests |
| `docs/docs_local/ml_hardening/74-v2c-task-lifecycle-hardening.md` | This report |

---

## Phase 5 — Benchmarking

| Suite | V2B | V2C |
|-------|-----|-----|
| Smoke (200) | 97.5% / 5 fail | **100% / 0 fail** |
| Workflow eval | 96.04% | **96.04%** |
| Manager tests (`test_manager_intent_hardening`) | pass | **pass** |
| V2B assign tests | pass | **pass** |
| ML pytest | 91 | **98** |
| ML contract drift | pass | **pass** |
| Backend contract drift (43) | pass | **pass** |

---

## Phase 6 — Validation

| Criterion | Result |
|-----------|--------|
| Update failures eliminated | **Yes** — 3/3 fixed |
| Mgrself failure eliminated | **Yes** — `main task 3` fixed |
| Cancel failure eliminated | **Yes** — `band karo` fixed |
| No assign-family regression | **Yes** — V2B tests pass |
| Workflow accuracy unchanged | **Yes** — 96.04% |
| Contract drift zero | **Yes** |

---

## Remaining failures

**None** on smoke dataset (200/200).

Workflow eval retains 17 pre-existing failures outside V2C scope.

---

## Readiness for next hardening wave

**Ready.** All V1 smoke cases pass deterministically.

Recommended next steps:

1. **LLM-on smoke run** (`--live`) — validate production path
2. **Workflow eval gap closure** — 17 remaining workflow failures
3. **Role-aware classify** (V3) — deferred scope
4. **Git commit / PR** — stage V1+V2B+V2C when user requests

---

## References

- V2B report: `73-v2b-operational-sink-hardening.md`
- Smoke report: `ml/eval/reports/smoke_intent_eval_deterministic.json`
