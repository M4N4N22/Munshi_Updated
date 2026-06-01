# Procurement Experience Report — Purchase Requests

**Rating: 2 / 10**

---

## Natural language tests (production ML)

| Message | Expected | Prod ML | Result |
|---------|----------|---------|--------|
| "packaging tape khatam hone wali hai" | Low-stock awareness / PR | `general_chat` | **FAIL** |
| "50 rolls order karne hain" | `/purchase_request_create` | `/depart_assign` | **FAIL** |
| "purchase request bana do" | `/purchase_request_create` | `/depart_assign` | **FAIL** |
| "vendor assign kar do purchase request pe" | PR workflow step | `/depart_assign` | **FAIL** |
| "purchase request ka status kya hai" | Status query | `general_chat` | **FAIL** |

**0/5 procurement-related NL intents passed.**

---

## Backend state (factory 3)

- **6 purchase requests** exist (mostly `DRAFT`, smoke-test titles "Audit smoke PR")
- Low-stock suggestions: **empty** (no items below reorder level)
- Full lifecycle implemented in backend: create → approve → assign vendor → close

---

## Local LLM comparison

Local pre-classifier:

- "purchase request bana do" → `/purchase_request_create` ✓
- "packaging tape khatam hone wali hai" → `general_chat` (gap even locally)

---

## Lifecycle phases (not exercised E2E)

| Phase | NL tested | E2E executed |
|-------|-----------|--------------|
| PR creation | FAIL (intent) | No |
| Approval | Not tested | No |
| Vendor assignment | FAIL (intent) | No |
| Low-stock suggestion → PR | Not testable (no low stock) | No |
| Close | Not tested | No |

---

## Friction points

1. **Critical misroute:** PR phrases become `/depart_assign` — owner thinks they're ordering materials; Munshi assigns a department task.
2. No NL status query for existing PRs.
3. Low-stock natural phrases ("khatam hone wali hai") not mapped to procurement.
4. Approval/vendor steps require active workflow session — unreachable without correct first intent.

---

## Rating rationale

**2/10** — Procurement foundation exists in backend and migrations. **Natural-language entry is broken** on production ML. Would cause serious trust damage if a owner tried to order 50 rolls of tape.

---

## LOCAL VALIDATION RESULTS

| Message | Local ML | Prod ML (webhook) | PR count after story |
|---------|----------|-------------------|----------------------|
| purchase request bana do packaging tape ke liye | `/purchase_request_create` | `/depart_assign` | **6** (unchanged) |
| packaging tape khatam hone wali hai 50 rolls chahiye | `general_chat` | `/depart_assign` | **6** |

Local ML handles explicit PR create; low-stock Hindi phrase fails even locally — **product gap**.

No new PR created in continuous story via webhook.

### Local procurement rating: **4/10**

Explicit PR phrase works on local ML only. Low-stock → procurement not mapped locally or on prod. Full lifecycle not completed in story.
