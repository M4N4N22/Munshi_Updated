# Phase 4 UAT — Hindi / Hinglish (Group 14)

**Run date:** 2026-06-07  
**Method:** Live ML extraction

---

## Group 14 — Standard Hindi / Hinglish

| Message | task_kind | assignee | item | qty | Result |
|---------|-----------|----------|------|-----|--------|
| Ram ko 20 cement de do | **issue** | Ram | cement | 20 | **FAIL** — owner meant delivery; *de do* triggers issue |
| Shyam ko 5 pipe issue karo | issue | Shyam | pipe | 5 | **PASS** |
| Inventory count karwa do | inventory_count | — | — | — | **PASS** |
| Ram ko 20 cement bags deliver kar do | delivery | Ram | cement | 20 | **PASS** |

**Overall: PARTIAL (3/4)**

---

## Business Interpretation

- Phrases with explicit **deliver / bhej** work reliably.
- Short Hindi imperatives using **de do** alone are misread as **issue** tasks — common in spoken Hindi for delivery ("Ram ko de do" = send/give to Ram).
- Inventory count phrases with **count karwa** pattern work well.

---

## Recommendations (direction only — not implemented)

1. Treat *de do / dedo* near assignee as **delivery** when inventory item present.
2. Add examples to owner onboarding tip: prefer *deliver* or *bhej do* over *de do* until model improves.

---

*End of Hindi/Hinglish report.*
