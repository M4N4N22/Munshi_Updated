# Phase 3.5 — Structural Limitations

Evidence-based list of architecture constraints. **Not solutions.**

---

## L1: Stateless classifier

**Evidence:** `/classify?message=` only; no session id, no history.  
**Impact:** Cannot disambiguate multi-turn; clarify flows split across backend workflow vs ML.

---

## L2: Role-blind classification

**Evidence:** `routeMlFallback` — message-only POST.  
**Impact:** mgr* vs assign, worker invalid intents, update-only worker — all classified without role.

---

## L3: No confidence score

**Evidence:** `classify-response.json` schema; no score in `IntentClassifier.classify` return.  
**Impact:** Cannot implement Phase 2 low-confidence clarify policy in ML layer.

---

## L4: Flat intent namespace

**Evidence:** `VALID_INTENTS` flat set; LLM prompt flat list.  
**Impact:** 25+ sibling intents; high confusion among delegation/mgr/inventory clusters.

---

## L5: Hardcoded VALID_INTENTS vs JSON contract

**Evidence:** `bot_engine.py` line 1906; `document_types.INTENT_TYPES` loaded but unused in classify.  
**Impact:** Contract drift undetected at runtime; 5 commands unreachable via NL classify.

---

## L6: Dual routing for stock-linked tasks

**Evidence:** `tryHandleFreeText` → `/extract/task-inventory` then `/classify`.  
**Impact:** Inconsistent outcomes; extractor failure → wrong assign intent.

---

## L7: general_chat as error sink

**Evidence:** `intent not in VALID_INTENTS → general_chat`; LLM exception → general_chat.  
**Impact:** P1 operational failures masked; owners get home menu instead of error.

---

## L8: Pre-classifier ordering rigidity

**Evidence:** Fixed chain workflow → operational → clarify → deterministic.  
**Impact:** Wrong early match cannot be overridden; discovery regex steals import phrases.

---

## L9: Discovery / import phrase collision

**Evidence:** `_BUSINESS_DISCOVERY_RE` contains `import inventory`; `intent-types.json` discovery_phrases duplicate.  
**Impact:** Structural misroute to business_discovery.

---

## L10: No ambiguity intent or clarify signal

**Evidence:** No `/clarify` or confidence in API; assign_clarify only via specific rules.  
**Impact:** Phase 2 ambiguity strategy not representable in classify output.

---

## L11: CommandParser incomplete

**Evidence:** Missing slash commands vs COMMANDS enum (mgr*, assign_delivery, cancel, import_csv).  
**Impact:** Slash passthrough inconsistent between ML service and backend.

---

## L12: LLM + regex maintenance burden

**Evidence:** 2000+ lines regex in `bot_engine.py` + large few-shot prompt.  
**Impact:** High coupling; order-sensitive; difficult to benchmark per-layer.

---

## L13: Backend masks ML errors for owners

**Evidence:** `routeGeneralChat` → `sendOwnerHome` for owner/manager on general_chat.  
**Impact:** Eval must separate classify accuracy from UX outcome.

---

## L14: Task inventory extractor SKU format

**Evidence:** `_SKU_RE` requires `CAPS_UNDERSCORE` pattern.  
**Impact:** Natural language item names skip stock path.

---

## L15: No factory/inventory grounding in classify

**Evidence:** `41-context-availability-audit.md` — no DB context to ML.  
**Impact:** Cannot resolve ambiguous SKUs or worker names at classify time.
