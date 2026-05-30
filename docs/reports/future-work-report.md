# Future Work Report — Post Prompt 7

**Date:** 2026-05-29  
**Baseline:** Inventory live; document foundation + suggestion engine; procurement/approval remain skeletons

---

## Completed in Prompt 6

- [x] Inventory category, location, item CRUD
- [x] Transaction engine (STOCK_IN, STOCK_OUT, ADJUSTMENT)
- [x] Transaction-backed quantity cache (Option B)
- [x] Low stock detection + status queries
- [x] `/inventory_create` workflow
- [x] `/inventory_status` WhatsApp foundation
- [x] Migration `004_inventory_master.sql`

---

## Completed in Prompt 7

- [x] DocumentModule (4 entities + migration 005)
- [x] Document registry (type contracts, no parsers)
- [x] Extraction contract validation + storage
- [x] Generic suggestion engine
- [x] Inventory bootstrap (`INITIAL_INVENTORY_IMPORT`)
- [x] New item detection (`NEW_INVENTORY_ITEM`)
- [x] Workflow YES/NO approval (`SUGGESTION_APPROVAL`)
- [x] LLM specification framework (dual-section reports)
- [x] 95 tests passing

---

## Recommended Prompt 8 — Document ingestion + procurement suggestions

| Task | Priority |
|------|----------|
| File upload + storage adapter | P0 |
| Parser plug-in interface (still no OCR in backend) | P0 |
| Auto WhatsApp notify on pending suggestions | P0 |
| `PURCHASE_INVOICE` suggestion processor | P1 |
| Purchase request CRUD (replace skeleton) | P1 |
| ML intent for document upload (classification only) | P1 |

---

## Platform hardening (ongoing)

| Task | Priority |
|------|----------|
| Quantity reconciliation cron | P1 |
| REST auth guards | P1 |
| ML intent for inventory commands | P1 |
| WhatsApp stock-in/stock-out commands | P2 |
| Suggestion queue (sequential approvals) | P2 |

---

## Deferred

- OCR / PDF / CSV / Excel parsing in backend
- Vendor ordering automation
- Financial ledger
- Account aggregator
- LLM CRUD (explicitly forbidden)

---

## LLM integration note (Prompt 7+)

All new reports include **SECTION B — LLM Integration Specification**. Future LLM work must:

- Output structured JSON to `POST /documents/:id/extractions`
- Never perform inventory/vendor/ledger CRUD
- Rely on backend suggestion + approval workflow

See [prompt-7-llm-specification-framework.md](./prompt-7-llm-specification-framework.md).

---

*See [prompt-7-next-steps.md](./prompt-7-next-steps.md)*
