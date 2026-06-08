# Failure Analysis

**Total FAIL outcomes:** 185 / 349 (53.0%)

## Root cause categories

| Root cause | Failures tagged |
|------------|-----------------|
| LLM fallback to general_chat | 129 |
| Context / conversational loss | 19 |
| Multi-intent limitation | 10 |
| Entity extraction null (inventory) | 7 |
| Hindi/Hinglish miss | 4 |
| Dept vs person assign confusion | 4 |
| Ambiguity handling | 4 |
| Broken English miss | 3 |
| Typos | 3 |
| Intent confusion (other) | 2 |

## Top 20 recurring failure patterns

1. **LLM fallback to general_chat** — 129 cases
2. **Context / conversational loss** — 19 cases
3. **Multi-intent limitation** — 10 cases
4. **Entity extraction null (inventory)** — 7 cases
5. **Hindi/Hinglish miss** — 4 cases
6. **Dept vs person assign confusion** — 4 cases
7. **Ambiguity handling** — 4 cases
8. **Broken English miss** — 3 cases
9. **Typos** — 3 cases
10. **Intent confusion (other)** — 2 cases

## Representative failures by workflow

### task_self_assign (intent acc 8.3%)
- `I will do task 12` → expected `/mgrself`, got `general_chat` (english, L2)
- `task 12 main kar lunga` → expected `/mgrself`, got `general_chat` (hindi, L3)
- `12 main sambhal lunga` → expected `/mgrself`, got `general_chat` (hinglish, L4)

### issue_resolve (intent acc 8.3%)
- `Issue 5 is fixed now` → expected `/resolve`, got `general_chat` (english, L2)
- `issue 5 theek ho gaya` → expected `/resolve`, got `/complete` (hindi, L3)
- `5 resolve kar do fix ho gaya` → expected `/resolve`, got `general_chat` (hinglish, L4)

### task_transfer (intent acc 16.7%)
- `transfer task 15 to IT` → expected `/mgrtransfer`, got `general_chat` (english, L2)
- `15 send to it` → expected `/mgrtransfer`, got `general_chat` (hinglish, L4)
- `transfer task 15` → expected `/mgrtransfer`, got `general_chat` (broken, L5)

### task_rejection (intent acc 16.7%)
- `reject task 18` → expected `/mgrreject`, got `general_chat` (english, L2)
- `18 reject` → expected `/mgrreject`, got `general_chat` (hinglish, L4)
- `reject task 18` → expected `/mgrreject`, got `general_chat` (broken, L5)

### department_assignment (intent acc 25.0%)
- `Ask sales team to send today figures` → expected `/depart_assign`, got `/assign_clarify` (english, L2)
- `sales team ko aaj ka data bhejne ko bolo` → expected `/depart_assign`, got `general_chat` (hindi, L3)
- `sales ko figures bhejo aaj ke` → expected `/depart_assign`, got `/assign_clarify` (hinglish, L4)

### issue_reporting (intent acc 25.0%)
- `The forklift will not start` → expected `/issue`, got `general_chat` (english, L2)
- `forklift start nahi ho rahi` → expected `/issue`, got `general_chat` (hinglish, L4)
- `machine not work` → expected `/issue`, got `/assign_clarify` (broken, L5)

### task_delegation (intent acc 33.3%)
- `priya ko task 15 do` → expected `/mgrassign`, got `general_chat` (hindi, L3)
- `task 15 priya karegi` → expected `/mgrassign`, got `general_chat` (hinglish, L4)
- `priya task 15 do` → expected `/mgrassign`, got `general_chat` (broken, L5)

### inventory_delivery (intent acc 33.3%)
- `Ram ko 20 cement de do` → expected `extract:delivery`, got `extract:issue` (hindi, L3)
- `Ram ko 20 bag cement issue kar do` → expected `extract:delivery`, got `extract:issue` (hinglish, L4)
- `20 cement Ram give` → expected `extract:delivery`, got `extract:null` (broken, L5)

### low_stock_workflow (intent acc 33.3%)
- `kya kya kam pad raha hai` → expected `/inventory_status`, got `general_chat` (mixed, L3)
- `stock low show` → expected `/inventory_status`, got `general_chat` (mixed, L5)
- `kya khatam ho raha` → expected `/purchase_request_create`, got `general_chat` (mixed, L6)

### task_assignment (intent acc 41.7%)
- `@ram aaj warehouse saaf karo` → expected `/assign`, got `/depart_assign` (hinglish, L1)
- `Please ask Ram to clean the warehouse today` → expected `/assign`, got `general_chat` (english, L2)
- `ram ko bolna godown saaf kare` → expected `/assign`, got `general_chat` (hindi, L3)

### task_listing (intent acc 41.7%)
- `my task show` → expected `/tasks`, got `/assign_clarify` (broken, L5)
- `taks dikhao` → expected `/tasks`, got `general_chat` (typos, L7)
- `tasks` → expected `/tasks`, got `general_chat` (short, L8)

