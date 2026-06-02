# Misclassification Analysis

**Date:** 2026-06-01  
**Engine:** Local ML `http://127.0.0.1:8000/classify` (full hybrid pipeline)  
**Dataset:** 385 phrases — see `intent-audit-results.json`

---

## Executive summary

| Metric | Value |
|--------|-------|
| Total misclassifications | **212 / 385** (55.1%) |
| Routed to `general_chat` | **200 / 212** (94.3% of errors) |
| Pre-classifier correct (workflow intents) | Strong for EN workflow regex |
| LLM path failures | Dominant failure mode for Hindi ops intents |

**Root cause pattern:** Hindi manager/worker/attendance/report phrases miss regex → LLM invoked → returns `general_chat` (or API fallback to `general_chat`).

---

## False negatives (expected intent missed)

Top expected intents that failed:

| Expected intent | Failures | Typical predicted | Example phrase |
|-----------------|----------|-----------------|----------------|
| `/depart_assign` | 18 | `general_chat` | "warehouse khali karo" |
| `/assign` | 24 | `general_chat` | "rahul ko kaam do" |
| `/present` | 15 | `general_chat` | "aaj main present hoon" |
| `/absent` | 15 | `general_chat` | "aaj nahi aa paunga" |
| `/mgrassign` | 15 | `general_chat` | "task 5 rahul ko do" |
| `/mgrself` | 15 | `general_chat` | "task 22 main khud karunga" |
| `/mgrtransfer` | 13 | `general_chat` | "task 8 inventory team ko transfer" |
| `/issue` | 13 | `general_chat` | "machine kharab hai" |
| `/tasks` | 13 | `general_chat` | "mera kaam dikhao" |
| `/report` | 12 | `general_chat` | "aaj attendance report dikhao" |
| `/mgrreject` | 8 | `general_chat` | "task 8 reject karo..." |
| `/business_discovery` | 7 | `general_chat` | Some HI variants |
| `/complete` | 6 | `general_chat` | Edge completion phrases |
| `/purchase_request_create` | 5 | `general_chat` | Low-stock colloquial |

---

## False positives (wrong intent)

| Predicted | Count | Expected was | Example collision |
|-----------|-------|--------------|-------------------|
| `/depart_assign` | ~few | `/purchase_request_create` | "raw material order karo" (dept purchase vs PR) |
| `/assign` | ~few | `/mgrassign` | Task ID present but regex miss |
| `/business_discovery` | ~few | `/onboard_vendor` | Import vendor list phrasing |

---

## Intent collisions

| Collision | Why |
|-----------|-----|
| `/depart_assign` ↔ `/purchase_request_create` | Shared verbs: order, karo, material |
| `/assign` ↔ `/mgrassign` | Hindi "task N ko do" needs task ID extraction + mgr rule |
| `/complete` ↔ `/assign` | "complete karo" (instruction) vs "complete ho gaya" (done) — deterministic partially handles |
| `/business_discovery` ↔ `/onboard_vendor` | "import vendors" in discovery regex |
| `/members` ↔ vendor list | No `/vendors` intent — user expects suppliers |

---

## General chat overuse

**200 misroutes** landed on `general_chat` where a specific intent was expected.

Contributing factors:

1. **No Hindi regex** for attendance, report, tasks, manager ops
2. **LLM few-shot** biased toward EN examples in prompt
3. **LLM API exception** → silent `general_chat` fallback (`llm_classify` except block)
4. **Invalid intent from LLM** → coerced to `general_chat`

Impact: User receives chat reply or "Unknown command" downstream instead of action.

---

## Workflow misrouting

When regex fires wrong workflow intent:

| Phrase type | Wrong workflow | User impact |
|-------------|----------------|-------------|
| Low-stock colloquial | None (general_chat) | No PR created |
| "vendor payment process karo" | `/depart_assign` purchase dept | Task created instead of finance action |

When regex correct — workflows start reliably:

- `/business_discovery` → menu shown ✅
- `/onboard_vendor` → vendor name prompt ✅
- `/purchase_request_create` → title prompt ✅

---

## Classification method breakdown (estimated)

| Method | Reliability in audit |
|--------|---------------------|
| `workflow_pre_classify` regex | **High** for EN + targeted HI (discovery, inventory, vendor, PR) |
| `deterministic_pre_classify` | **High** for `/complete` confirmation phrases |
| `llm_classify` | **Low** for Hindi ops — defaults to `general_chat` |
| `CommandParser` | N/A (dataset excludes slash commands) |

---

## Vendor dataset note

2 vendor phrases misclassified (not `general_chat`) — treated as minor false positives for NOT_SUPPORTED bucket. 54/56 correctly absorbed by `general_chat`.

---

## Related

- Scorecard: `intent-coverage-scorecard.md`
- Gaps: `intent-gap-analysis.md`
