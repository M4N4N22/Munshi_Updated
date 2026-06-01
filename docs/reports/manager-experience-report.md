# Manager Experience Report — Amit Verma & Suresh Gupta

**Rating: 7 / 10**

---

## Production Manager — Amit Verma

| Message | Expected | Prod ML | Result |
|---------|----------|---------|--------|
| "rahul ko packaging ka kaam do" | `/assign` | `/assign` | **PASS** |
| "task 5 inventory team ko transfer karo" | `/mgrtransfer` | `/mgrtransfer` | **PASS** |
| "task 8 reject karo ye hamare department ka kaam nahi hai" | `/mgrreject` | `/mgrreject` | **PASS** |
| "task 12 main khud karunga" | `/mgrself` | `/mgrself` | **PASS** |

Hinglish task management phrases classify correctly. This matches how a production manager would naturally speak on the shop floor.

---

## Inventory Manager — Suresh Gupta

| Message | Expected | Prod ML | Result |
|---------|----------|---------|--------|
| "packaging section ka kaam assign karo" | `/depart_assign` | `/depart_assign` | **PASS** |
| "stock level dikhao" | `/inventory_status` | `/tasks` | **FAIL** |

Department assignment works. **Inventory-specific manager queries fail** — routed to tasks instead of stock.

---

## Workflow execution

End-to-end WhatsApp workflow steps were **not executed** in this QA session (no live session). Intent layer — the entry point for managers — is **strong for core task ops**, weak for inventory oversight.

---

## Friction points

1. Inventory manager cannot ask "stock level dikhao" and reach inventory status.
2. Rejection phrase requires task ID in message — natural but brittle if ID unknown.
3. No confirmation that "inventory team" maps to correct department slug in transfer.
4. Managers blocked from discovery/procurement workflows is correct by role — but no NL path to delegate PR to owner.

---

## Rating rationale

**7/10** — Task assignment, transfer, reject, self-assign work in realistic Hinglish. Inventory manager stock queries fail. Would feel usable for daily task routing, incomplete for inventory leadership.

---

## LOCAL VALIDATION RESULTS

**Story tested:** Amit assigns production work; Suresh routes packaging to inventory team.

| Message | Local ML (HTTP) | Prod ML (webhook path) | Webhook result |
|---------|-----------------|------------------------|----------------|
| rahul ko production ka kaam assign karo | `general_chat` | `/assign` | `error` |
| packaging section ka kaam inventory team ko do | `general_chat` | `/mgrtransfer` | `ok` |
| anmol ko tape counting ka kaam do | `general_chat` | (not re-tested) | `ok` |

**Local pre-classifier:** Hindi assign phrases with person names often return `None` → `general_chat` — **product gap on local code**, not deployment.

**Prod ML via webhook:** Transfer phrase worked (`ok`); named assign to "rahul" failed (`error`) — worker not in factory under that name.

### Deployment vs product

| Issue | Type |
|-------|------|
| Prod ML routes some manager ops correctly | Deployment has *better* worker/manager Hindi for some phrases than local pre-classifier |
| Local pre-classifier misses "rahul ko … assign" | **Product** — needs Hindi assign patterns |
| Assign to non-existent worker "rahul" | **Product/data** — Sharma workers not seeded |

### Local manager rating: **5/10**

Prod-path webhook partially works for transfers. Local ML weaker than prod for manager Hindi assign. Full Sharma team not in DB.
