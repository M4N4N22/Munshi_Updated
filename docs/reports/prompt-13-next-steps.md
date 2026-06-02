# Prompt 13 — Next Steps

---

## SECTION A — Backend Implementation

Completed in this sprint:

- Six-bucket discovery domain
- Progressive manager/workforce entity collection
- Dynamic completion engine
- Data hygiene layer
- Module integration service
- Migration 008
- `GET /business-discovery/readiness`

---

## SECTION B — LLM Requirements

**Recommended follow-ups:**

1. Add Hinglish golden phrases for org/manager/workforce discovery to `bot_engine.py` operational pre-classify exclusions (avoid misrouting setup phrases)
2. Extend golden E2E with six-bucket progress assertion after discovery session

---

## SECTION C — Contract Requirements

1. Bump `contracts/typescript/index.ts` with v2 discovery types when dashboard work starts
2. Publish contract v2 note to LLM repo README

---

## SECTION D — Training Data Requirements

1. Separate training rows for "setup" vs "operational inventory" phrases
2. Document-assisted examples stubbed with `source_type: DOCUMENT` for future parser sprint

---

## SECTION E — Future Automation Opportunities

| Priority | Item |
|----------|------|
| P1 | Wire `getDiscoveredManagers()` into worker onboarding pre-fill |
| P1 | Department auto-create from org discovery fields |
| P2 | Document parser writes `source_type: DOCUMENT` fields |
| P3 | BOOKKEEPING / LEDGER / BANKING buckets (reserved) |
| P3 | Readiness dashboard UI consuming `/readiness` |

---

## SECTION F — Production Considerations

1. Deploy migration **008_business_discovery_expansion.sql**
2. Run `sanitizeProfileData` on factory 3 (and prod factories) if polluted
3. Re-run production evidence audit discovery section after hygiene deploy
4. Update runbook: discovery never blocks ops; pause/resume documented for support

---

## SECTION G — Scalability Considerations

1. Monitor `bucket_data` JSONB size per factory
2. Consider caching `getProgress` if API becomes hot
3. Batch reminder cron already hourly — sufficient for MVP scale

---

## Out of scope (unchanged)

Vendor quotations, invoices, GRN, inventory automation, auto procurement, ledger, bookkeeping, Tally, forecasting, BI.

---

## Success criteria checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Discovery supports onboarding expansion | ✅ |
| 2 | Organization discovery | ✅ |
| 3 | Manager discovery | ✅ |
| 4 | Workforce discovery | ✅ |
| 5 | Inventory discovery | ✅ |
| 6 | Vendor discovery | ✅ |
| 7 | Dynamic completion | ✅ |
| 8 | Pause / resume | ✅ |
| 9 | Document source architecture | ✅ |
| 10 | Module integration | ✅ |
| 11 | Data hygiene | ✅ |
| 12 | Contracts updated | ✅ |
| 13 | Tests implemented | ✅ |
| 14 | Reports generated | ✅ |
| 15 | Progressive self-onboarding | ✅ |
