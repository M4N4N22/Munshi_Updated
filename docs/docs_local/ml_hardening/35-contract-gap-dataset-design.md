# Phase 3F — Contract Gap Test Design

**Source:** `25-ml-contract-alignment-audit.md`  
**Status:** 5 commands in backend but **not** in `intent-types.json`  
**Approach:** Design eval now; execute after contract alignment approved.

---

## Gap commands

| Command | Capability | Contract status | Eval priority |
|---------|------------|-----------------|---------------|
| `/assign_delivery` | Stock-Linked Ops | Missing | Critical |
| `/task_inventory_nl` | Stock-Linked Ops | Missing | Critical |
| `/inventory_import_csv` | Inventory Data Entry | Missing | Critical |
| `/suggestion_approve` | Document Processing | Missing | High |
| `/cancel` | Platform Control | Missing | High |

---

## Provisional eval schema

Until contract updated, eval cases use:

```json
{
  "expected_intent": "/assign_delivery",
  "contract_status": "provisional",
  "contract_version_required": "v1.1"
}
```

**Phase 4 gate:** Benchmark blocked for gap intents until `intent-types.json` includes all 5.

---

## Per-command test design

### `/assign_delivery`

| Slice | Cases | Description |
|-------|------:|-------------|
| Slash canonical | 8 | `/assign_delivery @w SKU qty` |
| NL structured | 10 | "assign delivery @ram BOLT-8 50" |
| vs assign negative | 10 | Same without SKU |
| vs task_inventory_nl | 8 | NL prefers task_inventory_nl |
| Role invalid | 5 | Worker attempts |
| **Subtotal** | **41** | |

**Slots to verify:** worker_slug, sku, quantity

---

### `/task_inventory_nl`

| Slice | Cases | Description |
|-------|------:|-------------|
| Delivery NL | 12 | "Ram ko 50 bolt bhejo" |
| Count NL | 8 | "store mein count karo" |
| Issue-stock NL | 6 | "line 2 ko material issue" |
| vs assign negative | 10 | No inventory signals |
| Disambiguation entry | 8 | Ambiguous SKU/worker — expect workflow |
| **Subtotal** | **44** | |

**Note:** Eval may score "workflow_start" as pass equivalent to intent.

---

### `/inventory_import_csv`

| Slice | Cases | Description |
|-------|------:|-------------|
| Explicit slash | 8 | `/inventory_import_csv` |
| NL import | 12 | "CSV se import", "Zoho export upload" |
| vs create negative | 10 | "ek item add" |
| vs discovery negative | 8 | "import inventory" business setup |
| vs status negative | 6 | "stock kitna" |
| Post-command CSV attach | 6 | Session — pairs with SESS-* |
| **Subtotal** | **50** | |

---

### `/suggestion_approve`

| Slice | Cases | Description |
|-------|------:|-------------|
| Workflow auto-entry | 8 | After document upload |
| YES/NO responses | 8 | In CONFIRM step — session not classify |
| Explicit slash | 4 | `/suggestion_approve` |
| vs inventory create | 5 | Invoice import suggestion |
| **Subtotal** | **25** | |

**Split:** 50% session-handler eval (34-session), 50% intent eval.

---

### `/cancel`

| Slice | Cases | Description |
|-------|------:|-------------|
| Slash `/cancel` | 10 | Active workflow |
| Text `cancel` | 8 | Import + workflow |
| vs complete negative | 5 | "task cancel" meaning reject? |
| No session | 5 | Graceful no-op |
| **Subtotal** | **28** | |

---

## Contract alignment test procedure (future)

1. Add 5 intents to `intent-types.json` + TS mirrors + `bot_engine.py` passthrough.
2. Run `contract-drift.spec.ts` — must pass.
3. Re-label provisional cases → `contract_status: "aligned"`.
4. Include in Phase 4 benchmark suite.

---

## Discovery phrase conflict cases

| Phrase | Wrong route | Correct route | Cases |
|--------|-------------|---------------|------:|
| "import inventory" | business_discovery | inventory_import_csv | 8 |
| "import vendors" | business_discovery | onboard_vendor | 5 |

---

## Gap dataset total

| Command | Cases |
|---------|------:|
| assign_delivery | 41 |
| task_inventory_nl | 44 |
| inventory_import_csv | 50 |
| suggestion_approve | 25 |
| cancel | 28 |
| discovery conflicts | 13 |
| **Total** | **~201** |

---

## Readiness checklist (pre-benchmark)

- [ ] All 5 intents in contract
- [ ] bot_engine passthrough aligned
- [ ] Provisional cases re-tagged
- [ ] Session split cases linked (import, suggestion)
