# UAT Conversation Quality Review

**Run date:** 2026-06-06  
**Scope:** WhatsApp-first MSME experience across UAT 49 + UAT 7A

---

## Evaluation Questions

### 1. Does conversation feel natural?

**Rating: PARTIAL (3/5)**

| Strength | Weakness |
|----------|----------|
| Hindi/Hinglish mix matches MSME users | REST document upload breaks WhatsApp-only narrative |
| YES/NO approval is familiar | Technical 401 errors leak to API testers |
| Slash commands predictable | Duplicate import gives no conversational warning |

**Example gap:** Document B — Munshi says “5 items detected” but creates 2. Owner trust erodes.

---

### 2. Does user always know next step?

**Rating: GOOD (4/5)**

| Flow | Next step clear? |
|------|------------------|
| /help | **Yes** |
| /onboard_worker | **Yes** — step prompts |
| /inventory_import_csv | **Yes** — “send CSV” |
| Suggestion approval | **Yes** — YES/NO |
| Low stock → PR CTA | **Yes** — itemId in command |
| Document upload fail (401) | **No** |
| PDF upload | **No** — accepted then fails silently |

---

### 3. Are responses too technical?

**Rating: GOOD (4/5)**

User-facing copy uses item names, quantities, Hindi errors (“Stock kam hai”).  
API-level failures expose “Authentication required. Use X-API-Key header” — **not MSME-friendly** (defect).

---

### 4. Are commands discoverable?

**Rating: GOOD (4/5)**

- `/help` comprehensive  
- Owner home menu surfaces key actions  
- **Gap:** No command for “upload supplier sheet for review” — owner must know REST or use CSV shortcut

---

### 5. Are responses concise enough for WhatsApp?

**Rating: GOOD (4/5)**

Inventory status, low-stock alerts, and task summaries fit one–two screens.  
Large import summaries (25 items) may need pagination — not tested in live WA copy.

---

### 6. Would a real MSME owner be comfortable using this?

**Rating: CONDITIONAL (3.5/5)**

| Comfortable when… | Uncomfortable when… |
|-------------------|---------------------|
| Already on WhatsApp daily | Must use web/API for document parse |
| Structured CSV from supplier | Supplier sends PDF invoice |
| Single clean import | Duplicate lines in supplier sheet |
| Messaging credentials work | Confirmation messages fail after YES |

---

## Document Parsing Conversation Specifics

| Topic | Assessment |
|-------|------------|
| Suggestion prompt | Trust-building (“review before YES”) |
| Missing WhatsApp upload to parse | **Major gap** for WhatsApp-first product |
| CSV vs parse messaging | Owner may not understand two paths |
| Post-YES silence (401) | **Damaging** — user unsure if import worked |

---

## Recommendations (documentation / product — not implemented in UAT)

1. Unify messaging: “CSV quick import” vs “import with review” in `/help`.  
2. After YES, always return in-channel summary (items created count) even if external send fails.  
3. Warn in suggestion text when duplicate SKUs detected.  
4. Reject PDF at upload with Hindi: “Abhi sirf CSV/Excel support hai.”

---

## Conversation UX Readiness

| Dimension | Score | Ready? |
|-----------|-------|--------|
| Naturalness | 3/5 | Partial |
| Next-step clarity | 4/5 | Yes |
| Non-technical copy | 4/5 | Yes |
| Discoverability | 4/5 | Yes |
| Conciseness | 4/5 | Yes |
| MSME comfort | 3.5/5 | Conditional |

**Overall conversation UX:** **CONDITIONAL** — strong for commands and approvals; weak for document path entry and error feedback.

---

## Signoff Link

Supports **CONDITIONAL** verdict in `50-document-uat-signoff.md`.
