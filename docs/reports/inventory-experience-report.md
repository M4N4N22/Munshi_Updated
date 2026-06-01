# Inventory Experience Report — Sharma Packaging SKUs

**Rating: 3 / 10**

---

## Target inventory (simulation brief)

- Corrugated Sheets
- Packaging Tape
- Printing Ink
- Glue

**Factory 3 state:** **0 inventory items** (API `GET /inventory/items?factory_id=3`). Low-stock list empty. Discovery shows inventory bucket **67%** from non-item signals (categories/locations/document boosts from prior dev activity).

---

## Natural language tests (production ML)

| Message | Expected | Prod ML | Result |
|---------|----------|---------|--------|
| "inventory status batao" | `/inventory_status` | `general_chat` | **FAIL** |
| "corrugated sheets ka stock kitna hai" | `/inventory_status` | `general_chat` | **FAIL** |
| "packaging tape low stock hai kya" | `/inventory_status` | `general_chat` | **FAIL** |
| "stock level dikhao" | `/inventory_status` | `/tasks` | **FAIL** |
| "naya inventory item printing ink add karo" | `/inventory_create` | `/depart_assign` | **FAIL** |
| "invntry sttus" (misspelling) | `/inventory_status` or clarify | `general_chat` | **FAIL** |

**0/6 inventory NL intents passed** on production ML.

---

## Local LLM (not deployed) comparison

Local pre-classifier correctly maps:

- "inventory status batao" → `/inventory_status`
- "stock level dikhao" → `/inventory_status`
- "naya inventory item printing ink add karo" → would need inventory_create regex (partial)

Gap is **deployment**, not missing backend workflow.

---

## Backend capabilities (not reachable via NL today)

- Inventory create workflow (`INVENTORY_CREATE`)
- Inventory status command handler
- Categories, locations, items CRUD
- Stock in/out/adjustment transactions
- Low-stock suggestions for procurement

---

## Friction points

1. Owner/manager cannot ask "kitna stock hai" and get an answer.
2. Empty inventory on test factory — even if intent worked, response would be empty without seed data.
3. Low-stock → procurement chain untested in NL ("packaging tape khatam hone wali hai" → `general_chat`).
4. Misspellings not tolerated.
5. Inventory creation misrouted to department assignment — confusing error path.

---

## Rating rationale

**3/10** — Backend inventory module is implemented; **customer NL path is broken** on production ML. Empty test data adds secondary friction.

---

## LOCAL VALIDATION RESULTS

| Message | Local ML | Prod ML (webhook) | Items after story |
|---------|----------|-------------------|-------------------|
| naya inventory item corrugated sheets add karo | `/inventory_create` | `/depart_assign` | **0** |
| packaging tape ka stock kitna hai | `/inventory_status` | `general_chat` | **0** |

Local ML classifies both correctly. Webhook path (prod ML) fails. **No inventory items created** — workflow did not complete or was misrouted.

Sharma SKUs (Corrugated Sheets, Packaging Tape, Printing Ink, Glue) not in DB.

### Deployment vs product

| Issue | Type |
|-------|------|
| Prod ML blocks inventory NL | **Deployment** |
| Local ML correct but webhook uses prod | **Stack config** (ML_URL) |
| 0 items after inventory_create intent on local | **Product/E2E** — workflow completion not verified; webhook returns opaque `ok` |

### Local inventory rating: **5/10**

Intent layer fixed locally; no stock created in story; document-import path not tested (NL-only constraint).
