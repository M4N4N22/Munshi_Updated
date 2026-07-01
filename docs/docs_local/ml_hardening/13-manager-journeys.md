# Phase 1 — Manager Business Journeys

**Role:** Department head / supervisor (`MANAGER`)  
**Context:** Receives owner tasks; manages workers in a department

---

## Outcomes managers pursue

1. **Clear inbox** — know what owner assigned to their department
2. **Distribute work** — delegate to the right worker without bottlenecks
3. **Correct misroutes** — transfer or reject tasks outside their scope
4. **Floor visibility** — attendance, issues, task progress in their team
5. **Stock-aware execution** — delivery/count tasks tied to inventory

---

## Capabilities that matter most (manager)

| Priority | Capability | Why |
|----------|------------|-----|
| 1 | Manager Task Coordination | Core job — accept, delegate, transfer, reject |
| 2 | Task Delegation | Assign within team |
| 3 | Task Visibility | Daily work queue |
| 4 | Stock-Linked Operations | Delivery and material movement |
| 5 | Task Execution | Managers also complete tasks (`/mgrself`) |
| 6 | Issue Management | First responder on floor problems |
| 7 | Attendance Management | Managers mark present too |
| 8 | Inventory Visibility | Check stock before promising delivery |

---

## Commands managers use

| Situation | Commands |
|-----------|----------|
| Owner assigned task #15 to IT dept | `/mgrself 15` or NL "main kar lunga task 15" |
| Delegate to worker | `/mgrassign 15 @priya` or NL |
| Wrong department | `/mgrtransfer 15 sales` |
| Not our problem | `/mgrreject 15 hamara scope nahi` |
| Direct assign (not from owner) | `/assign @ram machine clean karo` |
| Ambiguous assign | NL → `/assign_clarify` |
| Deliver 50 cartons SKU-X | `/assign_delivery @driver SKU-X 50` or NL → `/task_inventory_nl` |
| Check team tasks | `/tasks` |
| See roster | `/members` |
| Worker's progress | Workers use `/update`; manager reads via task |
| Stock check | `/inventory_status` |
| Report problem | `/issue` or `/issues` + `/resolve` |

---

## Typical manager day (narrative)

**7:45 AM** — `/present` on WhatsApp while opening shop.

**8:15 AM** — `/tasks` shows 3 owner-assigned items for production dept.

**8:20 AM** — Takes task #12 personally: `/mgrself 12` (owner wanted dept head oversight).

**8:25 AM** — Delegates #14: "Priya ko task 14 do" → `/mgrassign`.

**10:00 AM** — Sales dept task wrongly routed: `/mgrtransfer 18 sales`.

**11:30 AM** — Customer pickup today — `/assign_delivery @ramesh CARTON-A 200`.

**1:00 PM** — Worker messages machine jam; manager `/issue conveyor belt stuck line 2`.

**3:00 PM** — `/inventory_status` before committing dispatch quantity.

**5:30 PM** — `/complete 12` on self-assigned task.

---

## Manager vs owner distinction

| Dimension | Owner | Manager |
|-----------|-------|---------|
| Cross-dept assign | `/assign`, `/depart_assign` | `/assign` within authority |
| Owner→manager pipeline | Creates tasks | `/mgr*` commands |
| Inventory setup | Full access | Full access (same backend role gate) |
| Reporting | `/report` for whole factory | `/report` (same command, dept context in tasks view) |

---

## Manager pain points → ML sensitivity

| Pain | Capability | Risk |
|------|------------|------|
| "Priya ko task 15" vs "assign task to sales" | Manager Coordination vs Delegation | **High** |
| "Main karunga" vs "Ram karega" | mgrself vs mgrassign | **High** |
| "Transfer to IT" vs "reject" | mgrtransfer vs mgrreject | **Medium** |
| Delivery NL vs plain assign | Stock-Linked vs Delegation | **High** |
