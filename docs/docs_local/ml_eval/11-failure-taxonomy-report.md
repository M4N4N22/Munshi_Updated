# Failure Taxonomy Report

**Source:** benchmark run 2026-06-08 · 349 cases · analysis only

## Summary tiers

| Tier | Description | Share of corpus |
|------|-------------|-----------------|
| **Understands well** | Slash commands, deterministic Hindi ops phrases, home menu, workflow keywords | ~41% full PASS |
| **Partially understands** | Hinglish assign, some inventory extract, business discovery | ~20% PARTIAL PASS |
| **Misunderstands** | Manager NL, dept routing, conversational stock/PR | ~35% intent miss |
| **Completely fails** | Typos, bare fragments, ambiguous material, multi-intent | ~14% typos acc |

## Failure categories

| Category | Est. cases | Severity | Business impact | Examples |
|----------|------------|----------|-----------------|----------|
| LLM Fallback to general_chat | 129 | Critical | Users get owner home menu or generic reply instead of action | Manager NL completely unrouted; Natural English paraphrases lost |
| Manager Routing Gap | 30 | Critical | Owner→manager→worker chain breaks at manager actions | /mgrtransfer, /mgrreject, /mgrself → general_chat (10 each) |
| Department vs Assign Clarify | 8 | High | Owner cannot route to sales/IT without exact dept keywords | sales ko figures bhejo → /assign_clarify |
| Inventory Dual-Path Confusion | 12 | High | Delivery NL hits /assign before task-inventory extractor | Ram ko 20 cement deliver → /assign not extract:delivery |
| Entity Extraction Failure (classify) | 56 | High | Wrong worker/dept/task id breaks downstream | depart_slug 0% accuracy on expected cases |
| Entity Extraction Failure (inventory) | 18 | High | Stock dispatch/issue workflow cannot bootstrap | extract:null on short/ambiguous material phrases |
| Typos & OCR-style Input | 24 | Medium | Shop-floor typing errors fail | presnt, cemnt, reprot, mgrtr |
| Short Command Fragments | 17 | Medium | MSME shorthand not mapped | present, leave, report, members |
| Conversational / Context Loss | 38 | Medium | Long natural messages misrouted | customer puch raha kitna cement |
| Ambiguity Mishandling | 16 | Medium | Should clarify but guesses or chats | ram ko bhej do, figures bhejo |
| Multi-Intent Limitation | 16 | Medium | Only first or wrong intent chosen | tasks dikhao aur present mark → /present |
| Instruction vs Completion | 4 | Medium | Work status confused | 3 half done → /complete; issue 5 theek → /complete |
| Resolve vs Complete Confusion | 11 | Medium | Issues cannot be closed via NL | /resolve → general_chat or /complete |
| Member Lookup Phrase Gap | 7 | High | Team visibility requires exact Hindi phrase | members → general_chat |
| Broken English Miss | 20 | Low-Medium | Non-native phrasing fails LLM | today no come sick |
## Phase 3 — Workflow analysis

