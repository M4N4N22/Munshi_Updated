# Intent-by-Intent Functional Validation

**Date:** 2026-06-02  
**Sprint:** Intent-by-Intent Functional Validation (QA only)  
**Factory:** `factory_id=3`  
**Test phones:** Owner `918604856137` · Manager `917452897444` · Worker `918950411406`  
**Backend:** `http://127.0.0.1:4001` · **ML:** `http://127.0.0.1:8000` · **DB:** remote Postgres (`65.1.128.181:5431`)  
**Machine output:** `intent-functional-validation-results.json`  
**Runner:** `scripts/run-functional-intent-validation.mjs`

---

## Executive summary

| Layer | Result | Notes |
|-------|--------|-------|
| Environment | ✅ Healthy | `GET /health` ok · migrations 001–007 applied · `pending_count=0` · ML `/health` ok |
| Classification (452 phrases) | **92.5%** (418/452) | All 24 supported intents tested; phrase counts meet sprint minimums |
| Golden E2E (24 intents × 1 phrase) | **54.2%** (13/24) | Classification correct on all 24; execution failures on 11 |
| Scope | QA only | No code, workflow, schema, or business-logic changes |

Classification accuracy is **lower than the 99.3% merged audit** because this sprint uses expanded per-intent phrase sets (452 vs ~409) and live ML variance. Functional gaps are dominated by **workflow session creation via natural language** and **manager/task webhook errors**.

---

## Environment validation

| Check | Result |
|-------|--------|
| Local backend running | ✅ `status: ok`, Postgres up |
| Local ML running | ✅ `/health` ok (restarted 2026-06-02 before sprint run) |
| Local database reachable | ✅ via backend health + direct `pg` queries |
| `GET /health/migrations` | ✅ `pending_count: 0` |
| Migrations applied | 001, 002, 003, 004, 005, 006, 007 |

---

## Intents tested (100% coverage)

All 24 currently supported slash intents were validated with classification phrase sets and one golden end-to-end phrase each.

| Intent | Phrases | Class. accuracy | Golden E2E | Role (golden) |
|--------|---------|-----------------|------------|---------------|
| `/business_discovery` | 21 | 100% | ❌ | Owner |
| `/continue_discovery` | 10 | 100% | ❌ | Owner |
| `/onboard_vendor` | 20 | 100% | ❌ | Owner |
| `/onboard_worker` | 20 | 95% | ❌ | Manager |
| `/inventory_create` | 20 | 100% | ❌ | Owner |
| `/inventory_status` | 20 | 100% | ✅ | Owner |
| `/purchase_request_create` | 20 | 90% | ❌ | Owner |
| `/present` | 21 | 90.5% | ✅ | Worker |
| `/absent` | 20 | 85% | ✅ | Worker |
| `/tasks` | 20 | 90% | ✅ | Worker |
| `/update` | 20 | 80% | ❌ | Worker |
| `/complete` | 20 | 100% | ✅ | Worker |
| `/issue` | 20 | 100% | ✅ | Worker |
| `/issues` | 20 | 60% | ✅ | Owner |
| `/resolve` | 20 | 65% | ✅ | Manager |
| `/report` | 20 | 95% | ✅ | Owner |
| `/assign` | 20 | 100% | ❌ | Manager |
| `/mgrassign` | 20 | 100% | ❌ | Manager |
| `/mgrtransfer` | 20 | 100% | ❌ | Manager |
| `/mgrreject` | 20 | 80% | ✅ | Manager |
| `/mgrself` | 20 | 100% | ❌ | Manager |
| `/depart_assign` | 20 | 100% | ✅ | Manager |
| `/members` | 10 | 100% | ✅ | Owner |
| `/help` | 10 | 100% | ✅ | Owner |

---

## Classification weak spots (34 misroutes)

| Intent | Accuracy | Common misroute | Example phrase |
|--------|----------|-----------------|----------------|
| `/issues` | 60% | `general_chat` | `issues batao`, `open issue dikhao` |
| `/resolve` | 65% | `general_chat`, `/complete` | `issue close karo`, `problem close ho gaya` |
| `/update` | 80% | `general_chat`, `/complete` | `status update karo`, `80 percent done task 6` |
| `/absent` | 85% | `general_chat` | `aaj nahi aa sakta`, `absent mark karo` |
| `/mgrreject` | 80% | `/mgrtransfer`, `general_chat` | `task 10 wapas bhejo` |
| `/present` | 90.5% | `general_chat` | `aaj present hoon`, `shift mein present` |
| `/tasks` | 90% | `general_chat` | `show my tasks`, `my tasks please` |
| `/purchase_request_create` | 90% | `/depart_assign` | `order create karo`, `packaging tape order karo` |
| `/onboard_worker` | 95% | `general_chat` | `team member add karo` |
| `/report` | 95% | `general_chat` | `monthly summary chahiye` |

Full per-phrase rows: `intent-functional-validation-results.json` → `all_results`.

---

## Golden E2E record (representative)

Each row: classify → `POST /webhook/test` → DB snapshot (`workflow_sessions`, domain counts).

