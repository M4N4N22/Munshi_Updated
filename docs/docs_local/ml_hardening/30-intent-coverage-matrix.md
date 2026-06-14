# Phase 3A — Intent Coverage Matrix

**Purpose:** Define evaluation coverage priority for every command (30) mapped to business capability and P-tier.

**Coverage tiers:** Critical | High | Medium | Low  
**Eval case targets** refer to minimum cases before Phase 4 benchmark (see `36-dataset-size-planning.md`).

---

## Master matrix

| Command | Business Capability | P-Tier | Coverage Priority | Min Eval Cases | Notes |
|---------|---------------------|--------|-------------------|----------------|-------|
| `/assign` | Task Delegation | P1 | **Critical** | 40 | Core delegation; boundary-heavy |
| `/depart_assign` | Task Delegation | P1 | **Critical** | 25 | vs assign boundary |
| `/assign_clarify` | Task Delegation | P1 | **Critical** | 20 | Clarification routing |
| `/assign_delivery` | Stock-Linked Operations | P1 | **Critical** | 25 | Contract gap |
| `/task_inventory_nl` | Stock-Linked Operations | P1 | **Critical** | 30 | Contract gap; NL path |
| `/mgrself` | Manager Task Coordination | P1 | **Critical** | 25 | vs mgrassign |
| `/mgrassign` | Manager Task Coordination | P1 | **Critical** | 25 | vs assign |
| `/mgrtransfer` | Manager Task Coordination | P1 | **Critical** | 20 | vs mgrreject |
| `/mgrreject` | Manager Task Coordination | P1 | **Critical** | 20 | vs mgrtransfer |
| `/inventory_status` | Inventory Visibility | P1 | **Critical** | 30 | vs create/import |
| `/complete` | Task Execution | P1 | **High** | 30 | vs update/issue |
| `/update` | Task Execution | P1 | **High** | 25 | Worker-only |
| `/issue` | Issue Management | P1/P2 | **High** | 25 | vs update/complete |
| `/present` | Attendance Management | P2 | **High** | 20 | Daily volume |
| `/absent` | Attendance Management | P2 | **High** | 20 | vs present |
| `/tasks` | Task Visibility | P2 | **High** | 20 | Distinct phrases |
| `/inventory_create` | Inventory Data Entry | P2 | **High** | 20 | vs status/import |
| `/inventory_import_csv` | Inventory Data Entry | P2 | **Critical** | 25 | Contract gap |
| `/purchase_request_create` | Procurement | P2 | **Medium** | 15 | CTA + NL |
| `/issues` | Issue Management | P2 | **Medium** | 12 | Manager read |
| `/resolve` | Issue Management | P2 | **Medium** | 12 | vs issue |
| `/report` | Attendance Reporting | P3 | **Medium** | 12 | vs present |
| `/members` | Team Visibility | P3 | **Low** | 10 | Rare confusion |
| `/onboard_worker` | Workforce Onboarding | P3 | **Medium** | 12 | Workflow start |
| `/onboard_vendor` | Vendor Management | P3 | **Low** | 10 | Workflow start |
| `/business_discovery` | Business Setup | P3 | **Medium** | 15 | vs import phrase |
| `/continue_discovery` | Business Setup | P3 | **Low** | 8 | Alias |
| `/suggestion_approve` | Document Processing | P3 | **High** | 15 | Contract gap |
| `/cancel` | Platform Control | P3 | **High** | 15 | Contract gap; session |
| `/help` | Platform Guidance | P3 | **Medium** | 10 | vs general_chat |
| `general_chat` | Platform Guidance | P3 | **Medium** | 20 | Negative control |

---

## Coverage priority summary

| Priority | Command count | Min cases (sum) |
|----------|--------------:|----------------:|
| **Critical** | 12 | ~285 |
| **High** | 9 | ~197 |
| **Medium** | 7 | ~96 |
| **Low** | 3 | ~28 |
| **Total** | 31 rows* | **~606** |

\*Includes `general_chat` as eval intent (31 eval targets for 30 commands + general_chat).

---

## Capability rollup

| Capability | Commands | Highest coverage |
|------------|----------|------------------|
| Task Delegation | assign, depart_assign, assign_clarify | Critical |
| Stock-Linked Ops | assign_delivery, task_inventory_nl | Critical |
| Manager Coordination | mgrself, mgrassign, mgrtransfer, mgrreject | Critical |
| Inventory Visibility | inventory_status | Critical |
| Inventory Data Entry | inventory_create, inventory_import_csv | Critical/High |
| Task Execution | complete, update | High |
| Issue Management | issue, issues, resolve | High/Medium |
| Attendance | present, absent | High |
| Task Visibility | tasks | High |
| Procurement | purchase_request_create | Medium |
| Platform | help, cancel, general_chat | Medium/High |
| Onboarding/Setup | onboard_*, business_discovery, continue_discovery | Low–Medium |
| Document Processing | suggestion_approve | High |

---

## Coverage rules

1. **Critical** intents require boundary + role + ambiguity slices before benchmark.
2. **Contract-gap** commands (5) use provisional eval schema until contract aligned (`35-contract-gap-dataset-design.md`).
3. **Slash-form** and **NL-form** counted separately within each intent minimum.
4. Each intent needs ≥20% Hinglish, ≥20% English, ≥10% mixed/broken variants.
