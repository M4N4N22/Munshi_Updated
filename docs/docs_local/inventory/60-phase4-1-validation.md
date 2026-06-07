# Phase 4.1 — Validation Report

**Run date:** 2026-06-06  
**Environment:** Windows, Python 3.14.2, Node backend

---

## Build

| Command | Result |
|---------|--------|
| `cd backend && npm run build` | **PASS** (nest build exit 0) |

---

## ML Service Tests

| Command | Result |
|---------|--------|
| `cd ml && python -m pytest tests/ --ignore=tests/test_intent_datasets.py` | **52/52 PASS** |

### Phase 4.1 Test Cases

| Test | Input summary | Result |
|------|---------------|--------|
| Delivery request | Ram + 20 cement + deliver | **PASS** |
| Issue request | Shyam + 5 PVC pipes + issue | **PASS** |
| Inventory count | Inventory count karwa do | **PASS** |
| Missing quantity | Ram + cement + deliver (no qty) | **PASS** |
| Missing assignee | 20 cement deliver (no name) | **PASS** |
| Unknown item | Ram ko deliver karo | **PASS** (item null) |
| Hindi inputs | cement ki thaili bhej do | **PASS** |
| Mixed Hindi-English | steel rods issue karo | **PASS** |
| SKU inputs | CEMENT_50KG + qty 5 | **PASS** |
| Contract keys | Empty message → 4 keys | **PASS** |
| Hindi count phrase | Maal ki ginati karwa do | **PASS** |

---

## Backend Tests

| Command | Result |
|---------|--------|
| `npm test -- --testPathPattern=contract-drift` | **7/7 PASS** |

Existing classify, document, and workflow contract drift checks unchanged.

---

## Backward Compatibility Checks

| Area | Verification | Result |
|------|--------------|--------|
| `/classify` | Existing intent tests (`test_operational_intent`, `test_workflow_intent`, etc.) | **PASS** — 52 ML tests green |
| `/parse` | `test_inventory_import_parser`, `test_stock_register_parser` | **PASS** |
| Document contracts | `test_inventory_import_contract_shape` | **PASS** |
| Phase 0–3 backend | No service code modified except shared contract types | **No regression path** |

---

## Manual Endpoint Smoke (Optional)

```bash
curl -X POST "http://localhost:8000/extract/task-inventory?message=Ram%20ko%2020%20cement%20bags%20deliver%20kar%20do"
```

Expected: JSON with `cement`, `20`, `Ram`, `delivery`.

---

## Verdict

```text
╔══════════════════════════════════════════════╗
║  PHASE 4.1 — ML EXTRACTION SCHEMA            ║
║                                              ║
║  Contract defined          PASS              ║
║  ML endpoint implemented   PASS              ║
║  Extraction tests          PASS (11/11)      ║
║  ML full suite             PASS (52/52)      ║
║  Backend build             PASS              ║
║  Backward compatibility    PASS              ║
╚══════════════════════════════════════════════╝
```

**Phase 4.2 (Backend Resolver) and 4.3 (Confirmation Workflow) remain out of scope.**

---

*End of validation report.*
