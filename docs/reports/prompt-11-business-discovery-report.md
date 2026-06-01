# Prompt 11 — Business Discovery Report

## SECTION A — Backend Implementation

Progressive **Business Discovery** replaces mandatory onboarding. Owners use Munshi immediately; Munshi learns over time.

| Component | Location |
|-----------|----------|
| Profile table | `migrations/007_business_discovery.sql` → `business_discovery_profiles` |
| Domain module | `src/services/business-discovery/*` |
| Workflow | `BUSINESS_DISCOVERY` handler — `MENU` / `COLLECT` steps |
| APIs | `GET/POST /business-discovery/*` (factory-scoped) |
| Scoring | `business-discovery.scoring.ts` — identity, org, inventory, vendors, overall |
| Documents | `BusinessDiscoveryDocumentService` hooks orchestrator post-parse |
| Reminders | `BusinessDiscoveryReminderCronService` — hourly scheduled lookup |

Profile fields: `status`, per-bucket completion, `overall_completion`, `bucket_data`, `reminder_stage`, `last_activity_at`, `next_reminder_at`.

Status enum: `ACTIVE`, `PAUSED`, `COMPLETED`. Discovery never blocks other Munshi features.

## SECTION B — LLM Requirements

Classify owner phrases to `/business_discovery` or `/continue_discovery` before workflow router starts session. Support English, Hindi, Hinglish. Distinguish "import inventory list" (discovery) from "create inventory item" (inventory workflow).

## SECTION C — Contract Requirements

- `contracts/discovery-types.json` — buckets + document map
- `contracts/intent-types.json` — `/business_discovery`, `/continue_discovery`
- `contracts/workflow-types.json` — `BUSINESS_DISCOVERY`
- `docs/architecture/backend-llm-contract.md` §12

## SECTION D — Training Data Requirements

Few-shot examples for setup/resume phrases; negative examples near `/onboard_vendor`, `/inventory_create`, `/purchase_request_create`. Hinglish resume: "setup wapas karo", "mera business setup karna hai".

## SECTION E — Future Automation Opportunities

Auto-nudge owners when document uploads raise a bucket without starting workflow; BOOKKEEPING / LEDGER / BANKING buckets when finance modules ship.
