# ML Hardening V2A — Boundary Failure Analysis

**Date:** 2026-06-11  
**Basis:** V1 smoke eval (`smoke_intent_eval_deterministic.json`), `bot_engine.py` pipeline trace, doc 21 boundaries  
**Mode:** Analysis only — no solutions implemented

---

## Executive summary

The three weakest V1 boundaries (~52–56% slice accuracy) share a **common structural cause**: most failures occur when **deterministic pre-classifiers miss** and `use_llm=False` (smoke/CI path) **defaults to `general_chat`**, not when the LLM mis-prompts.

| Boundary slice | Accuracy | Primary failure mode |
|----------------|----------|----------------------|
| assign ↔ depart_assign | 56% | Regex coverage gaps + vendor/report barriers + `general_chat` sink |
| assign ↔ assign_clarify | 53% | Overlapping draft regex vs named-person patterns; inventory keyword bleed |
| assign ↔ stock-linked | 52% | V1 stock rules + pipeline order + token/order sensitivity |

**`/assign` recall in smoke is 33%** (8/24) — overwhelmingly **false negatives to `general_chat`**, not confusion with `depart_assign`.

---

## PHASE 1 — Boundary error analysis

### A1: `/assign` vs `/depart_assign`

**Formal rule (doc 21):** Person/@mention → `/assign`. Department without person → `/depart_assign`.

#### False positives (predicted assign, expected depart)

| Pattern | Example | Cause |
|---------|---------|-------|
| Rare in smoke | — | `/assign` precision is **100%** in smoke; dept→assign FP is not the main problem |

#### False negatives (expected assign, wrong intent)

| Predicted | Example | Cause |
|-----------|---------|-------|
| `general_chat` | `priya client ko call kare`, `ram ko cleaning karo`, `meena ko file bhejo` | `_ASSIGN_PERSON_RE` requires `ko` + task verbs (`kaam`, `task`, `dispatch`, `do`, etc.). **Generic verbs (`call`, `cleaning`, `file`, `email`) not covered** |
| `general_chat` | `rahul ko bol dena`, `sonia ko list bhejo` | Same — `bol`/`list` not in person-assign regex tail |
| `/report` | `ajay ko report bhejo` | `_REPORT_RE` matches `report bhejo` **before** person-assign block; **keyword collision** |

#### False negatives (expected depart, wrong intent)

| Predicted | Example | Cause |
|-----------|---------|-------|
| `general_chat` | `quotation bhejo` | `_VENDOR_NOTIFICATION_RE` matches `quotation` → operational returns **None** early (vendor barrier), **blocking** dept routing despite `_detect_department` = sales + `_DEPT_ACTION_RE` = bhejo |
| `general_chat` | `purchase ko vendor call` | `vendor` in utterance triggers vendor barriers / assignee exclusion |
| `general_chat` | `sales team ko target do` | `team` breaks person extraction; **no department keyword** in `_DEPT_KEYWORDS` for "sales team" phrase alone; `target` not in `_DEPT_ACTION_RE` |
| `general_chat` | `operations ko load karo` | `load` not in `_DEPT_ACTION_RE` (`karo` alone insufficient without dept detect in some paths) |

#### Ambiguous utterances

| Utterance | Tension |
|-----------|---------|
| `sales ko bolo` | Dept name as recipient vs informal person reference |
| `IT team ko server fix karo` | "team" masks department slug |
| `customer payment followup` | "customer" excluded from person assignee; dept routing depends on keyword hit |

#### Slot ambiguity

- **Person vs department:** `_extract_person_assignee` and `_detect_department` are **independent**; no unified "recipient" slot.
- **Excluded entities:** `client`, `vendor`, `customer` explicitly excluded from person assign → often fall to `general_chat` instead of clarify or depart.

#### Regex influence

**High.** Assign/depart resolution in smoke is almost entirely `operational_pre_classify` (lines 1669–1684). LLM not invoked when `use_llm=False`.

