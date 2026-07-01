# Phase 1 — ML Hardening Prioritization (Business View)

**Scope:** Business priority ranking only — no model or architecture discussion.

Ranking dimensions:
- **Business Value** (1–5): impact if intent wrong
- **Usage Frequency** (H/M/L)
- **ML Complexity** (H/M/L): ambiguity, overlapping phrases, Hinglish variance
- **Misclassification Risk** (H/M/L): cost of wrong route

---

## Priority 1 — Harden first

| Capability | Business Value | Frequency | ML Complexity | Risk | Why P1 |
|------------|---------------|-----------|---------------|------|--------|
| **Task Delegation** | 5 | H | H | H | Core product; overlaps assign/depart/clarify/delivery NL |
| **Manager Task Coordination** | 5 | M | H | H | mgrself/mgrassign/mgrtransfer/mgrreject easily confused |
| **Inventory Visibility** | 5 | M | M | H | Revenue decisions; confused with create/import |
| **Stock-Linked Operations** | 4 | M | H | H | Missing from ML contract; overlaps assign + inventory |
| **Task Execution** | 4 | H | M | M | complete vs update vs issue — daily volume |

**Commands most affected:** `/assign`, `/depart_assign`, `/assign_clarify`, `/mgr*`, `/inventory_status`, `/assign_delivery`, `/task_inventory_nl`, `/complete`, `/update`

---

## Priority 2 — Harden second

| Capability | Business Value | Frequency | ML Complexity | Risk | Why P2 |
|------------|---------------|-----------|---------------|------|--------|
| **Attendance Management** | 4 | H | L | L | High volume but simpler patterns |
| **Task Visibility** | 4 | H | L | L | Usually distinct phrases |
| **Inventory Data Entry** | 4 | L | M | H | import vs create vs CSV — contract gap |
| **Issue Management** | 3 | M | M | M | issue vs task problem vs resolve |
| **Procurement** | 4 | L–M | M | M | Low-stock CTA vs manual PR phrases |

**Commands most affected:** `/present`, `/absent`, `/tasks`, `/inventory_create`, `/inventory_import_csv`, `/purchase_request_create`, `/issue`, `/resolve`

---

## Priority 3 — Harden later

| Capability | Business Value | Frequency | ML Complexity | Risk | Why P3 |
|------------|---------------|-----------|---------------|------|--------|
| **Workforce Onboarding** | 3 | L | L | L | Workflow-driven; explicit commands work |
| **Vendor Management** | 3 | L | L | L | Rare; workflow guided |
| **Business Setup** | 3 | L | M | M | Discovery phrases; long sessions |
| **Document Processing** | 4 | L | M | H | Rare but risky — workflow-triggered |
| **Team Visibility** | 2 | L–M | L | L | Clear intent phrases |
| **Attendance Reporting** | 3 | M | L | L | Distinct from present/absent |
| **Platform Guidance** | 2 | M | L | L | help/general_chat separation |

**Commands most affected:** `/onboard_*`, `/business_discovery`, `/continue_discovery`, `/suggestion_approve`, `/members`, `/report`, `/help`

---

## Highest-risk ML capabilities (misclassification cost)

| Rank | Capability | Typical failure mode | Business impact |
|------|------------|-------------------|-----------------|
| 1 | Stock-Linked Operations | Routes to `/assign` or `general_chat` | Wrong task type; stock not moved |
| 2 | Inventory Data Entry | "import stock" → `/inventory_create` | Wrong workflow; data errors |
| 3 | Manager Task Coordination | mgrself vs mgrassign swap | Wrong person owns task |
| 4 | Task Delegation | depart_assign vs assign | Wrong dept or person |
| 5 | Inventory Visibility | Stock question → general_chat | Owner can't decide on order |

---

## Priority summary matrix

```
                    HIGH RISK
                        │
    Stock-Linked Ops    │    Task Delegation
    Inventory Data      │    Manager Coordination
                        │
    ────────────────────┼──────────────────── HIGH FREQUENCY
                        │
    Document Processing │    Attendance / Tasks
    Business Setup      │    Task Visibility
                        │
                    LOW FREQUENCY
```

---

## Recommended hardening sequence (business phases)

1. **P1 delegation cluster** — assign, depart, clarify, mgr*, delivery, task_inventory_nl
2. **P1 inventory questions** — status vs create vs import disambiguation
3. **P2 execution cluster** — complete, update, issue boundaries
4. **P2 procurement path** — low-stock language → purchase request
5. **P3 setup/onboarding** — discovery and rare workflows
