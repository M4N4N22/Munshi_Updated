# Phase 4 Live Validation — Workflows

**Run date:** 2026-06-07

---

## Workflow Engine — Verified Live

| Check | Result |
|-------|--------|
| NL message starts `TASK_INVENTORY_CREATION` | **PASS** |
| Session persisted in `workflow_sessions` | **PASS** (18 sessions for owner phone) |
| `session_data` stores extraction + candidates | **PASS** |
| Confirm → task create → COMPLETED | **PASS** (issue + count) |
| Cancel tokens end session | **PASS** |
| Active session routing on follow-up messages | **PASS** |

---

## Successful Session Lifecycle — Issue (#135)

```
START → WAITING_CONFIRMATION → COMPLETED
```

| Field | Value |
|-------|-------|
| Session ID | 135 |
| Workflow type | `TASK_INVENTORY_CREATION` |
| Final status | `COMPLETED` |
| Task created | 122 (stored in session after confirm) |

---

## Successful Session Lifecycle — Inventory Count (#136)

```
START → WAITING_CONFIRMATION → COMPLETED
```

| Field | Value |
|-------|-------|
| Session ID | 136 |
| Default assignee | Priya (37) — owner when no worker hint |
| Task created | 123 |

---

## Disambiguation Session — Delivery (#137) — FAIL

```
START → WAITING_INVENTORY_SELECTION → CANCELLED (after reply "1")
```

**Expected:** `WAITING_INVENTORY_SELECTION` → pick `1` → `WAITING_WORKER_SELECTION` or `WAITING_CONFIRMATION`

**Actual:** Session **CANCELLED** at `WAITING_INVENTORY_SELECTION`; `inventory_candidates` unchanged in `session_data`.

**Root cause (observed, not fixed):** When both inventory and worker are ambiguous, bootstrap stores only `inventory_candidates`. After inventory pick, worker is unresolved → handler cancels.

---

## Confirmation Token Live Behavior

Tested at **`WAITING_INVENTORY_SELECTION`** (not confirmation step) for delivery scenarios:

| Token | Effect on session |
|-------|-------------------|
| `CONFIRM` | No state change — remains at inventory selection |
| `YES` / `haan` / `ok` | Same — treated as invalid selection or no-op |
| `CANCEL` / `NO` / `2` / `nahi` | Session **CANCELLED** — **PASS** |

**Issue/count at `WAITING_CONFIRMATION`:**

| Token | Effect |
|-------|--------|
| `CONFIRM` | Task created, session **COMPLETED** — **PASS** |

---

## Expiry Test (#G13) — FAIL

1. Started delivery workflow (session ACTIVE)
2. SQL: `updated_at = NOW() - 25 hours`
3. Sent `CONFIRM`

**Result:** Session remained ACTIVE at `WAITING_INVENTORY_SELECTION`; HTTP **400** on one webhook call. Expiry message path **not observed live**.

---

## Duplicate Confirm — NOT PROVEN

Delivery workflows did not reach post-create confirm step in live runs.

---

*End of workflow validation report.*
