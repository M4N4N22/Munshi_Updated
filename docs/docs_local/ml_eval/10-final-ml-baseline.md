# Final ML Baseline Report

**Date:** 2026-06-08
**Build reference:** capability registry v2.0 · ML `classify_hybrid(use_llm=True)` + `extract_task_inventory`
**Corpus:** 349 cases · 29 workflows · 12 difficulty levels

## Executive summary

Munshi ML today is a **hybrid classifier**: slash-command parser → deterministic regex layers → OpenAI LLM fallback. Task-inventory NL uses a **separate deterministic extractor**.

| Understanding tier | Description |
|-------------------|-------------|
| **Understands well** | Slash commands; clear Hindi/Hinglish operational phrases; home/greeting; workflow keyword starts; structured delivery/issue with `ko` + qty + item |
| **Partially understands** | Natural English paraphrases; department routing; purchase/low-stock phrasing; inventory status conversational queries |
| **Misunderstands** | Manager routing NL (`mgrtransfer`, `mgrreject`, `mgrself`); typos; short fragments; many ambiguous strings → `general_chat` |
| **Fails completely** | Bare `members`; highly ambiguous material commands; multi-intent single messages; typo-heavy input (~14% acc) |

## Production readiness

### Is current ML ready for production use?

## **NO**

Overall intent accuracy **47.0%** on this corpus (full PASS **41.3%**). Structured slash-command users fare well; free-text MSME WhatsApp (registry target audience) is **not production-ready** without hardening.

## Priority hardening areas (baseline only — no fixes in this run)

1. **Manager task routing NL** — `/mgrtransfer`, `/mgrreject`, `/mgrself` collapse to `general_chat` under LLM (10/12 failures each).
2. **Typos & short commands** — Level 7 accuracy **14.3%**; Level 8 **39.3%**.
3. **Member lookup** — bare `members` → `general_chat` (known registry gap); conversational team queries often miss.
4. **Department vs assign_clarify** — `figures bhejo` without dept keyword → wrong intent.
5. **Inventory delivery dual path** — classify maps `Ram ko 20 cement deliver` to `/assign` instead of task-inventory extractor workflow.
6. **Conversational & context-heavy** — Levels 9–10 under **25%** intent accuracy.
7. **Purchase request & inventory status** — LLM `general_chat` fallback on non-canonical phrasing.
8. **Issue resolve** — confused with general completion/chat.
9. **Multi-intent messages** — Level 12 **42.9%**; single intent assumed.
10. **Ambiguous material commands** — `material bhej do` → extractor null.

## What to preserve

- Deterministic pre-classify layer (152/349 cases, high accuracy)
- Command parser for slash syntax
- Task-inventory extractor for structured Hindi delivery/issue patterns
- `team members dikhao` style member regex

## Artifacts

- `benchmark_corpus.json` — full test inputs
- `benchmark_results.json` — machine-readable run output
- Reports `01`–`09` in this directory

## Success criteria checklist

| # | Criterion | Met |
|---|-----------|-----|
| 1 | Every workflow tested | ✅ 29 workflows |
| 2 | Every role tested | ✅ OWNER/MANAGER/WORKER |
| 3 | Every language style tested | ✅ 12 levels |
| 4 | Real ML inference used | ✅ use_llm=True |
| 5 | Failure patterns identified | ✅ |
| 6 | Success patterns identified | ✅ |
| 7 | Baseline score established | ✅ |
| 8 | No code changes | ✅ eval scripts in docs only |
| 9 | No hardening performed | ✅ |
| 10 | Actionable benchmark | ✅ |