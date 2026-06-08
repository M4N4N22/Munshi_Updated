# 25 — Regression Report (Phase 5A)

**Date:** 2026-06-08  
**Goal:** Confirm Phase 5A manager hardening did not regress non-manager workflows.

---

## Methodology

| Check | Details |
|---|---|
| Regression subset | 145 cases across attendance, members, help, inventory, purchase, issues, onboard, task listing |
| Manager exclusion | `/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject` cases excluded |
| Phase 5A comparison | Cases that **passed** in pre-Phase-5A baseline (`use_llm=True`) and now fail on deterministic path |
| Test suite | `python -m pytest tests/` → **68 passed** |

---

## Intent Regression (classify-only, 121 cases)

Compared pre-Phase-5A baseline predictions vs post-Phase-5A deterministic path for workflows: attendance, members, help, inventory status, purchase, issues, onboard, home, task listing.

| Metric | Result |
|---|---:|
| New regressions (was PASS → now FAIL) | **0** |
| Fixes (was FAIL → now PASS) | **0** |

**Verdict:** Phase 5A introduced **zero new intent regressions** on previously passing classify cases.

---

## Test Suite Regression

| Suite | Result |
|---|---|
| `test_manager_intent_hardening.py` | 24/24 pass |
| `test_operational_intent.py` | pass |
| Full `ml/tests/` | **68/68 pass** |

Spot checks unchanged:
- `aaj main present hoon` → `/present`
- `mere tasks dikhao` → `/tasks`
- `team members dikhao` → `/members`

---

## Deterministic Path Accuracy (regression subset)

| Workflow | Accuracy (det) | Notes |
|---|---:|---|
| attendance_present | 61.5% | Pre-existing gap (single-word `present`) |
| attendance_absent | 50.0% | Pre-existing |
| task_listing | 41.7% | Pre-existing |
| issue_reporting | 25.0% | Pre-existing |
| member_lookup | 41.7% | Pre-existing |
| inventory_status | 58.3% | Pre-existing |
| purchase_request | 41.7% | Pre-existing |
| general_help | 50.0% | Pre-existing |
| home_menu | 100% | — |
| onboard_worker | 58.3% | Pre-existing |
| inventory_delivery | 0% | Uses `extract_task_inventory` path, not intent classify |
| inventory_count | 0% | Uses `extract_task_inventory` path, not intent classify |

**Overall regression subset (det):** 44.1% — unchanged from pre-Phase-5A partial benchmark. Failures are **pre-existing deterministic gaps**, not caused by manager hardening.

---

## Out-of-Scope Paths (unchanged by design)

| Area | Status |
|---|---|
| Document parsing (`extract:delivery`, `extract:inventory_count`) | Not modified |
| Inventory workflows | Not modified |
| Purchase workflows | Not modified |
| Attendance handlers | Not modified |
| Onboarding | Not modified |
| WhatsApp message formats | Not modified |

---

## Regression Verdict

| Criterion | Result |
|---|---|
| No new failures on previously passing intent cases | **PASS** |
| Full ML test suite | **PASS** |
| Manager negative control (`priya ko bhej do` → `/assign`) | **PASS** |
| Pre-existing non-manager gaps introduced by Phase 5A | **NONE** |

**Overall:** Phase 5A is **regression-safe** for scoped workflows.
