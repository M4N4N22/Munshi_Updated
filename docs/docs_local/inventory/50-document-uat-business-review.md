# Document UAT — Business Experience Review

**Run date:** 2026-06-06  
**Perspective:** MSME owner (ABC Manufacturing)

---

## Business Question

> Would a real MSME owner trust and use Munshi's document parsing workflow?

**Answer:** **Conditionally yes** for structured supplier CSV/Excel sheets uploaded via web/API with review step; **no** for invoice photos, WhatsApp-only users, or duplicate-heavy supplier lists.

---

## Upload Simplicity — **PARTIAL**

| Aspect | Rating | Notes |
|--------|--------|-------|
| REST upload | Good | Single multipart form |
| One-click auto process | **Poor** | Fails when messaging auth missing |
| WhatsApp upload | **N/A** | Parsing pipeline not wired |
| File type clarity | **Poor** | PDF accepted; not parseable |

**Owner quote (simulated):** “CSV bhej sakta hoon, lekin photo invoice ka kya?”

---

## Suggestion Review Clarity — **GOOD**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Suggestion type | Clear | `INITIAL_INVENTORY_IMPORT` with item count |
| YES/NO workflow | Clear | Familiar WhatsApp pattern |
| Item preview in message | **Not verified** | Messaging 401 blocked live copy review |
| Duplicate visibility | **Poor** | Doc B shows 5 items in suggestion, 2 in ledger |

---

## Approval Workflow — **GOOD**

| Step | Business-friendly? |
|------|-------------------|
| Nothing auto-applied | **Yes** — builds trust |
| Explicit YES required | **Yes** |
| Reject path (NO) | Available (not live-tested) |

---

## Inventory Creation — **GOOD** (clean data)

12/12 and 25/25 items created correctly with accurate quantities and units on Documents A, E, F.

---

## Error Messages — **MIXED**

| Scenario | Message quality |
|----------|-----------------|
| Empty file | **Good** — 400 at upload |
| Corrupt CSV | **Good** — 422 at parse |
| PDF upload | **Poor** — silent until parse |
| auto_process fail | **Poor** — technical 401 |

---

## Recovery Experience — **PARTIAL**

| Scenario | Recovery |
|----------|----------|
| Parse fail | Document marked FAILED; user can re-upload |
| Wrong YES | No undo documented — **risk** |
| Partial duplicate import | **No warning** — silent data loss |

---

## Business Confidence — **CONDITIONAL**

| Trust factor | Score |
|--------------|-------|
| Clean structured sheet | **High** |
| Duplicate rows | **Low** |
| Missing quantities | **Medium** (zero stock honest) |
| Invoice PDF | **None** (not supported) |
| WhatsApp-only operation | **Low** |

---

## CSV vs Document Path (Owner decision guide)

| Use CSV import when… | Use document parse when… |
|----------------------|--------------------------|
| File matches Munshi template | *(Today: rarely)* — same CSV via REST adds approval only |
| Need reorder thresholds | Need human approval audit trail |
| WhatsApp `/inventory_import_csv` | REST upload with review |

**Honest assessment:** For identical CSV content, **CSV import is strictly better** for MSME today (fewer steps, thresholds, WhatsApp path).

Document parsing adds value when suggestion review catches errors — **not yet proven** because duplicates aren't surfaced.

---

## Step 8 Summary

| Criterion | Result |
|-----------|--------|
| Upload simplicity | **PARTIAL** |
| Suggestion review | **GOOD** |
| Approval workflow | **GOOD** |
| Inventory creation | **GOOD** |
| Error messages | **MIXED** |
| Recovery | **PARTIAL** |
| Business confidence | **CONDITIONAL** |

---

## Conversation UX (see `50-uat-conversation-review.md`)

WhatsApp YES/NO pattern is appropriate for MSME literacy; messaging delivery must be reliable for trust.
