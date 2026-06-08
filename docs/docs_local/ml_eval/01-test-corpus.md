# ML Evaluation Test Corpus

**Generated:** 2026-06-08T10:45:40.126995+00:00
**Mode:** production (use_llm=True, classify_hybrid + extract_task_inventory)
**Total cases:** 349
**Workflows:** 29

## Scope

User-facing workflows from `current-capability-registry.md` v2.0. Covers `/classify` (hybrid, `use_llm=True`) and `extract_task_inventory` for inventory-linked NL.

**Out of `/classify` scope (not in this corpus):** Document upload/parse/suggestion approval — REST + workflow path, not intent-classified. CSV slash commands (`/inventory_import_csv`) tested via command parser when prefixed.

## Difficulty levels

- **Level 1** — Canonical Commands
- **Level 2** — Natural English
- **Level 3** — Hindi
- **Level 4** — Hinglish
- **Level 5** — Broken English
- **Level 6** — MSME Style Messaging
- **Level 7** — Typos
- **Level 8** — Short Commands
- **Level 9** — Conversational Commands
- **Level 10** — Context-Heavy Commands
- **Level 11** — Ambiguous Commands
- **Level 12** — Multi-Intent Commands

## Workflows

- `assign_clarify` — 12 cases
- `attendance_absent` — 12 cases
- `attendance_present` — 13 cases
- `business_discovery` — 12 cases
- `department_assignment` — 12 cases
- `general_help` — 12 cases
- `home_menu` — 12 cases
- `inventory_count` — 12 cases
- `inventory_create` — 12 cases
- `inventory_delivery` — 12 cases
- `inventory_issue` — 12 cases
- `inventory_status` — 12 cases
- `issue_list` — 12 cases
- `issue_reporting` — 12 cases
- `issue_resolve` — 12 cases
- `low_stock_workflow` — 12 cases
- `member_lookup` — 12 cases
- `onboard_vendor` — 12 cases
- `onboard_worker` — 12 cases
- `purchase_request` — 12 cases
- `report` — 12 cases
- `task_assignment` — 12 cases
- `task_completion` — 12 cases
- `task_delegation` — 12 cases
- `task_listing` — 12 cases
- `task_rejection` — 12 cases
- `task_self_assign` — 12 cases
- `task_transfer` — 12 cases
- `task_update` — 12 cases

## Role distribution

- **OWNER** — 180 cases
- **MANAGER** — 84 cases
- **WORKER** — 85 cases

## Corpus sample (first 5 per workflow)

### assign_clarify

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0290 | L1 | OWNER | aaj website banegi | `/assign_clarify` |
| B-0291 | L2 | OWNER | Finish the quarterly audit | `/assign_clarify` |
| B-0292 | L3 | OWNER | aaj website update karni hai | `/assign_clarify` |
| B-0293 | L4 | OWNER | quarterly audit complete karna hai | `/assign_clarify` |
| B-0294 | L5 | OWNER | website update today | `/assign_clarify` |

### attendance_absent

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0014 | L1 | WORKER | /absent | `/absent` |
| B-0015 | L2 | WORKER | I will not come today | `/absent` |
| B-0016 | L3 | WORKER | aaj nahi aa paunga bimar hu | `/absent` |
| B-0017 | L4 | WORKER | not coming today leave | `/absent` |
| B-0018 | L5 | WORKER | today no come sick | `/absent` |

### attendance_present

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0001 | L1 | WORKER | /present | `/present` |
| B-0002 | L1 | WORKER | present | `/present` |
| B-0003 | L2 | WORKER | I am here today | `/present` |
| B-0004 | L3 | WORKER | aaj main present hoon | `/present` |
| B-0005 | L4 | WORKER | main aa gaya factory | `/present` |

### business_discovery

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0278 | L1 | OWNER | /business_discovery | `/business_discovery` |
| B-0279 | L2 | OWNER | Tell you about my business | `/business_discovery` |
| B-0280 | L3 | OWNER | apna business setup karna hai | `/business_discovery` |
| B-0281 | L4 | OWNER | setup my business munshi | `/business_discovery` |
| B-0282 | L5 | OWNER | register company | `/business_discovery` |

### department_assignment

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0038 | L1 | OWNER | /depart_assign sales today figures | `/depart_assign` |
| B-0039 | L2 | OWNER | Ask sales team to send today figures | `/depart_assign` |
| B-0040 | L3 | OWNER | sales team ko aaj ka data bhejne ko bolo | `/depart_assign` |
| B-0041 | L4 | OWNER | sales ko figures bhejo aaj ke | `/depart_assign` |
| B-0042 | L5 | OWNER | sales team figure today send | `/depart_assign` |

### general_help

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0206 | L1 | OWNER | /help | `/help` |
| B-0207 | L2 | OWNER | What can you do | `/help` |
| B-0208 | L3 | OWNER | madad chahiye | `/help` |
| B-0209 | L4 | OWNER | help please munshi | `/help` |
| B-0210 | L5 | OWNER | help me | `/help` |

