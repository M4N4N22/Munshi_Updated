# Backend ↔ LLM Contract

**Status:** Source of truth for cross-repository integration  
**Date:** 2026-05-30  
**Rule:** LLM produces structured output only. Backend executes all business actions.

---

## Architecture boundary

```mermaid
flowchart LR
  User[User Message / Document]
  LLM[LLM Service]
  BE[Munshi Backend]
  DB[(Database)]

  User --> LLM
  LLM -->|JSON contracts only| BE
  BE --> DB
  LLM -.->|NEVER| DB
```

---

## 1. Intent classification contract

### Transport

```
POST {ML_URL}/classify?message={url_encoded_text}
Content-Type: application/json (body empty)
```

Backend caller: `WhatsAppService.handleIncomingMessage`  
Default `ML_URL`: `http://localhost:8000`

### Response (LLM publishes)

```json
{
  "intent": "/assign",
  "id": 12,
  "worker_slug": "@rahul",
  "depart_slug": null,
  "deadline": "2026-05-31T17:00:00",
  "message": null
}
```

### Response (backend normalizes via `parseMlClassifyResponse`)

Backend accepts root object **or** nested `{ data: { ... } }`.

| Field | Type | Backend usage |
|-------|------|---------------|
| `intent` | string | Command routing (`/assign`, `general_chat`, workflow starts) |
| `id` | number \| string \| null | Task/issue id for `/complete`, `/mgr*`, etc. |
| `worker_slug` | string \| null | Assignee for `/assign`, `/mgrassign` |
| `depart_slug` | string \| null | Department for `/depart_assign`, `/mgrtransfer` |
| `reject_reason` | string \| null | **Expected** for `/mgrreject` — see gap note |
| `deadline` | ISO string \| null | Task deadline |
| `date` | string | Report date for `/report` |
| `datetime` | string | Alternative deadline field |
| `time` | string | Time component |
| `message` | string \| null | Shown directly if `general_chat` |

**Aliases accepted by backend:**

- `intent` ← `command`
- `depart_slug` ← `department_slug`, `department`
- `reject_reason` ← `reason`

### Workflow start intents

If ML returns these intents, backend starts workflow **before** `processCommand`:

| Intent | Workflow |
|--------|----------|
| `/onboard_vendor` | `ONBOARD_VENDOR` |
| `/onboard_worker` | `ONBOARD_WORKER` |
| `/inventory_create` | `INVENTORY_CREATE` |
| `/suggestion_approve` | Not started from free-text ML path |

### Example: vendor onboarding intent

**User message:** `"Add vendor ABC Traders"`

**LLM should return:**

```json
{
  "intent": "/onboard_vendor",
  "id": null,
  "worker_slug": null,
  "depart_slug": null,
  "deadline": null,
  "message": null
}
```

**Backend action:** Start vendor workflow — **does not create vendor**.

### Example: natural language assign

**User message:** `"@rahul invoice bhejdo kal tak"`

```json
{
  "intent": "/assign",
  "id": null,
  "worker_slug": "@rahul",
  "depart_slug": null,
  "deadline": "2026-05-31",
  "message": null
}
```

**Backend action:** `TasksService.assignToUser`

### Example: general chat

```json
{
  "intent": "general_chat",
  "id": null,
  "worker_slug": null,
  "depart_slug": null,
  "deadline": null,
  "message": "Main tasks aur attendance mein help kar sakta hoon. /help type karo."
}
```

**Backend action:** Send `message` field to user (no CRUD).

### Example: manager reject

```json
{
  "intent": "/mgrreject",
  "id": 12,
  "worker_slug": null,
  "depart_slug": null,
  "deadline": null,
  "reject_reason": "not our department",
  "message": null
}
```

**Gap:** LLM FastAPI schema currently **drops** `reject_reason` — backend expects it.

---

## 2. WhatsApp message conversion contract

### Transport

```
POST {ML_URL}/convert?message={url_encoded_wa_text}
```

### Response

```json
{
  "message": "Task assigned: Clean warehouse. It has been assigned to Anil and is due today."
}
```

**Usage today:** Optional — not wired in main WhatsApp inbound path. Available for future UX improvements.

---

## 3. Document parsing contract

### Boundary

| LLM responsibility | Backend responsibility |
|------------------|------------------------|
| Parse file → JSON | Store metadata, validate, suggest, approve, execute |
| Detect document type | `DocumentRegistry` contracts |
| Extract fields | `DocumentExtractionContractService` validation |

### Transport (LLM → Backend)

LLM **does not** write to DB. It POSTs to backend REST:

```
POST /documents/{document_id}/extractions
```

### Request body (backend expects)

```json
{
  "factory_id": 1,
  "document_type_detected": "INVENTORY_IMPORT",
  "extraction_version": "v1",
  "payload": {
    "document_type": "INVENTORY_IMPORT",
    "items": [
      { "name": "Cement", "quantity": 500, "sku": "CEM001", "unit": "bags" },
      { "name": "Steel Rod", "quantity": 200 }
    ]
  }
}
```

### Response (backend returns)

```json
{
  "id": 5,
  "document_id": 1,
  "factory_id": 1,
  "extraction_version": "v1",
  "document_type_detected": "INVENTORY_IMPORT",
  "payload": { "...normalized..." },
  "created_at": "2026-05-30T12:00:00.000Z"
}
```

### Document type: PURCHASE_INVOICE (future)

**LLM extraction output:**

```json
{
  "document_type": "PURCHASE_INVOICE",
  "vendor_name": "ABC Steel",
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-05-15",
  "items": [
    {
      "item_name": "Steel Rod",
      "name": "Steel Rod",
      "quantity": 100,
      "unit_price": 50,
      "total": 5000
    }
  ]
}
```

