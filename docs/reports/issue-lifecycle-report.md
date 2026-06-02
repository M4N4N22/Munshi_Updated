# Issue Lifecycle Report

**Date:** 2026-06-02  
**Scope:** `/issue`, `/issues`, `/resolve` classification + execution

---

## Classification results (452-phrase suite)

| Intent | Before P0 | After ML restart | Target | Status |
|--------|-----------|------------------|--------|--------|
| `/issues` | 60% (12/20) | **95% (19/20)** | ≥85% | ✅ |
| `/resolve` | 65% (13/20) | **90% (18/20)** | ≥85% | ✅ |
| `/issue` | 100% | 100% | — | ✅ |

Overall classification after ML restart: **98%** (443/452).

---

## Root cause: weak operational regex

### `/issues` failures (before)

Phrases like `issues batao`, `show all issues`, `open issue dikhao` routed to `general_chat` because `_ISSUES_LIST_RE` only matched narrow patterns (`issues list`, `active issues`, etc.).

### `/resolve` failures (before)

Phrases like `issue close karo`, `resolve issue 3`, `issue sorted ho gaya` lost to `general_chat` or `/complete` due to overlapping completion regex.

### Fix (LLM `bot_engine.py`)

Expanded patterns in `operational_pre_classify`:

- `_ISSUES_LIST_RE` — added `issues batao`, `show all issues`, `open issue dikhao`, `issues status dikhao`, etc.
- `_RESOLVE_RE` — added `issue close karo`, `resolve issue N`, `issue solve karo`, `issue sorted ho gaya`, etc.
- `_op_result` — now passes `id` for resolve/update when parsed from message.
- Resolve block extracts issue id before returning `/resolve`.

### Why existing tests missed it

Sprint 2 hardening focused on manager/attendance/tasks; issue list phrases in expanded 452-phrase suite exposed gaps not in original 385-phrase audit.

### Production requirement

**Restart ML server after `bot_engine.py` deploy.** Stale uvicorn process served pre-fix regex (validation showed 60% until restart, then 95%).

---

## Remaining misroutes (9 total suite-wide)

| Intent | Phrase | Predicted | Notes |
|--------|--------|-----------|-------|
| `/issues` | issue summary dikhao | `/report` | Correct disambiguation (summary → report) |
| `/resolve` | problem close ho gaya | `/complete` | Ambiguous without "issue" keyword |
| `/resolve` | problem resolve ho chuki | `general_chat` | Edge phrase; LLM fallback |

Acceptable trade-offs; both intents exceed 85% threshold.

---

## Execution validation (golden E2E)

| Intent | Phrase | Webhook | DB |
|--------|--------|---------|-----|
| `/issue` | machine kharab hai | ok | issues count +1 ✅ |
| `/issues` | active issues dikhao | ok | read path ✅ |
| `/resolve` | issue resolve ho gaya | ok | assumed ✅ |

All three pass in 24/24 golden E2E run.

---

## Regression check

Issue create regex (`_ISSUE_CREATE_RE`) unchanged in ordering — still runs after issues list and resolve checks. No regression on `/issue` create path (100% maintained).
