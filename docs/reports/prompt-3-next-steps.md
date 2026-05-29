# Prompt 3 — Next Steps & Future Design

**Date:** 2026-05-29  
**Scope:** Planning only — no implementation in this document

---

## A. Vendor Role Design (Future)

### Proposed `VENDOR` role

| Aspect | Design |
|--------|--------|
| **Identity** | External party linked to `vendors` row via `user_id` (future column) or separate vendor portal auth |
| **Scope** | Single vendor record; may supply multiple factories if duplicate vendor rows exist per factory |
| **Permissions** | View own profile; receive purchase requests; submit quotations; view order status |
| **Restrictions** | Cannot access factory tasks, attendance, departments, or other vendors |
| **WhatsApp onboarding** | Owner creates vendor in master → system sends template invite → vendor replies to opt-in → link phone to vendor record |

### Implementation prerequisites (not done yet)

- `vendors.user_id` nullable FK (migration)
- `USER_ROLE.VENDOR` constant
- WhatsApp command routing for vendor-specific intents
- Olli/Meta templates for vendor onboarding
- Separate auth or phone-based session for vendor users

---

## B. Procurement Flow Design (Future)

```text
Owner (WhatsApp or Dashboard)
  → Create Purchase Request (DRAFT)
  → Submit for Approval
  → ApprovalRequest (PENDING)
  → Owner/Manager Approves
  → Notify Vendor (WhatsApp / email)
  → Vendor Submits Quotation (future `vendor_quotations` table)
  → Owner Compares / Accepts Quote
  → Purchase Order Created (future `purchase_orders` table)
  → Goods Receipt → inventory_transactions (IN)
  → PO marked RECEIVED
```

### Entities to add later

- `purchase_request_lines` (item, qty, unit)
- `vendor_quotations` + `quotation_lines`
- `purchase_orders` + `purchase_order_lines`
- `goods_receipts` + lines

### Approval integration

- `ApprovalRequest.entity_type = PURCHASE_REQUEST`
- On approve → transition `purchase_requests.status` to `APPROVED`
- On reject → `REJECTED` with remarks

---

## C. Inventory Dependency Design (Future)

### How inventory consumes vendors

| Step | Consumption |
|------|-------------|
| Purchase request | Optional `vendor_id` FK (already on schema) |
| Purchase order | Required `vendor_id`; copies vendor contact for audit |
| Goods receipt | Links PO + posts `inventory_transactions` type `IN` |
| Reorder alerts | Compare `current_quantity` vs `reorder_threshold`; suggest vendor from last PO |

### Data flow

```text
Vendor (master)
  ↓ referenced by
PurchaseRequest / PurchaseOrder
  ↓ fulfilled by
GoodsReceipt
  ↓ posts
InventoryTransaction (IN)
  ↓ updates
InventoryItem.current_quantity
```

### Rules for Prompt 4+

- Quantity changes **only** via `inventory_transactions` service
- Vendor deactivation does not delete historical PO/transaction references
- SKU uniqueness remains per `factory_id`

---

## Recommended Prompt 4.0 Sequence

1. Inventory categories + locations CRUD
2. Inventory items CRUD + SKU validation
3. Purchase request CRUD + optional vendor link
4. Approval engine (approve/reject) for purchase requests
5. REST auth guard for TraderOS modules

---

## Explicitly deferred

- Vendor role and WhatsApp onboarding
- Vendor authentication
- Quotation workflow
- Purchase orders
- Goods receipts
- Financial ledger
- Account aggregator

---

*See [prompt-3-vendor-management-report.md](./prompt-3-vendor-management-report.md) for what was delivered in Prompt 3.*
