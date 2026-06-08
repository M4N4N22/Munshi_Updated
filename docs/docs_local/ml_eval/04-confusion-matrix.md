# Intent Confusion Matrix

Rows = **expected**, columns = **predicted**. Counts from benchmark run.

## Top incorrect mappings

| Expected | Predicted | Count |
|----------|-----------|-------|
| `/mgrtransfer` | `general_chat` | 10 |
| `/mgrreject` | `general_chat` | 10 |
| `/mgrself` | `general_chat` | 10 |
| `/resolve` | `general_chat` | 8 |
| `/inventory_status` | `general_chat` | 8 |
| `/purchase_request_create` | `general_chat` | 7 |
| `/absent` | `general_chat` | 6 |
| `/mgrassign` | `general_chat` | 6 |
| `/issues` | `general_chat` | 6 |
| `/help` | `general_chat` | 6 |
| `/report` | `general_chat` | 6 |
| `/present` | `general_chat` | 5 |
| `/assign` | `general_chat` | 5 |
| `/update` | `general_chat` | 5 |
| `/issue` | `general_chat` | 5 |
| `/members` | `general_chat` | 5 |
| `/assign_clarify` | `general_chat` | 5 |
| `extract:issue` | `extract:null` | 5 |
| `/depart_assign` | `/assign_clarify` | 4 |
| `/depart_assign` | `general_chat` | 4 |
| `extract:delivery` | `extract:issue` | 4 |
| `extract:delivery` | `extract:null` | 4 |
| `extract:inventory_count` | `extract:null` | 4 |
| `/tasks` | `/assign_clarify` | 3 |
| `/tasks` | `general_chat` | 3 |
| `/issue` | `/assign_clarify` | 3 |
| `/resolve` | `/complete` | 3 |
| `/onboard_worker` | `general_chat` | 3 |
| `/complete` | `general_chat` | 2 |
| `/purchase_request_create` | `/inventory_status` | 2 |
| `/onboard_vendor` | `general_chat` | 2 |
| `/inventory_create` | `/inventory_status` | 2 |
| `/business_discovery` | `general_chat` | 2 |
| `/assign` | `/depart_assign` | 1 |
| `/assign` | `/assign_clarify` | 1 |
| `/depart_assign` | `/report` | 1 |
| `/mgrassign` | `/assign_clarify` | 1 |
| `/mgrassign` | `/assign` | 1 |
| `/mgrself` | `/assign_clarify` | 1 |
| `/tasks` | `/present` | 1 |

## Notable confusion pairs (workflow view)

- **Inventory Delivery (NL)** → `/assign` — Classify path steals delivery phrases before extractor runs
- **Department Assignment** → `/assign_clarify` — Dept slug not detected without keywords
- **Department Assignment** → `general_chat` — LLM fallback on natural English
- **Member Lookup** → `general_chat` — Bare `members` and some English phrases
- **Manager Transfer** → `general_chat` — No regex coverage; LLM defaults
- **Manager Reject** → `general_chat` — Same
- **Manager Self-Assign** → `general_chat` — Same
- **Attendance** → `general_chat` — Typos and conversational variants
- **Purchase Request** → `general_chat` — LLM miss on non-keyword phrasing
- **Inventory Status** → `general_chat` — Conversational stock queries
- **Issue Resolve** → `general_chat` — Confused with general confirmation
- **Task Completion** → `/assign` — Instruction vs confirmation disambiguation