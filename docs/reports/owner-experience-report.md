# Owner Experience Report — Rajesh Sharma (Owner)

**Rating: 4 / 10**

---

## What was tested

Natural-language utterances an owner would send on WhatsApp, classified via production ML (`ML_URL`).

| Scenario | Example message | Expected | Actual (prod ML) | Owner would feel… |
|----------|-----------------|----------|------------------|-------------------|
| Introduce business | "mera business Sharma Packaging Industries hai Faridabad mein" | Discovery workflow | `general_chat` | Confused — Munshi chats instead of collecting business info |
| Resume setup | "setup continue karo" | Continue discovery | `/depart_assign` | Wrong — random department task created |
| Attendance report | "aaj attendance report dikhao" | Report | `/report` | OK |
| Task report | "task report chahiye aaj ka" | Report | `/report` | OK |
| Issues | "active issues dikhao" | Issues list | `/issues` | OK |
| Inventory status | "inventory status batao" | Stock summary | `general_chat` | Frustrated — no stock answer |
| Vendor list | "vendor list dikhao" | Vendor info | `/members` | Misleading — shows team members, not vendors |
| PR status | "purchase request ka status kya hai" | Status answer | `general_chat` | No answer |
| Add vendor | "naya vendor ABC Paper Traders add karo" | Vendor onboarding | `/depart_assign` | Broken — vendor never added |
| Low stock / PR | "purchase request bana do" | PR workflow | `/depart_assign` | Broken |
| Greeting | "hello kaise ho" | Friendly chat | `general_chat` | OK |

---

## Discovery progress (read-only check)

`GET /business-discovery/progress?factory_id=3`:

- Overall readiness: **92%**
- Status: **ACTIVE**
- Resumable: **true**

Backend discovery APIs work. **Owner cannot reach them via natural language** on current production ML.

---

## Positive signals

- Report and issue intents route correctly.
- Discovery does not block other features (design goal met at architecture level).
- Backend `/reports` returns attendance/tasks/issues summary for today.

---

## Friction points

1. **Discovery invisible in chat** — owner introduction phrases fall through to general chat.
2. **Inventory & procurement dead on arrival** — core owner ops misclassified.
3. **"Vendor list" → team members** — semantic mismatch; owner expects suppliers.
4. **No guided fallback** when intent is wrong (general chat may not explain what Munshi can do).
5. **Robotic contract** — owner must guess phrasing; no Sharma-specific context.

---

## Rating rationale

Reports and issues work. Discovery backend exists but is unreachable in NL. Inventory, vendors, and procurement — primary owner concerns for a packaging factory — **fail intent classification on production ML**.

**4/10** — promising backend, broken front door for owners.

---

## LOCAL VALIDATION RESULTS

**Date:** 2026-06-01  
**Backend:** `http://localhost:4001` (running)  
**Local ML:** `http://127.0.0.1:8000` (running after dependency install)  
**Database:** Remote Postgres via `.env.local` (healthy, migrations 001–007 applied)  
**E2E path:** `POST /webhook/test` with factory 3 role-mapped phones  
**Important:** Backend `ML_URL` still points to **production ML** — webhook E2E does **not** use local ML unless env is changed (not modified in this sprint).

### Continuous story outcome (Rajesh / Sharma Packaging)

| Step | Message | Local ML intent | Prod ML (webhook path) | DB impact |
|------|---------|-----------------|------------------------|-----------|
| Introduce business | mera business Sharma Packaging… | `/business_discovery` | `general_chat` | Discovery profile unchanged |
| Continue setup | setup continue karo | `/continue_discovery` | `/depart_assign` | No discovery resume |
| Inventory status | inventory status batao | `/inventory_status` | `general_chat` | 0 items still |
| Add vendor | naya vendor ABC Paper Traders… | `/onboard_vendor` | `/depart_assign` | Still 1 vendor |
| Add inventory | naya inventory item corrugated sheets… | `/inventory_create` | `/depart_assign` | Still 0 items |
| Purchase request | purchase request bana do… | `/purchase_request_create` | `/depart_assign` | Still 6 PRs (no new) |

### Local vs production split

| Failure type | Evidence |
|--------------|----------|
| **Deployment-caused** | Owner entry intents (discovery, inventory status, vendor onboard, PR create) pass **local ML** pre-classifier but fail on **prod ML** used by webhook |
| **Product-caused** | Mid-workflow replies (`1`, business name, `pause`) → `general_chat` even on local ML; discovery profile `last_activity_at` unchanged after story |
| **Stack misalignment** | Local ML running on :8000 but backend webhook still calls prod ML |

### Local owner rating: **6/10**

Local ML fixes the owner **entry** intents. Webhook path (prod ML) still blocks real owner flows. Workflow continuation and DB mutations for Sharma scenario did not complete.
