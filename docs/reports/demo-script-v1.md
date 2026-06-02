# Munshi Demo Script v1 — Factory 3

**Duration target:** 5–8 minutes  
**Languages:** Hindi / Hinglish natural language only  
**Phones:** Owner 7452897444 · Manager 9456157007  
**No slash commands. No developer tools during recording.**

---

## Section 1 — Attendance (~45s)

**User (Manager, 9456157007):**  
`Aaj main present hoon`

**Expected Munshi response:** Present mark confirmation for today.

**Workflow:** `/present` → AttendanceService  
**DB mutation:** `attendance.is_present = true`  
**Duration:** 15s

---

## Section 2 — Task Assignment (~60s)

**User (Owner, 7452897444):**  
`Rahul Kumar ko store check ka kaam do`

**Expected Munshi response:** Task assigned to Rahul Kumar with description.

**Workflow:** `/assign` → TasksService.createTaskFromAssign  
**DB mutation:** New row in `tasks`  
**Duration:** 20s

---

## Section 3 — Manager Operations (~75s)

**User (Owner):**  
`Rahul Verma ko dispatch planning ka task do`

**Expected Munshi response:** Task routed to manager Rahul Verma (awaiting manager action).

**User (Manager, 9456157007):**  
`mere tasks dikhao`

**Expected Munshi response:** Task list including new task **with task number**.

**User (Manager):**  
`task [NUMBER] Rahul Kumar ko do`  
*(Replace [NUMBER] with id from Munshi's list)*

**Expected Munshi response:** Task delegated to worker.

**Workflow:** Routing → `/mgrassign`  
**DB mutation:** `tasks.routing_status = DELEGATED_TO_WORKER`  
**Duration:** 75s total

---

## Section 4 — Inventory Query (~30s)

**User (Owner):**  
`Steel sheets ka stock kitna bacha hai`

**Expected Munshi response:** Steel Sheets — **120 sheets** (Main Warehouse).

**Workflow:** `/inventory_status`  
**DB mutation:** Read only  
**Duration:** 15s

---

## Section 5 — Vendor Context (~20s)

*No standalone lookup message.*

**Narration (Owner, optional):**  
`Gupta Metals hamara regular supplier hai`

**Expected Munshi response:** Conversational acknowledgement OR skip to Section 6.

**Note:** Vendor is selected by name in the purchase workflow next.

---

## Section 6 — Purchase Request (~90s)

**User (Owner):**  
`purchase request bana do`

**Munshi prompts — reply naturally:**

| Munshi asks | Owner replies |
|-------------|---------------|
| Title | `Steel sheets ka order` |
| Item name | `Steel Sheets` |
| Quantity | `25` |
| Add more items? | `Nahi` / NO |
| Approve? | `Haan` / YES |

**Workflow:** PURCHASE_REQUEST_CREATE through APPROVAL  
**DB mutation:** `purchase_requests` + line items  
**Duration:** 90s

---

## Section 7 — Vendor Confirmation (~45s)

**Munshi asks:** Select vendor.

**User (Owner):**  
`Gupta Metals`

**Munshi asks:** Close request?

**User (Owner):**  
`Haan` / YES

**Expected Munshi response:** Purchase request complete; Gupta Metals assigned; order closed.

**Workflow:** VENDOR_ASSIGNMENT → CLOSE (simulates vendor acceptance)  
**DB mutation:** `assigned_vendor_id = 12`, status `CLOSED`  
**Duration:** 45s

---

## Section 8 — Reports (~30s)

**User (Owner):**  
`Mujhe aaj ka report dikhao`

**Expected Munshi response:** Daily summary — attendance, tasks, issues.

**Workflow:** `/report`  
**DB mutation:** Read aggregates  
**Duration:** 20s

---

## Section 9 — Document Upload (~45s)

**User (Owner):**  
`Maine inventory CSV bheji hai — check karo`

*(Ensure `demo-assets/inventory-import-demo.csv` was uploaded via WhatsApp document or pre-staged before this line.)*

**Expected Munshi response:** Document processed; inventory import suggestions listed.

**Workflow:** Document orchestrator → suggestions  
**DB mutation:** `documents`, `document_suggestions`  
**Duration:** 45s

---

## Section 10 — Conclusion (~30s)

**User (Owner):**  
`Munshi, mera business setup ka status kya hai?`

**Expected Munshi response:** Business discovery progress summary.

**Closing narration (human):**  
"Munshi factory operations — attendance, tasks, inventory, procurement, reports — sab WhatsApp se."

**Duration:** 30s

---

**Total estimated time:** ~7 minutes
