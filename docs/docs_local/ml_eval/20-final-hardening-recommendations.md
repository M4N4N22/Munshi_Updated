# Final Hardening Recommendations

**Analysis only — no implementation in this phase.**

## Baseline scores

| Metric | Value |
|--------|-------|
| Overall intent accuracy | **47.0%** |
| Overall entity accuracy | **77.6%** |
| Full PASS rate | **41.3%** |

## What Munshi understands well

1. Slash commands (`/present`, `/tasks`, `/complete`, workflows) — 100% via command_parser
2. Home/greeting → `general_chat` — 100%
3. Hindi operational regex — present, tasks, complete, issue with clear keywords
4. `team members dikhao` → `/members`
5. Worker/vendor/inventory_create workflow keyword starts
6. Business discovery phrase list
7. Structured `X ko N item deliver` extraction (subset)
8. Assign with `@mention` deterministic path
9. Task completion confirmation Hindi patterns
10. Onboard vendor NL (83% — LLM + keywords)

## Top 10 failure clusters

1. `/mgrtransfer` → `general_chat` (10 cases)
2. `/mgrreject` → `general_chat` (10 cases)
3. `/mgrself` → `general_chat` (10 cases)
4. `/resolve` → `general_chat` (8 cases)
5. `/inventory_status` → `general_chat` (8 cases)
6. `/purchase_request_create` → `general_chat` (7 cases)
7. `/absent` → `general_chat` (6 cases)
8. `/mgrassign` → `general_chat` (6 cases)
9. `/issues` → `general_chat` (6 cases)
10. `/help` → `general_chat` (6 cases)

## Top 10 hardening opportunities

1. **Manager NL regex/LLM few-shot for mgrtransfer/mgrreject/mgrself** — +25-30% on manager workflows
2. **Bare members + English team phrases → /members** — +5-8% member_lookup
3. **Department slug detection in Hinglish (sales ko, IT team)** — +15% dept_assignment
4. **Route delivery NL to task-inventory extractor before /assign** — +20% inventory_delivery
5. **LLM few-shot expansion for resolve vs complete** — +10% issue_resolve
6. **Typo-tolerant fuzzy layer for top 20 commands** — +15% L7 accuracy
7. **inventory_status + purchase_request NL patterns** — +15% stock/PR
8. **Short-command dictionary (present, leave, help, report)** — +10% MSME/short
9. **Assign_clarify trigger refinement (reduce false positives)** — +5% overall
10. **Inventory extractor: broken English + ambiguous material** — +10% extract

## Phased hardening recommendation (analysis)

### Phase A — Critical path (manager + dept + members)
Opportunities 1, 2, 3 — unblocks owner/manager daily ops

### Phase B — Inventory NL
Opportunities 4, 10 — unblocks stock dispatch

### Phase C — LLM coverage
Opportunities 5, 7, 8 — improves conversational UX

### Phase D — Robustness
Opportunity 6, 9 — typos and false clarify reduction

## Preserve during hardening

- Command parser first — never regress slash path
- Deterministic pre-classify for high-traffic Hindi ops
- Task-inventory extractor determinism (no hallucination policy)
- `general_chat` → owner home for OWNER/MANAGER

## Production verdict

**ML is NOT production-ready for free-text WhatsApp.** Harden Phase A before expanding NLP marketing.

## Artifacts consumed

- `benchmark_corpus.json`, `benchmark_results.json`
- Reports `01`–`10`, `taxonomy_analysis.json`