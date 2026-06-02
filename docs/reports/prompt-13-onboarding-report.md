# Prompt 13 — Progressive Onboarding Report

**Date:** 2026-06-02 · **Sprint:** Business Discovery Expansion

---

## SECTION A — Backend Implementation

Business Discovery is expanded from four buckets to **six active onboarding domains** without a new onboarding app or mandatory wizard.

| Component | Path | Change |
|-----------|------|--------|
| Constants | `business-discovery.constants.ts` | Six buckets + legacy alias normalization |
| Field defs | `business-discovery.fields.ts` | Per-bucket prompts, repeatable buckets, `source_type` |
| Hygiene | `business-discovery.hygiene.ts` | Block/sanitize operational command pollution |
| Scoring | `business-discovery.scoring.ts` | Dynamic 6-bucket average overall % |
| Service | `business-discovery.service.ts` | `getReadiness`, `sanitizeProfileData`, `recordDocumentBucketField` |
| Integration | `business-discovery-integration.service.ts` | Module consumption of bucket_data |
| Handler | `business-discovery.handler.ts` | Entity resume, hygiene gate, repeatable managers/workers |
| Migration | `008_business_discovery_expansion.sql` | `manager_completion`, `workforce_completion` columns |
| APIs | `business-discovery.controller.ts` | `GET /business-discovery/readiness` |

**Design principles preserved:** non-blocking usage, workflow session persistence only, owner/manager access, pause/resume forever.

---

## SECTION B — LLM Requirements

No new ML models. Classifier must continue routing:

- Setup / continue phrases → `/business_discovery`, `/continue_discovery`
- Daily operations → existing operational intents (must not write discovery buckets)

Optional golden phrase additions for org/manager/workforce discovery NL (Hinglish).

---

## SECTION C — Contract Requirements

- `contracts/discovery-types.json` → **v2** (six buckets, `source_types`, repeatable flags)
- `docs/architecture/backend-llm-contract.md` → **§13** added
- Legacy bucket IDs remain readable in stored `bucket_data`

---

## SECTION D — Training Data Requirements

Add classification examples only (not bucket field extraction):

- "organization structure batana hai" → `/business_discovery`
- "manager ka phone number" (in setup context) → `/business_discovery`
- "inventory status batao" → `/inventory_status` (operational, not discovery write)

Do not train ML to populate `bucket_data` — backend owns state.

---

## SECTION E — Future Automation Opportunities

- Document parsers populate buckets with `source_type: DOCUMENT`
- Auto-suggest worker onboarding from `WORKFORCE_DISCOVERY.entry_*`
- Department creation from `ORGANIZATION_STRUCTURE.departments`
- Bookkeeping / ledger / banking buckets (reserved in contract)

---

## SECTION F — Production Considerations

- Run migration **008** before deploy
- Call `POST /business-discovery` sanitize or `sanitizeProfileData` for factories with polluted profiles (see production evidence audit)
- ML restart not required for backend-only Prompt 13 deploy

---

## SECTION G — Scalability Considerations

- Repeatable entities capped at scan window (20 entries) in scoring — sufficient for SMB factories
- `bucket_data` JSONB grows with entities; consider archival/partitioning at very large scale
- One ACTIVE workflow session per phone unchanged

---

## Success criteria met

Progressive onboarding across identity → org → managers → workforce → inventory → vendors without mandatory completion or platform redesign.
