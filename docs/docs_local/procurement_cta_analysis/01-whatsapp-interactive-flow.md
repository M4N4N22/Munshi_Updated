# Phase 1 — WhatsApp Interactive Flow Discovery

**Date:** 2026-06-07  
**Scope:** Discovery only — no implementation  
**Codebase:** `backend/` (Munshi NestJS backend)

---

## Executive Summary

Munshi supports three outbound interactive message types:

| Type | API shape | Used for |
|------|-----------|----------|
| **Reply buttons** | `interactive.type: button` | Owner home, team setup, low-stock alert |
| **CTA URL** | `interactive.type: cta_url` | Team CSV template download |
| **Plain text** | `type: text` | Fallback when CTA URL fails |

**List messages** are parsed on inbound (`list_reply`) but **never sent** outbound.

There is **no button labeled "Create Order"** in code. The low-stock procurement CTA is titled **`Purchase karein`** with reply `id` = `/purchase_request_create?itemId={inventoryItemId}`.

---

## 1. Entry Points

### Inbound (user taps button / sends message)

| Route | File | Handler |
|-------|------|---------|
| `POST /webhook` | `backend/src/modules/whatsapp/whatsapp.controller.ts` | Primary WABA/Olli webhook |
| `GET /webhook` | same | Meta verification |
| `POST /webhook/test` | same | Dev-only direct test (`ENABLE_WEBHOOK_TEST_ROUTE=true`) |

**Inbound normalization:**

```
Webhook body
  → parseWhatsAppInbound()          [whatsapp-inbound.parser.ts]
  → { kind: 'text', from, message }
  → WhatsAppService.handleIncomingMessage()
```

### Outbound (system sends buttons)

| Source | Send path |
|--------|-----------|
| Owner home / team setup | `WhatsAppService.sendOutbound()` → `MessagingService.sendInteractiveButtons()` |
| Low-stock alerts | `InventoryLowStockAlertHandler` → `MessagingService.sendInteractiveButtons()` **directly** (bypasses `WhatsAppService`) |
| Unrecognized chat fallback | `buildUnrecognizedChatOutbound()` → single "Home par jayein" button |

---

## 2. Inbound Payload Normalization

**File:** `backend/src/modules/whatsapp/whatsapp-inbound.parser.ts`

For `data.type === 'interactive'`, resolution order:

1. **Olli path:** `data.text` (often the button **title**) → `resolveInteractiveActionId(olliText)` → stable id or raw title
2. **Meta path:** `interactive.button_reply.id` → used verbatim as `message`
3. **List reply:** `interactive.list_reply.id`
4. **Legacy:** `interactive.type === 'button_reply'` + `interactive.id`
5. **Template quick-reply:** `data.button.payload`

All paths produce `{ kind: 'text', from, message }` for downstream routing.

### Critical Olli behavior

Owner-home buttons map **title → stable id** via `TITLE_TO_ACTION_ID` in `whatsapp-interactive.constants.ts`.

The low-stock button title **`Purchase karein` is NOT in `TITLE_TO_ACTION_ID`**. If Olli echoes the title instead of `button_reply.id`, the inbound message becomes `"Purchase karein"` — not a workflow command.

---

## 3. Routing Logic (`handleIncomingMessage`)

**File:** `backend/src/modules/whatsapp/whatsapp.service.ts`

Priority order (simplified):

```
msgTrim = body.message.trim()

① resolveInteractiveActionId(msgTrim)?
   ├─ HOME_* → OwnerHomeService.handleHomeAction() → return 'ok'
   └─ TEAM_* → handleTeamSetupInteractive() → return 'ok'

② isChatHomeTrigger? → sendOwnerHome() → return 'ok'

③ /cancel → cancel workflow + CSV awaiting

④ inventory CSV CONFIRM/CANCEL (in-memory review)

⑤ inventory / team CSV awaiting upload

⑥ Active workflow session?
   ├─ direct slash → processCommand()
   └─ else → handleActiveWorkflowMessage()

⑦ Slash bypass (mgrself, assign_delivery, …)

⑧ matchWorkflowStartCommand(msgTrim)?
   → startWorkflowFromCommand()     ← LOW-STOCK CTA LANDS HERE (if id echoed)

⑨ NL task inventory handler

⑩ Direct slash commands

⑪ ML /classify → processCommand / startWorkflowIfRegistered
```

### How a CTA click travels (intended path)

```
User taps "Purchase karein"
  → Olli webhook: message = "/purchase_request_create?itemId=42"
  → ① resolveInteractiveActionId → null (not WA_INTERACTIVE_ID)
  → ⑧ matchWorkflowStartCommand → "/purchase_request_create"
  → WorkflowRouterService.startWorkflowFromCommand()
  → parsePurchaseRequestItemIdFromCommand() → 42
  → PurchaseRequestPrefillService.buildLowStockPrefill()
  → workflow_sessions row created (PURCHASE_REQUEST_CREATE)
  → finish() sends prefilled YES/NO prompt to user
```

### Broken path (observed production risk)

```
User taps "Purchase karein"
  → Olli webhook: message = "Purchase karein" (title only)
  → ① resolveInteractiveActionId → null
  → ⑧ matchWorkflowStartCommand → null (no leading slash)
  → ⑪ ML classify → may return general_chat or wrong intent
  → User sees no procurement workflow → "nothing happens"
```

