# Ambiguity Analysis

**Level 11 cases:** 29 · **Accuracy:** 41.4%

| Input | Expected | Predicted | Classification |
|-------|----------|-----------|----------------|
| `aaj aa gaya` | `/present` | `general_chat` | Incorrectly → general_chat |
| `aaj nahi` | `/absent` | `general_chat` | Incorrectly → general_chat |
| `ram ko kaam do` | `/assign` | `/assign` | Correctly classified |
| `figures bhejo` | `/assign_clarify` | `/assign_clarify` | Correctly classified |
| `priya ko bhej do` | `/assign` | `/assign` | Correctly classified |
| `transfer karo` | `/mgrtransfer` | `general_chat` | Incorrectly → general_chat |
| `reject karo` | `/mgrreject` | `general_chat` | Incorrectly → general_chat |
| `main kar lunga` | `/mgrself` | `general_chat` | Incorrectly → general_chat |
| `task complete` | `/complete` | `/complete` | Correctly classified |
| `kya karna hai` | `/tasks` | `/assign_clarify` | Correctly clarified (assign) |
| `kaam chal raha` | `/update` | `/update` | Correctly classified |
| `problem hai` | `/issue` | `/issue` | Correctly classified |
| `problems` | `/issues` | `general_chat` | Incorrectly → general_chat |
| `theek ho gaya` | `/resolve` | `/complete` | Incorrectly classified |
| `team dikhao` | `/members` | `general_chat` | Incorrectly → general_chat |
| `kitna hai` | `/inventory_status` | `/inventory_status` | Correctly classified |
| `order karo` | `/purchase_request_create` | `/depart_assign` | Incorrectly classified |
| `kya kar sakte ho` | `/help` | `general_chat` | Incorrectly → general_chat |
| `ok` | `general_chat` | `general_chat` | Correctly classified |
| `summary` | `/report` | `general_chat` | Incorrectly → general_chat |
| `naya banda` | `/onboard_worker` | `general_chat` | Incorrectly → general_chat |
| `supplier` | `/onboard_vendor` | `general_chat` | Incorrectly → general_chat |
| `naya item` | `/inventory_create` | `/inventory_create` | Correctly classified |
| `setup` | `/business_discovery` | `general_chat` | Incorrectly → general_chat |
| `kaam hai` | `/assign_clarify` | `/assign_clarify` | Correctly classified |
| `Ram ko bhej do` | `extract:delivery` | `extract:delivery` | Correctly classified |
| `material bhej do` | `extract:null` | `extract:delivery` | Incorrectly classified |
| `ginati` | `extract:inventory_count` | `extract:inventory_count` | Correctly classified |
| `kam hai stock` | `/inventory_status` | `general_chat` | Incorrectly → general_chat |

## Recommended clarification categories (analysis only)

1. **Assignee missing** — material/task without @name or `ko`
2. **Department missing** — action without dept slug
3. **SKU/qty missing** — delivery without quantity or item
4. **Task ID missing** — mgr action without task number
5. **Intent pair** — complete vs assign vs resolve
6. **Team vs home** — bare `members` vs greeting