### home_menu

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0218 | L1 | OWNER | hi | `general_chat` |
| B-0219 | L2 | OWNER | Hello Munshi | `general_chat` |
| B-0220 | L3 | OWNER | namaste | `general_chat` |
| B-0221 | L4 | OWNER | hi munshi good morning | `general_chat` |
| B-0222 | L5 | OWNER | hey | `general_chat` |

### inventory_count

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0326 | L1 | OWNER | inventory count please | `extract:inventory_count` |
| B-0327 | L2 | OWNER | Start stock count | `extract:inventory_count` |
| B-0328 | L3 | OWNER | maal ki ginati karwa do | `extract:inventory_count` |
| B-0329 | L4 | OWNER | stock count karo | `extract:inventory_count` |
| B-0330 | L5 | OWNER | count stock | `extract:inventory_count` |

### inventory_create

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0266 | L1 | OWNER | /inventory_create | `/inventory_create` |
| B-0267 | L2 | OWNER | Add new inventory item | `/inventory_create` |
| B-0268 | L3 | OWNER | naya item add karo stock mein | `/inventory_create` |
| B-0269 | L4 | OWNER | inventory item banao | `/inventory_create` |
| B-0270 | L5 | OWNER | new stock item | `/inventory_create` |

### inventory_delivery

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0302 | L1 | OWNER | Ram ko 20 cement bags deliver kar do | `extract:delivery` |
| B-0303 | L2 | OWNER | Please deliver 20 bags of cement to Ram | `extract:delivery` |
| B-0304 | L3 | OWNER | Ram ko 20 cement de do | `extract:delivery` |
| B-0305 | L4 | OWNER | Ram ko 20 bag cement issue kar do | `extract:delivery` |
| B-0306 | L5 | OWNER | 20 cement Ram give | `extract:delivery` |

### inventory_issue

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0314 | L1 | MANAGER | Shyam ko 5 PVC pipes issue karo | `extract:issue` |
| B-0315 | L2 | MANAGER | Issue 5 steel rods to Shyam | `extract:issue` |
| B-0316 | L3 | MANAGER | Shyam ko 5 pipe de do | `extract:issue` |
| B-0317 | L4 | MANAGER | 5 rod shyam ko issue | `extract:issue` |
| B-0318 | L5 | MANAGER | 5 pipe shyam give | `extract:issue` |

### inventory_status

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0182 | L1 | OWNER | /inventory_status CEMENT-50KG | `/inventory_status` |
| B-0183 | L2 | OWNER | How much cement stock do we have | `/inventory_status` |
| B-0184 | L3 | OWNER | cement kitna bacha hai | `/inventory_status` |
| B-0185 | L4 | OWNER | stock dikhao cement ka | `/inventory_status` |
| B-0186 | L5 | OWNER | how much cement | `/inventory_status` |

### issue_list

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0146 | L1 | MANAGER | /issues | `/issues` |
| B-0147 | L2 | MANAGER | Show active issues | `/issues` |
| B-0148 | L3 | MANAGER | active issues dikhao | `/issues` |
| B-0149 | L4 | MANAGER | open issues batao | `/issues` |
| B-0150 | L5 | MANAGER | show issues | `/issues` |

### issue_reporting

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0134 | L1 | WORKER | /issue mixer not working | `/issue` |
| B-0135 | L2 | WORKER | The forklift will not start | `/issue` |
| B-0136 | L3 | WORKER | machine kharab hai | `/issue` |
| B-0137 | L4 | WORKER | forklift start nahi ho rahi | `/issue` |
| B-0138 | L5 | WORKER | machine not work | `/issue` |

### issue_resolve

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0158 | L1 | WORKER | /resolve 5 | `/resolve` |
| B-0159 | L2 | WORKER | Issue 5 is fixed now | `/resolve` |
| B-0160 | L3 | WORKER | issue 5 theek ho gaya | `/resolve` |
| B-0161 | L4 | WORKER | 5 resolve kar do fix ho gaya | `/resolve` |
| B-0162 | L5 | WORKER | resolve 5 fixed | `/resolve` |

### low_stock_workflow

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0338 | L1 | OWNER | low stock items | `/inventory_status` |
| B-0339 | L2 | OWNER | What is running low in stock | `/inventory_status` |
| B-0340 | L3 | OWNER | kya kya kam pad raha hai | `/inventory_status` |
| B-0341 | L4 | OWNER | low stock dikhao | `/inventory_status` |
| B-0342 | L5 | OWNER | stock low show | `/inventory_status` |

### member_lookup

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0170 | L1 | OWNER | /members | `/members` |
| B-0171 | L2 | OWNER | Show team members | `/members` |
| B-0172 | L3 | OWNER | team members batao | `/members` |
| B-0173 | L4 | OWNER | team members dikhao | `/members` |
| B-0174 | L5 | OWNER | show team member | `/members` |

### onboard_vendor

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0254 | L1 | OWNER | /onboard_vendor | `/onboard_vendor` |
| B-0255 | L2 | OWNER | Register new vendor | `/onboard_vendor` |
| B-0256 | L3 | OWNER | naya vendor add karo | `/onboard_vendor` |
| B-0257 | L4 | OWNER | supplier register karo | `/onboard_vendor` |
| B-0258 | L5 | OWNER | add vendor | `/onboard_vendor` |

