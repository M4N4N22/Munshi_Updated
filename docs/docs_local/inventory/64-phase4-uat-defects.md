# Phase 4 UAT — Defect Log

**Run date:** 2026-06-07

---

## P4-UAT-001

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Business Impact** | Owner says *"Ram ko 20 cement de do"* expecting delivery; system creates **issue** task |
| **Steps** | Owner sends `Ram ko 20 cement de do` via WhatsApp |
| **Expected** | Delivery task |
| **Actual** | ML extracts `task_kind: issue` |
| **Suggested Direction** | Disambiguate *de do* near assignee+item as delivery when context implies dispatch |

---

## P4-UAT-002

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Business Impact** | Common MSME phrasing (*ram se cement bhijwa do*, *site pe cement pahucha do*) does not start NL flow |
| **Steps** | Owner sends real-world godown/site messages (Group 14A) |
| **Expected** | Extraction or guided clarification |
| **Actual** | `task_kind: null` → falls through to `/classify` |
| **Suggested Direction** | Expand assignee patterns (`X se`), delivery verbs (`bhijwa`, `pahucha`) |

---

## P4-UAT-003

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Business Impact** | Owner confirms with *"theek hai"* — task not created |
| **Steps** | Reach confirmation step → reply `theek hai` |
| **Expected** | Accepted as confirm |
| **Actual** | Reprompt (only `theek` in token list) |
| **Suggested Direction** | Add common Hindi phrase variants |

---

## P4-UAT-004

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Business Impact** | Owner cannot cancel with natural *"mat karo"* or *"cancel kar do"* |
| **Steps** | Reach confirmation → send cancel phrase |
| **Expected** | Workflow cancelled |
| **Actual** | Reprompt or ignored |
| **Suggested Direction** | Prefix/substring match for Hindi cancel phrases |

---

## P4-UAT-005

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Business Impact** | Incomplete requests show error block instead of conversational clarify |
| **Steps** | Send `ram ko de do` or `cement bhej do` |
| **Expected** | Munshi asks Who? What? How much? |
| **Actual** | "Inventory not found" or quantity required block |
| **Suggested Direction** | Multi-turn clarification workflow for partial extractions |

---

## P4-UAT-006

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Business Impact** | Fictional/unknown items parsed as real SKUs at ML layer |
| **Steps** | `Ram ko 10 moon rocks deliver kar do` |
| **Expected** | item null or clarification |
| **Actual** | `item_name_or_sku: moon rock` |
| **Suggested Direction** | Resolver catches via not_found; tighten ML null policy for unknown nouns |

---

## P4-UAT-007

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Business Impact** | Unknown worker name extracted then blocked later |
| **Steps** | `Batman ko 10 cement deliver kar do` |
| **Expected** | Early "worker not found" |
| **Actual** | Extraction passes Batman; resolver blocks † |
| **Suggested Direction** | Acceptable if worker message is clear; optional early validation |

---

## P4-UAT-008

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Business Impact** | Ambiguous *"wo cement"* stored as literal item name |
| **Steps** | `ram ko wo cement de do` |
| **Expected** | Disambiguation among cement SKUs |
| **Actual** | item=`wo cement`, kind=issue |
| **Suggested Direction** | Strip Hindi fillers (wo, wala) before inventory match |

---

## P4-UAT-009

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Business Impact** | Godown sentence parses nonsense inventory |
| **Steps** | `godown se 10 bag cement nikal ke ram ko dedo` |
| **Expected** | cement + 10 + Ram + delivery/issue |
| **Actual** | item=`bag cement nikal ke`, kind=issue |
| **Suggested Direction** | Improve item span extraction for godown/nikal patterns |

---

## P4-UAT-010

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Business Impact** | Full WhatsApp UAT not completed — production readiness unproven for notifications and task IDs |
| **Steps** | Start backend + ML + Postgres; run all scenario groups via `/webhook/test` |
| **Expected** | Live end-to-end PASS |
| **Actual** | Backend/Postgres not available in UAT environment |
| **Suggested Direction** | Re-run UAT on staging with ABC Manufacturing seed |

---

## P4-UAT-011

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Business Impact** | *inventory check kar lo* does not map to inventory_count |
| **Steps** | Send check/dekh lo phrases |
| **Expected** | Count task or helpful redirect |
| **Actual** | `task_kind: null` |
| **Suggested Direction** | Synonym expansion for count/check/ginati |

---

*End of defect log.*