#### Prompt influence

**Low** in smoke path. Would matter in production (`use_llm=True`) for uncovered phrases.

---

### A2: `/assign` vs `/assign_clarify`

**Formal rule (doc 21):** Assignee identifiable → `/assign`. Task description without assignee → `/assign_clarify`.

#### False positives (predicted clarify, expected assign)

| Example | Cause |
|---------|-------|
| `ajay ko website banani hai` | `_extract_person_assignee` fails (`banani` not in `_ASSIGN_PERSON_RE` tail). `assign_clarify_pre_classify` fires on `_ASSIGN_DRAFT_RE` (`website`, `banani`) **despite** `ajay ko` person surface form |

#### False negatives (expected clarify, wrong intent)

| Predicted | Example | Cause |
|-----------|---------|-------|
| `/inventory_status` | `inventory check karna hai` | `workflow_pre_classify` → `_INVENTORY_STATUS_RE` runs **before** assign_clarify stage; "inventory" + "check" triggers status |
| `general_chat` | `sabko training do` | No draft regex match; plural `sabko` not handled; falls through to `general_chat` |

#### False positives (predicted assign, expected clarify)

| Example | Cause |
|---------|-------|
| (in matrix) | `/assign` → `/assign_clarify` 1 case via post-rules when LLM on; rare in deterministic smoke |

#### Ambiguous utterances

| Utterance | Issue |
|-----------|-------|
| `delivery plan banao` | Future/planning without assignee — clarify vs depart (operations) |
| `packing karni hai` | Passive Hindi — clarify trigger vs generic statement |
| `ajay ko website banani hai` | **Named person + passive future** — product wants assign; regex treats as clarify |

#### Slot ambiguity

- **Assignee present linguistically but not in regex vocabulary** (`banani`, `karwao`, `se` constructions).
- **task_description** only set in clarify path; assign path does not carry description slot consistently.

#### Regex influence

**Dominant.** `assign_clarify_pre_classify` uses `_ASSIGN_DRAFT_RE` (banegi, repair, dispatch, website, etc.) with early exit if person detected — but person detection is **narrower** than clarify triggers.

#### Prompt influence

**Medium in production only.** LLM post-rule: `/assign` without worker → `/assign_clarify` (lines 2132–2134) **does not run** when `use_llm=False`.

---

### A3: `/assign` vs `/assign_delivery`

**Formal rule (doc 21):** SKU/qty + delivery signals + worker → stock-linked delivery; else generic assign.

#### False positives

| Predicted | Example | Cause |
|-----------|---------|-------|
| `/task_inventory_nl` | `dispatch 3 unit bolt` (no worker) | V1 rule: `has_stock && has_dispatch` without worker → `task_inventory_nl` not assign |
| `/mgrassign` | `priya ko 20 nut dispatch` | **Pipeline order:** stock_linked skipped (`nut` ∉ `_STOCK_ITEM_RE`); `manager_pre_classify` catches `priya` + digit pattern |

#### False negatives (expected assign_delivery, wrong intent)

| Predicted | Example | Cause |
|-----------|---------|-------|
| `/task_inventory_nl` | `50 bolt bhejo anil ko`, `bolt dispatch ram ko`, `15 bolt bhejo sunita ko` | **Worker at end of sentence** — `_extract_mgr_worker` has no `(\w+)\s+ko$` pattern; worker=None → `has_stock && has_dispatch` → `task_inventory_nl` |
| `/task_inventory_nl` | `dispatch sku X12 to ram`, `delivery 5 sku to priya` | English **SOV patterns**; worker extraction fails |
| `/task_inventory_nl` | `50 piece delivery priya` | Non-`ko` Hindi structure; worker not extracted |

#### Ambiguous utterances

