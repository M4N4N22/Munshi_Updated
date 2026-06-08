# Multi-Intent Analysis

**Level 12 cases:** 29 · **Accuracy:** 41.4%

## Per-case analysis

| Message | Expected | Predicted | Expected behavior | Current behavior | Risk |
|---------|----------|-----------|-------------------|------------------|------|
| `present hu aur tasks dikhao` | `/present` | `/present` | Process both intents sequentially or confirm | Single intent `/present` only | Low |
| `absent hu aur kal aaunga` | `/absent` | `/absent` | Process both intents sequentially or confirm | Single intent `/absent` only | Medium |
| `ram ko safai karo aur shyam ko loading` | `/assign` | `/assign` | Process both intents sequentially or confirm | Single intent `/assign` only | Medium |
| `sales ko figures aur it ko server check` | `/depart_assign` | `/depart_assign` | Process both intents sequentially or confirm | Single intent `/depart_assign` only | Medium |
| `priya ko 15 do aur ram ko 16` | `/mgrassign` | `/assign` | Process both intents sequentially or confirm | Single intent `/assign` only | Medium |
| `15 handle aur next` | `/mgrtransfer` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `18 handle aur next` | `/mgrreject` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `12 handle aur next` | `/mgrself` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `14 done aur 15 start` | `/complete` | `/complete` | Process both intents sequentially or confirm | Single intent `/complete` only | Medium |
| `tasks dikhao aur present mark` | `/tasks` | `/present` | Process both intents sequentially or confirm | Single intent `/present` only | Medium |
| `3 update aur 4 complete` | `/update` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `mixer band aur task 5 update` | `/issue` | `/update` | Process both intents sequentially or confirm | Single intent `/update` only | Medium |
| `issues dikhao aur report` | `/issues` | `/issues` | Process both intents sequentially or confirm | Single intent `/issues` only | Medium |
| `5 resolve aur 6 open` | `/resolve` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `members dikhao aur tasks` | `/members` | `/members` | Process both intents sequentially or confirm | Single intent `/members` only | Medium |
| `cement stock aur low items` | `/inventory_status` | `/inventory_create` | Process both intents sequentially or confirm | Single intent `/inventory_create` only | Medium |
| `cement order aur steel bhi` | `/purchase_request_create` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `help aur tasks` | `/help` | `/help` | Process both intents sequentially or confirm | Single intent `/help` only | Medium |
| `hi aur team dikhao` | `general_chat` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `report aur issues` | `/report` | `general_chat` | Process both intents sequentially or confirm | Single intent `general_chat` only | Medium |
| `worker add aur vendor bhi` | `/onboard_worker` | `/onboard_vendor` | Process both intents sequentially or confirm | Single intent `/onboard_vendor` only | Medium |
| `vendor add aur PR` | `/onboard_vendor` | `/onboard_vendor` | Process both intents sequentially or confirm | Single intent `/onboard_vendor` only | Medium |
| `item add aur stock check` | `/inventory_create` | `/inventory_status` | Process both intents sequentially or confirm | Single intent `/inventory_status` only | Medium |
| `business setup aur import inventory` | `/business_discovery` | `/business_discovery` | Process both intents sequentially or confirm | Single intent `/business_discovery` only | Medium |
| `website banao aur report bhejo` | `/assign_clarify` | `/report` | Process both intents sequentially or confirm | Single intent `/report` only | Medium |
| `Ram ko 20 cement de do aur Shyam ko kal site bhejn` | `extract:delivery` | `extract:issue` | Process both intents sequentially or confirm | Single intent `extract:issue` only | High |
| `shyam ko 5 pipe aur ram ko cement` | `extract:issue` | `extract:null` | Process both intents sequentially or confirm | Single intent `extract:null` only | Medium |
| `stock count aur report` | `extract:inventory_count` | `extract:inventory_count` | Process both intents sequentially or confirm | Single intent `extract:inventory_count` only | Medium |
| `low stock aur order cement` | `/purchase_request_create` | `/inventory_status` | Process both intents sequentially or confirm | Single intent `/inventory_status` only | Medium |

## Architecture support for multi-intent

### Can current architecture support multi-intent workflows?

## **NO**

**Reasoning:**
- `classify_hybrid` returns exactly one intent per message
- No intent segmentation or compound command parser
- Backend `whatsapp.service` processes one command per inbound message
- Multi-intent benchmark shows wrong-first-intent wins (e.g. `tasks dikhao aur present` → `/present`)
- Task-inventory extractor is single extraction object

Supporting multi-intent would require message splitting, priority rules, or confirmation — **out of current scope**.