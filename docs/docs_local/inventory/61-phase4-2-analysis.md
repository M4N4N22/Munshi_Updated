# Phase 4.2 — Resolution Analysis

**Run date:** 2026-06-06  
**Scope:** Backend entity resolution for Phase 4.1 ML extraction  
**Out of scope:** Task creation, WhatsApp wiring, workflows (Phase 4.3+)

---

## Objective

Convert `TaskInventoryExtraction` into backend-resolvable inventory items and workers, producing disambiguation payloads when matches are ambiguous.

---

## Inventory Search (Existing)

| Capability | Location | Notes |
|------------|----------|-------|
| List items | `InventoryRepository.listItems` | Paginated, includes category/location |
| Find by SKU | `InventoryRepository.findItemBySku` | Exact match |
| Find by name | `InventoryRepository.findItemByName` | `Op.iLike`, active only |
| Name hint in message | `InventoryService.findSkuByNameHint` | Substring in normalized message; WhatsApp-specific |
| Named entity pick | `inventory.validation.resolveNamedSelection` | ID/name from option list — workflow UI pattern |

**Gap:** No shared fuzzy matcher or structured resolver for NL extraction hints.

---

## User / Worker Lookup (Existing)

| Capability | Location | Notes |
|------------|----------|-------|
| Search users | `UserService.findAll({ search, factory_id })` | `LIKE` on name/phone |
| Factory members | `FactoryUser` + `User` join | Roles OWNER/MANAGER/WORKER |
| WhatsApp mention resolve | `WhatsAppService` | Slash commands, `@mention`, ML `worker_slug` |

**Gap:** No factory-scoped name resolver with partial/fuzzy tiers for NL assignee hints.

---

## Task Creation Flow (Reference Only)

- Structured: `/assign_delivery @worker SKU qty` → `TasksService` + inventory lines
- NL classify: `/assign` with `worker_slug` — no inventory linkage
- **Phase 4.2 does not modify this path**

---

## Workflow Engine (Reference Only)

- DB-backed sessions via `WorkflowSessionService`
- Phase 4.2 generates disambiguation **payloads only** — no session or conversation wiring

---

## Fuzzy Matching Utilities

**Before 4.2:** None in backend.

**Phase 4.2:** `fuzzy-match.util.ts` — Levenshtein distance + similarity ratio (0–1), shared by inventory and worker resolvers.

---

## Findings

| # | Finding | Phase 4.2 response |
|---|---------|-------------------|
| 1 | SKU lookup was exact-case only | Added `findItemBySkuIgnoreCase` |
| 2 | Bulk active items needed for partial/fuzzy | Added `findActiveItemSummaries` |
| 3 | Workers assignable = WORKER + MANAGER | Worker resolver filters roles |
| 4 | Ambiguity is common for "Ram", "cement" | Status `ambiguous` + candidate list |
| 5 | WhatsApp disambiguation not yet conversational | Payload models only |

---

*End of analysis.*
