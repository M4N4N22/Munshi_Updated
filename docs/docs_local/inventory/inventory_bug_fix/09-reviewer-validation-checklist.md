# Reviewer Validation Checklist

**Branch:** `feature/shantanu-inventory-import-idempotency`  
**Reviewer:** Second developer (Manan)  
**Environment:** Railway staging after migrations 015–016 applied

---

## Pre-requisites

- [ ] Branch checked out locally or reviewed on GitHub
- [ ] `npm test` passes (386 unit tests)
- [ ] Migrations applied: `npm run migrate` → **18/18**
- [ ] Backend redeployed on staging with this branch

---

## TEST 1 — Direct CSV upload (no session)

**Steps**

1. As owner/manager on WhatsApp, attach an inventory `.csv` file **without** sending `/inventory_import_csv` first.

**Expected**

- Guidance message only: mentions `/inventory_import_csv`
- **No** import review message
- **No** import complete message
- **No** inventory rows created

**Pass / Fail:** ___________

---

## TEST 2 — Inventory review flow (happy path)

**Steps**

1. Send `/inventory_import_csv`
2. Attach valid inventory `.csv`
3. Review summary appears
4. Reply `CONFIRM` once

**Expected**

- Exactly **one** "Inventory Import Review" message
- Exactly **one** "Inventory import complete" message
- Correct added/updated counts
- Items visible in inventory

**Pass / Fail:** ___________

---

## TEST 3 — Duplicate webhook replay

**Steps**

1. Use staging webhook test route or replay same payload (same `message_id`) twice via `POST /webhook`
2. Or observe Railway logs after a single user action (should not see duplicate processing)

**Expected**

- First delivery: processed normally
- Second delivery (same `message_id`): returns `ok`, **no** duplicate side effects
- `whatsapp_webhook_events` has **one** row for that `provider_message_id`

**Pass / Fail:** ___________

---

## TEST 4 — Multiple CONFIRM

**Steps**

1. Complete review flow through step 3 of TEST 2
2. Send `CONFIRM` twice in quick succession (or replay CONFIRM webhook)

**Expected**

- First CONFIRM: import executes
- Second CONFIRM: "Import already in progress." or session expired (no second import)
- **One** `inventory_csv_import_complete` audit log per batch
- No duplicate added/updated counts from second CONFIRM

**Pass / Fail:** ___________

---

## TEST 5 — Stock validation

**Steps**

1. Import CSV with quantity > 0 for a new SKU (TEST 2)
2. Query stock for that item

**Expected**

- `current_quantity` matches CSV quantity (not doubled)
- Exactly **one** `CSV_IMPORT` transaction per item for that batch
- Re-running duplicate CONFIRM does **not** inflate quantity

**Pass / Fail:** ___________

---

## TEST 6 — Migration validation

**Steps**

```bash
curl https://<staging-backend>/health/migrations
# or: npm run migrate:status
```

**Expected**

- `pending_count: 0`
- **18/18** migrations applied
- Tables/indexes exist:
  - `whatsapp_webhook_events`
  - `uq_inventory_txn_csv_import_item_batch` (partial unique index)

**Pass / Fail:** ___________

---

## Regression spot-checks

- [ ] REST CSV import still works (`POST /inventory/import/csv`)
- [ ] `/inventory_status` unchanged
- [ ] Low stock alerts still fire
- [ ] Purchase Karein CTA still routes correctly
- [ ] Team CSV bulk import unchanged

---

## Sign-off

| Item | Reviewer | Date |
|------|----------|------|
| Code review complete | | |
| Staging validation complete | | |
| Approved to merge | | |