### member_lookup (intent acc 41.7%)
- `Show team members` → expected `/members`, got `general_chat` (english, L2)
- `show team member` → expected `/members`, got `general_chat` (broken, L5)
- `kaun kaun hai team mein` → expected `/members`, got `general_chat` (msme, L6)

### purchase_request (intent acc 41.7%)
- `order cement purchase` → expected `/purchase_request_create`, got `general_chat` (broken, L5)
- `purchse request cement` → expected `/purchase_request_create`, got `general_chat` (typos, L7)
- `order cement` → expected `/purchase_request_create`, got `general_chat` (short, L8)

### report (intent acc 41.7%)
- `daily report` → expected `/report`, got `general_chat` (broken, L5)
- `reprot dikhao` → expected `/report`, got `general_chat` (typos, L7)
- `report` → expected `/report`, got `general_chat` (short, L8)

### assign_clarify (intent acc 41.7%)
- `Finish the quarterly audit` → expected `/assign_clarify`, got `general_chat` (english, L2)
- `audit karo` → expected `/assign_clarify`, got `general_chat` (msme, L6)
- `websit update` → expected `/assign_clarify`, got `general_chat` (typos, L7)

### attendance_absent (intent acc 50.0%)
- `I will not come today` → expected `/absent`, got `general_chat` (english, L2)
- `today no come sick` → expected `/absent`, got `general_chat` (broken, L5)
- `absnt aaj` → expected `/absent`, got `general_chat` (typos, L7)

### task_update (intent acc 50.0%)
- `3 half done` → expected `/update`, got `/complete` (broken, L5)
- `updat task 3` → expected `/update`, got `general_chat` (typos, L7)
- `3 update` → expected `/update`, got `general_chat` (short, L8)

### issue_list (intent acc 50.0%)
- `show issues` → expected `/issues`, got `general_chat` (broken, L5)
- `isues dikhao` → expected `/issues`, got `general_chat` (typos, L7)
- `issues` → expected `/issues`, got `general_chat` (short, L8)

### general_help (intent acc 50.0%)
- `What can you do` → expected `/help`, got `general_chat` (english, L2)
- `commands batao` → expected `/help`, got `general_chat` (msme, L6)
- `hlp` → expected `/help`, got `general_chat` (typos, L7)

### inventory_issue (intent acc 50.0%)
- `5 pipe shyam give` → expected `extract:issue`, got `extract:null` (broken, L5)
- `shyam ko pipe do` → expected `extract:issue`, got `extract:null` (msme, L6)
- `5 pipe shyam` → expected `extract:issue`, got `extract:null` (short, L8)

### inventory_status (intent acc 58.3%)
- `how much cement` → expected `/inventory_status`, got `general_chat` (broken, L5)
- `cement stock` → expected `/inventory_status`, got `general_chat` (msme, L6)
- `stock cement` → expected `/inventory_status`, got `general_chat` (short, L8)

### onboard_worker (intent acc 58.3%)
- `naya banda join karega` → expected `/onboard_worker`, got `/assign_clarify` (msme, L6)
- `onbord worker` → expected `/onboard_worker`, got `general_chat` (typos, L7)
- `ek helper aaya hai usko system mein daalo` → expected `/onboard_worker`, got `general_chat` (conversational, L9)

### attendance_present (intent acc 61.5%)
- `present` → expected `/present`, got `general_chat` (hinglish, L1)
- `present today i come` → expected `/present`, got `general_chat` (broken, L5)
- `presnt hu aaj` → expected `/present`, got `general_chat` (typos, L7)

### inventory_count (intent acc 66.7%)
- `count stock` → expected `extract:inventory_count`, got `extract:null` (broken, L5)
- `inventry count` → expected `extract:inventory_count`, got `extract:null` (typos, L7)
- `month end hai poora stock ginna hai` → expected `extract:inventory_count`, got `extract:null` (conversational, L9)

### inventory_create (intent acc 75.0%)
- `inventry create` → expected `/inventory_create`, got `/inventory_status` (typos, L7)
- `supplier ne naya product diya add karo` → expected `/inventory_create`, got `/onboard_vendor` (context, L10)
- `item add aur stock check` → expected `/inventory_create`, got `/inventory_status` (multi, L12)

### business_discovery (intent acc 75.0%)
- `busines setup` → expected `/business_discovery`, got `general_chat` (typos, L7)
- `naya factory hai profile complete karni hai` → expected `/business_discovery`, got `/assign_clarify` (conversational, L9)
- `setup` → expected `/business_discovery`, got `general_chat` (ambiguous, L11)

### task_completion (intent acc 83.3%)
- `complte 14` → expected `/complete`, got `general_chat` (typos, L7)
- `warehouse safai kar di 14 wala` → expected `/complete`, got `general_chat` (conversational, L9)

### onboard_vendor (intent acc 83.3%)
- `onbord vendor` → expected `/onboard_vendor`, got `general_chat` (typos, L7)
- `supplier` → expected `/onboard_vendor`, got `general_chat` (ambiguous, L11)
