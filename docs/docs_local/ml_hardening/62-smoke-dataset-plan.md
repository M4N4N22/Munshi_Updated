# Phase 4A — Smoke Dataset Plan (~200 cases)

**Purpose:** Structure only — no utterances authored in this task.  
**Format:** JSONL (one case per line) + manifest JSON for CI.

---

## File layout (PR-3)

```
ml/data/eval/smoke/
  manifest.json           # version, slices, counts
  smoke-v1.1.jsonl        # all cases
  slices/
    contract_gap.jsonl    # optional split for targeted runs
    boundaries.jsonl
    ...
```

---

## Case schema

```json
{
  "id": "SMOKE-CG-001",
  "message": "<utterance — authored in PR-3>",
  "expected_intent": "/inventory_import_csv",
  "expected_slots": {},
  "role": "OWNER",
  "category": "positive",
  "slice": "contract_gap",
  "boundary_pair": null,
  "language": "hinglish",
  "tags": ["p0", "v1.1"],
  "contract_version": "v1.1",
  "notes": "import phrase collision fix"
}
```

**Optional fields:** `forbidden_intents`, `expected_behavior` (`clarify`), `use_llm` (default true for smoke).

---

## Slice allocation (~200 total)

| Slice ID | Focus | Cases | Source doc |
|----------|-------|------:|------------|
| S1 | Contract gap (5 intents) | 40 | 35-contract-gap |
| S2 | Import vs discovery vs create | 25 | C2/C3 boundaries |
| S3 | assign vs depart_assign | 25 | A1 |
| S4 | assign vs assign_clarify | 15 | A2 |
| S5 | assign vs stock-linked (delivery/NL) | 25 | A3 |
| S6 | mgrself vs mgrassign | 20 | B1 |
| S7 | mgrtransfer vs mgrreject | 15 | B2 |
| S8 | inventory_status vs create | 15 | C1 |
| S9 | complete vs update | 15 | D1 |
| S10 | Regression (existing eval) | 15 | manager_workflows + workflow samples |
| **Total** | | **~200** | |

---

## S1 — Contract gap detail (40 cases)

| Intent | Positive | Negative (wrong intent) |
|--------|----------|-------------------------|
| `/inventory_import_csv` | 12 | vs business_discovery (8), vs create (4) |
| `/assign_delivery` | 6 | vs assign (4) |
| `/task_inventory_nl` | 6 | vs assign (4) |
| `/cancel` | 4 | vs complete (2) |
| `/suggestion_approve` | 2 | workflow context notes |

---

## Language mix (all slices)

| Language | % | Cases |
|----------|---|------:|
| Hinglish | 35% | 70 |
| Hindi | 20% | 40 |
| English | 25% | 50 |
| Broken/mixed | 15% | 30 |
| Typos | 5% | 10 |

---

## Authoring rules (PR-3)

1. No duplicate messages across slices
2. Every boundary pair has ≥2 adversarial cases
3. Contract gap slice blocks merge of PR-2 without PR-3 labels updated
4. Role field required for mgr* and assign slices
5. Slash-form cases ≤10% (mostly NL)

---

## Execution

| Mode | Command (planned) |
|------|-------------------|
| Regex | `python -m eval.smoke_intent_eval --no-llm` |
| LLM | `python -m eval.smoke_intent_eval --live` |
| Slice | `--slice contract_gap` |

Harness built in PR-1; data in PR-3.

---

## Acceptance (dataset)

- [ ] 200 cases in manifest
- [ ] All 5 gap intents ≥4 positive each
- [ ] All 12 boundary pairs from doc 31 represented
- [ ] Language mix within ±5%
- [ ] Schema validates against JSON schema (PR-1)

---

## Readiness

| Item | Status |
|------|--------|
| Structure defined | ✅ This doc |
| Harness | ❌ PR-1 |
| Utterances | ❌ PR-3 |
| Baseline comparison | ❌ PR-4 after PR-2+3