---

## 4. Stable Button IDs (`WA_INTERACTIVE_ID`)

**File:** `backend/src/core/messaging/whatsapp-interactive.constants.ts`

| ID | Title (Hindi) | Handler |
|----|---------------|---------|
| `home_add_employee` | Employee jodiyein | Owner home submenu |
| `home_add_stock` | Maal / stock jodein | Starts `INVENTORY_CREATE` workflow |
| `home_assign_task` | Kaam assign karein | Assignment instructions |
| `home_go_home` | Home par jayein | Re-send owner home |
| `home_bulk_csv` | CSV se bulk add | Team CSV awaiting state |
| `team_onboard_wa` | WhatsApp par add | Starts `ONBOARD_WORKER` workflow |
| `team_google_form` | Google Form se add | **Stub** — retired message |
| `team_dashboard` | Dashboard par add | **Stub** — coming soon message |

---

## 5. Dynamic Low-Stock Button

**File:** `backend/src/core/messaging/inventory-low-stock-outbound.ts`

| Field | Value |
|-------|-------|
| Outbound type | `interactive_buttons` |
| Title | `Purchase karein` (max 20 chars) |
| Reply `id` | `/purchase_request_create?itemId={inventoryItemId}` |
| Body | Item name, SKU, current qty, threshold, Hindi copy |

**Not registered in `WA_INTERACTIVE_ID`.** Routed as a **workflow start command**, not a home-menu action.

---

## 6. Outbound Transport

**File:** `backend/src/core/messaging/messaging.service.ts`

- `sendInteractiveButtons(to, body, buttons)` → Olli `POST /external/waba/send`
- `sendInteractiveCtaUrl(to, body, displayText, url)` → may 500 on Olli; `WhatsAppService.sendOutbound` falls back to plain text + URL
- Max **3** reply buttons per message

**Types:** `backend/src/core/messaging/outbound-message.types.ts`

```typescript
{ type: 'interactive_buttons'; body: string; buttons: { id: string; title: string }[] }
{ type: 'interactive_cta_url'; body: string; displayText: string; url: string }
```

---

## 7. CTA Status Matrix

| CTA | Status | Notes |
|-----|--------|-------|
| Owner home buttons | ✅ Working | Title→id mapping for Olli |
| Team WhatsApp onboard | ✅ Working | |
| Team CSV bulk add | ✅ Working | + CTA URL for template |
| Google Form / Dashboard | 🛑 Stub | Legacy ids only |
| **Purchase karein** (low stock) | ⚠️ **Conditional** | Works when `button_reply.id` echoed; **fails** when only title echoed |
| CTA URL template download | ⚠️ Partial | Text fallback on Olli error |

---

## 8. Unused / Dead Helpers

| Symbol | File | Status |
|--------|------|--------|
| `isPurchaseRequestWorkflowCommand()` | `whatsapp-interactive.constants.ts` | **Defined, never called** |
| `WA_LOW_STOCK_BUTTON_TITLES` | same | **Defined, not wired to routing** |

These were likely intended to bridge the Olli title-echo gap but were never integrated into `parseWhatsAppInbound` or `handleIncomingMessage`.

---

## 9. State Management for Interactive Taps

| Pattern | Storage | Triggered by |
|---------|---------|--------------|
| Workflow sessions | PostgreSQL `workflow_sessions` | PR create, onboard, inventory create, etc. |
| Inventory CSV review | In-memory `Map<phone>` | `home_add_stock`, `/inventory_import_csv` |
| Team CSV upload | In-memory `Map<phone>` | `home_bulk_csv` |
| Owner home routing | **Stateless** | Each tap resolved from message string |

---

## 10. Key Files Index

| Concern | Path |
|---------|------|
| Webhook controller | `backend/src/modules/whatsapp/whatsapp.controller.ts` |
| Inbound parser | `backend/src/modules/whatsapp/whatsapp-inbound.parser.ts` |
| Message router | `backend/src/modules/whatsapp/whatsapp.service.ts` |
| Interactive constants | `backend/src/core/messaging/whatsapp-interactive.constants.ts` |
| Low-stock outbound | `backend/src/core/messaging/inventory-low-stock-outbound.ts` |
| Owner home actions | `backend/src/modules/whatsapp/owner-home.service.ts` |
| Outbound builders | `backend/src/core/messaging/owner-home-outbound.ts`, `team-setup-outbound.ts` |
| Olli send | `backend/src/core/messaging/messaging.service.ts` |
| Workflow start from command | `backend/src/services/workflow/workflow-engine.service.ts` |
| Workflow command registry | `backend/src/services/workflow/workflow.registry.ts` |

---

## 11. Answer: How does a CTA click travel today?

**Working case:** Button reply `id` (`/purchase_request_create?itemId=N`) survives inbound parsing → `matchWorkflowStartCommand` → prefilled `PURCHASE_REQUEST_CREATE` workflow → WhatsApp prefilled prompt.

**Failing case:** Olli sends button **title** only (`Purchase karein`) → no id mapping → no workflow match → ML fallback → user perceives **no response / wrong response**.

This is the most likely root cause of "Create Order / Purchase karein — nothing happens" in production with Olli.
