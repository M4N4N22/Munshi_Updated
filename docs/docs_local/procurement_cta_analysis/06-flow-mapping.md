# Phase 6 — Flow Mapping

**Date:** 2026-06-07  
**Scope:** Architecture diagrams for current flows

---

## 1. Current Low Stock Flow

```mermaid
flowchart TD
  A[STOCK_OUT transaction] --> B{Crossed reorder_threshold?}
  B -->|No| Z[End — no alert]
  B -->|Yes| C[Build InventoryLowStockEventPayload]
  C --> D[domain_events.publish inventory.low_stock]
  D --> E[processEventById immediate + cron fallback]
  E --> F[InventoryLowStockAlertHandler.handle]
  F --> G[resolveLowStockAlertRecipientPhones]
  G --> H{Recipients > 0?}
  H -->|No| Z2[Skip — log warning]
  H -->|Yes| I[buildInventoryLowStockAlertOutbound]
  I --> J[sendInteractiveButtons per owner/manager]
  J --> K[User sees alert + Purchase karein button]

  K --> L{User taps button}
  L --> M[Inbound webhook]
  M --> N{message = button_reply.id?}
  N -->|Yes /purchase_request_create?itemId=N| O[→ Procurement Flow]
  N -->|No title only Purchase karein| P[ML fallback — often no action]
```

### Decision points

| Point | Condition | Outcome |
|-------|-----------|---------|
| Threshold cross | `didCrossLowStockThreshold` | Event published or skipped |
| Recipients | owners + managers phones exist | Alert sent or skipped |
| Inbound routing | `button_reply.id` vs title echo | Workflow starts or fails |

### Database writes

| Step | Table | Operation |
|------|-------|-----------|
| Stock movement | `inventory_transactions`, `inventory_items` | INSERT + UPDATE qty |
| Event | `domain_events` | INSERT PENDING → COMPLETED |

### WhatsApp messages

| Step | Message |
|------|---------|
| Alert | Interactive: body + "Purchase karein" button |
| Failed routing | None or unrelated ML reply |

---

## 2. Current Procurement Flow (WhatsApp)

```mermaid
flowchart TD
  START[Entry: slash / ML / CTA button] --> A[matchWorkflowStartCommand]
  A --> B{PURCHASE_REQUEST_CREATE?}
  B -->|itemId present| C[buildLowStockPrefill]
  C --> D[create workflow_sessions ACTIVE]
  D --> E[Send prefilled YES/NO prompt]
  B -->|no itemId| F[Manual title prompt]
  F --> D2[create session — manual path]

  E --> G{User reply}
  G -->|YES| H[createFromWorkflowSession submit=true]
  H --> I[(purchase_requests PENDING_APPROVAL)]
  I --> J[APPROVAL step — YES/NO]
  J -->|YES| K[approvePurchaseRequest APPROVED]
  J -->|NO| L[rejectPurchaseRequest REJECTED]
  K --> M[VENDOR_ASSIGNMENT]
  M --> N[CLOSE]
  N --> O[COMPLETE session]

  G -->|NO| F
  G -->|new qty| E
```

### Entry points (Start)

| Source | Message |
|--------|---------|
| Low-stock CTA | `/purchase_request_create?itemId=N` |
| Manual slash | `/purchase_request_create` |
| ML intent | `/purchase_request_create` |
| REST | `POST /purchase-requests` (no WhatsApp) |

### Services touched

| Step | Service |
|------|---------|
| Route | `WorkflowRouterService` |
| Prefill | `PurchaseRequestPrefillService` |
| Steps | `PurchaseRequestCreateWorkflowHandler` |
| Persist | `PurchaseRequestService` |
| Audit | `PurchaseRequestRepository` |

### Database writes

| Step | Tables |
|------|--------|
| Session create | `workflow_sessions` INSERT |
| PR create | `purchase_requests`, `purchase_request_items`, `purchase_request_audit` |
| Approve/reject | `purchase_requests` UPDATE + audit |
| Vendor assign | `purchase_requests` UPDATE + audit |
| Session complete | `workflow_sessions` UPDATE status |

