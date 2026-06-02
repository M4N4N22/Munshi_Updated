# Prompt 13 — Contract Report

---

## SECTION A — Backend Implementation

Contracts updated to reflect six-bucket progressive onboarding without breaking v1 consumers.

| Artifact | Version | Change |
|----------|---------|--------|
| `contracts/discovery-types.json` | v2 | Six buckets, repeatable flags, `source_types`, legacy_aliases |
| `docs/architecture/backend-llm-contract.md` | §13 | Full Prompt 13 contract section |
| §12 table | — | Document map uses `INVENTORY_DISCOVERY` / `VENDOR_DISCOVERY` |

New API surface documented: `GET /business-discovery/readiness`.

---

## SECTION B — LLM Requirements

| Contract | LLM role |
|----------|----------|
| Business Discovery | Classify `/business_discovery`, `/continue_discovery` |
| Organization Discovery | NL routed via discovery workflow (no separate intent required) |
| Manager / Workforce Discovery | Same — workflow bucket selection |
| Inventory / Vendor Discovery | Operational workflows separate; discovery buckets via chat |
| Completion Score | Backend computes — ML returns no scores |
| Resume | `/continue_discovery` alias |
| Document Source | Backend stores `CHAT`/`DOCUMENT` — ML parsing future |

---

## SECTION C — Contract Requirements

All contracts in §13 of `backend-llm-contract.md`:

- Organization Discovery Contract
- Manager Discovery Contract
- Workforce Discovery Contract
- Inventory Discovery Contract
- Vendor Discovery Contract
- Completion Score Contract
- Resume Contract
- Document Source Contract

Shared JSON: `contracts/discovery-types.json`.

---

## SECTION D — Training Data Requirements

Extend `contracts/intent-types.json` discovery_phrases if needed for org/manager NL — optional this sprint.

No LLM contract changes for bucket field schemas.

---

## SECTION E — Future Automation Opportunities

`contracts/typescript/index.ts` can export `DiscoveryBucketV2` union when frontend consumes readiness dashboard.

---

## SECTION F — Production Considerations

Coordinate deploy: backend + contract v2; LLM repo unchanged unless golden phrases added.

---

## SECTION G — Scalability Considerations

Contract versioning table should bump discovery to v2 when external integrators depend on four-bucket shape.

---

## Files touched

- `contracts/discovery-types.json`
- `docs/architecture/backend-llm-contract.md`
