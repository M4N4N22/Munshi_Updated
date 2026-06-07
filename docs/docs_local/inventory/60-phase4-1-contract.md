# Phase 4.1 — Extraction Contract

**Version:** v1  
**Run date:** 2026-06-06

---

## Contract Name

`TaskInventoryExtraction` — structured output for natural-language inventory-linked task messages.

---

## Files

| File | Purpose |
|------|---------|
| `contracts/schemas/task-inventory-extraction.json` | JSON Schema (draft-07) |
| `contracts/task-kinds.json` | Allowed `task_kind` enum catalog |
| `contracts/typescript/index.ts` | `TaskInventoryExtractionContract`, `TASK_KINDS` |
| `contracts/python/models.py` | `TaskInventoryExtraction` Pydantic model |

Mirrored in `backend/contracts/` and `ml/contracts/`.

---

## Payload Shape

All four keys are **required** in every response. Use JSON `null` when value is unknown or confidence is insufficient.

```json
{
  "item_name_or_sku": "cement",
  "quantity": 20,
  "assignee_hint": "Ram",
  "task_kind": "delivery"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item_name_or_sku` | `string \| null` | Item name hint or SKU reference (e.g. `CEMENT_50KG`) |
| `quantity` | `number \| null` | Non-negative quantity; integer or decimal |
| `assignee_hint` | `string \| null` | Worker name hint from message (e.g. `"Ram"`) |
| `task_kind` | `string \| null` | One of `delivery`, `issue`, `inventory_count` |

---

## Task Kinds (`task-kinds.json`)

| Value | Meaning | Example trigger phrases |
|-------|---------|-------------------------|
| `delivery` | Stock-out delivery task | deliver, bhej, dispatch |
| `issue` | Issue materials to worker | issue, de do, dena |
| `inventory_count` | Stock count request | inventory count, ginati, count karwa |

---

## Validation Rules

1. **No extra properties** — `additionalProperties: false`
2. **Quantity** — when present, must be `>= 0`
3. **Strings** — when present, `minLength: 1`
4. **task_kind** — must be one of catalog values or `null`
5. **SKU detection** — uppercase token with underscore (e.g. `CEMENT_50KG`); avoids false positives on acronyms like `PVC`

---

## Serialization Rules

| Rule | Behaviour |
|------|-----------|
| Always emit four keys | Pydantic `model_dump()` normalizes output |
| Unknown fields | `null`, never omitted |
| Assignee hint | Title case (`Ram`, not `ram`) |
| Item name | Lowercase common nouns; preserve SKU casing; singularize unit words (`pipes` → `pipe`) |
| No hallucination | Extractor returns `null` rather than guessing |

---

## API Endpoint

```
POST /extract/task-inventory?message=<url-encoded text>
```

**Response:** `TaskInventoryExtraction` (flat JSON, no wrapper)

---

## Examples

### Delivery

**Input:** `Ram ko 20 cement bags deliver kar do`

```json
{
  "item_name_or_sku": "cement",
  "quantity": 20,
  "assignee_hint": "Ram",
  "task_kind": "delivery"
}
```

### Issue

**Input:** `Shyam ko 5 PVC pipes issue karo`

```json
{
  "item_name_or_sku": "PVC pipe",
  "quantity": 5,
  "assignee_hint": "Shyam",
  "task_kind": "issue"
}
```

### Inventory count

**Input:** `Inventory count karwa do`

```json
{
  "item_name_or_sku": null,
  "quantity": null,
  "assignee_hint": null,
  "task_kind": "inventory_count"
}
```

---

## Backward Compatibility

| System | Impact |
|--------|--------|
| `/classify` | None — separate endpoint |
| `/parse` | None — document parsers unchanged |
| Document extraction schemas | None — new schema file only |
| Backend services | None — no consumer wired yet |

---

*End of contract specification.*
