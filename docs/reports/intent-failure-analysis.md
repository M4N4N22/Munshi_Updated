# Intent Failure Analysis

**Date:** 2026-06-02  
**Failures analyzed:** 34 classification misroutes + 11 golden E2E execution failures  
**Source:** `intent-functional-validation-results.json`, live NL/slash re-tests, backend logs

---

## Failure taxonomy

| Category | Count | Severity |
|----------|-------|----------|
| Classification failure | 34 phrases (7.5% of 452) | Medium |
| Workflow failure | 6 golden (NL workflow start) | **Critical** |
| Execution failure | 5 golden (webhook `error`) | **High** |
| Database failure | 6 workflow + 5 write paths blocked | **High** (consequence) |
| Response failure | 0 (webhook returned `ok` or `error` consistently) | Low |

---

## 1. Workflow failures (Critical)

### WF-1: NL workflow start does not create `workflow_sessions`

| Field | Detail |
|-------|--------|
| **Intents** | `/business_discovery`, `/continue_discovery`, `/onboard_vendor`, `/onboard_worker`, `/inventory_create`, `/purchase_request_create` |
| **Symptom** | ML intent correct; webhook `ok`; `execution_reason: no_active_session` |
| **Root cause** | Natural-language path after ML classify does not persist ACTIVE workflow sessions on current runtime. Slash commands (`/business_discovery`, `/onboard_vendor`) create sessions reliably. Likely gap between `startWorkflowFromMlCommand` / `processCommand` fallback and session insert, or stale backend instance relative to source. |
| **Impact** | Users cannot start onboarding, inventory bootstrap, or procurement flows via Hindi/Hinglish — only via slash commands. |
| **Severity** | **Critical** |
| **Recommended fix** | Debug `WhatsAppService.handleIncomingMessage` NL branch: log `command`, `workflowFromMl` result, and `createSession` calls; ensure `startWorkflowFromMlCommand` runs for all registry handlers; add `processCommand` fallback for `/business_discovery`, `/continue_discovery`, `/purchase_request_create` mirroring vendor/worker/inventory; restart backend from current source; add E2E test asserting ACTIVE session after NL phrase. |

### WF-2: Active discovery session hijacks other intents

| Field | Detail |
|-------|--------|
| **Symptom** | With ACTIVE `BUSINESS_DISCOVERY`, messages like `naya vendor …` or `aaj present hoon` update discovery profile instead of intended intent |
| **Root cause** | Active session checked before ML; by design for multi-step flows |
| **Impact** | Mis-routed execution if users leave discovery open |
| **Severity** | Medium |
| **Recommended fix** | Product guidance + stronger cancel/resume UX; optional intent override when confidence high (future). |

---

## 2. Execution failures (High)

### EX-1: Manager / task webhook errors

| Field | Detail |
|-------|--------|
| **Intents** | `/update`, `/assign`, `/mgrassign`, `/mgrtransfer`, `/mgrself` |
| **Symptom** | Classification correct; webhook returns `error` |
| **Root cause** | Uncaught exception in `processCommand` or `sendTextMessage` (Olli WhatsApp API). Likely causes: worker slug `@rahul` not resolved in factory 3, task id not found (`task 2`, `task 5`, `task 20`), missing department slug for transfer, or WhatsApp send failure after handler throw. |
| **Impact** | Managers cannot assign, delegate, transfer, or self-assign via tested golden phrases |
| **Severity** | **High** |
| **Recommended fix** | Use seeded worker slugs and task ids in QA fixtures; improve error messages returned to test webhook; verify `resolveManagerWorkerMention` / `resolveManagerTaskId` against factory 3 data; consider test-mode bypass for Olli send in `/webhook/test`. |

### EX-2: Task update golden phrase

| Field | Detail |
|-------|--------|
| **Phrase** | `progress update task 2` |
| **Root cause** | Same as EX-1 — task 2 may not exist or update payload invalid |
| **Severity** | High |
| **Recommended fix** | Golden test should use known task id from seed data; verify `TasksService.addTaskUpdate` preconditions. |

---

## 3. Classification failures (Medium)

### CL-1: Issue list (`/issues`) — 60% accuracy

| Misroute | Example phrases |
|----------|-----------------|
| → `general_chat` | `issues batao`, `show all issues`, `open issue dikhao`, `issues status dikhao` |
| → `/report` | `issue summary dikhao` |

