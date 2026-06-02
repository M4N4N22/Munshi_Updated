# Demo Certification Report — Prompt 13.6

**Audited:** 2026-06-02T15:19:24.263Z  
**Method:** Live handler execution via `POST /webhook/test` (same `WhatsAppService.handleIncomingMessage` as real WhatsApp inbound). Outbound replies sent through Olli WABA API (same as production).  
**Phones:** Owner `917452897444` (7452897444) · Manager `919456157007` (9456157007)

> Previous Prompt 13.5 reports are **superseded** by this audit. Do not rely on them without re-verification.

## Part A — Environment Verification (fresh)

| Check | Evidence | Result |
|-------|----------|--------|
| Backend :4001 | `GET /health` → Postgres up | ✅ PASS |
| ML :8000 | `GET /health` → ok | ✅ PASS |
| Database | Factory 3 queries succeeded | ✅ PASS |
| Migrations 001–008 | `pending_count: 0`, all 8 applied | ✅ PASS |
| Owner user | Shantanu Garg, role OWNER | ✅ PASS |
| Manager user | Rahul Verma, role MANAGER | ✅ PASS |
| Olli outbound probe | HTTP 200, WhatsApp message_id returned | ✅ PASS (at audit time) |
| WhatsApp inbound | Meta/Olli webhook configured in `.env.local` | ✅ Config present |

## Part B — Command Certification Summary

| Command | Certified Phrase | Intent | Handler | Result |
|---------|------------------|--------|---------|--------|
| Attendance | Aaj main present hoon | /present | AttendanceService | ✅ PASS |
| Task Assignment | Rahul Kumar ko store check ka kaam do | /assign | TasksService.handleAssign | ✅ PASS |
| Task List (worker) | mere tasks dikhao | /tasks | TasksService.getTasks | ✅ PASS |
| Task List (manager) | mere tasks dikhao | /tasks | TasksService.getTasks | ⚠️ Handler OK; **Olli send returned error** once (long reply) |
| Task Update | task update [ID] kaam shuru ho gaya | /update | TasksService.addUpdate | ✅ PASS (requires task ID) |
| Task Complete | task [ID] complete ho gaya | /complete | TasksService.completeTask | ✅ PASS (requires task ID) |
| Manager Delegation | task [ID] Rahul Kumar ko do | /mgrassign | TasksService.applyManagerDelegateWorker | ✅ PASS (fresh routed task) |
| Inventory Query | Steel sheets ka stock kitna bacha hai | /inventory_status | InventoryService | ✅ PASS |
| Purchase Request | purchase request bana do (+ workflow replies) | workflow | PURCHASE_REQUEST_CREATE handler | ✅ PASS (full dry run) |
| Vendor Assignment | Gupta Metals → YES | workflow steps | assignVendor + closePurchaseRequest | ✅ PASS |
| Reports | Mujhe aaj ka report dikhao | /report | ReportService | ✅ PASS |
| Business Discovery | mera business setup karna hai | /business_discovery | BUSINESS_DISCOVERY handler | ✅ PASS |
| Document Upload | REST `POST /documents/upload` only | N/A | Document orchestrator | ✅ PASS (not WhatsApp NL) |

**Commands passed:** 10 / 12

## Part C — Key NL Findings

1. **Never use the word "inventory" in task phrases** — ML routes to `/inventory_status`.
2. **Use full name "Rahul Kumar"** — short "Rahul" matches manager + worker (ambiguous).
3. **Task update/complete require task ID** in message for reliable execution.
4. **Manager delegation requires `task [ID] Rahul Kumar ko do`** — not generic assign phrase on routed tasks.

## Part D — Workflow Session Interference

**Confirmed:** Active workflow sessions intercept all messages before ML classification.

| Scenario | Interference |
|----------|--------------|
| PR active → inventory query | YES — message consumed as PR step input |
| PR active → report | YES |
| Discovery active → task list | YES |
| After `/cancel` → inventory | NO |

**Recording rule:** Complete or cancel each workflow before switching topic. Never jump from PR to report without finishing or cancelling.

## Part E — 400 / Error Summary

See `demo-400-root-cause-report.md`. Primary causes:

1. Olli outbound failure after successful handler (user sees no reply; webhook body `error`)
2. ML misroute + role guard (worker + inventory keyword → Forbidden)
3. BadRequest on repeat manager delegate
4. Historical HTTP 400 from exception filter when Olli axios error escaped (older builds); current handler catches and returns 201 + `error`

## Part F — Demo Script v1 Re-validation

| Section | Result |
|---------|--------|
| 1 Attendance | ✅ PASS |
| 2 Task assign | ✅ PASS |
| 3 Manager ops | ⚠️ 3a/3c PASS; **3b manager task list — Olli send error** |
| 4 Inventory | ✅ PASS |
| 6–7 Purchase + vendor | ✅ PASS (PR #17 CLOSED, vendor 12) |
| 8 Report | ✅ PASS |
| Worker update/complete | ✅ PASS with task ID phrases |
| 10 Discovery | ✅ PASS |
| 9 Document (WhatsApp NL) | ❌ NOT CERTIFIED — no WhatsApp document handler |

**demo-script-v1.md validity:** **Partially invalid.** Sections 2, 4, 6–8 usable with certified phrases. Section 3b risky. Section 9 must change. Section 5 optional narration only.

## Part G — Safety Reclassification

See `demo-safety-audit-v2.md`.

## Verdict

**Conditional GO** — record using `demo-script-certified.md` only, with session hygiene and certified phrases. Full success criteria not met until manager task-list Olli reliability is confirmed on real phones.
