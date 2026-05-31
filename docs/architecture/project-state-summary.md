# Project State Summary

**Date:** 2026-05-30  
**Repositories:** Munshi Backend + Munshi LLM (Phase-1)  
**Analysis type:** Documentation only — no code changes

---

## 1. What has been built?

### Backend (Munshi NestJS)

| Area | Status |
|------|--------|
| WhatsApp orchestration | **Live** — webhook, ML routing, Olli send |
| Core operations | **Live** — tasks, attendance, issues, reports, departments |
| Workflow engine | **Live** — 4 workflow types, TTL, cancel, expiry cron |
| Vendor management | **Live** — REST CRUD + WhatsApp onboarding |
| Worker onboarding | **Live** — WhatsApp workflow |
| Inventory | **Live** — CRUD, transactions, low stock, `/inventory_create`, `/inventory_status` |
| Document foundation | **Live** — entities, registry, extraction storage, REST API |
| Suggestion engine | **Live** — generate suggestions; inventory bootstrap + new item + stock-in |
| Suggestion approval | **Live** — workflow YES/NO + execution service |
| Procurement / approvals | **Skeleton** — REST stubs only |
| Ledger / finance / AA | **Not started** — registry contracts only |

**Stats:** 21 DB tables · 95 tests · 4 workflows · 23+ WhatsApp commands · Swagger at `/api/docs`

### LLM (Munshi Phase-1 FastAPI)

| Area | Status |
|------|--------|
| Intent classification | **Live** — hybrid parser + OpenAI |
| General chat | **Live** — scoped Hinglish replies |
| WA message convert | **Live** — `/convert` endpoint |
| Document parsing | **Not started** |
| Training / eval | **Not started** |
| Local ML models | **Not used** (deps listed but unused) |

**Stats:** 2 Python modules · 4 API endpoints · 1 env var (`OPENAI_API_KEY`)

---

## 2. What remains?

### Backend

- Document file upload + storage
- Auto WhatsApp notify on suggestions
- Suggestion queue (multi-suggestion sequential approval)
- Procurement CRUD + approval business logic
- Execute `CREATE_VENDOR`, `STOCK_OUT`, `INVENTORY_ADJUSTMENT` suggestions
- Ledger + account aggregator modules
- REST authentication guards
- Quantity reconciliation cron

### LLM

- Document parser (`/parse` or similar)
- All document type extractors (6+ types)
- Fix `reject_reason` API schema gap
- Workflow intent few-shot coverage
- Eval harness + labeled dataset
- Confidence scoring
- API auth + slim Docker image
- Remove unused dependencies

### Shared

- Synchronized contract versioning
- End-to-end tested pipeline: upload → parse → suggest → approve → execute
- CI contract validation between repos

---

## 3. Current backend completion %

**Estimated: ~58%** of full Munshi + TraderOS vision

| Module | Weight | Completion |
|--------|--------|------------|
| Core WhatsApp ops | 20% | 95% |
| Workflow engine | 10% | 90% |
| Vendor | 8% | 85% |
| Inventory | 12% | 80% |
| Document foundation | 10% | 70% |
| Procurement | 12% | 15% |
| Approvals | 8% | 15% |
| Ledger / finance | 10% | 5% |
| Account aggregator | 5% | 0% |
| Platform (auth, observability) | 5% | 20% |

---

## 4. Current LLM completion %

**Estimated: ~28%** of full Munshi LLM vision

| Module | Weight | Completion |
|--------|--------|------------|
| Intent classification | 35% | 75% |
| Entity extraction (slots) | 15% | 60% |
| General chat / convert | 10% | 80% |
| Document parsing | 25% | 0% |
| Training / eval infrastructure | 10% | 0% |
| Production hardening | 5% | 15% |

---

## 5. Highest-risk areas

