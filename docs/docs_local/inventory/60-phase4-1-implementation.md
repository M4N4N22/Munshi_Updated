# Phase 4.1 — Implementation Report

**Run date:** 2026-06-06  
**Branch:** Shantanu

---

## Deliverables

| Area | Change |
|------|--------|
| Shared contract | `task-inventory-extraction.json`, `task-kinds.json` |
| TypeScript types | `TaskInventoryExtractionContract`, `TASK_KINDS` |
| Python models | `TaskInventoryExtraction` with strict `extra=forbid` |
| ML extractor | `ml/extractors/task_inventory_extractor.py` |
| ML endpoint | `POST /extract/task-inventory` |
| Tests | `ml/tests/test_task_inventory_extraction.py`, `test_contract.py` update |

---

## ML Extractor Design

**Module:** `ml/extractors/task_inventory_extractor.py`

**Approach:** Deterministic regex/rules (no LLM call) to avoid hallucination.

| Step | Logic |
|------|-------|
| 1 | Detect inventory-count-only messages → return kind with null item/qty/assignee |
| 2 | Detect `task_kind` from delivery / issue / count keywords |
| 3 | Extract assignee from `Name ko` pattern (exclude stop words) |
| 4 | Detect SKU (`[A-Z]+_[A-Z0-9_]+`) before item name parsing |
| 5 | Extract quantity — skip digits inside SKU span |
| 6 | Extract item from post-quantity fragment; strip Hindi filler (`ki thaili`); stop at action verbs |

**Public API:**

```python
from extractors.task_inventory_extractor import extract_task_inventory

extract_task_inventory("Ram ko 20 cement bags deliver kar do")
```

---

## Endpoint Wiring

**File:** `ml/main.py`

- Registers `TaskInventoryExtractor` in app lifespan
- Route: `POST /extract/task-inventory?message=...`
- Response model: `TaskInventoryExtraction`

---

## Not Implemented (By Design)

- Backend resolver / fuzzy inventory match (Phase 4.2)
- WhatsApp confirmation message (Phase 4.3)
- Contract drift eval extension (Phase 4.4)
- Wiring extraction into `WhatsAppService` classify path
- Task creation or inventory ledger writes

---

## File List

```
backend/contracts/
  schemas/task-inventory-extraction.json
  task-kinds.json
  typescript/index.ts          (+ TaskInventoryExtractionContract)
  python/models.py             (+ TaskInventoryExtraction)
  python/__init__.py
  README.md

ml/contracts/                  (mirror of above)
ml/extractors/
  __init__.py
  task_inventory_extractor.py
ml/main.py                     (+ /extract/task-inventory)
ml/tests/test_task_inventory_extraction.py
ml/tests/test_contract.py
```

---

*End of implementation report.*
