# Intent Classification Results

**Run:** 2026-06-08T10:45:40.126995+00:00 · **Inference:** `classify_hybrid(message, use_llm=True)`

## Overall

| Metric | Value |
|--------|-------|
| Total cases | 349 |
| Intent accuracy | **47.0%** |
| Full PASS (intent + entities) | **41.3%** |
| PARTIAL PASS | 20 |
| FAIL | 185 |

## Per-workflow

| Workflow | N | Intent Acc | Entity Acc | Verdict |
|----------|---|------------|------------|---------|
| assign_clarify | 12 | 41.7% | 100.0% | FAIL |
| attendance_absent | 12 | 50.0% | 100.0% | PARTIAL PASS |
| attendance_present | 13 | 61.5% | 100.0% | PARTIAL PASS |
| business_discovery | 12 | 75.0% | 100.0% | PARTIAL PASS |
| department_assignment | 12 | 25.0% | 8.3% | FAIL |
| general_help | 12 | 50.0% | 100.0% | PARTIAL PASS |
| home_menu | 12 | 100.0% | 100.0% | PASS |
| inventory_count | 12 | 66.7% | 66.7% | PARTIAL PASS |
| inventory_create | 12 | 75.0% | 100.0% | PARTIAL PASS |
| inventory_delivery | 12 | 33.3% | 16.7% | FAIL |
| inventory_issue | 12 | 50.0% | 33.3% | PARTIAL PASS |
| inventory_status | 12 | 58.3% | 100.0% | PARTIAL PASS |
| issue_list | 12 | 50.0% | 100.0% | PARTIAL PASS |
| issue_reporting | 12 | 25.0% | 100.0% | FAIL |
| issue_resolve | 12 | 8.3% | 16.7% | FAIL |
| low_stock_workflow | 12 | 33.3% | 100.0% | FAIL |
| member_lookup | 12 | 41.7% | 100.0% | FAIL |
| onboard_vendor | 12 | 83.3% | 100.0% | PASS |
| onboard_worker | 12 | 58.3% | 100.0% | PARTIAL PASS |
| purchase_request | 12 | 41.7% | 100.0% | FAIL |
| report | 12 | 41.7% | 100.0% | FAIL |
| task_assignment | 12 | 41.7% | 25.0% | FAIL |
| task_completion | 12 | 83.3% | 33.3% | PASS |
| task_delegation | 12 | 33.3% | 8.3% | FAIL |
| task_listing | 12 | 41.7% | 100.0% | FAIL |
| task_rejection | 12 | 16.7% | 100.0% | FAIL |
| task_self_assign | 12 | 8.3% | 100.0% | FAIL |
| task_transfer | 12 | 16.7% | 100.0% | FAIL |
| task_update | 12 | 50.0% | 41.7% | PARTIAL PASS |

## Per difficulty level

| Level | Name | Intent Acc | N |
|-------|------|------------|---|
| 1 | Canonical Commands | 93.3% | 30 |
| 2 | Natural English | 62.1% | 29 |
| 3 | Hindi | 75.9% | 29 |
| 4 | Hinglish | 69.0% | 29 |
| 5 | Broken English | 27.6% | 29 |
| 6 | MSME Style Messaging | 44.8% | 29 |
| 7 | Typos | 13.8% | 29 |
| 8 | Short Commands | 41.4% | 29 |
| 9 | Conversational Commands | 20.7% | 29 |
| 10 | Context-Heavy Commands | 31.0% | 29 |
| 11 | Ambiguous Commands | 41.4% | 29 |
| 12 | Multi-Intent Commands | 41.4% | 29 |

## Inference path breakdown

- **deterministic_pre** — 152 cases, intent acc 75.0%
- **llm** — 142 cases, intent acc 9.2%
- **task_inventory_extractor** — 36 cases, intent acc 50.0%
- **command_parser** — 19 cases, intent acc 100.0%

## Sample failures (intent)

| Message | Expected | Predicted | Path |
|---------|----------|-----------|------|
| present | `/present` | `general_chat` | llm |
| present today i come | `/present` | `general_chat` | llm |
| presnt hu aaj | `/present` | `general_chat` | llm |
| present | `/present` | `general_chat` | llm |
| aaj aa gaya | `/present` | `general_chat` | llm |
| I will not come today | `/absent` | `general_chat` | llm |
| today no come sick | `/absent` | `general_chat` | llm |
| absnt aaj | `/absent` | `general_chat` | llm |
| leave | `/absent` | `general_chat` | llm |
| doctor ne rest bola hai kal se aaunga | `/absent` | `general_chat` | llm |
| aaj nahi | `/absent` | `general_chat` | llm |
| @ram aaj warehouse saaf karo | `/assign` | `/depart_assign` | deterministic_pre |
| Please ask Ram to clean the warehouse today | `/assign` | `general_chat` | llm |
| ram ko bolna godown saaf kare | `/assign` | `general_chat` | llm |
| ram se kehna store saaf kare aaj | `/assign` | `general_chat` | llm |
| ram clean warehouse today | `/assign` | `general_chat` | llm |
| ram safai karo | `/assign` | `general_chat` | llm |
| ram free hai usko warehouse wala kaam de do | `/assign` | `/assign_clarify` | deterministic_pre |
| Ask sales team to send today figures | `/depart_assign` | `/assign_clarify` | deterministic_pre |
| sales team ko aaj ka data bhejne ko bolo | `/depart_assign` | `general_chat` | llm |
| sales ko figures bhejo aaj ke | `/depart_assign` | `/assign_clarify` | deterministic_pre |
| sales team figure today send | `/depart_assign` | `/assign_clarify` | deterministic_pre |
| sales walo ko bolo | `/depart_assign` | `general_chat` | llm |
| slaes ko data bhejo | `/depart_assign` | `general_chat` | llm |
| sales figures | `/depart_assign` | `/assign_clarify` | deterministic_pre |
| sales department se kehna aaj closing bhejein | `/depart_assign` | `general_chat` | llm |
| month end hai sales ko report chahiye | `/depart_assign` | `/report` | deterministic_pre |
| priya ko task 15 do | `/mgrassign` | `general_chat` | llm |
| task 15 priya karegi | `/mgrassign` | `general_chat` | llm |
| priya task 15 do | `/mgrassign` | `general_chat` | llm |