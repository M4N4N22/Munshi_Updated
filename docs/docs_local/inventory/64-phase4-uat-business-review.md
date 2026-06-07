# Phase 4 UAT — Business Review

**Run date:** 2026-06-07  
**Reviewers:** UAT tester (business owner perspective)  
**Factory:** ABC Manufacturing

---

## Executive Summary

Phase 4 represents a **meaningful step toward conversational operations** for MSME owners who already text in short Hinglish commands. It is **not yet a full natural-language operating system** for inventory-linked work — godown-floor language, broken English, and partial sentences remain largely unsupported.

---

## Conversation Quality Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Naturalness** | 6/10 | Baseline phrases feel OK; everyday variants fail |
| **Clarity** | 7/10 | Confirmation card is structured and readable |
| **Discoverability** | 5/10 | Owner must guess supported phrasing; no in-chat examples |
| **Error recovery** | 6/10 | Clear blocks for not-found; weak multi-turn clarify |
| **Confidence** | 6/10 | Owner may unsure if message was understood |
| **Speed** | 7/10 | Two-message confirm is fast when extraction works |
| **Owner comfort** | 6/10 | Power users OK; casual speakers frustrated |
| **Worker comfort** | N/A | Notifications not live-tested |

**Overall conversation quality: 6/10**

---

## What Works Well (Business)

1. **Structured Hinglish commands** — *"Ram ko 20 cement deliver kar do"* feels natural and completes the mental model: say → confirm → done.
2. **Confirmation card** — Task type, worker, item, quantity visible before commit — builds trust.
3. **Numbered disambiguation** — Familiar pattern (like picking from a list).
4. **Inventory count** — *"Inventory count karwa do"* works without inventory lines — sensible for owners.
5. **No silent task creation** — Confirm step prevents accidental assignments.
6. **Slash commands preserved** — Existing trained users not broken.

---

## What Frustrates Owners (Business)

1. **"Ram se cement bhej do"** — Common phrasing ignored; feels like Munshi "didn't understand."
2. **"theek hai" not working** — Every Indian WhatsApp user says this to confirm.
3. **"de do" vs "deliver"** — Same Hindi intent, different system behavior.
4. **Godown sentences** — Real warehouse language produces nonsense items.
5. **Incomplete messages** — Error text instead of "Kaun? Kya? Kitna?"
6. **No live proof on phone** — Cannot sign off on notification experience.

---

## Role-Based Notes

| Role | Assessment |
|------|------------|
| **Owner** | Can use NL for baseline tasks after brief coaching |
| **Manager** | Same as owner if role allowed (orchestrator skips workers) |
| **Worker** | Cannot initiate NL inventory tasks — by design |
| **Inventory Manager** | No distinct role; uses owner/manager path |

---

## Production Readiness Inputs

| Criterion | Assessment |
|-----------|------------|
| Core journey complete | Yes for baseline phrases |
| MSME language coverage | Insufficient |
| Error UX | Acceptable blocks; weak clarify |
| Regression risk | Low (Phase 0–3 evidence) |
| Live validation gap | High — staging UAT required |

---

## Recommendations (Business — not implemented)

1. **Pilot with 3–5 coached phrases** before marketing "natural language."
2. **Add WhatsApp hint** after owner home: *"Try: Ram ko 20 cement deliver kar do"*
3. **Staging UAT** with real phones before PRODUCTION READY.
4. **Phase 4.5** focus: MSME phrase expansion + confirmation synonyms + clarify wizard.

---

*End of business review.*