| Intent | Phrase | Predicted | Class OK | Webhook | Workflow | Outcome |
|--------|--------|-----------|----------|---------|----------|---------|
| `/business_discovery` | mera business setup karna hai | `/business_discovery` | ✅ | ok | none | ❌ no session |
| `/continue_discovery` | setup phir se shuru | `/continue_discovery` | ✅ | ok | none | ❌ no session |
| `/onboard_vendor` | naya vendor add karo | `/onboard_vendor` | ✅ | ok | none | ❌ no session |
| `/onboard_worker` | naya worker add karo | `/onboard_worker` | ✅ | ok | none | ❌ no session |
| `/inventory_create` | SKU register karo | `/inventory_create` | ✅ | ok | none | ❌ no session |
| `/inventory_status` | inventory status batao | `/inventory_status` | ✅ | ok | n/a (command) | ✅ |
| `/purchase_request_create` | purchase request bana do | `/purchase_request_create` | ✅ | ok | none | ❌ no session |
| `/present` | aaj main present hoon | `/present` | ✅ | ok | n/a | ✅ |
| `/absent` | chutti chahiye | `/absent` | ✅ | ok | n/a | ✅ |
| `/tasks` | mera kaam dikhao | `/tasks` | ✅ | ok | n/a | ✅ |
| `/update` | progress update task 2 | `/update` | ✅ | ok | n/a | ❌ webhook error |
| `/complete` | task complete ho gaya | `/complete` | ✅ | ok | n/a | ✅ |
| `/issue` | machine kharab hai | `/issue` | ✅ | ok | n/a | ✅ |
| `/issues` | active issues dikhao | `/issues` | ✅ | ok | n/a | ✅ |
| `/resolve` | issue resolve ho gaya | `/resolve` | ✅ | ok | n/a | ✅ |
| `/report` | aaj ka report dikhao | `/report` | ✅ | ok | n/a | ✅ |
| `/assign` | rahul ko kaam do | `/assign` | ✅ | ok | n/a | ❌ webhook error |
| `/mgrassign` | task 5 rahul ko do | `/mgrassign` | ✅ | ok | n/a | ❌ webhook error |
| `/mgrtransfer` | task 5 sales ko transfer karo | `/mgrtransfer` | ✅ | ok | n/a | ❌ webhook error |
| `/mgrreject` | task 8 reject karo wrong department | `/mgrreject` | ✅ | ok | n/a | ✅ |
| `/mgrself` | task 20 main khud karunga | `/mgrself` | ✅ | ok | n/a | ❌ webhook error |
| `/depart_assign` | warehouse khali karo | `/depart_assign` | ✅ | ok | n/a | ✅ |
| `/members` | team members dikhao | `/members` | ✅ | ok | n/a | ✅ |
| `/help` | help chahiye | `/help` | ✅ | ok | n/a | ✅ |

---

## Live re-verification (2026-06-02, post-run)

Manual checks confirmed a **slash vs natural-language execution gap**:

| Trigger | Phrase | `workflow_sessions` after webhook |
|---------|--------|-----------------------------------|
| NL | `mera business setup karna hai` | No new ACTIVE row |
| Slash | `/business_discovery` | ACTIVE `BUSINESS_DISCOVERY` (session id 6) |
| NL | `naya vendor add karo` | No new row |
| Slash | `/onboard_vendor` | ACTIVE `ONBOARD_VENDOR` (session id 7) |
| NL | `purchase request bana do` | No new row |

ML classifies all three NL phrases correctly (`/business_discovery`, `/onboard_vendor`, `/purchase_request_create`). Webhook returns `ok`, but **multi-step workflows do not persist ACTIVE sessions for NL triggers** on the current runtime, while slash commands do.

---

## Per-intent functional status

| Module | Classification | Execution | DB mutation verified |
|--------|------------------|-----------|----------------------|
| Business Discovery | ✅ Strong | ❌ NL workflow start broken | Profile updates only via slash/active session |
| Continue Discovery | ✅ Strong | ❌ Same as above | — |
| Vendor Onboarding | ✅ Strong | ❌ NL session not created | — |
| Worker Onboarding | ✅ Strong | ❌ NL session not created | — |
| Inventory Create | ✅ Strong | ❌ NL session not created | — |
| Inventory Status | ✅ Strong | ✅ Command path | Read verified |
| Procurement (PR create) | ⚠️ 90% | ❌ NL session not created | — |
| Attendance | ⚠️ 85–90% | ✅ Present/absent golden pass | Upsert assumed |
| Tasks (list/complete) | ⚠️ 90–100% | ✅ Golden pass | Read/update assumed |
| Task update | ⚠️ 80% | ❌ Webhook error | — |
| Issues (create/list) | ✅ / ⚠️ list | ✅ Golden pass | Insert/count verified (issue) |
| Issue resolve | ⚠️ 65% class | ✅ Golden pass (phrase-specific) | Assumed |
| Reporting | ✅ 95% | ✅ Golden pass | Aggregated read |
| Manager assign/delegate/transfer/self | ✅ Class | ❌ 4/5 golden webhook errors | — |
| Manager reject | ⚠️ 80% class | ✅ Golden pass | Assumed |
| Department routing | ✅ 100% | ✅ Golden pass | Task count verified |
| Members / Help | ✅ 100% | ✅ Golden pass | Read / none |

---

## Related reports

- `workflow-execution-validation.md` — workflow start/complete analysis  
- `database-action-validation.md` — table-level verification  
- `intent-failure-analysis.md` — categorized root causes  
- `intent-readiness-scorecard.md` — module scores  
- `trader-os-readiness-assessment.md` — go/no-go for Trader OS workflows  
