# Phase 3.3A — Manager Alert Risk Review

**Run date:** 2026-06-06

---

## Risk Register

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R-01 | Duplicate WhatsApp (owner=manager) | Medium | `uniqueAlertPhones()` | **Mitigated** |
| R-02 | Manager send blocks owner | High | Independent try/catch per recipient | **Mitigated** |
| R-03 | Wrong manager for non-task stock-out | Low | Manager only on TASK reference | **By design** |
| R-04 | No dept link on inventory item | Medium | Documented; TASK path only | **Accepted** |
| R-05 | Task without department_id | Low | Fall back to owner only | **Mitigated** |
| R-06 | Inventory logic regression | Critical | Handler-only change | **Mitigated** |

---

## Known Limitations

1. **Non-TASK movements** — manual/CSV/Zoho pull stock-outs alert owner only (no department context in schema).
2. **Single manager per department** — uses `departments.manager_user_id` only.
3. **No location→dept mapping** — would require new schema (out of scope).

---

## Compliance

| Rule | Status |
|------|--------|
| No inventory changes | **COMPLIANT** |
| No event publish changes | **COMPLIANT** |
| Existing relationships only | **COMPLIANT** |

---

**Risk review:** **PASS**
