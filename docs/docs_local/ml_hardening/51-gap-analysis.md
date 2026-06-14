# Phase 4 — Gap Analysis

For each Phase 3.5 weakness: current → target → effort.

---

## G1: Role-blind classification

| Field | Detail |
|-------|--------|
| **Current** | `/classify` receives message only; role enforced in `processCommand` |
| **Business impact** | Workers get wrong intents; mgr* emitted for owners; eval role accuracy impossible at ML layer |
| **Root cause** | API designed stateless; backend owns auth |
| **Target** | Role in classify request; invalid intents filtered or down-ranked |
| **Complexity** | Medium |
| **Risk** | Medium — API contract change affects backend caller |

---

## G2: Five missing intents

| Field | Detail |
|-------|--------|
| **Current** | `assign_delivery`, `task_inventory_nl`, `inventory_import_csv`, `suggestion_approve`, `cancel` absent from VALID_INTENTS/LLM |
| **Business impact** | NL cannot express stock delivery, bulk import, workflow cancel; wrong fallbacks |
| **Root cause** | Contract not synced with COMMANDS enum; hardcoded set |
| **Target** | All 5 in contract, VALID_INTENTS, LLM prompt, CommandParser where slash |
| **Complexity** | Low–Medium |
| **Risk** | Low for contract; medium for prompt regression |

---

## G3: Import inventory → business_discovery collision

| Field | Detail |
|-------|--------|
| **Current** | `_BUSINESS_DISCOVERY_RE` matches "import inventory"; discovery_phrases duplicate |
| **Business impact** | Owners routed to wrong onboarding flow; stock not imported |
| **Root cause** | Regex overlap; no import_csv intent |
| **Target** | import phrases → `inventory_import_csv`; discovery phrases narrowed |
| **Complexity** | Low |
| **Risk** | Low — high ROI quick win |

---

## G4: Stock-linked split routing

| Field | Detail |
|-------|--------|
| **Current** | Extractor pre-classify path; failure → `/assign`; assign_delivery slash-only |
| **Business impact** | Stock movements not tracked; delivery tasks wrong type |
| **Root cause** | Feature added as separate endpoint; not integrated into intent model |
| **Target** | Unified stock-linked cluster; extractor feeds slots not routing |
| **Complexity** | High |
| **Risk** | High — touches backend order + ML |

---

## G5: No confidence / clarify signal

| Field | Detail |
|-------|--------|
| **Current** | No score; LLM fail → general_chat; P1 phrases can hit home menu |
| **Business impact** | Silent failures; no measurable quality; Phase 2 strategy unimplementable |
| **Root cause** | API schema never included confidence; clarify only assign_clarify |
| **Target** | `confidence_tier` + clarify behavior in contract |
| **Complexity** | High |
| **Risk** | Medium — UX change for owners on ambiguous P1 |

---

## G6: Flat intent space

| Field | Detail |
|-------|--------|
| **Current** | 25+ intents as LLM siblings |
| **Business impact** | assign/depart/mgr/inventory confusions scale with new intents |
| **Root cause** | Organic growth of regex + few-shot list |
| **Target** | Cluster-first routing or grouped prompt sections |
| **Complexity** | Medium–High |
| **Risk** | Medium — prompt engineering + eval validation |

---

## G7: Hardcoded VALID_INTENTS

| Field | Detail |
|-------|--------|
| **Current** | Python set in bot_engine.py; JSON contract decorative |
| **Business impact** | Silent drift; deploy without contract update |
| **Root cause** | Historical implementation |
| **Target** | Load from JSON at init; single edit path |
| **Complexity** | Low |
| **Risk** | Low |

---

## G8: general_chat as failure sink

| Field | Detail |
|-------|--------|
| **Current** | Unknown intent + LLM error → general_chat; owners → home |
| **Business impact** | Misclassification invisible in production UX |
| **Root cause** | Safe default; no clarify path |
| **Target** | P1 operational keywords never sink to general_chat without clarify attempt |
| **Complexity** | Medium |
| **Risk** | Low–Medium |

---

## G9: CommandParser incomplete

| Field | Detail |
|-------|--------|
| **Current** | Slash passthrough missing mgr*, assign_delivery, cancel, import_csv |
| **Business impact** | Direct ML service calls differ from backend slash set |
| **Root cause** | Partial port from COMMANDS |
| **Target** | CommandParser mirrors COMMANDS enum |
| **Complexity** | Low |
| **Risk** | Low |

---

## G10: No factory/inventory grounding

| Field | Detail |
|-------|--------|
| **Current** | worker_slug resolved post-ML in backend |
| **Business impact** | Ambiguous names; wrong assignee at classify time |
| **Root cause** | Stateless ML by design |
| **Target** | Phase 6+ optional: candidate list in context for disambiguation |
| **Complexity** | High |
| **Risk** | Medium — privacy/latency |

---

## Gap priority matrix

| Gap | Business severity | Fix complexity | Priority |
|-----|-------------------|----------------|----------|
| G3 Import collision | High | Low | P0 |
| G2 Missing intents | High | Low–Med | P0 |
| G7 VALID_INTENTS sync | Medium | Low | P0 |
| G9 CommandParser | Low | Low | P1 |
| G1 Role context | High | Medium | P1 |
| G8 general_chat sink | High | Medium | P1 |
| G4 Stock-linked unify | Critical | High | P1 |
| G6 Intent hierarchy | Medium | Med–High | P2 |
| G5 Confidence tier | High | High | P2 |
| G10 Factory grounding | Medium | High | P3 |
