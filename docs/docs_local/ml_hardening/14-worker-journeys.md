# Phase 1 — Worker Business Journeys

**Role:** Shop-floor worker (`WORKER`)  
**Context:** Executes assigned tasks; minimal admin surface

---

## Outcomes workers pursue

1. **Know what to do today** — clear task list
2. **Mark attendance** — prove presence for pay
3. **Report progress** — without calling supervisor
4. **Finish work** — close tasks; trigger stock movements when applicable
5. **Flag problems** — machine, safety, material shortage

---

## Capabilities that matter most (worker)

| Priority | Capability | Why |
|----------|------------|-----|
| 1 | Task Visibility | "Mere tasks dikhao" — daily driver |
| 2 | Attendance Management | Present/absent every shift |
| 3 | Task Execution | Complete + update |
| 4 | Issue Management | Report blockers (create only) |
| 5 | Platform Guidance | Learn commands; `general_chat` hints |

Workers **cannot** access: delegation, inventory admin, reporting, onboarding, procurement, manager routing.

---

## Commands workers use

| Need | Command / NL |
|------|--------------|
| Mark present | `/present`, "aaj present hoon" |
| Mark absent | `/absent`, "aaj absent hoon" |
| See tasks | `/tasks`, "mere kaam dikhao" |
| Finish task | `/complete 12`, "task 12 complete" |
| Progress update | `/update 12 kaam chal raha hai` |
| Report problem | `/issue machine band hai` |
| Get help | `/help`, "madad" |
| Cancel stuck workflow | `/cancel` (if accidentally in one) |

---

## Typical worker day (narrative)

**8:00 AM** — Arrives; sends "present" on WhatsApp.

**8:05 AM** — `/tasks` — sees 2 assignments from morning manager delegation.

**10:30 AM** — `/update 7 half done, waiting for parts`.

**12:00 PM** — `/issue welding rod khatam ho gaya`.

**4:00 PM** — `/complete 7` after finishing delivery task (may reduce stock if linked).

**4:05 PM** — `/tasks` to confirm inbox empty.

---

## Worker journey constraints (business)

| Constraint | Impact |
|------------|--------|
| No `/assign` | Cannot delegate — reduces ML intent space |
| No `/inventory_status` | Must ask manager for stock (coordination friction) |
| No `/resolve` | Issues stay open until manager acts |
| `general_chat` → Hindi hints | Primary discovery path for new workers |

---

## Worker pain points → ML sensitivity

| Pain | Capability | Risk |
|------|------------|------|
| "task 12 done" vs "task 12 update" | Execution complete vs update | **Medium** |
| "machine broken" vs "issue with task" | Issue vs task description | **Medium** |
| Present/absent colloquial Hindi | Attendance Management | **Low–Medium** |
| Accidental admin phrase | Role enforcement saves backend; ML still wastes turn | **Low** |

---

## Onboarding gate

Worker journey **starts after** Workforce Onboarding (`/onboard_worker`). Until onboarded, worker gets registration prompt — capability dependency: Business Setup → Workforce Onboarding → Attendance + Tasks.