**Backend suggested actions (not yet fully executable):** `STOCK_IN`, `CREATE_VENDOR`

### Document type: GOODS_RECEIPT (future)

```json
{
  "document_type": "GOODS_RECEIPT",
  "vendor_name": "ABC Steel",
  "items": [
    { "name": "Steel Rod", "quantity": 100 }
  ]
}
```

### Document type: STOCK_REGISTER

```json
{
  "document_type": "STOCK_REGISTER",
  "items": [
    { "name": "Cement", "quantity": 450 },
    { "name": "Aluminium Sheet", "quantity": 25 }
  ]
}
```

---

## 4. Workflow contracts

### LLM → Backend (intent triggers workflow)

LLM returns slash intent; backend creates `workflow_sessions` row.

**LLM must NOT:**

- Collect workflow step answers on behalf of backend
- Submit vendor/inventory fields directly

### Backend → User (workflow prompts)

Backend sends WhatsApp prompts; user replies; backend handler validates.

**LLM role in active workflow:** None (messages bypass ML).

### Suggestion approval workflow

**Backend REST starts session:**

```json
POST /documents/suggestions/7/approve-workflow
{
  "factory_id": 1,
  "phone_number": "919876543210"
}
```

**Response:**

```json
{
  "message": "We detected the following inventory:\n\n• Cement — 500\n\nIs this your inventory? Reply YES or NO.",
  "workflow_session_id": 42
}
```

**User replies:** `YES` or `NO` — backend executes; LLM not involved.

---

## 5. Suggestion contracts

### Backend generates (from extraction)

```json
{
  "id": 7,
  "document_id": 1,
  "factory_id": 1,
  "extraction_id": 5,
  "suggestion_type": "INITIAL_INVENTORY_IMPORT",
  "status": "PENDING",
  "payload": {
    "summary": "We detected the following inventory:\n\n• Cement — 500\n\nIs this your inventory? Reply YES or NO.",
    "items": [{ "name": "Cement", "quantity": 500 }],
    "document_id": 1,
    "extraction_id": 5
  }
}
```

### Suggestion types

| Type | LLM involvement | Backend on YES |
|------|-----------------|----------------|
| `INITIAL_INVENTORY_IMPORT` | Extraction only | Create items + STOCK_IN |
| `NEW_INVENTORY_ITEM` | Extraction only | Create item (+ optional stock-in) |
| `STOCK_IN` | Extraction only | `recordStockIn` |
| `CREATE_VENDOR` | Future extraction | Not executable |
| `CREATE_LEDGER_ENTRY` | Future extraction | Not executable |

---

## 6. Inventory contracts

### LLM must NOT call

- `POST /inventory/items`
- `POST /inventory/transactions/stock-in`

### LLM provides (via document extraction)

Item lines only:

```json
{ "name": "Cement", "quantity": 500, "sku": "CEM001", "unit": "bags" }
```

### Backend executes

After user approval → `InventoryService` + `InventoryTransactionService`

---

## 7. Vendor contracts

### Workflow path

LLM intent: `/onboard_vendor` → backend collects fields step-by-step

### Document path (future)

LLM extraction:

```json
{
  "document_type": "PURCHASE_INVOICE",
  "vendor_name": "ABC Steel"
}
```

Backend suggestion: `CREATE_VENDOR` (future) → approval → `VendorService.createVendor`

---

## 8. Future procurement contracts

### Purchase request extraction (not implemented)

```json
{
  "document_type": "PURCHASE_INVOICE",
  "vendor_name": "ABC Steel",
  "items": [{ "item_name": "Steel Rod", "quantity": 100, "unit_price": 50 }]
}
```

**Expected backend suggestions:**

- `CREATE_VENDOR` (if vendor unknown)
- `STOCK_IN` (on goods receipt)
- Future: `CREATE_PURCHASE_REQUEST`

### Backend REST (skeleton exists)

```
POST /purchase-requests
POST /approvals
```

LLM must POST extractions only — not these endpoints directly.

---

## 9. Future ledger contracts

### LEDGER_EXPORT extraction (registered, not executable)

```json
{
  "document_type": "LEDGER_EXPORT",
  "entries": [
    { "description": "Rent payment", "amount": -15000, "date": "2026-05-01" }
  ]
}
```

**Expected suggestion:** `CREATE_LEDGER_ENTRY` (future module)

### BANK_STATEMENT extraction

```json
{
  "document_type": "BANK_STATEMENT",
  "transactions": [
    { "date": "2026-05-10", "description": "NEFT ABC Steel", "amount": -50000 }
  ]
}
```

---

## 10. Future account aggregator contracts

**Not implemented.** Proposed pattern:

```json
{
  "document_type": "BANK_STATEMENT",
  "source": "ACCOUNT_AGGREGATOR",
  "account_id": "xxxx",
  "transactions": []
}
```

Backend would suggest reconciliation entries — LLM extracts only.

---

## Contract versioning

| Contract | Version | Location |
|----------|---------|----------|
| Extraction payload | `v1` | `EXTRACTION_CONTRACT_VERSION` |
| ML classify | implicit 9.0.0 | ML `main.py` version string |
| Document registry | extensible enums | `documents.constants.ts` |

**Breaking changes** require coordinated backend + LLM updates and contract version bump.

---

*Related: [backend-llm-gap-analysis.md](./backend-llm-gap-analysis.md) · [document-parsing-strategy.md](./document-parsing-strategy.md)*