| Utterance | Tension |
|-----------|---------|
| `deliver cartons` | Delivery verb without SKU — assign vs task_inventory_nl vs depart |
| `Ram ko 50 bolt bhejo` | Doc 23 preferred `task_inventory_nl`; V1 regex prefers `assign_delivery` when worker parsed |

#### Slot ambiguity

- **Worker slug** required for `assign_delivery` in V1 but extraction is **mgr-biased** (task-id patterns), not general `Name ko`.
- **SKU/qty** not extracted as slots — only boolean token presence (`bolt`, `sku`, `50`).

#### Regex influence

**Very high.** `stock_linked_pre_classify` in `workflow_pre_classify` (runs **before** operational assign).

#### Prompt influence

**Low in smoke.** Few-shots exist for assign_delivery but unreachable when regex path wrong or `use_llm=False`.

---

### A4: `/assign` vs `/task_inventory_nl`

**Coupled with A3** — same `stock_linked_pre_classify` function.

#### Confusion matrix (smoke)

- `/assign_delivery` → `/task_inventory_nl`: **8 cases**
- `/task_inventory_nl` precision **63.6%** (8 FP from delivery-labeled cases)

#### False positives (task_inventory_nl over-predicted)

| Condition | Cause |
|-----------|-------|
| stock + dispatch, no worker | By design in V1 line 1952–1953 |
| `dispatch` in `_DISPATCH_RE` matches non-delivery dept phrases | `quotation bhejo` has `bhejo` ∈ dispatch regex (contaminates stock stage indirectly) |

#### False negatives

| Example | Cause |
|---------|-------|
| `sku ABC count karo` | `_INVENTORY_COUNT_RE` requires `count` phrases; `count karo` alone may miss |
| Generic assign phrases in stock slice | `priya ko call karo` — no stock tokens → `general_chat` |

#### Ambiguous utterances

| Utterance | Doc 23 expectation |
|-----------|-------------------|
| `Ram ko 50 bolt bhejo` | `task_inventory_nl` (workflow/disambiguation) |
| V1 implementation | `assign_delivery` when worker parsed |

**Product/spec tension** between boundary doc A3 and ambiguity doc 23.

#### Regex vs prompt

Same as A3 — regex-first; NL stock workflow not invoked at classify layer.

---

## PHASE 2 — Classifier path analysis

### Pipeline (production order)

```
Message
  ↓ CommandParser (slash only)
  ↓ IntentClassifier.classify:
      1. workflow_pre_classify  ← stock_linked, inventory, discovery, import_csv
      2. operational_pre_classify ← mgr*, report, assign person, depart
      3. assign_clarify_pre_classify
      4. deterministic_pre_classify ← @mention + task id shortcuts
      5. LLM (if use_llm=True)
      6. Post-rules (assign→mgrassign, assign→assign_clarify)
  ↓ VALID_INTENTS gate
  ↓ general_chat message enrichment
```

### Where errors originate (smoke failures traced)

| Stage | % of boundary failures (approx) | Failure types |
|-------|----------------------------------|---------------|
| **No match → `general_chat`** | **~60%** | Assign/depart phrases outside regex vocabulary |
| **workflow_pre_classify** | ~25% | stock_linked worker/order; inventory_status bleed |
| **operational_pre_classify** | ~10% | report/vendor barriers; mgr intercept |
| **assign_clarify_pre_classify** | ~5% | draft regex with hidden person |
| **LLM** | **~0%** in smoke | Not invoked (`use_llm=False`) |
| **Post-processing** | <5% | assign→clarify when LLM on only |

### Critical architectural finding

```python
# bot_engine.py classify(), use_llm=False branch
else:
    intent = "general_chat"
```

Any utterance not caught by four pre-classifier stages **cannot** resolve to `/assign`, `/depart_assign`, or stock-linked intents in smoke/CI. This explains **14/24 assign → general_chat** in confusion matrix.

---

## PHASE 3 — Linguistic pattern catalog

### Person assignment patterns

