# Prompt 13 — Workflow Report

**Workflow type:** `BUSINESS_DISCOVERY` · **Engine:** existing `workflow_sessions`

---

## SECTION A — Backend Implementation

Steps unchanged: `MENU` → `COLLECT` (per field). Session data expanded:

```typescript
{
  current_bucket: ActiveDiscoveryBucket;
  field_index: number;
  entity_index: number;      // Manager #4 → 3
  awaiting_more: boolean;    // Repeatable bucket loop
}
```

**Repeatable buckets:** `MANAGER_DISCOVERY`, `WORKFORCE_DISCOVERY` — after four fields, prompt "Add another? yes/skip".

**Pause:** `pause` / `/pause` / `later` → profile PAUSED, session COMPLETED.

**Resume:** `/business_discovery` or `/continue_discovery` → new session; menu restores `field_index` + `entity_index` from persisted session_data when same bucket selected.

**Hygiene:** Operational commands in COLLECT rejected before `recordBucketField`.

---

## SECTION B — LLM Requirements

Classify setup vs ops only. Workflow step progression is backend-driven.

---

## SECTION C — Contract Requirements

§13 Resume contract in `backend-llm-contract.md`. `workflow-types.json` unchanged (`BUSINESS_DISCOVERY`).

---

## SECTION D — Training Data Requirements

Phrases for "continue setup", "business discovery resume" → `/continue_discovery`.

---

## SECTION E — Future Automation Opportunities

WhatsApp reminder cron linking to workflow resume prompt with bucket label.

---

## SECTION F — Production Considerations

Stale session TTL (24h default) expires ACTIVE sessions; profile `bucket_data` retains progress — user can restart discovery without data loss.

---

## SECTION G — Scalability Considerations

Concurrent discovery on different phones (owner vs manager) isolated by `phone_number` unique ACTIVE constraint.

---

## Validation

Tests: `business-discovery.handler.spec.ts` — pause, hygiene block, workforce entity_index resume.