| Risk | Severity | Why |
|------|----------|-----|
| **No document parser (LLM)** | Critical | Blocks document-driven inventory/procurement |
| **`reject_reason` schema gap** | High | Breaks NL `/mgrreject` flow |
| **Workflow intents not in LLM few-shot** | High | "Add vendor" may misroute |
| **No REST auth** | High | Open admin API if exposed |
| **No eval metrics** | Medium | Intent accuracy unknown in production |
| **Open ML API** | Medium | No authentication |
| **Contract drift between repos** | Medium | Two repos, manual sync |
| **Suggestion queue** | Medium | One workflow per phone limits multi-suggestion docs |

---

## 6. Architectural strengths

1. **Clear LLM/backend boundary** — LLM classifies/parses; backend executes
2. **Workflow engine** — reusable for onboarding, inventory, document approval
3. **Suggestion engine** — never auto-executes; human-in-the-loop by design
4. **Inventory transaction integrity** — single write path for quantities
5. **Factory isolation** — consistent tenancy model
6. **Document registry** — extensible contracts without schema churn
7. **WhatsApp-first routing** — mature command + ML hybrid
8. **95 backend tests** — regression safety for core modules

---

## 7. Architectural weaknesses

1. **LLM repo lag** — backend document pipeline ready; LLM parser missing
2. **Contract enforcement** — no automated schema validation between repos
3. **Skeleton modules** — procurement/approval create false sense of completeness
4. **No auth on REST or ML** — production exposure risk
5. **LLM codebase hygiene** — commented duplicate code, unused heavy deps
6. **No observability** — no structured logging of ML intent decisions
7. **README gaps** — LLM repo minimally documented
8. **Manual migration** — no auto-run at startup

---

## 8. Recommended next development phase

### Prompt 8 — Document ingestion + contract hardening

**Theme:** Close the backend↔LLM gap on the document pipeline and fix known contract bugs.

| Priority | Backend | LLM |
|----------|---------|-----|
| P0 | File upload + storage | Fix `reject_reason` in API |
| P0 | WhatsApp notify on suggestions | `/parse` for INVENTORY_IMPORT |
| P0 | Suggestion queue | Workflow intent few-shot |
| P1 | REST auth foundation | Eval harness (50 examples) |
| P1 | Wire upload → parse → extract | Slim Docker deps |

**Success criteria:**

1. User uploads inventory document end-to-end
2. LLM parses → backend stores extraction → suggestions generated
3. User approves on WhatsApp → inventory created
4. `/mgrreject` works from natural language with reason
5. "Add vendor" reliably starts vendor workflow

---

## Repository structure summary

### Backend

```
munshi-dada-AS-sructure/
├── src/
│   ├── app/api/app.module.ts
│   ├── core/           # DB, messaging, health, guards
│   ├── modules/whatsapp/
│   └── services/       # domains + workflow + documents
├── migrations/         # 001-005
├── docs/
│   ├── architecture/   # ← 10 new docs (this analysis)
│   └── reports/        # Prompt 1-7 reports
└── .env.local
```

### LLM

```
Munshi-Dada-Phase-1-main/
├── main.py             # FastAPI
├── bot_engine.py       # Classifier + converter
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## Document index

| Document | Purpose |
|----------|---------|
| [backend-system-map.md](./backend-system-map.md) | Full backend architecture |
| [llm-system-map.md](./llm-system-map.md) | Full LLM architecture |
| [backend-command-registry.md](./backend-command-registry.md) | All WhatsApp commands |
| [workflow-inventory.md](./workflow-inventory.md) | All workflows |
| [backend-llm-contract.md](./backend-llm-contract.md) | **Integration source of truth** |
| [backend-llm-gap-analysis.md](./backend-llm-gap-analysis.md) | Gap analysis |
| [document-parsing-strategy.md](./document-parsing-strategy.md) | Future document parsing |
| [intent-classification-strategy.md](./intent-classification-strategy.md) | Intent strategy |
| [implementation-roadmap-v2.md](./implementation-roadmap-v2.md) | Re-planned roadmap |
| [project-state-summary.md](./project-state-summary.md) | This document |

---

*No code was modified. All documents are analysis-only.*