### WhatsApp messages

| Step | Content |
|------|---------|
| Prefill prompt | Title, item, qty, current, threshold, YES/NO instructions |
| After YES | PR created confirmation + approval prompt |
| Approval | Approve/reject result message |
| Vendor step | Vendor list + SKIP |
| Close | Close confirmation |

---

## 3. Current CTA Flow (All Interactive Buttons)

```mermaid
flowchart TD
  WH[POST /webhook] --> PARSE[parseWhatsAppInbound]
  PARSE --> MSG[message string]
  MSG --> R1{resolveInteractiveActionId}

  R1 -->|HOME_*| OH[OwnerHomeService.handleHomeAction]
  R1 -->|TEAM_*| TS[handleTeamSetupInteractive]
  R1 -->|null| R2{matchWorkflowStartCommand}

  R2 -->|/purchase_request_create?| PR[PR workflow]
  R2 -->|other /commands| WF[Other workflows]
  R2 -->|null| R3{Active session?}
  R3 -->|yes| ACTIVE[handleActiveWorkflowMessage]
  R3 -->|no| ML[ML classify / processCommand]

  OH --> OUT[sendOutbound interactive/text]
  TS --> OUT
  PR --> OUT
  WF --> OUT
  ACTIVE --> OUT
  ML --> OUT
```

### CTA categories

| Category | Routing mechanism | State |
|----------|-------------------|-------|
| Owner home | `WA_INTERACTIVE_ID` + title map | Stateless / spawns workflow |
| Team setup | `WA_INTERACTIVE_ID` + title map | Stateless / spawns workflow |
| Low-stock purchase | Workflow command in `button_reply.id` | Creates `workflow_sessions` |
| CTA URL (CSV template) | URL open (no inbound) | N/A |

---

## 4. Current Approval Flow

```mermaid
flowchart TD
  subgraph wa [WhatsApp PR Workflow]
    A1[PR created PENDING_APPROVAL] --> A2[APPROVAL step prompt]
    A2 --> A3{YES or NO?}
    A3 -->|YES| A4[approvePurchaseRequest]
    A3 -->|NO| A5[rejectPurchaseRequest]
  end

  subgraph rest [REST API]
    B1[PATCH /purchase-requests/:id/approve]
    B2[PATCH /purchase-requests/:id/reject]
  end

  A4 --> DB[(purchase_requests APPROVED)]
  A5 --> DB2[(purchase_requests REJECTED)]
  B1 --> DB
  B2 --> DB2

  DB --> AUDIT[(purchase_request_audit)]
  DB2 --> AUDIT
```

### Decision points

| Point | Gate |
|-------|------|
| Who can approve | `canApprovePurchaseRequests()` — OWNER or MANAGER |
| Valid transition | `assertStatusTransition()` |
| Terminal | REJECTED, CLOSED — no further WA steps |

---

## 5. Cross-Flow Sequence (Desired Future — Already Partially Built)

```mermaid
sequenceDiagram
  participant Inv as Inventory STOCK_OUT
  participant DE as Domain Events
  participant Alert as LowStockAlertHandler
  participant WA as WhatsApp User
  participant WH as Webhook Router
  participant WF as PR Workflow
  participant DB as PostgreSQL

  Inv->>DE: publish inventory.low_stock
  DE->>Alert: dispatch event
  Alert->>WA: interactive alert + Purchase karein
  WA->>WH: button tap
  WH->>WF: startWorkflowFromCommand itemId
  WF->>DB: workflow_sessions INSERT
  WF->>WA: prefilled YES/NO prompt
  WA->>WF: YES
  WF->>DB: purchase_requests INSERT
  WF->>WA: approval prompt
```

---

## 6. ASCII Summary — Low Stock → Procurement

```
[STOCK_OUT] → [threshold cross] → [domain_event]
     → [alert to owners/managers]
     → [WhatsApp: Purchase karein button]
     → [tap → /purchase_request_create?itemId=X]  ← must survive inbound
     → [workflow session + prefill prompt]
     → [YES → PR PENDING_APPROVAL]
     → [approval → vendor → close]
```
