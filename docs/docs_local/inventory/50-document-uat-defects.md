# Document UAT — Defect Log

**Run date:** 2026-06-06  
**Testing only — no fixes applied**

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 2 |
| INFO | 2 |

---

## HIGH

### DOC-UAT-D-01 — auto_process upload fails when messaging unauthorized

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | Owner uploads document with default settings; entire request fails with 401; no suggestions shown. |
| **Steps to reproduce** | 1. `POST /documents/upload` with `auto_process=true`. 2. Messaging provider returns 401. |
| **Expected** | Document parsed; owner notified via WhatsApp to review suggestions. |
| **Actual** | HTTP 401; orchestration throws after messaging failure. |
| **Suggested direction** | Decouple parse/suggest from outbound messaging; mark workflow pending without failing upload. |

---

### DOC-UAT-D-02 — WhatsApp cannot access document parsing pipeline

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | MSME users on WhatsApp-only workflow cannot upload supplier sheets into parse/review/approve flow. |
| **Steps to reproduce** | Send CSV file on WhatsApp without `/inventory_import_csv` — receives CSV import hint, not suggestion workflow. |
| **Expected** | Optional path: upload → suggestions → YES/NO (per product vision). |
| **Actual** | Only direct CSV ledger import; document module is REST-only. |
| **Suggested direction** | Route structured uploads to `DocumentService.uploadDocument` or document clear UX that CSV import is the WhatsApp path. |

---

### DOC-UAT-D-03 — Duplicate rows in single import silently drop lines

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Business impact** | Document B: supplier lists CEM twice (50+30) and PVC once — inventory shows 2 items; PVC missing; quantities not summed. |
| **Steps to reproduce** | Upload `doc-b-duplicate-items.csv`, approve INITIAL_INVENTORY_IMPORT. |
| **Expected** | Merge duplicate SKUs (sum qty) or warn user before approve. |
| **Actual** | 2 items created (CEM-001 qty 50, STL-012 qty 100); PVC-002 absent. |
| **Suggested direction** | Deduplicate in suggestion payload; surface duplicate warning in summary. |

---

## MEDIUM

### DOC-UAT-D-04 — Category/location from document not applied on approve

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Document A parses Building Materials, Steel, etc.; all items land in default category/location. |
| **Expected** | Categories from extraction applied or suggested. |
| **Actual** | `resolveDefaultCategoryAndLocation` only. |
| **Suggested direction** | Map `category_name` / `location_name` from extraction when present. |

---

### DOC-UAT-D-05 — No reorder threshold from document path

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | CSV import sets thresholds; document import does not — low-stock alerts won't fire until manual update. |
| **Expected** | Parity with CSV when column present. |
| **Actual** | `reorder_threshold` always null after document import. |
| **Suggested direction** | Extend extraction contract + execution for threshold field. |

---

### DOC-UAT-D-06 — PDF/non-tabular upload accepted then fails at parse

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | Owner uploads invoice PDF thinking Munshi will parse it; file stored but no useful feedback at upload time. |
| **Expected** | Reject unsupported types at upload with Hindi message. |
| **Actual** | 201 upload; parse fails later with 422. |
| **Suggested direction** | MIME/extension gate at upload; user-facing “use CSV/Excel” guidance. |

---

### DOC-UAT-D-07 — Post-approval messaging 401 confuses workflow state

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Business impact** | User replies YES; inventory created but may see error in test webhook response. |
| **Expected** | Confirmation message listing items imported. |
| **Actual** | YES returns 401 from messaging provider; inventory still created. |
| **Suggested direction** | Return success payload even if WhatsApp send fails; queue retry. |

---

## LOW

### DOC-UAT-D-08 — Missing SKU generates opaque derived codes

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Business impact** | Document D creates SKUs like `CEMENT507146` — hard to match supplier codes later. |
| **Expected** | Prompt user to enter SKU in review step. |
| **Actual** | Auto-derived SKU without confirmation. |
| **Suggested direction** | Prefill workflow step for missing SKU rows. |

---

### DOC-UAT-D-09 — Suggestion summary not validated in live WhatsApp copy

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Business impact** | User may not see item list before YES when messaging down. |
| **Suggested direction** | Ensure summary in workflow session even if send fails. |

---

## INFO

### DOC-UAT-D-10 — OCR not implemented (documented, not a defect)

Out of scope per task. Invoice photos are unsupported by design today.

---

### DOC-UAT-D-11 — STOCK_REGISTER parser not UAT-tested

Same parser family; assumed equivalent behaviour to INVENTORY_IMPORT.

---

## Defects Carried from UAT 49

| ID | Relevance to document UAT |
|----|---------------------------|
| UAT-D-01 | REST unauthenticated — document upload also unprotected |
| UAT-D-05 | Messaging 401 — blocks auto_process |
