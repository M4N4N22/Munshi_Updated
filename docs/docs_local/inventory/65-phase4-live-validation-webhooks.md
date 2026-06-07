# Phase 4 Live Validation — Webhooks

**Run date:** 2026-06-07  
**Endpoint:** `POST http://127.0.0.1:4001/webhook/test`  
**Owner phone:** `919900000001`

---

## Request Format

```json
{
  "from": "919900000001",
  "message": "Shyam ko 5 PVC pipes issue karo"
}
```

## Response Format (all successful handler paths)

```json
{
  "data": "ok",
  "meta": {
    "success": true,
    "message": "SUCCESS",
    "statusCode": 201
  }
}
```

HTTP status: **201**

**Note:** Response body is always `"ok"` — Munshi reply text is sent asynchronously via OLLI (`MessagingService.sendText`).

---

## Chain Verified Live

### ML extraction (parallel HTTP)

```http
POST http://127.0.0.1:8000/extract/task-inventory?message=Ram%20ko%2020%20cement%20deliver%20kar%20do
```

**Live response:**

```json
{
  "item_name_or_sku": "cement",
  "quantity": 20,
  "assignee_hint": "Ram",
  "task_kind": "delivery"
}
```

### Resolver (direct HTTP)

```http
POST http://127.0.0.1:4001/resolve/task-inventory
Content-Type: application/json

{
  "factory_id": 5,
  "extraction": {
    "item_name_or_sku": "cement",
    "quantity": 20,
    "assignee_hint": "Ram",
    "task_kind": "delivery"
  }
}
```

**Live highlights:** inventory **ambiguous** (3 cement SKUs), worker **ambiguous** (Ram Kumar / Ram Singh), disambiguation payloads generated.

---

## Issue E2E — Captured Flow (PASS)

| Step | Message | Webhook | Session after |
|------|---------|---------|---------------|
| 1 | `Shyam ko 5 PVC pipes issue karo` | 201 ok | `TASK_INVENTORY_CREATION` / `WAITING_CONFIRMATION` / ACTIVE |
| 2 | `CONFIRM` | 201 ok | COMPLETED |

**Session #135 `session_data` after step 1:**

```json
{
  "task_kind": "issue",
  "quantity": 5,
  "worker_user_id": 41,
  "worker_name": "Shyam",
  "inventory_item_id": 21,
  "inventory_sku": "PVC_PIPE",
  "inventory_name": "PVC Pipe"
}
```

**Task created:** `#122` — `[ISSUE] PVC Pipe pcs (PVC_PIPE) x5.0000`

---

## Inventory Count E2E — Captured Flow (PASS)

| Step | Message | Session after |
|------|---------|---------------|
| 1 | `Inventory count karwa do` | `WAITING_CONFIRMATION`, assignee Priya (37) |
| 2 | `CONFIRM` | COMPLETED |

**Task created:** `#123` — `[INVENTORY_COUNT] Inventory count karwa do` → assigned to Priya

---

## Delivery — Captured Flow (FAIL)

| Step | Message | Session after |
|------|---------|---------------|
| 1 | `Ram ko 20 cement deliver kar do` | `WAITING_INVENTORY_SELECTION` (3 cement candidates) |
| 2 | `CONFIRM` | Still `WAITING_INVENTORY_SELECTION` — **no task** |
| Alt | `1` (pick inventory) | Session **CANCELLED** — worker not resolved |

---

## Unknown Entity Paths

| Message | Webhook | New active session? |
|---------|---------|---------------------|
| `Ram ko 10 moon rocks deliver kar do` | 201 | **No** — blocking inventory message path |
| `Batman ko 10 cement deliver kar do` | 201 | **No** — worker not found block |

---

## Regression Webhooks

| Command | HTTP status | Notes |
|---------|-------------|-------|
| `/help` | **400** | Live failure — investigate separately |
| `/members` | 201 | ok |
| `/present` | 201 | ok |

---

*Evidence source: `65-phase4-live-evidence.json`*
