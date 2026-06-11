# ML Hardening Final Audit — Real World Robustness Assessment

**Date:** 2026-06-11  
**Branch:** `feature/shantanu-ml-hardening-v1`  
**Mode:** Analysis only — no code or dataset changes  
**Benchmark state:** Smoke 200/200 · Workflow 429/429 · Live smoke 200/200 · Contract drift green

---

## Executive summary

Benchmark saturation is **real**: 566 unique eval messages achieve **100% accuracy** with **0% reaching the LLM fallback**. This validates hardened regex paths but **does not prove** generalization to unconstrained factory WhatsApp traffic.

| Dimension | Assessment |
|-----------|--------------|
| Benchmark fidelity | **High** for covered templates; **low** for open-world variety |
| Regex generalization | **Medium risk** — tuned to eval phrasing |
| LLM fallback value | **Unproven** on eval (never invoked); **weak** on probed adversarial cases |
| Role blindness | **High risk** for mgr vs assign in production |
| Ship confidence | **7.5 / 10** — ship with telemetry, not with complacency |

---

## Phase 1 — Dataset saturation audit

### Smoke dataset (`smoke-v1.1.jsonl`)

| Metric | Value | Concern |
|--------|-------|---------|
| Total cases | 200 | Fixed boundary slice design |
| Unique messages | **185** | **15 duplicates** (7.5%) |
| Language | 92% Hinglish, 8% English, 1% Hindi | Under-represents pure Hindi, typos |
| Avg words/message | 3.6 | Short, template-like |
| Intents covered | 24 of 31 contract intents | 7 intents thin or absent |
| LLM path hit rate | **0%** | Saturation masks LLM behavior |

**Repeated / overrepresented patterns:**

| Pattern | Prevalence | Risk |
|---------|------------|------|
| `import inventory*` variants | 12+ cases | Overfits import collision fix |
| `Name ko …` dative assign | 33 cases | High coverage; rare alternate constructions under-tested |
| `task N` manager phrases | 24 cases | MSME shorthand under-tested (only in mgr slice) |
| Slash commands | 3 cases | CommandParser barely exercised |
| Contract-gap slice | 30 cases (15%) | Artificial density vs production frequency |

**Underrepresented in smoke:**

| Intent / area | Smoke count | Gap |
|---------------|-------------|-----|
| `/present`, `/absent` | 1 each | Attendance variety (leave types, multi-day) |
| `/help`, `/members` | 1 each | Near-zero coverage |
| `/suggestion_approve` | 2 | Edge workflow |
| `/issue`, `/issues`, `/resolve` | 0 in smoke | **Not in smoke at all** |
| `/report` | 0 in smoke | Attendance reporting absent |
| Typos / broken English | ~0 | Only canonical Hinglish |
| Voice-to-text artifacts | 0 | No filler, no ASR errors |
| Multi-sentence messages | 0 | Max ~9 words; production often longer |
| SKU-specific inventory queries | Sparse | `CEM001`-style codes rare in smoke |

**Artificial phrasing signals:**

- Generator-driven templates (`generate_smoke_v1_1.py`) — boundary-positive by design
- Duplicate messages across slices (`import inventory`, `ram ko 50 bolt bhejo`, etc.) — inflates pass rate
- Role field present but **not passed to classifier** — metadata only

### Workflow dataset (`data/eval/intents/*.json`)

| File | Cases | Focus |
|------|-------|-------|
| inventory_create | 100 | Template-saturated after V2E |
| inventory_status | 100 | Template-saturated after V2E |
| onboard_vendor | 100 | Template-saturated after V2E |
| onboard_worker | 100 | Worker onboarding |
| manager_workflows | **29 only** | Smallest, highest real-world variance |

| Metric | Value |
|--------|-------|
| Unique messages | 419 / 429 |
| Languages | Hindi 34%, English 33%, Hinglish 31%, typos/broken/msme **12 total** |
| Intents | **8 only** — inventory, onboard, mgr* |
| Combined with smoke | 566 unique messages, **25 intents** |

