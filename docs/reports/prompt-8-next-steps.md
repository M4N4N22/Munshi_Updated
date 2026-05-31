# Prompt 8 — Next Steps

**Date:** 2026-05-29

---

## SECTION A — Backend Implementation

1. **Integration test** — upload CSV with ML service running (`ML_URL` + test factory/user).
2. **Cloud storage** — implement `GcsStorageProvider` behind `StorageProvider`.
3. **Observability** — metrics for orchestrator success/failure rates.
4. **Queue persistence** — optional migration if metadata JSON becomes insufficient.
5. **Swagger** — document full upload → workflow happy path in `api/docs`.

---

## SECTION B — LLM Requirements

1. Expand `CommandParser` / classifier coverage per `intent-classification-strategy.md`.
2. Add `PurchaseInvoiceParser` stub returning `UNKNOWN` with clear error.
3. Harden `/parse` error messages for backend audit logs.
4. Remove unused heavy deps (`torch`, `sentence-transformers`) if not used in production path.
5. Docker image update for `openpyxl`.

---

## SECTION C — Contract Requirements

1. Add `PURCHASE_INVOICE` extraction schema when Procurement phase starts.
2. CI sync check: backend `contracts/` ↔ LLM `contracts/`.
3. Bump to v2 only when breaking payload shapes.

---

## SECTION D — Training Data Requirements

1. Collect 10 real inventory CSV exports from pilot factories.
2. Label intent dataset for workflow commands (`/onboard_vendor`, etc.).
3. Build golden extraction files for CI.

---

## SECTION E — Future Automation Opportunities

| Phase | Reuses Prompt 8 stack |
|-------|-------------------------|
| Procurement | Same upload → parse → suggest → queue → workflow |
| Ledger | `LEDGER_EXPORT` parser + `CREATE_LEDGER_ENTRY` suggestions |
| AA (Analytics) | Read-only extractions, no execution |

No redesign required — extend `DocumentRegistry`, parsers, and suggestion processors.

---

## Success criteria checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Document upload works | Done (`POST /documents/upload`) |
| 2 | Storage abstraction exists | Done (`StorageProvider` + local) |
| 3 | Orchestrator exists | Done |
| 4 | Parser adapters exist | Done (backend + LLM) |
| 5 | Inventory import parser | Done |
| 6 | Stock register parser | Done |
| 7 | Contract validation | Done |
| 8 | Suggestion queue | Done |
| 9 | Workflow auto-trigger | Done |
| 10 | Shared contract package | Done |
| 11 | Reports updated | Done |
| 12 | Architecture extensible | Done |
