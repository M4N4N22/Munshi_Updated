# Phase 3.5 — Failure Mode Analysis

Architecture-level causes for Phase 2 boundary confusions. **Not example utterances.**

---

## assign ↔ depart_assign

| Cause | Evidence |
|-------|----------|
| Shared action verbs | `_DEPT_ACTION_RE`, `_ASSIGN_PERSON_RE` compete on same "ko" patterns |
| Department detection heuristic | `_detect_department` keyword map — "sales ko bolo" may lack dept keyword |
| Order dependency | Person extract in `operational_pre_classify` before dept — if person regex fails, dept may win |
| LLM few-shot overlap | Both use similar Hinglish instruction examples |
| No role context | Owner vs manager assign phrasing identical to classifier |
| Flat intent space | No hierarchy: delegation → person vs dept as siblings |

---

## assign ↔ task_inventory_nl

| Cause | Evidence |
|-------|----------|
| **Split architecture** | Stock tasks use `/extract/task-inventory` **before** classify — if extractor returns null, classify runs |
| Extractor narrow patterns | SKU regex `_SKU_RE` requires `WORD_WORD` format; plain names fail |
| task_kind gate | No task_kind → null → falls through to `/assign` |
| assign regex broad | `_ASSIGN_PERSON_RE` matches "X ko ... dispatch" without SKU |
| Not in VALID_INTENTS | `/task_inventory_nl` cannot be LLM output |
| Delivery verbs in assign examples | LLM prompt shows "dispatch" in complete/depart examples |

---

## assign ↔ assign_delivery

| Cause | Evidence |
|-------|----------|
| **Not in ML at all** | assign_delivery only via slash bypass in backend |
| NL delivery utterances | Classified as assign unless extractor succeeds |
| No quantity/SKU slot in ClassifyResponse for assign | Backend `handleAssignDelivery` separate code path |
| LLM prompt lacks assign_delivery intent | Cannot emit correct intent |

---

## mgrself ↔ mgrassign

| Cause | Evidence |
|-------|----------|
| Shared task_id extraction | Same `_extract_mgr_task_id` patterns |
| Regex order in manager_pre_classify | Self vs assign patterns may overlap on "task N X ko" |
| `_MGRASSIGN_RE` captures name + id | "main" could be misread as name in edge cases |
| Post-LLM rule | `assign + task_id → mgrassign` always — no mgrself path from LLM assign |
| No manager role input | Owner saying "main karunga" could hit mgr patterns incorrectly |
| Context reply map | `_MGR_CONTEXT_REPLY` hardcoded phrases — brittle |

---

## inventory_create ↔ inventory_import_csv

| Cause | Evidence |
|-------|----------|
| **import_csv not in classifier** | No regex, no LLM intent |
| `_BUSINESS_DISCOVERY_RE` includes import inventory | Routes to business_discovery |
| `_INVENTORY_CREATE_RE` very broad | "add", "jod", "stock", "maal" match create |
| workflow_pre_classify order | status checked before create — but import phrases may hit discovery first |
| Single-turn NL | No file-attachment signal in classify (CSV is separate message) |

---

## inventory_status ↔ inventory_create

| Cause | Evidence |
|-------|----------|
| workflow_pre_classify order | `_INVENTORY_STATUS_RE` before `_INVENTORY_CREATE_RE` — helps status |
| Overlap on "stock" + verb | "stock add" → create; "stock kitna" → status — verb-sensitive |
| Ambiguous "stock" only | No interrogative → may default LLM to create or general_chat |
| kitna patterns in status regex | Partial coverage — LLM handles long tail |

---

## complete ↔ update

| Cause | Evidence |
|-------|----------|
| Explicit ordering | `_UPDATE_PROGRESS_RE` before `_COMPLETION_CONFIRMED_RE` in operational_pre_classify |
| Regex overlap | "almost complete", "half done" — update wins if matched |
| Shared task id patterns | Both use task number extraction |
| LLM tricky examples | Prompt has instruction vs completion section — LLM may flip |
| `_INSTRUCTION_SIGNAL_RE` blocks complete | "karo" in message blocks complete pre-classifier |
| Vendor notification barrier | `_VENDOR_NOTIFICATION_RE` returns null — falls to LLM |

---

## issue ↔ update

| Cause | Evidence |
|-------|----------|
| Ordering | issue create before complete; update before complete |
| `_ISSUE_CREATE_RE` vs task-scoped update | "task 5 blocked" — update regex may win |
| `_ISSUE_REPORT_BARRIER_RE` | Used in workflow_pre to skip purchase — limited |
| No issue vs update in LLM prompt distinction for task-scoped problems | LLM decides on long tail |
| issue allows no task id | update prefers task id — architecture partial |

---

## Cross-cutting failure drivers

1. **Stateless single message** — no dialog state for clarify
2. **Hardcoded VALID_INTENTS** — contract gaps silently become general_chat
3. **Pre-classifier precedence** — wrong early match cannot be recovered
4. **general_chat as sink** — operational phrases misclassified → owner home (owners) masks error
5. **Dual paths** (classify vs task-inventory extract) — inconsistent entry