**Critical gap:** Workflow eval does **not** cover `/assign`, `/issue`, `/complete`, `/present`, `/purchase_request_create`, `/business_discovery`, etc. Smoke carries those — but with thin counts for several.

### Saturation verdict

> **The benchmark suite is a curated regression harness, not a representative sample of production traffic.** 100% pass rate means "no known gap in 566 templates" — not "all factory messages will classify correctly."

---

## Phase 2 — Real-world gap analysis

### By capability

#### Task assignment (`/assign`, `/assign_clarify`, `/depart_assign`)

| Production phrase (likely) | In eval? | Risk |
|--------------------------|----------|------|
| `anil ko ye kaam de do` (ambiguous mgr) | Partial | **High** — resolves `/assign`; role needed for mgr |
| `kisi ko assign karo` | No | **Medium** — gets `/assign`, should be `/assign_clarify` |
| `kal subah tak kar dena` (deadline only) | No | **Medium** — may sink `general_chat` |
| `@rahul @priya dono ko bolo` (multi-assignee) | No | **High** |
| `wo wala kaam jaldi karo` (deictic reference) | No | **High** |
| Long compound instructions | No | **High** |

#### Manager delegation (`/mgr*`)

| Production phrase | In eval? | Risk |
|-------------------|----------|------|
| `prnya ko task 15 do` (typo) | Yes (1) | Low — works |
| `15 priya` (ultra-shorthand) | Yes | Low |
| Owner saying `main kar lunga` without task id | No | **Medium** |
| Context-dependent reply (`haan transfer`) | No | **High** — no session API |
| Wrong-dept correction mid-thread | No | **High** |

#### Inventory (`/inventory_status`, `/inventory_create`, stock-linked)

| Production phrase | In eval? | Risk |
|-------------------|----------|------|
| `stock kitna hai` | Ambiguity doc | Low — works |
| `stock add karo` (single vs bulk) | No | **Medium** — forces `/inventory_create` |
| `deliver 50 cartons` (no assignee) | No | **High** — `general_chat` |
| `pls chk stck` (typo) | No | **High** — `general_chat` |
| SKU codes in Hinglish sentences | Sparse | **Medium** |
| `CEM001 kitna bacha` pattern | Partial | Medium |

#### Procurement (`/purchase_request_create`)

| Production phrase | In eval? | Risk |
|-------------------|----------|------|
| `purchase karo cement` | No | **High** — `general_chat` |
| `50 rolls tape mangwao` | Partial | Medium |
| `vendor se order karo` | No | **High** — may hit depart or vendor block |

#### Onboarding (`/onboard_vendor`, `/onboard_worker`, discovery)

| Production phrase | In eval? | Risk |
|-------------------|----------|------|
| `supplier ka record banao` | Yes (V2E) | Low |
| Informal vendor names / GST details in message | No | **Medium** — may overload discovery |
| Partial business profile in chat | No | **High** |

#### Reporting (`/report`, `/update`, `/complete`, `/issue`)

| Production phrase | In eval? | Risk |
|-------------------|----------|------|
| `task 12 done half` | No | **High** — misclassified `/complete` not `/update` |
| `task 5 blocked` | No | **High** — `general_chat` |
| `machine band hai` | Ambiguity doc | Low — `/issue` |
| Issue with location + severity narrative | No | **Medium** |
| `/report` attendance variants | 0 smoke cases | **Medium** |

---

## Phase 3 — Language robustness

### Support matrix

