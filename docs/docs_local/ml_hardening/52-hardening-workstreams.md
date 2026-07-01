# Phase 4 — Hardening Workstreams

Independent work packages with goals, dependencies, impact, complexity, risk.

---

## Workstream A — Contract Alignment

| Attribute | Detail |
|-----------|--------|
| **Goals** | 30-command parity; JSON = runtime; fix discovery phrase collision |
| **Deliverables** | Updated `intent-types.json`; VALID_INTENTS from JSON; CommandParser parity; discovery_phrases split |
| **Dependencies** | None (start here) |
| **Expected impact** | Fixes import misroute; enables NL for 5 missing intents; eval can tag aligned cases |
| **Complexity** | Low |
| **Risk** | Low regression if paired with eval smoke |

---

## Workstream B — Role-Aware Classification

| Attribute | Detail |
|-----------|--------|
| **Goals** | Pass role to classifier; apply validity matrix; stop invalid top-1 |
| **Deliverables** | Extended classify request schema; backend passes role; classifier filter rules |
| **Dependencies** | A (intent list stable) |
| **Expected impact** | Role accuracy at classify layer; fewer backend 403s; cleaner eval |
| **Complexity** | Medium |
| **Risk** | API versioning; backward compat during rollout |

---

## Workstream C — Stock-Linked Intent Unification

| Attribute | Detail |
|-----------|--------|
| **Goals** | Single routing for delivery/count/issue-stock; assign_delivery + task_inventory_nl first-class |
| **Deliverables** | Unified cluster rules; extractor as slot helper; backend order simplified |
| **Dependencies** | A (intents in contract) |
| **Expected impact** | Largest P1 boundary improvement; stock tracking correctness |
| **Complexity** | High |
| **Risk** | High — dual path removal needs careful migration |

---

## Workstream D — Confidence & Clarification

| Attribute | Detail |
|-----------|--------|
| **Goals** | confidence_tier in response; P1 never silent general_chat; clarify prompts |
| **Deliverables** | Schema extension; policy engine; assign + inventory + mgr slot clarifies |
| **Dependencies** | A, partial B |
| **Expected impact** | Ambiguity resolution accuracy; measurable quality |
| **Complexity** | High |
| **Risk** | UX change; owner may see questions instead of home |

---

## Workstream E — Intent Hierarchy

| Attribute | Detail |
|-----------|--------|
| **Goals** | Cluster-first routing; smaller LLM decision spaces |
| **Deliverables** | Cluster map; staged classify or grouped prompt; cluster eval metrics |
| **Dependencies** | A, baseline benchmark |
| **Expected impact** | Boundary accuracy across delegation/mgr/inventory |
| **Complexity** | Medium–High |
| **Risk** | Two-stage latency; new failure modes between stages |

---

## Workstream F — Evaluation & Benchmarking

| Attribute | Detail |
|-----------|--------|
| **Goals** | Baseline → JSONL suites → CI gates → regression |
| **Deliverables** | ~200 smoke cases first; 1,200 min suite; harness; dashboards |
| **Dependencies** | A (contract frozen for labeling) |
| **Expected impact** | Prevents regressions; proves hardening ROI |
| **Complexity** | Medium (authoring high effort) |
| **Risk** | Delay if over-scoped before baseline |

---

## Workstream G — Session & Routing Policy (Backend)

| Attribute | Detail |
|-----------|--------|
| **Goals** | Document and test routing order; optional session_context in eval |
| **Deliverables** | Routing policy spec; session test suite; no ML change required |
| **Dependencies** | F (session cases) |
| **Expected impact** | Session accuracy GREEN → stay GREEN |
| **Complexity** | Low–Medium |
| **Risk** | Low |

---

## Workstream map

```
A (Contract) ──┬──► B (Role)
               ├──► C (Stock-linked)
               ├──► E (Hierarchy)
               └──► F (Eval) ──► all streams measured

D (Confidence) ◄── B, A
G (Session) ◄── F
```
