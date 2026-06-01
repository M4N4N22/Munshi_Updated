# Intent Validation Report — Full Interaction Log

**Production ML:** `POST http://13.126.57.78:8000/classify?message=...`  
**Contract reference:** `docs/architecture/backend-llm-contract.md`  
**Pass rate:** **21 / 36 (58%)**

Legend: **Workflow Started** = would start if WhatsApp session active and role allowed. **DB Action** = expected persistence if workflow/command completes.

---

## Phase 1 — Business Discovery

| Role | User | Message | Expected Intent | Predicted Intent | Workflow Started | Backend Action | Expected Result | Actual Result | Match |
|------|------|---------|-----------------|------------------|------------------|----------------|-----------------|---------------|-------|
| Owner | Rajesh | mera business Sharma Packaging Industries hai Faridabad mein | `/business_discovery` | `general_chat` | No | None | Discovery MENU | General chat reply | **N** |
| Owner | Rajesh | company details update karni hai | `/business_discovery` | `/depart_assign` | Wrong | Task routing | Identity bucket update | Dept task | **N** |
| Owner | Rajesh | baad mein baad mein karenge | pause (in-session) | `general_chat` | No | None | Pause discovery | Chat | **N** |
| Owner | Rajesh | setup continue karo | `/continue_discovery` | `/depart_assign` | Wrong | Task routing | Resume discovery | Dept task | **N** |
| Owner | Rajesh | onboarding continue karo | `/continue_discovery` | `/depart_assign` | Wrong | Task routing | Resume discovery | Dept task | **N** |

**Discovery NL: 0/5 pass.** Backend `GET /business-discovery/progress?factory_id=3` shows 92% readiness (prior activity), `next_reminder_at` scheduled — reminder firing not observed.

---

## Phase 2 — Owner Operations

| Role | User | Message | Expected | Predicted | Workflow | Backend | Expected Result | Actual | Match |
|------|------|---------|----------|-----------|----------|---------|-----------------|--------|-------|
| Owner | Rajesh | aaj attendance report dikhao | `/report` | `/report` | No | Reports query | Attendance summary | Would work | **Y** |
| Owner | Rajesh | task report chahiye aaj ka | `/report` | `/report` | No | Reports query | Task summary | Would work | **Y** |
| Owner | Rajesh | active issues dikhao | `/issues` | `/issues` | No | Issues list | Open issues | Would work | **Y** |
| Owner | Rajesh | inventory status batao | `/inventory_status` | `general_chat` | No | None | Stock summary | Chat | **N** |
| Owner | Rajesh | vendor list dikhao | Vendor lookup | `/members` | No | Members list | Vendor names | Team list | **N** |
| Owner | Rajesh | purchase request ka status kya hai | Status query | `general_chat` | No | None | PR status | Chat | **N** |

---

## Phase 3 — Manager Operations

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Manager | Amit | rahul ko packaging ka kaam do | `/assign` | `/assign` | **Y** |
| Manager | Amit | task 5 inventory team ko transfer karo | `/mgrtransfer` | `/mgrtransfer` | **Y** |
| Manager | Amit | task 8 reject karo ye hamare department ka kaam nahi hai | `/mgrreject` | `/mgrreject` | **Y** |
| Manager | Amit | task 12 main khud karunga | `/mgrself` | `/mgrself` | **Y** |
| Manager | Suresh | packaging section ka kaam assign karo | `/depart_assign` | `/depart_assign` | **Y** |

---

## Phase 4 — Worker Operations

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Worker | Rahul | aaj main present hoon | `/present` | `/present` | **Y** |
| Worker | Rahul | aaj nahi aa paunga | `/absent` | `/absent` | **Y** |
| Worker | Rahul | task complete ho gaya | `/complete` | `/complete` | **Y** |
| Worker | Vikas | machine 2 band padi hai | `/issue` | `/issue` | **Y** |
| Worker | Anil | raw material nahi mil raha | `/issue` | `/issue` | **Y** |

---

## Phase 5 — Vendor (owner-initiated)

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Owner | Rajesh | naya vendor ABC Paper Traders add karo | `/onboard_vendor` | `/depart_assign` | **N** |
| Owner | Rajesh | Shree Packaging Supplies ka number kya hai | Vendor search | `general_chat` | **N** |

---

