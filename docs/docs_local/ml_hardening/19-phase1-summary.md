# Phase 1 Summary — Business Capability & Use Case Mapping

**Date:** 2026-06-10  
**Status:** Complete (research only — no code changes)  
**Builds on:** Phase 0 (30 commands, registry verified)

---

## 1. Total business capabilities

**17** refined capabilities (see `10-business-capability-map.md`)

Consolidated from Phase 0's 18 command-centric groups by merging meta/navigation and clarifying inventory split (Visibility vs Data Entry).

---

## 2. Most important capabilities (business value)

| Rank | Capability | Why |
|------|------------|-----|
| 1 | Task Delegation | Core Munshi value — "get work done via WhatsApp" |
| 2 | Task Execution | Closes the loop — work actually happens |
| 3 | Inventory Visibility | Order acceptance, production, cash tied to stock truth |
| 4 | Manager Task Coordination | Multi-dept factories depend on owner→manager→worker |
| 5 | Attendance Management | Daily compliance and payroll foundation |

---

## 3. Highest-frequency capabilities

| Frequency | Capabilities |
|-----------|--------------|
| **High** | Attendance Management, Task Visibility, Task Execution, Task Delegation |
| **Medium** | Manager Coordination, Issue Management, Inventory Visibility, Attendance Reporting, Platform Guidance |
| **Low** | Inventory Data Entry, Procurement, Onboarding, Vendor, Business Setup, Document Processing |

---

## 4. Highest-risk ML capabilities

| Risk | Capability | Key confusion |
|------|------------|---------------|
| Critical | Stock-Linked Operations | vs plain assign; not in ML contract |
| Critical | Inventory Data Entry | import vs create vs status |
| High | Manager Task Coordination | mgrself vs mgrassign vs transfer vs reject |
| High | Task Delegation | assign vs depart_assign vs assign_clarify |
| Medium | Task Execution | complete vs update vs issue |

---

## 5. Capability dependency map (summary)

```
Business Setup
  → Workforce Onboarding → Attendance + Tasks
  → Inventory Data Entry → Inventory Visibility → Procurement
                                              → Stock-Linked Ops
  → Vendor Management → Procurement

Team Visibility → Task Delegation → Manager Coordination → Execution
```

Full graph: `17-capability-dependencies.md`

---

## 6. Recommended next phase

**Phase 2 — Business Workflow Analysis**

| Deliverable | Purpose |
|-------------|---------|
| Swimlane diagrams | Owner → Manager → Worker per capability |
| State machines | Workflow sessions (onboard, import, purchase, discovery) |
| Intent boundary specs | Written rules for P1 clusters (no training data yet) |
| Role×intent validity matrix | Which NL intents are valid per role |
| ML contract alignment audit | Close gap: 4 commands missing from `intent-types.json` |

Phase 2 should produce **workflow documentation and evaluation criteria** — still no training example generation until Phase 3 (Natural Language Dataset Design).

---

## Deliverables index

| File | Content |
|------|---------|
| `10-business-capability-map.md` | 17 capabilities, problem framing |
| `11-command-capability-mapping.md` | Primary/secondary mapping all 30 commands |
| `12-owner-journeys.md` | Owner outcomes, commands, day narrative |
| `13-manager-journeys.md` | Manager outcomes, mgr* focus |
| `14-worker-journeys.md` | Worker outcomes, constrained surface |
| `15-real-business-scenarios.md` | SMB scenarios by capability |
| `16-capability-frequency-analysis.md` | H/M/L frequency estimates |
| `17-capability-dependencies.md` | Dependency graph |
| `18-ml-prioritization.md` | P1/P2/P3 business priorities |
| `19-phase1-summary.md` | This document |

---

## Key transitions: command → capability view

| Before (Phase 0) | After (Phase 1) |
|------------------|-----------------|
| 30 commands listed | 17 business outcomes |
| Per-command fields | Per-role journeys |
| Technical handlers | Real factory scenarios |
| Command overlap noted | ML risk ranked by capability |
| Entity dependencies | Capability dependency graph |

**No training examples created. No code modified.**
