# Phase 4A — Success Criteria & Phase Gates

**Purpose:** Measurable gates before Phase 4B+ workstreams.

---

## Phase 4A exit gates (all required)

| ID | Gate | Measure | Target |
|----|------|---------|--------|
| G4A-1 | Contract parity | `contract-drift` + ML eval | 30 slash intents; v1.1 |
| G4A-2 | Gap intents regex recall | Smoke slice S1 | ≥80% |
| G4A-3 | Import collision fixed | Probe + S2 | `import inventory` → import_csv 100% regex |
| G4A-4 | Manager regression | `manager_workflows.json` eval | No drop vs pre-baseline |
| G4A-5 | Smoke dataset | Manifest | ~200 cases, schema valid |
| G4A-6 | Baseline documented | PR-4 report | Pre/post JSON committed |
| G4A-7 | pytest ML intent suite | CI | Green |

---

## Gates before Role-aware classification (4B)

| ID | Prerequisite | Evidence |
|----|--------------|----------|
| G4B-R1 | 4A complete | G4A-1..7 |
| G4B-R2 | Role matrix frozen | Doc 22 signed off |
| G4B-R3 | Smoke mgr slices | S6, S7 ≥85% regex |
| G4B-R4 | API design | `role` query param spec in blueprint doc 54 |
| G4B-R5 | No contract drift | v1.1 stable 1 week or 0 drift PRs |

**Do not start:** `/classify?role=` implementation until G4B-R1–R4.

---

## Gates before Stock-linked unification (Phase 5)

| ID | Prerequisite | Evidence |
|----|--------------|----------|
| G5-S1 | 4B role wave complete | Role eval report |
| G5-S2 | task_inventory_nl in contract | G4A-1 |
| G5-S3 | Boundary A3 smoke | S5 confusion < baseline |
| G5-S4 | Single-path RFC | Doc 55 decision recorded |
| G5-S5 | Extract API inventory | `/extract/task-inventory` usage audit |

---

## Gates before Confidence tiers (Phase 5)

| ID | Prerequisite | Evidence |
|----|--------------|----------|
| G5-C1 | Calibrated eval set | ≥500 labeled cases |
| G5-C2 | Backend clarify handler | Product spec |
| G5-C3 | False positive rate measured | Baseline from 4A LLM smoke |
| G5-C4 | Schema v2 draft | `confidence_tier` in contract |

---

## Gates before Intent hierarchy (Phase 5)

| ID | Prerequisite | Evidence |
|----|--------------|----------|
| G5-H1 | Parent-child map | Doc 56 hierarchy table |
| G5-H2 | No duplicate regex paths | Audit bot_engine |
| G5-H3 | Stock + role stable | G5-S1, G4B complete |
| G5-H4 | Breaking change plan | Version v2.0 bump |

---

## KPIs (4A benchmark)

| Metric | Baseline (expected pre) | Post v1.1 target |
|--------|-------------------------|------------------|
| Contract gap probe pass | ~0–2/5 | 5/5 regex |
| Smoke macro accuracy (regex) | N/A | ≥75% |
| Smoke macro accuracy (LLM) | ~60–70% est. | ≥70% |
| business_discovery false import | High | Near 0 |
| manager_workflows accuracy | Current pytest baseline | No regression |

---

## Decision gate: proceed to 4B?

**Go if:** G4A-1, G4A-2, G4A-3, G4A-5, G4A-6 met.  
**No-go if:** Import collision fix reverted or mgr regression >5% absolute.
