# Prompt 13 — Completion Engine Report

---

## SECTION A — Backend Implementation

**File:** `business-discovery.scoring.ts`

Six independent bucket scores:

| Bucket | DB column | Signals |
|--------|-----------|---------|
| Business Identity | `identity_completion` | Factory name/address + bucket fields |
| Organization Structure | `organization_completion` | Department count + org fields |
| Managers | `manager_completion` | Repeatable entries + manager count |
| Workforce | `workforce_completion` | Repeatable entries + worker count |
| Inventory | `inventory_completion` | Categories/items/locations + fields |
| Vendors | `vendor_completion` | Vendor count + vendor fields |

**Overall:** `Math.round(sum(six buckets) / 6)` — dynamic, not hardcoded weights.

**Auto-complete:** profile `status=COMPLETED` when `overall >= 100`.

Legacy `ORGANIZATION.*`, `INVENTORY.*`, `VENDORS.*` keys still contribute via `legacyHasField()`.

---

## SECTION B — LLM Requirements

None for scoring — backend-only.

---

## SECTION C — Contract Requirements

`discovery-types.json`: `"readiness_formula": "average of six active bucket completion percentages"`.

Readiness API returns `organization_structure`, `managers`, `workforce` plus deprecated alias `organization`.

---

## SECTION D — Training Data Requirements

N/A

---

## SECTION E — Future Automation Opportunities

Document boost (`{bucket}_document_boost`) can fold into bucket formulas when document pipeline matures.

---

## SECTION F — Production Considerations

Migration 008 adds columns with DEFAULT 0 — safe on existing factories.

---

## SECTION G — Scalability Considerations

`refreshScores` runs DB counts per factory on read — acceptable for current scale; cache if hot path emerges.

---

## Tests

`business-discovery.scoring.spec.ts` — six-bucket average, repeatable manager entries.
