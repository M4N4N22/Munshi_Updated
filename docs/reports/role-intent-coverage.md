# Role Intent Coverage

**Date:** 2026-06-01  
**Audit dataset:** 385 Hindi/Hinglish phrases, local ML only

---

## Owner (Rajesh Sharma)

**Dataset size:** 114 phrases | **Accuracy:** 65.8%

### Supported actions (reliable)

| Action | Intent | Audit accuracy | Example |
|--------|--------|----------------|---------|
| Introduce business | `/business_discovery` | ~63% | "mera business Sharma Packaging hai" |
| Resume setup | `/continue_discovery` | (in discovery bucket) | "setup continue karo" |
| Check inventory | `/inventory_status` | **83%** | "inventory status batao" |
| Add inventory item | `/inventory_create` | **83%** | "naya inventory item add karo" |
| Register vendor | `/onboard_vendor` | **92%** | "naya vendor add karo" |
| Create purchase request | `/purchase_request_create` | **69%** | "purchase request bana do" |
| General chat | `general_chat` | **100%** | "hello munshi" |

### Missing / broken actions

| Action | Expected | Actual behavior | Gap type |
|--------|----------|-----------------|----------|
| Daily reports | `/report` | `general_chat` | **Missing Hindi regex + LLM gap** |
| Issue list | `/issues` | `general_chat` | LLM gap |
| Vendor list (suppliers) | Vendor lookup intent | `/members` (employees) | **Semantic gap — no vendor list intent** |
| PR status query | Status intent | `general_chat` | **Intent missing** |
| Low-stock alert phrase | `/purchase_request_create` or alert | `general_chat` | Regex gap |
| Help | `/help` | `general_chat` | LLM gap |

### Ambiguous actions

- "vendor list import karni hai" → `/business_discovery` (correct for discovery doc path, confusing vs vendor master)
- "vendor se order place karo purchase request se" → may hit PR or depart_assign

---

## Manager (Amit / Suresh)

**Dataset size:** 120 phrases | **Accuracy:** 20.8%

### Supported actions (partial)

| Action | Intent | Audit accuracy | Notes |
|--------|--------|----------------|-------|
| Onboard worker | `/onboard_worker` | **83%** | Regex works |
| Assign with @mention | `/assign` | ~30% | English patterns better |
| Task delegate with ID | `/mgrassign` | **25%** | "task 5 rahul ko do" often fails |

### Missing / broken actions

| Action | Expected | Actual | Gap |
|--------|----------|--------|-----|
| "rahul ko kaam do" | `/assign` | `general_chat` | **No Hindi assign regex** |
| Department routing | `/depart_assign` | `general_chat` | **0% — 18/18 failed** |
| Task transfer | `/mgrtransfer` | `general_chat` | **0%** |
| Task reject | `/mgrreject` | `general_chat` | **0%** |
| Self-assign task | `/mgrself` | `general_chat` | **0%** |
| Stock check as manager | `/inventory_status` | Not in manager set | Uses owner path if reached |

### Ambiguous actions

- "raw material order karo" → `/depart_assign` (purchase dept) vs `/purchase_request_create`
- "inventory count karo department mein" → `/depart_assign` vs `/inventory_status`

---

## Worker (Rahul, Vikas, Anil, …)

**Dataset size:** 95 phrases | **Accuracy:** 20.0%

### Supported actions (partial)

| Action | Intent | Audit accuracy |
|--------|--------|----------------|
| Task complete (EN/HI done words) | `/complete` | **67%** |
| General chat | `general_chat` | **100%** |

### Missing / broken actions

| Action | Expected | Actual | Gap |
|--------|----------|--------|-----|
| Present | `/present` | `general_chat` | **0% — 15/15 failed** |
| Absent / leave | `/absent` | `general_chat` | **0%** |
| Report issue | `/issue` | `general_chat` | **0%** |
| View tasks | `/tasks` | `general_chat` | **0%** |
| Update task | `/update` | `general_chat` | **0%** |
| List issues | `/issues` | `general_chat` | **0%** |

### Ambiguous actions

- "machine start ho gayi ab" → could be `/complete` or `/issue` update
- "shift khatam reporting" → `/report` vs `general_chat`

---

## Vendor (ABC Paper, Shree Packaging, Om Chemicals)

**Dataset size:** 56 phrases | **Accuracy:** 96.4% (as NOT_SUPPORTED → `general_chat`)

### Supported actions

**None.** Vendors are master-data records, not WhatsApp users.

### Missing actions (product gap)

| Expected vendor capability | Status |
|---------------------------|--------|
| Confirm order | No intent |
| Send invoice notification | No intent |
| Delivery schedule update | No intent |
| Payment / PO status | No intent |
| Quotation submission | Out of scope |

Vendor phrases correctly fall to `general_chat` — Munshi cannot act on them today.

---

## Cross-role summary

| Role | Supported | Missing | Ambiguous |
|------|-----------|---------|-----------|
| Owner | Discovery, inventory, vendor onboard, PR create | Reports, vendor list, PR status | Discovery vs vendor import |
| Manager | Worker onboard (partial assign) | Hindi assign/transfer/reject/dept | Dept vs procurement verbs |
| Worker | Complete (partial) | Present, absent, issue, tasks | Status vs completion |
| Vendor | — | Entire role | N/A |