| Pattern | Example | Current handling | Gap |
|---------|---------|------------------|-----|
| Hindi dative `Name ko` + task verb | `priya ko task do` | mgr/assign regex | Partial |
| `Name ko` + generic verb | `priya ko call kare` | **Miss** → general_chat | High |
| `Name se` / `karwao` | `priya se packing karwao` | **Miss** | High |
| English `to Name` | `dispatch to priya` | **Miss** (stock slice) | High |
| `@mention` | `@rahul invoice` | deterministic_pre @ only | Medium |
| Passive future + person | `ajay ko website banani hai` | **clarify** not assign | Medium |

### Department assignment patterns

| Pattern | Example | Current handling | Gap |
|---------|---------|------------------|-----|
| Dept keyword + action verb | `invoice bhejo` | depart_assign | Works |
| Dept + `team` | `sales team ko target do` | **Miss** | High |
| Quotation/vendor nouns | `quotation bhejo` | **vendor barrier blocks** | High |
| `purchase ko vendor call` | vendor exclusion | **Miss** | Medium |
| Dept slug only | `operations ko load karo` | `load` ∉ action regex | Medium |

### Delivery / stock patterns

| Pattern | Example | Current handling | Gap |
|---------|---------|------------------|-----|
| Hindi SOV stock dispatch | `50 bolt bhejo ram ko` | task_inventory_nl (no worker) | High |
| Hindi VOS | `ram ko 50 bolt bhejo` | assign_delivery | Works |
| English SVO | `dispatch sku X12 to ram` | task_inventory_nl | High |
| SKU token only | `nut`, `carton` | **Not in _STOCK_ITEM_RE** | High |
| Count phrases | `stock count`, `ginati` | task_inventory_nl | Works |
| `count karo` alone | `sku ABC count karo` | **Miss** | Medium |

### Missing-assignee patterns

| Pattern | Example | Current handling | Gap |
|---------|---------|------------------|-----|
| Passive future | `aaj website banegi` | assign_clarify | Works |
| Person + passive | `ajay ko website banani hai` | **clarify** (wrong if assign intended) | Medium |
| Plural | `sabko training do` | general_chat | High |
| Inventory noun | `inventory check karna hai` | inventory_status | Medium |

---

## PHASE 4 — Role impact analysis

**Current state:** Role is **not** passed to `/classify` (doc 45). Enforcement is post-ML in backend.

### Would role context solve these failures?

| Failure class | Role helps? | Estimated impact |
|---------------|-------------|------------------|
| assign vs **mgrassign** (`priya ko 20 nut dispatch`) | **Yes** — manager + existing task context disambiguates | **Medium** (subset of stock slice) |
| assign vs **depart_assign** | **Partial** — owners assign more; workers rarely assign depts | **Low–Medium** |
| assign vs **assign_clarify** | **Low** — ambiguity is linguistic, not role | **Low** |
| assign vs **stock-linked** | **Partial** — workers shouldn't trigger delivery assign | **Medium** for worker role |
| **general_chat sink** | **No** — role doesn't help if regex never fires | **None** |

### Role alone is insufficient

~60% of assign failures are **vocabulary/coverage** misses ending in `general_chat`. Role API without expanded patterns or LLM fallback **does not fix** the majority.

### Combined role + clarify (V2 vision)

Could redirect low-confidence assign-family outputs to clarify instead of `general_chat` — addresses **sink problem** indirectly. Not analyzed as implementation here.

---

## PHASE 5 — Boundary prioritization (ROI ranking)

