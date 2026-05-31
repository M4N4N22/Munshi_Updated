# Munshi Report Framework (Mandatory from Prompt 8)

Every future implementation report **must** include all five sections below. This lets Backend, LLM, and QA teams use the same document without cross-reading multiple prompts.

---

## SECTION A — Backend Implementation

What was built or changed in the NestJS backend: modules, APIs, entities, migrations, services, tests, env vars, and operational notes.

## SECTION B — LLM Requirements

What the ML service must implement, expose, or return: endpoints, schemas, parser behavior, model constraints, and deployment notes.

## SECTION C — Contract Requirements

Shared contract changes: JSON schemas, TypeScript types, Pydantic models, validation rules, and version bumps. Reference `contracts/` and `backend-llm-contract.md`.

## SECTION D — Training Data Requirements

Datasets, fixtures, few-shot examples, labeling guidelines, and evaluation sets needed for ML quality or regression testing.

## SECTION E — Future Automation Opportunities

What can be automated next (Procurement, Ledger, AA, cloud storage, batch jobs, observability) without redesigning the current architecture.

---

**Reports using this framework:** all `prompt-8-*.md` files and every report created after Prompt 8.