**Root cause:** List/report phrasing overlap; operational regex may not cover bare “issues batao”.  
**Impact:** Owner cannot list issues reliably in Hindi.  
**Recommended fix:** Extend `operational_pre_classify` patterns for issue-list verbs (`dikhao`, `batao`, `list`) without report keywords.

### CL-2: Issue resolve (`/resolve`) — 65% accuracy

| Misroute | Example phrases |
|----------|-----------------|
| → `general_chat` | `issue close karo`, `resolve issue 3`, `issue solve karo` |
| → `/complete` | `issue sorted ho gaya`, `problem close ho gaya` |

**Root cause:** Resolve vs complete semantic overlap in Hindi (“close”, “ho gaya”).  
**Recommended fix:** Resolve-specific regex before completion patterns; require “issue” + resolve/close/fix tokens.

### CL-3: Task update (`/update`) — 80% accuracy

| Misroute | Example phrases |
|----------|-----------------|
| → `/complete` | `80 percent done task 6` |
| → `general_chat` | `status update karo`, `progress batao task 2` |

**Recommended fix:** Percentage/progress patterns should map to `/update`, not `/complete`.

### CL-4: Attendance absent (`/absent`) — 85%

| Misroute | Phrases |
|----------|---------|
| → `general_chat` | `aaj nahi aa sakta`, `absent mark karo`, `aaj chutti` |

**Recommended fix:** Expand absent regex for “nahi aa sakta”, “chutti” without “chahiye”.

### CL-5: Attendance present (`/present`) — 90.5%

| Misroute | Phrases |
|----------|---------|
| → `general_chat` | `aaj present hoon`, `shift mein present` |

**Note:** Golden phrase `aaj main present hoon` passes; shorter variants fail classification.

### CL-6: Tasks list (`/tasks`) — 90%

| Misroute | Phrases |
|----------|---------|
| → `general_chat` | `show my tasks`, `my tasks please` |

**Recommended fix:** English task-list patterns in operational pre-classify.

### CL-7: Procurement (`/purchase_request_create`) — 90%

| Misroute | Phrases |
|----------|---------|
| → `/depart_assign` | `order create karo`, `packaging tape order karo` |

**Root cause:** “order karo” matches department-order regex from Sprint 2.  
**Recommended fix:** Disambiguate procurement vs department routing when “purchase/raw material/vendor” context absent but “order” + material nouns present.

### CL-8: Manager reject (`/mgrreject`) — 80%

| Misroute | Phrases |
|----------|---------|
| → `/mgrtransfer` | `task 10 wapas bhejo`, `task 2 wapas bhejo galat dept` |
| → `general_chat` | `task 4 hamare department ka nahi`, `task 18 not our department` |

**Recommended fix:** “wapas bhejo” + reject reason patterns → `/mgrreject` before transfer.

### CL-9: Minor (single phrase each)

| Intent | Phrase | Predicted |
|--------|--------|-----------|
| `/onboard_worker` | team member add karo | `general_chat` |
| `/report` | monthly summary chahiye | `general_chat` |

---

## 4. Database failures (consequence)

All workflow DB failures trace to **WF-1** (no session → no domain insert). Manager write failures trace to **EX-1**.

No independent schema or migration issues observed (`pending_migrations = 0`).

---

## 5. Response failures

Webhook consistently returns `ok` or `error`. No silent hangs or empty responses in golden set. **No Response failure category items.**

---

## 6. Environment / operational notes

| Note | Impact |
|------|--------|
| ML server must be restarted after LLM deploy | Stale ML caused `/present` → `general_chat` in earlier session |
| Backend instance may differ from latest source | NL workflow regression vs 2026-06-01 logs where PR NL created session |
| Remote DB latency | 800 ms post-webhook wait may be tight under load; not primary failure mode |

---

## Priority matrix

| Priority | ID | Fix area | Effort |
|----------|-----|----------|--------|
| P0 | WF-1 | Backend NL → workflow session | Medium |
| P0 | EX-1 | Manager ops test data + error surfacing | Low–Medium |
| P1 | CL-1, CL-2 | Issues list/resolve regex | Low |
| P1 | CL-3 | Update vs complete disambiguation | Low |
| P2 | CL-4–CL-8 | Remaining operational patterns | Low |
| P2 | WF-2 | Discovery session UX | Product |

---

## Failure count summary

```text
Classification:  34 failures / 452 phrases (7.5%)
Golden E2E:        11 failures / 24 intents (45.8%)
  ├─ Workflow:      6
  └─ Execution:     5
```

Trader OS workflow development should **not** proceed until **WF-1** and **EX-1** are resolved and golden E2E re-run at 100% execution pass.
