# Prompt 11 — Next Steps

## SECTION A — Backend Implementation

1. Add discovery endpoints to `scripts/swagger-smoke-test.mjs`.
2. Proactive WhatsApp reminder delivery (cron currently processes stages; outbound messaging TBD).
3. Wire GST certificate document type → `BUSINESS_IDENTITY` when parser enum exists.
4. Attendance sheet → `ORGANIZATION` bucket when document type registered.

## SECTION B — LLM Requirements

1. Monitor misclassification between `/business_discovery` and `/inventory_create` in production logs.
2. Add LLM contract drift CI job mirroring backend `contract-drift.spec.ts`.

## SECTION C — Contract Requirements

1. Bump `discovery-types.json` version when BOOKKEEPING bucket goes live.
2. Export OpenAPI schemas for readiness DTO to frontend dashboard.

## SECTION D — Training Data Requirements

1. Collect real owner utterances from WhatsApp (anonymized) for Hinglish resume phrases.
2. Add negative training for "add vendor" vs "import vendor list".

## SECTION E — Future Automation Opportunities

1. Discovery dashboard widget showing bucket completion without starting chat workflow.
2. Suggestion engine auto-start discovery when first document uploaded for new factory.
3. Complete BOOKKEEPING / LEDGER / BANKING buckets when finance modules ship (no redesign needed — extensible bucket order + future flag in contract).
