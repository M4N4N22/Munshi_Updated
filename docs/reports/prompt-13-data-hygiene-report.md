# Prompt 13 — Data Hygiene Report

---

## SECTION A — Backend Implementation

**Problem (production audit):** Operational WhatsApp phrases stored in `bucket_data` (e.g. `BUSINESS_IDENTITY.address = "inventory status batao"`).

**Root cause:** Discovery COLLECT step accepted any text; test runs interleaved ops phrases with discovery.

**Fix (production-safe, multi-factory):**

1. **`business-discovery.hygiene.ts`**
   - `isOperationalCommand()` — regex guard for inventory, PR, tasks, attendance, reports, slash commands
   - `sanitizeBucketData()` — strip polluted string values on read/write

2. **`business-discovery.handler.ts`**
   - COLLECT rejects operational input before `recordBucketField`
   - MENU rejects operational default-to-identity for command-like text

3. **`business-discovery.service.ts`**
   - All profile reads/writes pass through `sanitizeBucketData`
   - `sanitizeProfileData(factoryId)` for ops cleanup

**Only workflow COLLECT path writes bucket fields** — operational modules never call `recordBucketField`.

---

## SECTION B — LLM Requirements

Correct classification reduces wrong-path discovery starts; hygiene is backend enforcement regardless of ML accuracy.

---

## SECTION C — Contract Requirements

§13 Data hygiene contract documents blocked phrase classes and `{field}__source` metadata.

---

## SECTION D — Training Data Requirements

Ensure golden set separates "inventory status batao" → operational intent, not discovery field capture.

---

## SECTION E — Future Automation Opportunities

ML confidence threshold to suggest "exit discovery" when user sends operational intent repeatedly.

---

## SECTION F — Production Considerations

Run `sanitizeProfileData` once per factory before customer go-live if audit showed pollution.

---

## SECTION G — Scalability Considerations

Regex list is O(n) per message — negligible vs WhatsApp round-trip.

---

## Tests

`business-discovery.hygiene.spec.ts`, handler operational block test, service sanitize test.
