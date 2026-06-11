# Phase 2 Summary — Workflow Analysis, Intent Boundaries & Contract Alignment

**Date:** 2026-06-10  
**Status:** Complete (research only — no code, ML, or dataset changes)

---

## 1. Highest-risk intent boundaries

| Rank | Boundary pair | Business impact |
|------|---------------|-----------------|
| 1 | `/assign` vs `/task_inventory_nl` / `/assign_delivery` | Stock not tracked on delivery |
| 2 | `/inventory_status` vs `/inventory_import_csv` vs `/inventory_create` | Wrong mutation path |
| 3 | `/mgrself` vs `/mgrassign` | Wrong person owns task |
| 4 | `/assign` vs `/depart_assign` | Wrong routing target |
| 5 | `/mgrtransfer` vs `/mgrreject` | Misroute vs escalation |
| 6 | `/complete` vs `/update` vs `/issue` | Wrong task/issue state |

Full rules: `21-intent-boundary-specifications.md`

---

## 2. Role restriction findings

| Finding | Detail |
|---------|--------|
| `/update` | Worker-only — owners/managers blocked |
| `/mgr*` | Manager-only — 4 commands |
| Inventory, onboard, procurement | Owner + Manager only |
| Worker valid set | 9 commands + general_chat |
| ML is role-agnostic today | Backend enforces; future ML should use role matrix |
| Manager dual hat | Can use `/assign` AND `/mgr*` — context disambiguation critical |

Matrix: `22-role-intent-validity-matrix.md`

---

## 3. Workflow complexity findings

| Workflow | Complexity | ML impact |
|----------|------------|-----------|
| Task Inventory NL | **High** — 4+ states, disambiguation | Competes with assign at entry |
| Inventory CSV import | **Medium** — 3 phases, CONFIRM lock | CONFIRM must not classify as intent |
| Purchase Request | **Medium** — 4 steps + prefill | CTA bypasses ML |
| Business Discovery | **Medium** — MENU/COLLECT + pause | Phrase overlap with import |
| Assign Clarify | **Low** — single step | Triggered from assign ambiguity |
| Worker/Vendor onboard | **Low** — linear steps | Session suppresses classify |

Details: `24-workflow-state-machines.md`

---

## 4. ML contract gaps

**5 commands missing from `intent-types.json`:**

| Command | Severity |
|---------|----------|
| `/assign_delivery` | Critical |
| `/task_inventory_nl` | Critical |
| `/inventory_import_csv` | Critical |
| `/suggestion_approve` | High |
| `/cancel` | Medium |

**Additional drift:**
- `discovery_phrases` "import inventory" conflicts with `/inventory_import_csv`
- `bot_engine.py` slash passthrough missing same 5+ commands
- Contract coverage: **25/30 intents (83%)**

Audit: `25-ml-contract-alignment-audit.md`

---

## 5. Ambiguity hotspots

| Hotspot | Competing intents |
|---------|-------------------|
| "Stock add karo" | create vs import |
| "Anil ko kaam do" | assign vs mgrassign |
| "Sales ko bolo" | depart_assign vs assign |
| "Main kar lunga" | mgrself vs assign |
| "Deliver 50 cartons" | stock-linked vs assign |
| "Import inventory" | import_csv vs business_discovery |
| "Task 12 half done" | update vs complete |

`/assign_clarify` triggers: no assignee + assign action verb.

Analysis: `23-ambiguity-analysis.md`

---

## 6. Low-confidence recommendations

| P1 Capability | Low-confidence action |
|---------------|----------------------|
| Task Delegation | Route to assign_clarify or ask assignee |
| Manager Coordination | Ask task id + self vs delegate |
| Inventory Visibility | Ask which SKU; never general_chat |
| Stock-Linked Ops | Ask item + qty + worker; prefer workflow |
| Task Execution | Ask complete vs update vs issue |

**Global:** P1 never silent-fail to `general_chat`.

Strategy: `26-low-confidence-strategy.md`

---

## 7. Recommended Phase 3 scope

**Phase 3 — Natural Language Dataset Design**

| Workstream | Scope |
|------------|-------|
| **3A: Contract closure** | Add 5 missing intents; fix discovery_phrases (spec only until implementation approved) |
| **3B: P1 eval datasets** | Boundary pairs from doc 21 — positive, negative, adversarial |
| **3C: Role-conditioned cases** | Invalid emissions per matrix doc 22 |
| **3D: Ambiguity cases** | Hotspots from doc 23 with expected clarification outcome |
| **3E: Session cases** | CONFIRM/CANCEL, active workflow suppression |
| **3F: Coverage thresholds** | Min cases per intent before Phase 4 benchmarking |

**Out of scope for Phase 3:** Model architecture, deployment, code changes (unless contract alignment approved separately).

**Requirements baseline:** `27-ml-hardening-requirements.md` (REQ-1 through REQ-10)

---

## Deliverables index

| File | Content |
|------|---------|
| `20-p1-workflow-analysis.md` | P1 swimlanes and decision points |
| `21-intent-boundary-specifications.md` | Formal boundary rules |
| `22-role-intent-validity-matrix.md` | Role × command validity |
| `23-ambiguity-analysis.md` | Hotspots and clarify triggers |
| `24-workflow-state-machines.md` | 8 workflow/session machines |
| `25-ml-contract-alignment-audit.md` | 5-intent gap audit |
| `26-low-confidence-strategy.md` | Per-P1 low-confidence behavior |
| `27-ml-hardening-requirements.md` | REQ-1 through REQ-10 |
| `28-phase2-summary.md` | This document |

---

**No NL datasets generated. No code modified. No git operations performed.**
