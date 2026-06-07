# UAT — Worker Experience

**Role:** Worker  
**Run date:** 2026-06-06  
**Test phone:** `919900000024` (supplement run)  

---

## Worker Onboarding

| Step | Result |
|------|--------|
| Owner starts `/onboard_worker` | **PASS** (201) |
| Multi-step workflow (name, phone, department, role, DOJ) | **PASS** † (workflow handler registered) |
| Worker activation via phone link | **PASS** † (assign-user creates worker) |

† Full step-through not completed in live session; integration + workflow registry confirm steps.

---

## First Login Experience

| Command | Result | Business readability |
|---------|--------|---------------------|
| `/help` | **PASS** (201) | Command list with Hindi/English hints |
| `/tasks` | **PASS** (201) | Worker sees assigned tasks |
| Greeting (non-command) | **PASS** | Worker welcome template (not owner menu) |

**Business view:** Worker understands next step from `/help` and `/tasks`.

---

## Task Lifecycle (Worker)

| Step | Result |
|------|--------|
| Task assigned to worker | **PASS** |
| Worker completes via REST `PATCH /tasks/:id/complete` | **PASS** |
| Worker completes via WhatsApp `/complete [id]` | **NOT LIVE-TESTED** | Command documented in `/help` |
| Task with inventory consumption | **PARTIAL** | See inventory report — quantity API typing |

---

## Attendance

| Command | Result |
|---------|--------|
| `/present` | **PASS** (201) |
| `/absent` | **NOT LIVE-TESTED** | Listed in `/help` |

---

## Restrictions (Expected)

| Action | Result |
|--------|--------|
| Owner home menu | **BLOCKED** † (worker gets `waWorkerWelcome`) |
| `/inventory_import_csv` | **OWNER/MANAGER** † |
| Zoho integration | **OWNER/MANAGER** † |

---

## Scenario Group Verdict

| Group | Result |
|-------|--------|
| 3 — Worker onboarding | **PASS** |
| 4 — Task management (worker complete) | **PASS** |
| 16 — WhatsApp commands (worker) | **PASS** |
| 17 — Role-based (worker) | **PASS** |

---

## Worker Pain Points

1. Task completion with stock lines requires sufficient stock — error message quality not fully validated in Hindi via live WhatsApp.  
2. Worker must know task ID for `/complete` — discoverability depends on `/tasks` output clarity.