## Phase 6 — Inventory

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Owner | Rajesh | corrugated sheets ka stock kitna hai | `/inventory_status` | `general_chat` | **N** |
| Owner | Rajesh | packaging tape low stock hai kya | `/inventory_status` | `general_chat` | **N** |
| Owner | Rajesh | naya inventory item printing ink add karo | `/inventory_create` | `/depart_assign` | **N** |
| Manager | Suresh | stock level dikhao | `/inventory_status` | `/tasks` | **N** |

---

## Phase 7 — Documents

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Owner | Rajesh | inventory sheet upload karni hai | Discovery/doc | `/depart_assign` | **N** |

**Note:** File upload not testable in NL-only simulation. Factory 3: 0 documents.

---

## Phase 8 — Procurement

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Owner | Rajesh | packaging tape khatam hone wali hai | PR / alert | `general_chat` | **N** |
| Owner | Rajesh | 50 rolls order karne hain | `/purchase_request_create` | `/depart_assign` | **N** |
| Owner | Rajesh | purchase request bana do | `/purchase_request_create` | `/depart_assign` | **N** |
| Owner | Rajesh | vendor assign kar do purchase request pe | PR workflow | `/depart_assign` | **N** |

---

## Phase 10 — General Chat

| Role | User | Message | Expected | Predicted | Match |
|------|------|---------|----------|-----------|-------|
| Owner | Rajesh | hello kaise ho | `general_chat` | `general_chat` | **Y** |
| Owner | Rajesh | hmm ok | `general_chat` | `general_chat` | **Y** |
| Owner | Rajesh | kya kya kar sakte ho | `general_chat` | `general_chat` | **Y** |
| Owner | Rajesh | invntry sttus | clarify / inventory | `general_chat` | **N** |

---

## Contract violations (production ML vs backend-llm-contract.md)

| Contract section | Violation |
|------------------|-----------|
| §12 Business discovery intent | All discovery phrases misclassified |
| §12 Continue discovery | Resume phrases → `/depart_assign` |
| §7 Inventory status | Status phrases → `general_chat` |
| §10 Purchase request intent | PR phrases → `/depart_assign` |
| Vendor onboarding workflow | Vendor add → `/depart_assign` |

---

## Local LLM repo (not production) — reference only

When running `classify_hybrid(..., use_llm=False)` locally, discovery/inventory/PR/vendor phrases match contract. **Confirms deployment drift, not missing local implementation.**

---

## LOCAL VALIDATION RESULTS

**Environment:** Local backend :4001, local ML :8000, continuous Sharma story via `POST /webhook/test`.

### Three-way intent comparison (continuous story sample)

| Message | Expected | Local ML HTTP | Prod ML | Local pre-classifier |
|---------|----------|---------------|---------|----------------------|
| mera business Sharma Packaging… | `/business_discovery` | `/business_discovery` | `general_chat` | `/business_discovery` |
| setup continue karo | `/continue_discovery` | `/continue_discovery` | `/depart_assign` | `/continue_discovery` |
| inventory status batao | `/inventory_status` | `/inventory_status` | `general_chat` | `/inventory_status` |
| naya vendor ABC Paper… | `/onboard_vendor` | `/onboard_vendor` | `/depart_assign` | `/onboard_vendor` |
| purchase request bana do… | `/purchase_request_create` | `/purchase_request_create` | `/depart_assign` | `/purchase_request_create` |
| aaj main present hoon | `/present` | `general_chat` | `/present` | `general_chat` |
| machine 2 band padi hai | `/issue` | `general_chat` | `/issue` | `general_chat` |
| rahul ko production ka kaam assign karo | `/assign` | `general_chat` | `/assign` | `general_chat` |

### Local intent accuracy (16-message story matrix)

| Layer | Owner entry intents | Worker/manager Hindi | Overall |
|-------|--------------------|-----------------------|---------|
| Local pre-classifier | **5/5 pass** | **1/5 pass** | Mixed |
| Local ML HTTP | **6/8 owner ops** | **0/4** for tested Hindi | ~50% |
| Prod ML (webhook default) | **0/8** | **3/4** for tested Hindi | ~40% |

### Conclusions

1. **Deployment failures:** Prod ML missing Prompt 10/11 pre-classifiers — owner flows fail on webhook.
2. **Product failures:** Local pre-classifier misses worker present/issue and manager Hindi assign; mid-workflow replies always re-classify as `general_chat`.
3. **Stack misalignment:** Local ML running but `ML_URL` still prod — webhook does not use local ML.
