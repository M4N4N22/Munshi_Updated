# Phase 3.5 — Classification Pipeline Analysis

**Architecture type:** **Hybrid** — deterministic regex pre-classifiers + OpenAI LLM fallback + separate task-inventory extractor.

**Not used:** Embeddings, vector similarity, fine-tuned classifier, hierarchical intent tree.

---

## Pipeline order (`IntentClassifier.classify`)

```
1. DateTimeExtractor (deadline — parallel metadata)
2. extract_task_id, extract_mentions (slot helpers)
3. workflow_pre_classify(message)     ← regex, workflow intents
4. operational_pre_classify(message)  ← regex, daily ops + mgr*
5. assign_clarify_pre_classify(message)
6. deterministic_pre_classify(message) ← mention + task_id rules
7. IF any pre returns → use pre result (skip LLM)
8. ELSE IF use_llm → llm_classify (GPT, temperature=0, JSON mode)
9. Post-LLM rules:
   - intent ∉ VALID_INTENTS → general_chat
   - assign + task_id → mgrassign
   - assign + no worker → assign_clarify
   - depart_slug validated against VALID_DEPARTMENTS
10. IF general_chat → second LLM call for chat reply
```

**`main.py` `/classify` adds step 0:** `CommandParser.parse()` for messages starting with `/` (subset of commands).

---

## Pre-classifier layers

| Layer | Function | Mechanism |
|-------|----------|-----------|
| CommandParser | Slash passthrough | `startswith("/...")` |
| workflow_pre_classify | Onboard, inventory, discovery, PR | Large regex sets |
| operational_pre_classify | present, tasks, complete, update, issue, assign, depart, mgr* | Ordered regex + manager_pre_classify |
| manager_pre_classify | mgrself, mgrassign, mgrtransfer, mgrreject | Dedicated regex + context map |
| assign_clarify_pre_classify | Passive task statements | `_ASSIGN_DRAFT_RE` |
| deterministic_pre_classify | @mention + task_id → mgrassign vs assign | Simple rules |

**First match wins** — order is critical.

---

## LLM classification

| Property | Value |
|----------|-------|
| Model | `CHAT_MODEL` env (gpt-4.1-mini per comments) |
| Temperature | 0 |
| Seed | 42 |
| Format | JSON object |
| Prompt | Large system prompt with intent definitions + few-shot examples |
| On failure | Falls back to `general_chat` |

**Commented legacy feature:** "second LLM confidence check call" — **not present in active code** (only in commented v1 block).

---

## Parallel path: Task inventory NL

**Not part of `/classify`.**

```
Backend tryHandleFreeText (before classify)
  → POST /extract/task-inventory
  → TaskInventoryExtractor (regex + rules, task_kind)
  → IF task_kind valid → start TASK_INVENTORY_CREATION workflow
  → ELSE return null → fall through to classify
```

---

## Keyword / regex vs LLM split

| Intent family | Primary mechanism |
|---------------|-------------------|
| Slash commands | CommandParser (no LLM) |
| Workflow starts | workflow_pre_classify regex |
| Attendance, tasks, help | operational_pre_classify regex |
| Manager ops | manager_pre_classify regex |
| assign vs depart (person name) | operational + deterministic |
| Ambiguous / long tail | LLM |
| Stock-linked NL | TaskInventoryExtractor (separate) |
| assign_delivery slash | **Backend only** — never classify |

---

## Confidence ranking

**None.** Pre-classifiers are binary (match / no match). LLM returns single intent with no score. No threshold-based routing in production path.

---

## Test/eval entry

`classify_hybrid(message, use_llm=False)` — tests pre-classifiers only without LLM call.
