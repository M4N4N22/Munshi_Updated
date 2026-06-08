# Confusion Matrix Report (Complete)

## Top 20 intent confusions

### 1. `/mgrtransfer` → `general_chat`

- **Failure count:** 10
- **% of expected intent failures:** 83.3%

**Example inputs:**
- `transfer task 15 to IT`
- `15 send to it`
- `transfer task 15`
- `15 it ko`
- `mgrtr 15`

### 2. `/mgrreject` → `general_chat`

- **Failure count:** 10
- **% of expected intent failures:** 83.3%

**Example inputs:**
- `reject task 18`
- `18 reject`
- `reject task 18`
- `18 reject`
- `mgrre 18`

### 3. `/mgrself` → `general_chat`

- **Failure count:** 10
- **% of expected intent failures:** 83.3%

**Example inputs:**
- `I will do task 12`
- `task 12 main kar lunga`
- `12 main sambhal lunga`
- `i do task 12`
- `12 main karunga`

### 4. `/resolve` → `general_chat`

- **Failure count:** 8
- **% of expected intent failures:** 66.7%

**Example inputs:**
- `Issue 5 is fixed now`
- `5 resolve kar do fix ho gaya`
- `resolve 5 fixed`
- `5 band nahi ab theek`
- `resolv 5`

### 5. `/inventory_status` → `general_chat`

- **Failure count:** 8
- **% of expected intent failures:** 40.0%

**Example inputs:**
- `how much cement`
- `cement stock`
- `stock cement`
- `customer puch raha kitna cement hai batao`
- `kya kya kam pad raha hai`

### 6. `/purchase_request_create` → `general_chat`

- **Failure count:** 7
- **% of expected intent failures:** 43.8%

**Example inputs:**
- `order cement purchase`
- `purchse request cement`
- `order cement`
- `stock kam hai cement ka purchase chahiye`
- `cement order aur steel bhi`

### 7. `/absent` → `general_chat`

- **Failure count:** 6
- **% of expected intent failures:** 50.0%

**Example inputs:**
- `I will not come today`
- `today no come sick`
- `absnt aaj`
- `leave`
- `doctor ne rest bola hai kal se aaunga`

### 8. `/mgrassign` → `general_chat`

- **Failure count:** 6
- **% of expected intent failures:** 54.5%

**Example inputs:**
- `priya ko task 15 do`
- `task 15 priya karegi`
- `priya task 15 do`
- `15 priya ko`
- `prnya ko task 15`

### 9. `/issues` → `general_chat`

- **Failure count:** 6
- **% of expected intent failures:** 50.0%

**Example inputs:**
- `show issues`
- `isues dikhao`
- `issues`
- `kya kya problems open hain`
- `kal wale issues abhi bhi open?`

### 10. `/help` → `general_chat`

- **Failure count:** 6
- **% of expected intent failures:** 50.0%

**Example inputs:**
- `What can you do`
- `commands batao`
- `hlp`
- `mujhe samajh nahi aa raha kya likhun`
- `pehli baar use kar raha hun guide karo`

### 11. `/report` → `general_chat`

- **Failure count:** 6
- **% of expected intent failures:** 50.0%

**Example inputs:**
- `daily report`
- `reprot dikhao`
- `report`
- `kal wala report abhi bhejo`
- `summary`

### 12. `/present` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 38.5%

**Example inputs:**
- `present`
- `present today i come`
- `presnt hu aaj`
- `present`
- `aaj aa gaya`

### 13. `/assign` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 38.5%

**Example inputs:**
- `Please ask Ram to clean the warehouse today`
- `ram ko bolna godown saaf kare`
- `ram se kehna store saaf kare aaj`
- `ram clean warehouse today`
- `ram safai karo`

### 14. `/update` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 41.7%

**Example inputs:**
- `updat task 3`
- `3 update`
- `3 wala abhi 50 percent ho chuka`
- `subah start kiya 3 abhi bhi chal raha`
- `3 update aur 4 complete`

### 15. `/issue` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 41.7%

**Example inputs:**
- `The forklift will not start`
- `forklift start nahi ho rahi`
- `mixer band`
- `mchine kharab`
- `subah se mixer chal nahi raha`

### 16. `/members` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 45.5%

**Example inputs:**
- `Show team members`
- `show team member`
- `kaun kaun hai team mein`
- `memebers list`
- `team dikhao`

