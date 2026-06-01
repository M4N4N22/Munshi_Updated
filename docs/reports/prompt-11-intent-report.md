# Prompt 11 — Intent Report

## SECTION A — Backend Implementation

Workflow registry accepts `/business_discovery` and `/continue_discovery` (alias). WhatsApp router uses ML classify → `startWorkflowFromMlCommand`.

## SECTION B — LLM Requirements

Added to `bot_engine.py`:

| Intent | Example phrases |
|--------|-----------------|
| `/business_discovery` | tell you about my business, setup my business, register my company, update company details, import inventory list, import vendors, mera business setup karna hai |
| `/continue_discovery` | continue setup, continue onboarding, setup wapas karo, resume discovery |

Pre-classifier regex runs before LLM. Few-shot examples added to system prompt. `VALID_INTENTS` updated.

## SECTION C — Contract Requirements

Both intents in `contracts/intent-types.json` (backend + LLM repos). Contract drift test enforces presence.

## SECTION D — Training Data Requirements

Expand Hinglish variants: "company register karo", "business details update", "inventory sheet import". Negative pairs with `/inventory_create` and `/onboard_vendor`.

## SECTION E — Future Automation Opportunities

Intent for "discovery progress" read-only query without starting workflow session.
