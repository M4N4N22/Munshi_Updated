# Phase 4 UAT — Real-World MSME Language

**Run date:** 2026-06-07  
**Method:** Live ML extraction + expected backend behavior inference

---

## Group 14A — Real-World MSME Language

| # | Message | Extraction summary | NL pipeline? | Result |
|---|---------|-------------------|--------------|--------|
| 1 | ram se cement bhijwa do | all null | No | **FAIL** |
| 2 | godown se 10 bag cement nikal ke ram ko dedo | issue, Ram, garbage item | Yes (broken) | **FAIL** |
| 3 | site pe cement pahucha do | all null | No | **FAIL** |
| 4 | ram ko wo premium wala cement de dena | issue, Ram, "wo premium wala cement" | Yes (risky) | **FAIL** |
| 5 | kal subah cement bhejna hai | all null | No | **FAIL** |
| 6 | paint ka stock count karwa do | inventory_count | Yes | **PASS** |
| 7 | inventory check kar lo | all null | No | **FAIL** |
| 8 | cement khatam hone wala hai | all null | No | **FAIL** (low-stock chat, not task) |
| 9 | shyam ko kuch pipes issue kar dena | issue, Shyam, item="kuch" | Yes (broken) | **FAIL** |
| 10 | site A ke liye material nikal do | all null | No | **FAIL** |

**Score: 1/10 PASS**

---

## Group 14B — Broken English

| # | Message | task_kind | Result |
|---|---------|-----------|--------|
| 1 | send cement ram | null | **FAIL** |
| 2 | give 20 cement bag ram | null item kind | **FAIL** |
| 3 | issue pipe shyam | issue (no entities) | **FAIL** |
| 4 | count inventory | null | **FAIL** |
| 5 | ram need cement | null | **FAIL** |
| 6 | deliver material site | delivery (no entities) | **PARTIAL** |
| 7 | cement send tomorrow | null | **FAIL** |
| 8 | stock count paint | inventory_count | **PASS** |

**Score: 1/8 PASS**

---

## Group 14C — Messy Hinglish

| # | Message | Result | Notes |
|---|---------|--------|-------|
| 1 | ram ko cement bhej do | **PARTIAL** | delivery but missing qty → blocked at backend |
| 2 | ram ko 20 wala cement de do | **FAIL** | issue + wrong item token |
| 3 | godown se pipe issue kar do | **FAIL** | issue kind only |
| 4 | paint ka count karwa do | **PASS** | inventory_count |
| 5 | shyam ko material nikal ke de do | **FAIL** | garbage item parse |
| 6 | cement ka stock dekh lo | **FAIL** | null — check vs count |
| 7 | inventory ka check karwa do | **FAIL** | null |

**Score: 1/7 PASS, 1 partial**

---

## Group 14D — Incomplete Intent

| Message | Extraction | Expected business behavior | Actual (design) | Result |
|---------|------------|---------------------------|-----------------|--------|
| ram ko de do | issue, Ram, no item | Ask what + how much | Inventory not found block | **PARTIAL** |
| cement bhej do | delivery, no item | Ask who + how much | Inventory not found block | **PARTIAL** |
| issue kar do | issue, all null | Ask who/what/qty | Inventory not found block | **PARTIAL** |
| count karwa do | inventory_count | Confirm assignee | Confirmation flow | **PASS** |
| stock dekh lo | null | Clarify or route elsewhere | Falls to /classify | **PASS** |

**Hallucination prevention:** **PASS** for null task_kind cases.  
**Clarification quality:** **FAIL** — blocking messages replace interactive "Who? What? How much?" wizard.

**Overall: PARTIAL**

---

## Group 14E — Ambiguous Business Language

| Message | Extraction | Silent assumption? | Result |
|---------|------------|-------------------|--------|
| ram ko wo cement de do | issue, item=wo cement | Yes — literal "wo cement" | **FAIL** |
| site wala material bhej do | delivery, no entities | No | **PASS** (no guess) |
| premium wala issue kar do | issue, no entities | No | **PASS** |
| same as last time kar do | null | No | **PASS** |
| usual stock bhej do | delivery, no entities | No | **PASS** |

**Overall: PARTIAL (3/5 acceptable)**

---

## Cross-Cutting Assessment

| Dimension | Rating | Comment |
|-----------|--------|---------|
| Extraction quality (MSME) | **Poor** | Most casual phrases miss |
| Task kind detection | **Fair** | Baseline OK; de do / godown weak |
| Assignee detection | **Fair** | `X ko` works; `X se` fails |
| Inventory detection | **Poor** | Filler words become "items" |
| Clarification handling | **Fair** | Blocks instead of converses |
| Confirmation quality | **Good** | When reached, summary is clear |

---

*End of real-world language report.*
