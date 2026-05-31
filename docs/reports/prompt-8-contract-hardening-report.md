# Prompt 8 — Contract Hardening Report

**Date:** 2026-05-29  
**Scope:** Shared `contracts/` package, validation layer, LLM schema audit

---

## SECTION A — Backend Implementation

### Shared package

```
contracts/
├── document-types.json
├── suggestion-types.json
├── workflow-types.json
├── intent-types.json
├── schemas/
│   ├── classify-response.json
│   ├── inventory-import-extraction.json
│   └── stock-register-extraction.json
├── typescript/index.ts
└── python/models.py
```

### Validation layer

| Service | Role |
|---------|------|
| `ContractValidationService` | Validates against shared types + registry |
| `ExtractionAuditService` | Appends to `document.metadata.extraction_audit` |
| `DocumentExtractionContractService` | Item-level normalization (existing) |

Invalid extractions: logged, job marked failed (when `job_id` present), `BadRequestException` thrown.

### TypeScript consumption

- `ContractValidationService` imports `DOCUMENT_TYPES` from `contracts/typescript/index.ts`
- `tsconfig.json` includes `contracts/**/*`

---

## SECTION B — LLM Requirements

### Audit fixes

| Issue | Resolution |
|-------|------------|
| Missing `reject_reason` on `/classify` | Added to `contracts/python/models.py` and used as FastAPI response model |
| No `/parse` contract | Added `ParseResponse` Pydantic model |

### LLM repo mirror

Copied `contracts/` into `Munshi-Dada-Phase-1-main/contracts/` (JSON + Python).

---

## SECTION C — Contract Requirements

**Source of truth order:**

1. `docs/architecture/backend-llm-contract.md`
2. `contracts/schemas/*.json`
3. Generated/consumed TS + Python models

**Version:** v1 (unchanged)

Breaking changes require bump in both repos and migration notes.

---

## SECTION D — Training Data Requirements

- Contract regression fixtures: one valid + one invalid payload per document type.
- LLM `eval/contract_eval.py` runs automated compliance checks.

---

## SECTION E — Future Automation Opportunities

- CI job: diff JSON schemas → regenerate TS/Python.
- JSON Schema validator (`ajv`) in backend for stricter field typing.
- OpenAPI export from shared schemas for Swagger alignment.