| Workflow | Accuracy | Pass | Fail | Entity | Rank | Strong | Weak |
|----------|----------|------|------|--------|------|--------|------|
| Attendance | 61.5% | 61.5% | 38.5% | 100.0% | Acceptable | `/present` | `present` |
| Attendance | 50.0% | 50.0% | 50.0% | 100.0% | Acceptable | `/absent` | `I will not come today` |
| Task Assignment | 41.7% | 25.0% | 58.3% | 25.0% | Weak | `@ram warehous safai` | `@ram aaj warehouse saaf k` |
| Task Delegation | 33.3% | 8.3% | 66.7% | 8.3% | Weak | `/mgrassign @priya 15` | `priya ko task 15 do` |
| Task Transfer | 16.7% | 16.7% | 83.3% | 100.0% | Critical | `/mgrtransfer 15 it` | `transfer task 15 to IT` |
| Task Rejection | 16.7% | 16.7% | 83.3% | 100.0% | Critical | `/mgrreject 18 not our sco` | `reject task 18` |
| Manager Self-Assign | 8.3% | 8.3% | 91.7% | 100.0% | Critical | `/mgrself 12` | `I will do task 12` |
| Task Completion | 83.3% | 33.3% | 16.7% | 33.3% | Good | `/complete 14` | `complte 14` |
| Department Assignment | 25.0% | 8.3% | 75.0% | 8.3% | Critical | `/depart_assign sales toda` | `Ask sales team to send to` |
| Issue Reporting | 25.0% | 25.0% | 75.0% | 100.0% | Critical | `/issue mixer not working` | `The forklift will not sta` |
| Inventory Delivery | 33.3% | 16.7% | 66.7% | 16.7% | Weak | `Ram ko 20 cement bags del` | `Ram ko 20 cement de do` |
| Inventory Issue | 50.0% | 25.0% | 50.0% | 33.3% | Acceptable | `Shyam ko 5 PVC pipes issu` | `5 pipe shyam give` |
| Inventory Count | 66.7% | 66.7% | 33.3% | 66.7% | Good | `inventory count please` | `count stock` |
| Purchase Requests | 41.7% | 41.7% | 58.3% | 100.0% | Weak | `/purchase_request_create` | `order cement purchase` |
| Low Stock | 33.3% | 33.3% | 66.7% | 100.0% | Weak | `low stock items` | `kya kya kam pad raha hai` |
| Members | 41.7% | 41.7% | 58.3% | 100.0% | Weak | `/members` | `Show team members` |
| Help | 50.0% | 50.0% | 50.0% | 100.0% | Acceptable | `/help` | `What can you do` |
| Status Queries | 58.3% | 58.3% | 41.7% | 100.0% | Acceptable | `/inventory_status CEMENT-` | `how much cement` |
| Reports | 41.7% | 41.7% | 58.3% | 100.0% | Weak | `/report` | `daily report` |

## Phase 5 — LLM routing

| Metric | Value |
| Total LLM cases | 142 |
| Pass rate | 9.2% |
| Fail rate | 90.8% |

LLM is the **weakest layer** (9.2% acc). 129 failures are `general_chat` fallback.

### Should have been deterministic (sample)

- `ram ko bolna godown saaf kare` expected `/assign` got `general_chat`
- `ram se kehna store saaf kare aaj` expected `/assign` got `general_chat`
- `ram safai karo` expected `/assign` got `general_chat`
- `sales team ko aaj ka data bhejne ko bolo` expected `/depart_assign` got `general_chat`
- `sales walo ko bolo` expected `/depart_assign` got `general_chat`
- `priya ko task 15 do` expected `/mgrassign` got `general_chat`
- `task 15 priya karegi` expected `/mgrassign` got `general_chat`
- `15 priya ko` expected `/mgrassign` got `general_chat`
- `15 send to it` expected `/mgrtransfer` got `general_chat`
- `15 it ko` expected `/mgrtransfer` got `general_chat`

## Phase 6 — Deterministic routing

| Total deterministic_pre | 152 |
| Pass rate | 75.0% |
| False routes | 38 |

### Incorrect deterministic routes

- `@ram aaj warehouse saaf karo` — expected `/assign`, got `/depart_assign` (task_assignment)
- `ram free hai usko warehouse wala kaam de do` — expected `/assign`, got `/assign_clarify` (task_assignment)
- `Ask sales team to send today figures` — expected `/depart_assign`, got `/assign_clarify` (department_assignment)
- `sales ko figures bhejo aaj ke` — expected `/depart_assign`, got `/assign_clarify` (department_assignment)
- `sales team figure today send` — expected `/depart_assign`, got `/assign_clarify` (department_assignment)
- `sales figures` — expected `/depart_assign`, got `/assign_clarify` (department_assignment)
- `month end hai sales ko report chahiye` — expected `/depart_assign`, got `/report` (department_assignment)
- `priya free hai usko 15 wala kaam de do` — expected `/mgrassign`, got `/assign_clarify` (task_delegation)
- `priya ko 15 do aur ram ko 16` — expected `/mgrassign`, got `/assign` (task_delegation)
- `owner ne diya 12 mujhe khud karna hai` — expected `/mgrself`, got `/assign_clarify` (task_self_assign)
- `my task show` — expected `/tasks`, got `/assign_clarify` (task_listing)
- `aaj mujhe kya karna hai wo batao` — expected `/tasks`, got `/assign_clarify` (task_listing)
- `kya karna hai` — expected `/tasks`, got `/assign_clarify` (task_listing)
- `tasks dikhao aur present mark` — expected `/tasks`, got `/present` (task_listing)
- `3 half done` — expected `/update`, got `/complete` (task_update)