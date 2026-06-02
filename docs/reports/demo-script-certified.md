# Certified Demo Script — Factory 3

**Use this script for recording.** Supersedes `demo-script-v1.md`.  
**Phones:** Owner 7452897444 · Manager 9456157007  
**Duration:** ~6 minutes  
**Rule:** Natural language only. Cancel stale workflows between major sections if Munshi stops responding sensibly.

---

## Preconditions (before camera rolls)

- Backend + ML running locally
- Olli send verified (test message delivered)
- Demo data present: Rahul Kumar worker, Gupta Metals vendor, Steel Sheets qty 120
- No active workflow sessions on owner/manager phones (send **cancel** if unsure)

---

## 1. Attendance — Manager (~20s)

**Precondition:** None

**Message (Manager):** `Aaj main present hoon`

**Expected Munshi response:** Present marked for today

**Workflow:** `/present` → AttendanceService.markAttendance

**DB mutation:** `attendance.is_present = true` for manager user

---

## 2. Task Assignment — Owner (~25s)

**Precondition:** No active owner workflow

**Message (Owner):** `Rahul Kumar ko store check ka kaam do`

**Expected Munshi response:** Task assigned to Rahul Kumar

**Workflow:** `/assign` → TasksService.handleAssign

**DB mutation:** New `tasks` row, assigned_to Rahul Kumar (user 35)

---

## 3. Manager Routing — Owner then Manager (~60s)

**Precondition:** No active sessions

**Message (Owner):** `Rahul Verma ko dispatch planning ka task do`

**Expected Munshi response:** Task routed to manager (awaiting manager action). **Note the task number** in Munshi's reply.

**Workflow:** Department routing → `AWAITING_MANAGER_ACTION`

**DB mutation:** Task assigned_to manager (user 34)

**Message (Manager):** `task [NUMBER] Rahul Kumar ko do`  
*(Replace [NUMBER] with task ID from owner's confirmation — do **not** rely on "mere tasks dikhao"; list send failed intermittently.)*

**Expected Munshi response:** Task delegated to Rahul Kumar

**Workflow:** `/mgrassign` → TasksService.applyManagerDelegateWorker

**DB mutation:** `routing_status = DELEGATED_TO_WORKER`

---

## 4. Inventory Query — Owner (~20s)

**Precondition:** **No active workflow** on owner phone

**Message (Owner):** `Steel sheets ka stock kitna bacha hai`

**Expected Munshi response:** Steel Sheets stock (~120 sheets)

**Workflow:** `/inventory_status`

**DB mutation:** Read only

---

## 5. Purchase Request — Owner (~90s)

**Precondition:** Inventory section complete; no other active workflow

**Message (Owner):** `purchase request bana do`

**Then reply to Munshi prompts:**

| Munshi asks | Reply |
|-------------|-------|
| Title | `Steel sheets ka order` |
| Item | `Steel Sheets` |
| Quantity | `25` |
| More items? | `Nahi` or NO |
| Approve? | `Haan` or YES |
| Vendor | `Gupta Metals` |
| Close? | `Haan` or YES |

**Expected Munshi response:** Purchase request complete

**Workflow:** PURCHASE_REQUEST_CREATE → APPROVAL → VENDOR_ASSIGNMENT → CLOSE

**DB mutation:** `purchase_requests.status = CLOSED`, `assigned_vendor_id = 12`

---

## 6. Report — Owner (~20s)

**Precondition:** PR workflow **completed** (session not ACTIVE)

**Message (Owner):** `Mujhe aaj ka report dikhao`

**Expected Munshi response:** Daily summary (attendance, tasks, issues)

**Workflow:** `/report` → ReportService.generateReport

**DB mutation:** Read aggregates

---

## 7. Closing — Owner (~20s) *(optional)*

**Precondition:** Cancel any discovery session after if opened

**Message (Owner):** `Munshi, mera business setup ka status kya hai?`

**Expected Munshi response:** Business discovery menu or progress

**Workflow:** `/business_discovery` — **pause here; do not complete all buckets on camera**

---

## Explicitly excluded from certified script

- WhatsApp document upload NL (Section 9 of v1) — use REST upload off-camera if needed
- Vendor standalone lookup NL
- Manager self-assign
- Worker task update/complete (unless time permits — use `task [ID] complete ho gaya`)
- `mere tasks dikhao` for manager (Olli risk)

---

**Total:** ~6 minutes core flow (sections 1–6)
