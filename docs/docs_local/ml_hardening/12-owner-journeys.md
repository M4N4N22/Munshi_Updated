# Phase 1 — Owner Business Journeys

**Role:** Factory owner / proprietor  
**Context:** Indian SMB — manufacturer, trader, distributor, workshop

---

## Outcomes owners pursue

1. **Run the floor without being physically present** — know attendance, tasks, issues
2. **Delegate without micromanaging** — assign to managers/workers/depts
3. **Protect margins** — stock truth before accepting orders; reorder in time
4. **Scale the team** — onboard workers and vendors on WhatsApp
5. **Get visibility** — who is here, what is blocked, what is low

---

## Capabilities that matter most (owner)

| Priority | Capability | Why |
|----------|------------|-----|
| 1 | Task Delegation | Owner's primary lever — "get this done" |
| 2 | Task Visibility | Oversight across departments |
| 3 | Inventory Visibility | Order acceptance, production planning |
| 4 | Attendance Reporting | Payroll, discipline |
| 5 | Issue Management | Escalations without walking the floor |
| 6 | Workforce Onboarding | Growth — new hires must join WhatsApp ops |
| 7 | Procurement | Cash flow — buy at right time |
| 8 | Business Setup | One-time but gates everything else |

Lower frequency for owner: Bulk inventory import, vendor onboarding, document approval, manager routing commands (owner uses `/assign`, not `/mgr*`).

---

## Commands owners use

| Journey stage | Typical commands / triggers |
|---------------|----------------------------|
| Morning check-in | `menu` / `hello` → home; `/report`; `/issues` |
| Delegate work | `/assign`, NL assign → `/assign_clarify`; `/depart_assign` |
| Stock check before order | `/inventory_status` or NL "kitna stock hai" |
| Reorder | Low-stock alert → `/purchase_request_create` |
| Add employee | Home → Employee jodiyein → `/onboard_worker` |
| Add stock | `/inventory_create` or `/inventory_import_csv` |
| Close the loop | `/resolve` (issues); workers `/complete` tasks |
| Setup (early) | `/business_discovery`, `/continue_discovery` |

---

## Typical owner day (narrative)

**6:30 AM** — Sends `namaste` to open home menu. Checks yesterday's `/report` for absentees.

**8:00 AM** — Customer calls for 500 units by Friday. Sends `/inventory_status steel-rod-12mm` (or Hindi equivalent via ML). Sees enough stock; accepts order.

**9:30 AM** — Tells Munshi: "IT team ko server backup karwao kal tak." ML routes to `/depart_assign` + `it` slug. IT manager gets task.

**11:00 AM** — `/issues` shows machine breakdown reported by worker. Calls mechanic; later `/resolve 8`.

**2:00 PM** — Low-stock alert on packaging material. Taps purchase CTA → `/purchase_request_create?itemId=42`.

**4:00 PM** — `/members` to confirm new welder was onboarded yesterday and linked to production dept.

**5:00 PM** — `/tasks` to see open owner-level items still pending across departments.

---

## Owner pain points → capability gaps (business view)

| Pain | Capability involved | ML sensitivity |
|------|---------------------|----------------|
| "I said assign to Anil" — wrong person | Task Delegation | High |
| "Import my Zoho stock" — wrong intent | Inventory Data Entry | High |
| "How much rod left?" — general chat | Inventory Visibility | Medium |
| "Add vendor from invoice" — unclear path | Document Processing | Medium |

---

## Owner commands rarely used

`/mgrself`, `/mgrassign`, `/mgrtransfer`, `/mgrreject` (manager domain), `/update` (worker-only), `/present`/`/absent` (owner may use but not core).