| Variant | Eval coverage | Classifier support | Risk |
|---------|---------------|-------------------|------|
| **Canonical Hinglish** | **Dominant** (92% smoke) | Strong (V2B/V2C) | Low |
| **English (formal)** | Workflow 33% | Strong for inventory/vendor | Low |
| **Hindi (Devanagari)** | 2 smoke + 34% workflow | Moderate — regex Latin-script biased | **Medium** |
| **Hinglish shorthand** | 12 msme/typo cases (mgr only) | mgr typo parsers exist | **Medium** |
| **Broken English** | 2 cases | Weak outside mgr | **High** |
| **Typos** | 5 cases (`mgrse`, `prnya`) | Partial — mgr only | **High** |
| **Heavy typos / abbrev** | 0 (`pls chk stck` fails) | **Fails** | **High** |
| **Voice-to-text** | 0 | No filler handling | **High** |
| **Mixed EN+HI in one phrase** | Common in eval | Generally OK | Low–Medium |
| **Emoji / punctuation noise** | 0 | Unknown | Medium |

### Weak areas

1. **Non-mgr typo tolerance** — inventory, assign, procurement typos sink to `general_chat`
2. **Deictic / contextual references** — `wo task`, `ye wala`, `usko` without name
3. **Passive constructions beyond trained patterns** — `kar dena`, `ho jana hai` variants
4. **Devanagari script** — most regex uses Latin transliteration
5. **LLM fallback** — probed adversarial `general_chat` cases **stay** `general_chat` with `use_llm=True`

---

## Phase 4 — Adversarial audit

Realistic messages probed against current classifier (analysis run, not added to eval):

| Message | Expected (product) | Actual | Layer | Severity |
|---------|-------------------|--------|-------|----------|
| `task 12 done half` | `/update` | `/complete` | operational completion regex | **High** |
| `task 5 blocked` | `/update` | `general_chat` | regex miss → LLM miss | **High** |
| `deliver 50 cartons` | `/task_inventory_nl` or clarify | `general_chat` | regex miss | **High** |
| `purchase karo cement` | `/purchase_request_create` | `general_chat` | regex miss | **High** |
| `pls chk stck` | `/inventory_status` | `general_chat` | typo | **High** |
| `kisi ko assign karo` | `/assign_clarify` | `/assign` | over-eager assign regex | **Medium** |
| `50 carton bhej do kisi ko` | `/assign_clarify` | `/assign_delivery` | stock+dispatch, no valid worker | **Medium** |
| `stock add karo` | clarify or create | `/inventory_create` | ambiguous — no clarify | **Medium** |
| `anil ko ye kaam de do` | role-dependent | `/assign` | no role context | **Medium** |
| `vendor ko payment bhejo` | depart or payment flow | `/depart_assign` | may be wrong dept | **Low–Medium** |
| `voice: anil call karna hai client ko` | `/assign` | `/assign_clarify` | passive + noise prefix | **Medium** |
| `namaste` / `ok` | `general_chat` | `general_chat` | OK | Low |

**Attack classes not covered by eval:**

- Incomplete instructions (`jaldi karo`, `dekh lo`)
- Sarcasm / rhetorical questions
- Replies referencing prior messages (`same as yesterday`)
- Multi-intent compound (`present hu aur task 5 update`)
- Numbers without `task` keyword (`5 pe kaam khatam`)

---

## Phase 5 — Generalization score

### By intent cluster

| Cluster | Generalization | Risk | Rationale |
|---------|----------------|------|-----------|
| Assign family (V2B) | Good in-template | **Medium** | 100% eval; weak on deictic/typo/compound |
| Task lifecycle (V2C) | Good in-template | **Medium** | `done half` → complete conflation |
| Import / contract gap | Strong | **Low** | Heavily tested; narrow collision surface |
| Inventory status/create (V2E) | Good in-template | **Medium** | 200 workflow cases; typo gaps remain |
| Onboard vendor/worker | Good in-template | **Medium** | Formal phrases; informal onboarding weak |
| Manager workflows | Moderate | **Medium–High** | Only 29 workflow + 35 smoke; role gaps |
| Issue / resolve | Weak eval | **High** | Near-zero smoke coverage |
| Procurement | Weak eval | **High** | 3 smoke cases; colloquial purchase fails |
| general_chat vs ops | Unknown | **Medium** | Short greetings OK; borderline ops sink |
| LLM fallback | **Untested on eval** | **High** | 0 eval cases hit LLM; adversarial probe weak |

### Overall risk classification