| Rank | Boundary | Why highest ROI | Smoke pain | Fix leverage |
|------|----------|-----------------|------------|--------------|
| **1** | **assign family → `general_chat` sink** | 14 FN; affects all three slices | Critical | Pre-LLM policy or broader person/dept regex |
| **2** | **assign_delivery ↔ task_inventory_nl** | 8 confusions; V1 stock rules brittle | High | Slot extraction + order patterns |
| **3** | **assign ↔ depart_assign** | Vendor/report barriers; team phrases | High | Barrier ordering + dept patterns |
| **4** | **assign ↔ assign_clarify** | Person+passive; inventory bleed | Medium | Align person detect with clarify guards |
| **5** | **assign vs mgrassign** (in stock slice) | Pipeline order + stock token list | Medium | Role + stock stage ordering |

---

## PHASE 6 — V2 implementation candidates (not decisions)

| Approach | Addresses | Notes |
|----------|-----------|-------|
| **Role-aware classify API** | mgrassign vs assign; worker invalid intents | Doc 52-B; backend must pass role |
| **P1 anti-sink / clarify routing** | general_chat sink for operational phrases | Doc 56 M4B-4; needs clarify UX |
| **Delegation cluster regex expansion** | person/dept vocabulary gaps | Low risk; incremental |
| **Barrier reordering** | report/vendor regex stealing assign/dept | e.g. person+report bhejo |
| **Unified recipient extractor** | person vs dept slot competition | Slot-aware ranking |
| **Stock-linked slot extractor** | worker+SKU+qty regardless of word order | Reuse `/extract/task-inventory` as slots not router |
| **Prompt restructuring** | LLM path when regex abstains | Abstain vs general_chat default |
| **Intent hierarchy / staged classify** | delegation cluster first, then stock sub-cluster | Doc 52-E |
| **Confidence tier + clarify** | ambiguous assign family | Doc 52-D; schema change |
| **Smoke/CI: hybrid eval mode** | Metrics understate production LLM behavior | Measurement fix, not classifier |

---

## Root causes (consolidated)

1. **`general_chat` as deterministic fallback** — largest single cause of assign-family failures.
2. **Narrow `_ASSIGN_PERSON_RE`** — misses valid Hindi/English assignment phrasing.
3. **Competing high-priority regex** — `_REPORT_RE`, `_VENDOR_NOTIFICATION_RE`, `_INVENTORY_STATUS_RE` preempt correct cluster.
4. **V1 `stock_linked_pre_classify` brittleness** — worker order, English patterns, limited SKU tokens, delivery vs NL spec tension.
5. **Pipeline stage ordering** — workflow (stock) before operational (mgr); manager intercepts when stock tokens absent.
6. **assign_clarify person guard mismatch** — person visible in text but not in extractor → false clarify.
7. **Role blindness** — cannot separate mgrassign from assign/delivery in stock-adjacent phrases.
8. **Smoke measures regex-only** — production LLM may perform better; benchmarks understate LLM, overstate regex gaps.

---

## Weakest boundaries

1. **assign → general_chat** (recall 33%) — weakest overall  
2. **assign_delivery → task_inventory_nl** (8 FNs) — weakest stock pair  
3. **assign_clarify ↔ inventory_status** — workflow keyword bleed  
4. **depart_assign → general_chat** — vendor/team barriers  

---

## Recommended V2 implementation focus

**Primary:** Fix the **deterministic abstain policy** for delegation/stock clusters — stop routing operational phrases to `general_chat` without clarify or LLM attempt.

**Secondary:** **Stock-linked slot extraction** (worker + SKU + qty + order invariance) before intent label choice between `assign_delivery` and `task_inventory_nl`.

**Tertiary:** **Role-aware classify** for mgrassign vs assign and worker-invalid stock commands.

**Measurement:** Run parallel **LLM-on** smoke slice for assign family before hardening to avoid optimizing regex-only CI while production uses LLM.

---

## References

- Smoke report: `ml/eval/reports/smoke_intent_eval_deterministic.json`
- Boundaries: `21-intent-boundary-specifications.md`
- Ambiguity: `23-ambiguity-analysis.md`
- Role: `45-role-awareness-audit.md`
- V1 audit: `71-ml-hardening-v1-audit.md`
