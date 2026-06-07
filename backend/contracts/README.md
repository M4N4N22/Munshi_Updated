# Munshi Shared Contracts

Single source of truth for Backend (TypeScript) and LLM (Python) integration.

**Rule:** LLM produces structured output only. Backend validates, suggests, approves, and executes.

## Contents

| File | Purpose |
|------|---------|
| `document-types.json` | Canonical document type enum |
| `suggestion-types.json` | Suggestion type enum |
| `workflow-types.json` | Workflow type enum |
| `intent-types.json` | ML intent catalog |
| `schemas/classify-response.json` | `/classify` response schema |
| `schemas/inventory-import-extraction.json` | INVENTORY_IMPORT extraction |
| `schemas/stock-register-extraction.json` | STOCK_REGISTER extraction |
| `schemas/task-inventory-extraction.json` | Phase 4.1 NL task extraction |
| `schemas/task-inventory-resolve-request.json` | Phase 4.2 resolver request |
| `schemas/task-inventory-resolution.json` | Phase 4.2 resolver response |
| `task-kinds.json` | Allowed `task_kind` values for NL extraction |
| `typescript/` | Generated/consumed TS types |
| `python/` | Pydantic models for LLM service |

## Version

Contract version: **v1**

When breaking changes occur, bump version in both repos and update `backend-llm-contract.md`.
