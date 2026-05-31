# Backend ↔ LLM Gap Analysis

**Date:** 2026-05-30  
**Method:** Compare backend expectations vs LLM repository current state

---

## Summary matrix

| Area | Backend ready | LLM ready | Gap severity |
|------|---------------|-----------|--------------|
| Core intent classification | Yes | Mostly | Medium |
| Workflow intents | Yes | Partial | Medium |
| `reject_reason` field | Yes | **Broken schema** | **High** |
| Document parsing | Yes (store/validate) | **None** | **High** |
| Document → suggestions | Yes | N/A (backend) | LLM must feed extractions |
| `/convert` endpoint | Optional | Yes | Low (not wired) |
| Auth / observability | Weak | None | Medium |
| Procurement / ledger | Registry only | None | Expected (future) |

---

## Compatible areas

### Intent classification (core operations)

| Intent | Backend handler | LLM support |
|--------|-----------------|-------------|
| `/tasks` | Yes | Slash + LLM |
| `/present`, `/absent` | Yes | Slash + LLM |
| `/complete` | Yes | Deterministic + LLM |
| `/assign` | Yes | LLM + @mention rules |
| `/depart_assign` | Yes | LLM (4 departments) |
| `/mgrassign`, `/mgrself` | Yes | LLM + deterministic |
| `/mgrtransfer`, `/mgrreject` | Yes | Slash + LLM |
| `/issue`, `/issues`, `/resolve` | Yes | Slash + LLM |
| `/help`, `/report`, `/members` | Yes | Slash + LLM |
| `general_chat` | Yes | LLM with message field |

### Date/time extraction

LLM `DateTimeExtractor` produces `deadline` backend consumes via `classifyDeadlineRawInput`.

### Department slugs

Both sides use: `operations`, `sales`, `purchase`, `it`.

### Architectural alignment

Both repos respect: **LLM classifies/parses; backend executes.**

---

## Missing contracts

| Contract | Backend expects | LLM provides |
|----------|-----------------|--------------|
| `reject_reason` in `/classify` response | Yes (`parseMlClassifyResponse`) | Produced internally but **stripped by FastAPI model** |
| Document extraction POST to backend | `POST /documents/:id/extractions` | No parser, no HTTP client |
| Document upload trigger intent | Future REST/ML routing | Not defined |
| Workflow intents in few-shot | `/onboard_vendor`, `/onboard_worker`, `/inventory_create` | **Not in LLM few-shot examples** |
| Confidence score | Not required today | Not provided |
| User context (factory_id, role) | Backend resolves from phone | ML has no user context |

---

## Missing outputs

| Output | Needed for | LLM status |
|--------|------------|------------|
| Structured document JSON | Document pipeline | Missing entirely |
| `reject_reason` | `/mgrreject` NL | Dropped at API layer |
| `/onboard_vendor` intent | Vendor workflow via NL | Unreliable (not in few-shot) |
| `/inventory_create` intent | Inventory workflow via NL | Unreliable |
| Extraction confidence | Low-quality guardrails | Missing |
| Parser error codes | Backend `FAILED` status | Missing |

---

## Missing inputs

| Input | Backend has | LLM needs |
|-------|-------------|-----------|
| Factory inventory snapshot | Yes | For smarter NEW_ITEM vs STOCK_IN (optional) |
| Registered user phone → role | Yes | Could improve intent disambiguation |
| Document bytes / storage_ref | Metadata in backend | Parser input |
| Active workflow state | Backend session | LLM should not need (by design) |

---

## Potential risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **reject_reason loss** | `/mgrreject` NL fails without reason | Fix LLM `ClassifyResponse` schema |
| **Workflow intent gap** | Users say "add vendor" → may get `general_chat` | Add few-shot + eval for workflow intents |
| **ML bypass during workflow** | Active session skips ML | By design — document intents need REST path |
| **No document parser** | Document pipeline blocked on LLM side | Build parser service posting to backend REST |
| **Open ML endpoint** | No auth on `/classify` | Network isolation or API key |
| **Model drift** | `gpt-4.1-mini` updates change behavior | Eval harness + pinned model version |
| **False task id** | Bare numbers trigger `/mgrassign` rules | Tighten deterministic regex |
| **Heavy LLM Docker image** | Unused torch deps | Slim requirements for prod |

---

## Potential refactors (documentation only — do not implement)

| Area | Suggestion |
|------|------------|
| LLM API | JSON body instead of query string |
| LLM API | Add `reject_reason` to response model |
| LLM API | Version prefix `/v1/classify` |
| Backend | Wire `/convert` for outbound message humanization |
| Backend | Pass optional context to ML (role, locale) |
| Both | Shared OpenAPI spec generated from contract doc |
| LLM | Remove commented duplicate code in bot_engine.py |
| LLM | Remove unused ML dependencies |

---

## Potential simplifications

| Simplification | Benefit |
|----------------|---------|
| Single shared `contracts/` package or JSON Schema repo | One source of truth |
| LLM document parser as separate FastAPI router `/parse` | Clear separation from `/classify` |
| Backend document upload webhook triggers LLM async | Clean async pipeline |
| Intent catalog YAML consumed by both repos | Drift prevention |

---

## Backend currently expects (not yet LLM-delivered)

1. Document extractions for 6+ document types
2. Reliable NL triggers for 4 workflow commands
3. `reject_reason` on `/mgrreject`
4. Future: purchase invoice → vendor + stock suggestions
5. Future: ledger/bank statement extractions

## LLM currently produces (fully working)

1. NL → slash intent + slots for ~18 intents
2. Slash fast-path for ~12 commands
3. General chat replies
4. WA template conversion (`/convert`)
5. Hindi/English/Hinglish date extraction

---

*Related: [backend-llm-contract.md](./backend-llm-contract.md) · [implementation-roadmap-v2.md](./implementation-roadmap-v2.md)*