### 17. `/assign_clarify` → `general_chat`

- **Failure count:** 5
- **% of expected intent failures:** 38.5%

**Example inputs:**
- `Finish the quarterly audit`
- `audit karo`
- `websit update`
- `audit karo`
- `owner ne bola tha audit kisko du`

### 18. `extract:issue` → `extract:null`

- **Failure count:** 5
- **% of expected intent failures:** 45.5%

**Example inputs:**
- `5 pipe shyam give`
- `shyam ko pipe do`
- `5 pipe shyam`
- `kal order tha shyam ko 5 pipe`
- `shyam ko 5 pipe aur ram ko cement`

### 19. `/depart_assign` → `/assign_clarify`

- **Failure count:** 4
- **% of expected intent failures:** 36.4%

**Example inputs:**
- `Ask sales team to send today figures`
- `sales ko figures bhejo aaj ke`
- `sales team figure today send`
- `sales figures`

### 20. `/depart_assign` → `general_chat`

- **Failure count:** 4
- **% of expected intent failures:** 36.4%

**Example inputs:**
- `sales team ko aaj ka data bhejne ko bolo`
- `sales walo ko bolo`
- `slaes ko data bhejo`
- `sales department se kehna aaj closing bhejein`

## Full matrix by expected intent

### `/absent` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 6 | 50.0% |

### `/assign` (n=13)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 38.5% |
| `/depart_assign` | 1 | 7.7% |
| `/assign_clarify` | 1 | 7.7% |

### `/assign_clarify` (n=13)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 38.5% |
| `/assign` | 1 | 7.7% |
| `/report` | 1 | 7.7% |

### `/business_discovery` (n=11)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 2 | 18.2% |
| `/assign_clarify` | 1 | 9.1% |

### `/complete` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 2 | 16.7% |

### `/depart_assign` (n=11)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `/assign_clarify` | 4 | 36.4% |
| `general_chat` | 4 | 36.4% |
| `/report` | 1 | 9.1% |

### `/help` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 6 | 50.0% |

### `/inventory_create` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `/inventory_status` | 2 | 16.7% |
| `/onboard_vendor` | 1 | 8.3% |

### `/inventory_status` (n=20)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 8 | 40.0% |
| `/inventory_create` | 1 | 5.0% |

### `/issue` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 41.7% |
| `/assign_clarify` | 3 | 25.0% |
| `/update` | 1 | 8.3% |

### `/issues` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 6 | 50.0% |

### `/members` (n=11)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 45.5% |
| `/assign_clarify` | 1 | 9.1% |
| `/onboard_worker` | 1 | 9.1% |

### `/mgrassign` (n=11)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 6 | 54.5% |
| `/assign_clarify` | 1 | 9.1% |
| `/assign` | 1 | 9.1% |

### `/mgrreject` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 10 | 83.3% |

### `/mgrself` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 10 | 83.3% |
| `/assign_clarify` | 1 | 8.3% |

### `/mgrtransfer` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 10 | 83.3% |

### `/onboard_vendor` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 2 | 16.7% |

### `/onboard_worker` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 3 | 25.0% |
| `/assign_clarify` | 1 | 8.3% |
| `/onboard_vendor` | 1 | 8.3% |

### `/present` (n=13)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 38.5% |

### `/purchase_request_create` (n=16)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 7 | 43.8% |
| `/inventory_status` | 2 | 12.5% |
| `/depart_assign` | 1 | 6.2% |
| `/assign_clarify` | 1 | 6.2% |

### `/report` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 6 | 50.0% |
| `/assign_clarify` | 1 | 8.3% |

### `/resolve` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 8 | 66.7% |
| `/complete` | 3 | 25.0% |

### `/tasks` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `/assign_clarify` | 3 | 25.0% |
| `general_chat` | 3 | 25.0% |
| `/present` | 1 | 8.3% |

### `/update` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `general_chat` | 5 | 41.7% |
| `/complete` | 1 | 8.3% |

### `extract:delivery` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `extract:issue` | 4 | 33.3% |
| `extract:null` | 4 | 33.3% |

### `extract:inventory_count` (n=12)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `extract:null` | 4 | 33.3% |

### `extract:issue` (n=11)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `extract:null` | 5 | 45.5% |

### `extract:null` (n=1)

| Predicted | Count | Failure % of expected |
|-----------|-------|----------------------|
| `extract:delivery` | 1 | 100.0% |