### onboard_worker

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0242 | L1 | OWNER | /onboard_worker | `/onboard_worker` |
| B-0243 | L2 | OWNER | Add new worker | `/onboard_worker` |
| B-0244 | L3 | OWNER | naya worker add karo | `/onboard_worker` |
| B-0245 | L4 | OWNER | worker onboard karna hai | `/onboard_worker` |
| B-0246 | L5 | OWNER | add worker | `/onboard_worker` |

### purchase_request

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0194 | L1 | OWNER | /purchase_request_create | `/purchase_request_create` |
| B-0195 | L2 | OWNER | Create purchase request for cement | `/purchase_request_create` |
| B-0196 | L3 | OWNER | cement ka order karna hai | `/purchase_request_create` |
| B-0197 | L4 | OWNER | purchase request banao cement ke liye | `/purchase_request_create` |
| B-0198 | L5 | OWNER | order cement purchase | `/purchase_request_create` |

### report

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0230 | L1 | MANAGER | /report | `/report` |
| B-0231 | L2 | MANAGER | Daily summary please | `/report` |
| B-0232 | L3 | MANAGER | aaj ka report dikhao | `/report` |
| B-0233 | L4 | MANAGER | report chahiye aaj ka | `/report` |
| B-0234 | L5 | MANAGER | daily report | `/report` |

### task_assignment

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0026 | L1 | OWNER | @ram aaj warehouse saaf karo | `/assign` |
| B-0027 | L2 | OWNER | Please ask Ram to clean the warehouse today | `/assign` |
| B-0028 | L3 | OWNER | ram ko bolna godown saaf kare | `/assign` |
| B-0029 | L4 | OWNER | ram se kehna store saaf kare aaj | `/assign` |
| B-0030 | L5 | OWNER | ram clean warehouse today | `/assign` |

### task_completion

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0098 | L1 | WORKER | /complete 14 | `/complete` |
| B-0099 | L2 | WORKER | Task 14 is finished | `/complete` |
| B-0100 | L3 | WORKER | task 14 ho gaya | `/complete` |
| B-0101 | L4 | WORKER | 14 complete ho gaya kaam | `/complete` |
| B-0102 | L5 | WORKER | 14 done | `/complete` |

### task_delegation

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0050 | L1 | MANAGER | /mgrassign @priya 15 | `/mgrassign` |
| B-0051 | L2 | MANAGER | @priya will do task 15 | `/mgrassign` |
| B-0052 | L3 | MANAGER | priya ko task 15 do | `/mgrassign` |
| B-0053 | L4 | MANAGER | task 15 priya karegi | `/mgrassign` |
| B-0054 | L5 | MANAGER | priya task 15 do | `/mgrassign` |

### task_listing

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0110 | L1 | WORKER | /tasks | `/tasks` |
| B-0111 | L2 | WORKER | Show my tasks please | `/tasks` |
| B-0112 | L3 | WORKER | mere tasks dikhao | `/tasks` |
| B-0113 | L4 | WORKER | aaj ke tasks batao | `/tasks` |
| B-0114 | L5 | WORKER | my task show | `/tasks` |

### task_rejection

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0074 | L1 | MANAGER | /mgrreject 18 not our scope | `/mgrreject` |
| B-0075 | L2 | MANAGER | reject task 18 | `/mgrreject` |
| B-0076 | L3 | MANAGER | task 18 reject karo | `/mgrreject` |
| B-0077 | L4 | MANAGER | 18 reject | `/mgrreject` |
| B-0078 | L5 | MANAGER | reject task 18 | `/mgrreject` |

### task_self_assign

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0086 | L1 | MANAGER | /mgrself 12 | `/mgrself` |
| B-0087 | L2 | MANAGER | I will do task 12 | `/mgrself` |
| B-0088 | L3 | MANAGER | task 12 main kar lunga | `/mgrself` |
| B-0089 | L4 | MANAGER | 12 main sambhal lunga | `/mgrself` |
| B-0090 | L5 | MANAGER | i do task 12 | `/mgrself` |

### task_transfer

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0062 | L1 | MANAGER | /mgrtransfer 15 it | `/mgrtransfer` |
| B-0063 | L2 | MANAGER | transfer task 15 to IT | `/mgrtransfer` |
| B-0064 | L3 | MANAGER | task 15 IT ko bhejo | `/mgrtransfer` |
| B-0065 | L4 | MANAGER | 15 send to it | `/mgrtransfer` |
| B-0066 | L5 | MANAGER | transfer task 15 | `/mgrtransfer` |

### task_update

| ID | Level | Role | Message | Expected |
|----|-------|------|---------|----------|
| B-0122 | L1 | WORKER | /update 3 50 percent done | `/update` |
| B-0123 | L2 | WORKER | Task 3 is half complete | `/update` |
| B-0124 | L3 | WORKER | task 3 par kaam chal raha | `/update` |
| B-0125 | L4 | WORKER | 3 almost complete hai | `/update` |
| B-0126 | L5 | WORKER | 3 half done | `/update` |

Full machine-readable corpus: `benchmark_corpus.json`