| Level | Share of real-world traffic (estimate) | Description |
|-------|----------------------------------------|-------------|
| **Low risk** | ~40–50% | Canonical Hinglish matching hardened templates |
| **Medium risk** | ~30–35% | Variants, ambiguity, shorthand, minor typos |
| **High risk** | ~15–25% | Context-dependent, typo-heavy, compound, role-sensitive, LLM-path |

**Generalization score: MEDIUM** — excellent on the 566-message manifold; uncertain beyond it.

---

## Phase 6 — Production telemetry plan

*Design only — no code in this task.*

### What to log (per `/classify` request)

| Field | Purpose |
|-------|---------|
| `message_raw` | Replay for eval case mining (PII policy required) |
| `message_normalized` | Hash or tokenized form for clustering |
| `predicted_intent` | Outcome |
| `classification_stage` | `slash` / `workflow` / `operational` / `clarify` / `deterministic` / `llm` |
| `use_llm` | Whether LLM was invoked |
| `llm_raw_intent` | Pre-post-rule LLM output (if applicable) |
| `worker_slug`, `depart_slug`, `task_id` | Slot quality audit |
| `latency_ms` | Perf |
| `factory_id`, `user_role`, `user_id` | Segment failures by role (post-hoc, not in classifier) |
| `backend_outcome` | `processCommand` success / `ensureManager` block / workflow started |
| `correction_signal` | User retry, different phrasing within 60s (proxy for misclass) |

### What to review (weekly cadence)

| Review | Action |
|--------|--------|
| **LLM-path rate** | If >5% of traffic, expand regex or prompt |
| **Top `general_chat` clusters** | Sample 50/week; label intended intent |
| **Role-blocked intents** | mgr intent from worker phone → product gap |
| **Backend handler mismatches** | ML intent OK but workflow fails |
| **Retry patterns** | Same user, similar message, different outcome |
| **New noun/verb pairs** | e.g. unseen `Name ko <verb>` — feed V2-style expansion |

### What becomes future eval cases

| Source | Promotion criteria |
|--------|-------------------|
| Logged `general_chat` with backend failure | Add within 2 weeks |
| Logged LLM path with user retry | High priority |
| Role-blocked classification | Tag for V3 or backend routing |
| Production success after initial miss | Negative case for anti-pattern |
| Monthly adversarial review | 10 synthetic + 10 real failures |

### Suggested dashboards

1. Intent distribution vs eval distribution (drift)
2. `classification_stage` breakdown (regex vs LLM)
3. Misclass proxy rate (retry + block)
4. Per-factory failure heatmap

---

## Ship confidence score

| Factor | Weight | Score (0–10) | Notes |
|--------|--------|--------------|-------|
| Benchmark pass rate | 20% | 10 | Saturated at 100% |
| Eval representativeness | 25% | 5 | 566 templates; thin on issues, typos, role |
| Adversarial probe | 20% | 6 | Several high-severity misses |
| LLM fallback strength | 15% | 4 | Unproven on eval; weak on probe |
| Role/post-classify safety net | 10% | 7 | Backend blocks some invalid paths |
| Telemetry readiness | 10% | 6 | Plan defined; not yet implemented |

**Weighted ship confidence: 7.5 / 10**

### Recommendation

| Decision | Guidance |
|----------|----------|
| **Ship hardened classifier?** | **Yes** — major regression classes closed; backend role gates exist |
| **Treat 100% eval as proof?** | **No** — saturated harness |
| **V3 before ship?** | **No** — but plan role-aware classify for mgr ambiguity |
| **Before scale** | Enable telemetry; weekly `general_chat` review; expand eval from logs |

---

## References

- V2D production validation: `75-production-path-validation.md`
- V2E inventory/vendor: `76-v2e-inventory-vendor-hardening.md`
- Ambiguity hotspots: `23-ambiguity-analysis.md`
- Role audit: `45-role-awareness-audit.md`
- Dataset generator: `ml/scripts/generate_smoke_v1_1.py`
