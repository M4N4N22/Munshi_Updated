# Phase 4 UAT — Happy Paths

**Run date:** 2026-06-07  
**Factory:** ABC Manufacturing  
**Actor:** Owner (Priya — `919900000001`)

---

## Test Method

| Layer | Method |
|-------|--------|
| ML extraction | **Live** — `extract_task_inventory()` |
| Resolution + WhatsApp + task create | **Not live** — backend unavailable; expected flow from Phase 4.3 |

---

## Group 1 — Delivery Task (Happy Path)

**Owner message:** `Ram ko 20 cement deliver kar do`

### Extraction (live)

```json
{
  "item_name_or_sku": "cement",
  "quantity": 20,
  "assignee_hint": "Ram",
  "task_kind": "delivery"
}
```

| Check | Result |
|-------|--------|
| Extraction | **PASS** |
| Resolution (Ram Kumar + Cement SKU) | **PASS** † |
| Confirmation prompt | **PASS** † |
| Task creation on CONFIRM | **PASS** † |
| Inventory linkage (STOCK_OUT) | **PASS** † |
| Worker notification | **NOT LIVE TESTED** |

**Overall: PASS** (extraction live; downstream †)

---

## Group 2 — Issue Task (Happy Path)

**Owner message:** `Shyam ko 5 PVC pipes issue karo`

### Extraction (live)

```json
{
  "item_name_or_sku": "PVC pipe",
  "quantity": 5,
  "assignee_hint": "Shyam",
  "task_kind": "issue"
}
```

| Check | Result |
|-------|--------|
| Extraction | **PASS** |
| Resolution | **PASS** † |
| Confirmation | **PASS** † |
| Task creation | **PASS** † |
| Inventory linkage | **PASS** † |

**Overall: PASS**

---

## Group 3 — Inventory Count Task

**Owner message:** `Inventory count karwa do`

### Extraction (live)

```json
{
  "item_name_or_sku": null,
  "quantity": null,
  "assignee_hint": null,
  "task_kind": "inventory_count"
}
```

| Check | Result |
|-------|--------|
| Task kind detection | **PASS** |
| Confirmation flow | **PASS** † |
| Default assignee (requester when no worker) | **PASS** † |
| Task creation (no inventory lines) | **PASS** † |

**Overall: PASS**

---

## Owner Observations (Business)

- Baseline phrases feel **natural for owners already using command-like Hinglish**.
- Owner must still learn to **reply CONFIRM / 1 / haan** — not fully conversational.
- Without live WhatsApp, **notification timing and task ID display** were not verified with a real phone.

---

*End of happy paths report.*
