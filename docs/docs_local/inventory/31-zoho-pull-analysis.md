# Phase 2.3 — Zoho Pull Sync Analysis

**Run date:** 2026-06-04  
**Scope:** Manual pull sync only — no cron, push, or webhooks

---

## 1. Pull Sync Architecture

```text
POST /integrations/zoho/sync/pull
    ↓
IntegrationAuthValidation (owner/manager)
    ↓
ZohoPullSyncService.runPullSync(connectionId, factoryId, userId)
    ↓
Validate active Zoho connection (factory-scoped)
    ↓
Create integration_sync_runs (direction=pull, trigger=manual, status=running)
    ↓
ZohoOAuthService.refreshConnectionIfNeeded()
    ↓
TokenCryptoService.decrypt(access_token)
    ↓
ZohoInventoryClient.fetchAllItems() [paginated, mockable]
    ↓
Per item: resolve category/location → mapping lookup → upsert
    ↓
Finalize sync run (completed | partial | failed)
    ↓
Return { addedCount, updatedCount, failedCount, mappingCount, syncRunId }
```

**Source of truth:** Munshi ledger (`inventory_transactions`). Zoho is bootstrap + external catalog mirror.

---

## 2. Mapping Strategy

| Key | Rule |
|-----|------|
| Join key | `integration_item_mappings.external_id` = Zoho `item_id` |
| SKU snapshot | `external_sku` updated each sync |
| New item | Create `inventory_items` + mapping row |
| Existing mapping | Update Munshi item metadata only (Case B) |
| SKU conflict on create | Item fails; sync continues (strict v1) |

Mappings are never deleted on sync failure. `sync_status` = `ok` on success; failed items have no mapping row.

---

## 3. Quantity Handling Strategy (R-Z06 / R-D01)

**Mandatory discipline — same as CSV import:**

| Rule | Implementation |
|------|----------------|
| Never SET `current_quantity` from Zoho | New items created with `formatQuantity(0)` |
| Never UPDATE `current_quantity` directly | Case B updates metadata fields only |
| Bootstrap stock | `recordStockIn({ reference_type: ZOHO_PULL, reference_id: syncRunId })` |
| Re-sync existing mapped item | No additional stock ledger (metadata only) |

Quantity changes flow only through `InventoryTransactionService.recordStockIn()` — **not** modified internally.

---

## 4. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| **R-Z06** Quantity overwrite | Ledger-only bootstrap; integration test asserts re-sync does not change qty |
| **R-Z07** SKU mismatch | Strict fail on create conflict; mapping keyed by Zoho `item_id` |
| **R-D01** CSV discipline | Same `formatQuantity(0)` + `recordStockIn` pattern as `InventoryImportService` |
| Missing category/location | Fail item, continue sync (strict v1, no auto-create) |
| Token expiry mid-pull | `refreshConnectionIfNeeded` before API calls |
| Cross-factory pull | Connection lookup requires matching `factory_id` |
| Worker abuse | 403 on pull endpoint |

---

## 5. Category / Location Policy

Matches CSV import (Phase 1.2):

- Resolve via `findCategoryByName` / `findLocationByName`
- Missing master → item fails with Hindi-style detail message
- Sync continues for remaining items → `partial` status when mixed

---

## 6. WhatsApp Summary (optional)

`formatZohoPullSummaryMessage()` mirrors CSV import summary format. Not wired to WhatsApp in 2.3 — ready for reuse without new notification infrastructure.
