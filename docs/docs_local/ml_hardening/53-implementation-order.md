# Phase 4 — Implementation Order

Classification: **Quick Win** | **Medium Effort** | **Major Refactor**

---

## Recommended sequence

| Order | Item | Type | Workstream | Rationale |
|------:|------|------|------------|-----------|
| 1 | Baseline benchmark (regex + 100 LLM sample) | Quick | F | Measure before change; avoids blind edits |
| 2 | Contract alignment (5 intents + JSON→VALID_INTENTS) | Quick | A | Unblocks labeling and fixes import collision |
| 3 | Fix discovery/import regex collision | Quick | A | High ROI, low risk (G3) |
| 4 | CommandParser full COMMANDS parity | Quick | A | Slash consistency |
| 5 | Smoke eval suite (~200 cases) | Medium | F | Gate for steps 2–4 |
| 6 | LLM prompt + regex updates for 5 intents | Medium | A | NL coverage for gap intents |
| 7 | P1 general_chat guard (operational keyword list) | Medium | D | Reduce sink without full confidence |
| 8 | Role in classify API + backend caller | Medium | B | Enables role eval |
| 9 | Role validity filter in classifier | Medium | B | Role accuracy improvement |
| 10 | Stock-linked cluster unification | Major | C | Largest architectural change |
| 11 | confidence_tier + clarify contract | Major | D | Depends on stable intents |
| 12 | Intent hierarchy (cluster router) | Major | E | After baseline shows flat-space failures |
| 13 | Full eval suite (1,200+) | Medium | F | Parallel with 6–11, not blocking start |
| 14 | Regression suite + CI gates | Medium | F | After first hardening wave |
| 15 | Factory grounding (optional) | Major | Future | Phase 6+ |

---

## Quick wins (do first)

1. **Baseline measure** — no code change, run existing eval
2. **Contract sync** — 5 intents, load VALID_INTENTS from JSON
3. **Import phrase fix** — remove import inventory from discovery regex; add import_csv patterns
4. **CommandParser parity** — align with COMMANDS
5. **Smoke JSONL** — 200 cases for P1 boundaries

**Estimated relative effort:** Small team days, not weeks.

---

## Medium effort (second wave)

1. Role in classify request + filter
2. P1 anti-sink rules (stock kitna, assign verbs → never general_chat)
3. Prompt/regex hardening per boundary doc 21
4. Eval harness integration in CI
5. Partial suite expansion (600 cases)

---

## Major refactors (third wave)

1. **Stock-linked unification** — merge extract + classify decision
2. **Confidence tier + clarify** — schema + policy
3. **Intent hierarchy** — two-stage or cluster prompts
4. **Full regression suite** (2,800 cases)

**Do not start major refactors without baseline + smoke eval.**

---

## Parallelization

| Track 1 (ML/contract) | Track 2 (eval) | Track 3 (backend) |
|----------------------|----------------|-------------------|
| A contract + regex | F baseline | G session tests |
| B role API | F smoke JSONL | C routing order for stock |
| C stock unify | F expand suites | Pass role to ML |

---

## Stop / go gates

| Gate | Criteria |
|------|----------|
| G0 | Baseline report published |
| G1 | Contract 30/30; smoke eval ≥80% P1 regex-only known limits documented |
| G2 | Post-A smoke ≥ baseline + 5% boundary pairs |
| G3 | Role eval ≥92% invalid rejection |
| G4 | Stock-linked eval ≥85% before prod flag |
| G5 | Full suite passes Phase 4 thresholds (doc 37) |
