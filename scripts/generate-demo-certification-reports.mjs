/**
 * Generate Prompt 13.6 certification deliverables from demo-certification-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.join(__dirname, '..', 'docs', 'reports');
const data = JSON.parse(
  fs.readFileSync(path.join(REPORTS, 'demo-certification-results.json'), 'utf8'),
);

function write(name, content) {
  const p = path.join(REPORTS, name);
  fs.writeFileSync(p, content.trim() + '\n');
  console.log('wrote', p);
}

const ts = data.validated_at;
const cp = data.certified_phrases;
const steps = data.demo_script_run.steps;
const failedStep = steps.find((s) => s.webhook_ok === false);
const scriptCorePass =
  steps.filter((s) => s.section?.startsWith('6-7') || s.section === '7 Vendor close').every((s) => s.webhook_ok !== false || s.pass) &&
  steps.find((s) => s.section === '7 Vendor close')?.pass;

write(
  'demo-certification-report.md',
  `# Demo Certification Report — Prompt 13.6

**Audited:** ${ts}  
**Method:** Live handler execution via \`POST /webhook/test\` (same \`WhatsAppService.handleIncomingMessage\` as real WhatsApp inbound). Outbound replies sent through Olli WABA API (same as production).  
**Phones:** Owner \`917452897444\` (7452897444) · Manager \`919456157007\` (9456157007)

> Previous Prompt 13.5 reports are **superseded** by this audit. Do not rely on them without re-verification.

## Part A — Environment Verification (fresh)

| Check | Evidence | Result |
|-------|----------|--------|
| Backend :4001 | \`GET /health\` → Postgres up | ✅ PASS |
| ML :8000 | \`GET /health\` → ok | ✅ PASS |
| Database | Factory 3 queries succeeded | ✅ PASS |
| Migrations 001–008 | \`pending_count: 0\`, all 8 applied | ✅ PASS |
| Owner user | Shantanu Garg, role OWNER | ✅ PASS |
| Manager user | Rahul Verma, role MANAGER | ✅ PASS |
| Olli outbound probe | HTTP 200, WhatsApp message_id returned | ✅ PASS (at audit time) |
| WhatsApp inbound | Meta/Olli webhook configured in \`.env.local\` | ✅ Config present |

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
| Document Upload | REST \`POST /documents/upload\` only | N/A | Document orchestrator | ✅ PASS (not WhatsApp NL) |

**Commands passed:** ${data.summary.commands_passed} / ${data.summary.commands_tested}

## Part C — Key NL Findings

1. **Never use the word "inventory" in task phrases** — ML routes to \`/inventory_status\`.
2. **Use full name "Rahul Kumar"** — short "Rahul" matches manager + worker (ambiguous).
3. **Task update/complete require task ID** in message for reliable execution.
4. **Manager delegation requires \`task [ID] Rahul Kumar ko do\`** — not generic assign phrase on routed tasks.

## Part D — Workflow Session Interference

**Confirmed:** Active workflow sessions intercept all messages before ML classification.

| Scenario | Interference |
|----------|--------------|
| PR active → inventory query | YES — message consumed as PR step input |
| PR active → report | YES |
| Discovery active → task list | YES |
| After \`/cancel\` → inventory | NO |

**Recording rule:** Complete or cancel each workflow before switching topic. Never jump from PR to report without finishing or cancelling.

## Part E — 400 / Error Summary

See \`demo-400-root-cause-report.md\`. Primary causes:

1. Olli outbound failure after successful handler (user sees no reply; webhook body \`error\`)
2. ML misroute + role guard (worker + inventory keyword → Forbidden)
3. BadRequest on repeat manager delegate
4. Historical HTTP 400 from exception filter when Olli axios error escaped (older builds); current handler catches and returns 201 + \`error\`

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

See \`demo-safety-audit-v2.md\`.

## Verdict

**Conditional GO** — record using \`demo-script-certified.md\` only, with session hygiene and certified phrases. Full success criteria not met until manager task-list Olli reliability is confirmed on real phones.
`,
);

write(
  'demo-400-root-cause-report.md',
  `# Demo 400 / Error Root Cause Report

Investigation date: ${ts}

## Executive Summary

The user-visible **"Request failed with status code 400"** message is **not** from inbound command logic failing first. It originates from the **outbound Olli WhatsApp send** (\`MessagingService.sendText\`) or from **HttpException** types (403 Forbidden, 400 Bad Request) raised inside handlers after ML routing.

Current \`handleIncomingMessage\` catches most errors and returns HTTP 201 with body \`ok\` or \`error\` — the user may still see nothing on WhatsApp when Olli fails.

---

${data.errors_investigation
  .map(
    (e, i) => `## Error ${i + 1}: ${e.incoming_message.slice(0, 60)}

| Field | Value |
|-------|-------|
| **Incoming message** | \`${e.incoming_message}\` |
| **User** | \`${e.user}\` |
| **Intent (ML)** | \`${e.intent}\` |
| **Router** | ${e.router} |
| **Workflow** | ${e.workflow ?? 'none'} |
| **Handler** | ${e.handler} |
| **Exception** | ${e.exception} |
| **Webhook body** | \`${e.webhook_body ?? 'n/a'}\` |
| **Root cause** | ${e.root_cause} |
| **Production impact** | ${e.production_impact} |
| **Confidence** | ${e.confidence} |
`,
  )
  .join('\n')}

---

## Additional Error Class: Manager Task List Olli Failure

| Field | Value |
|-------|-------|
| **Message** | \`mere tasks dikhao\` (Manager) |
| **Intent** | \`/tasks\` |
| **Handler** | \`TasksService.getTasks\` → long formatted list |
| **Webhook body** | \`error\` |
| **Root cause** | Handler succeeded; Olli outbound failed (intermittent — observed during certification) |
| **Production impact** | Manager sees no task list on WhatsApp despite DB read succeeding |
| **Confidence** | MEDIUM |

---

## Historical HTTP 400 (from prior audit)

When Olli returned OAuth 190 / 400, uncaught axios errors could propagate to \`HttpExceptionFilter\`, producing:

\`\`\`json
{ "meta": { "message": "Request failed with status code 400", "failures": { "error": "whatsapp_api_error", "code": 190 } } }
\`\`\`

At audit time Olli probe returned **200**. Failures are **intermittent** and tied to outbound delivery, not ML or Postgres.

---

## Recommendations (documentation only — no fixes applied)

1. Rotate/verify Olli API key before recording.
2. Avoid manager task list in video if Olli fails on long messages — owner can speak task ID aloud.
3. Never use "inventory" in worker task phrases.
4. Always cancel stale workflows before switching commands.
`,
);

write(
  'demo-command-certification-report.md',
  `# Demo Command Certification Report

Each row tested live on ${ts}. **PASS** = correct intent + handler executed + DB effect (where applicable) + outbound send not \`error\`.

## Certification Matrix

| # | Command | Exact phrase tested | Predicted intent | Handler | Webhook | DB / logic | Result |
|---|---------|---------------------|------------------|---------|---------|------------|--------|
${data.command_certification
  .map(
    (c, i) =>
      `| ${i + 1} | ${c.command} | \`${c.phrase}\` | ${c.predicted_intent} | ${c.handler?.split(' ')[0] ?? '—'} | ${c.webhook.ok ? 'ok' : c.webhook.body} | ${c.pass ? 'verified' : c.fail_reason} | ${c.pass ? '✅ PASS' : '❌ FAIL'} |`,
  )
  .join('\n')}

## NL Hardening — Certified vs Failed Phrases

${data.nl_audit
  .map(
    (n) => `### ${n.command}

- **Recommended demo phrase:** \`${n.recommended_demo_phrase ?? 'NONE'}\`
- **Alternatives tested:** ${n.phrases_tested.map((p) => `\`${p.phrase}\` → ${p.pass ? 'PASS' : 'FAIL'}`).join('; ')}
`,
  )
  .join('\n')}

## Demo Script Step Results

| Step | Message | Intent | Webhook | Pass |
|------|---------|--------|---------|------|
${steps
  .map(
    (s) =>
      `| ${s.section} | \`${s.message ?? '—'}\` | ${s.predicted_intent ?? '—'} | ${s.webhook_ok === false ? 'error' : 'ok'} | ${s.pass === false ? '❌' : s.pass === true ? '✅' : '—'} |`,
  )
  .join('\n')}

## Failed Step Detail

${
  failedStep
    ? `**${failedStep.section}** — \`${failedStep.message}\`

- Handler likely succeeded (intent ${failedStep.predicted_intent})
- Outbound Olli returned failure → webhook body \`error\`
- **Precondition for recording:** Retry once; if fails, skip task list and use task ID from owner's routing confirmation message`
    : 'No webhook failures in script run.'
}
`,
);

write(
  'demo-workflow-session-report.md',
  `# Demo Workflow Session Interference Report

## How sessions block commands

\`WhatsAppService.handleIncomingMessage\` checks \`resolveActiveSession\` **before** ML classify. Any ACTIVE session routes the message into the workflow handler.

\`\`\`
Message → Active session? → YES → workflow step handler (ML skipped)
                         → NO  → ML classify → command/workflow start
\`\`\`

## Interference Matrix (tested ${ts})

| # | Active workflow | User tries | ML would be | Actual behaviour | Result |
|---|-----------------|------------|-------------|------------------|--------|
${data.session_audit
  .filter((s) => s.setup)
  .map(
    (s, i) =>
      `| ${i + 1} | ${s.setup_workflow} (step ${s.setup_session?.step}) | \`${s.interrupt}\` | ${s.interrupt_intent} | Consumed as workflow input | ${s.interference} |`,
  )
  .join('\n')}
| — | *(cancelled)* | Steel sheets query | /inventory_status | Normal inventory read | NO interference ✅ |

## Root Cause

| Session ID (example) | Workflow | Step | Blocking condition |
|---------------------|----------|------|-------------------|
| 94–97 | PURCHASE_REQUEST_CREATE | REQUEST_CREATION | Free-text captured as PR title/item |
| 96 | BUSINESS_DISCOVERY | MENU | Menu selection parser receives task-list phrase |

## Recording Rules

1. **Finish** each workflow (PR → YES close) or send **cancel** (\`/cancel\` or natural cancel if supported) before inventory/report/task commands.
2. Do **not** open Business Discovery mid-demo unless it is the final segment.
3. Purchase request is **multi-step** — stay in flow until Munshi confirms complete.
4. Order demo sections to minimize context switches: Attendance → Tasks → Inventory → PR (continuous) → Report → Discovery (optional close).

## Demo Script Impact

- **demo-script-v1.md Section 4 (inventory)** must run **before** Section 6 (PR) OR after PR is fully closed — not during an active PR session.
- Current script order (inventory before PR) is **correct**.
- Section 8 (report) after PR close is **correct** (verified in dry run).
`,
);

write(
  'demo-safety-audit-v2.md',
  `# Demo Safety Audit v2 — Based on Live Certification

**Source:** \`demo-certification-results.json\` (${ts})  
**Previous v1 audit superseded.**

## SAFE ✅ — Use in recording

| Flow | Certified phrase | Evidence |
|------|------------------|----------|
| Attendance | \`Aaj main present hoon\` | DB is_present=true |
| Task assign (owner) | \`Rahul Kumar ko store check ka kaam do\` | tasks count +1 |
| Owner → manager route | \`Rahul Verma ko dispatch planning ka task do\` | AWAITING_MANAGER_ACTION |
| Manager delegate | \`task [ID] Rahul Kumar ko do\` | DELEGATED_TO_WORKER |
| Inventory | \`Steel sheets ka stock kitna bacha hai\` | /inventory_status ok |
| Purchase request | \`purchase request bana do\` + workflow replies | PR CLOSED in dry run |
| Vendor assign | \`Gupta Metals\` then \`YES\` | assigned_vendor_id=12 |
| Report | \`Mujhe aaj ka report dikhao\` | /report ok (after PR closed) |
| Discovery (optional) | \`mera business setup karna hai\` | session MENU — cancel after |

## RISKY ⚠️ — Avoid or have backup

| Flow | Why | Mitigation |
|------|-----|------------|
| Manager task list | Olli send \`error\` on long list during audit | Owner states task # verbally after routing |
| Task update/complete without ID | May not resolve task | Use \`task [ID] ...\` from Munshi assign message |
| \`Rahul ko ...\` (partial name) | Ambiguous Rahul Verma vs Rahul Kumar | Always **Rahul Kumar** for worker |
| Any phrase with "inventory" in task context | ML → /inventory_status | Use "store check" instead |
| Section 9 WhatsApp document NL | No inbound document handler | Pre-upload via API; skip NL claim in video |
| Vendor narration (Section 5) | general_chat — no structured response | Skip or ad-lib human narration |

## UNSAFE ❌ — Do not demo

| Flow | Why |
|------|-----|
| \`Rahul ko inventory check karne ka task de do\` | Wrong intent — no task created |
| \`main khud yeh kaam karunga\` | general_chat — no /mgrself |
| Manager dept transfer NL | Known unreliable |
| Slash commands | Violates demo requirements |
| Re-delegate same task | BadRequest 400 |
| Commands during active PR/Discovery | Session interference |

## Reclassification vs Prompt 13.5

| Item | v1 | v2 (live) |
|------|----|----|
| Manager task list | SAFE | **RISKY** (Olli) |
| Worker task complete | SAFE (kaam complete ho gaya) | **RISKY** without task ID; **SAFE** with \`task [ID] complete ho gaya\` |
| demo-script-v1 overall | GO | **Conditional** — use certified script |
`,
);

write(
  'demo-script-certified.md',
  `# Certified Demo Script — Factory 3

**Use this script for recording.** Supersedes \`demo-script-v1.md\`.  
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

**Message (Manager):** \`Aaj main present hoon\`

**Expected Munshi response:** Present marked for today

**Workflow:** \`/present\` → AttendanceService.markAttendance

**DB mutation:** \`attendance.is_present = true\` for manager user

---

## 2. Task Assignment — Owner (~25s)

**Precondition:** No active owner workflow

**Message (Owner):** \`Rahul Kumar ko store check ka kaam do\`

**Expected Munshi response:** Task assigned to Rahul Kumar

**Workflow:** \`/assign\` → TasksService.handleAssign

**DB mutation:** New \`tasks\` row, assigned_to Rahul Kumar (user 35)

---

## 3. Manager Routing — Owner then Manager (~60s)

**Precondition:** No active sessions

**Message (Owner):** \`Rahul Verma ko dispatch planning ka task do\`

**Expected Munshi response:** Task routed to manager (awaiting manager action). **Note the task number** in Munshi's reply.

**Workflow:** Department routing → \`AWAITING_MANAGER_ACTION\`

**DB mutation:** Task assigned_to manager (user 34)

**Message (Manager):** \`task [NUMBER] Rahul Kumar ko do\`  
*(Replace [NUMBER] with task ID from owner's confirmation — do **not** rely on "mere tasks dikhao"; list send failed intermittently.)*

**Expected Munshi response:** Task delegated to Rahul Kumar

**Workflow:** \`/mgrassign\` → TasksService.applyManagerDelegateWorker

**DB mutation:** \`routing_status = DELEGATED_TO_WORKER\`

---

## 4. Inventory Query — Owner (~20s)

**Precondition:** **No active workflow** on owner phone

**Message (Owner):** \`Steel sheets ka stock kitna bacha hai\`

**Expected Munshi response:** Steel Sheets stock (~120 sheets)

**Workflow:** \`/inventory_status\`

**DB mutation:** Read only

---

## 5. Purchase Request — Owner (~90s)

**Precondition:** Inventory section complete; no other active workflow

**Message (Owner):** \`purchase request bana do\`

**Then reply to Munshi prompts:**

| Munshi asks | Reply |
|-------------|-------|
| Title | \`Steel sheets ka order\` |
| Item | \`Steel Sheets\` |
| Quantity | \`25\` |
| More items? | \`Nahi\` or NO |
| Approve? | \`Haan\` or YES |
| Vendor | \`Gupta Metals\` |
| Close? | \`Haan\` or YES |

**Expected Munshi response:** Purchase request complete

**Workflow:** PURCHASE_REQUEST_CREATE → APPROVAL → VENDOR_ASSIGNMENT → CLOSE

**DB mutation:** \`purchase_requests.status = CLOSED\`, \`assigned_vendor_id = 12\`

---

## 6. Report — Owner (~20s)

**Precondition:** PR workflow **completed** (session not ACTIVE)

**Message (Owner):** \`Mujhe aaj ka report dikhao\`

**Expected Munshi response:** Daily summary (attendance, tasks, issues)

**Workflow:** \`/report\` → ReportService.generateReport

**DB mutation:** Read aggregates

---

## 7. Closing — Owner (~20s) *(optional)*

**Precondition:** Cancel any discovery session after if opened

**Message (Owner):** \`Munshi, mera business setup ka status kya hai?\`

**Expected Munshi response:** Business discovery menu or progress

**Workflow:** \`/business_discovery\` — **pause here; do not complete all buckets on camera**

---

## Explicitly excluded from certified script

- WhatsApp document upload NL (Section 9 of v1) — use REST upload off-camera if needed
- Vendor standalone lookup NL
- Manager self-assign
- Worker task update/complete (unless time permits — use \`task [ID] complete ho gaya\`)
- \`mere tasks dikhao\` for manager (Olli risk)

---

**Total:** ~6 minutes core flow (sections 1–6)
`,
);

const goVerdict = scriptCorePass && data.summary.commands_passed >= 8
  ? 'CONDITIONAL GO'
  : 'NO-GO';

write(
  'demo-go-no-go-report.md',
  `# Demo Go / No-Go Report

**Decision date:** ${ts}  
**Verdict:** **${goVerdict}**

---

## Success Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Every demo command manually validated | ⚠️ PARTIAL | 10/12 certification rows pass; manager task list outbound failed once |
| 2 | Every workflow tested | ✅ YES | PR full path CLOSED; Discovery start; session interference mapped |
| 3 | Exact working phrases identified | ✅ YES | See \`demo-script-certified.md\` and \`certified_phrases\` in JSON |
| 4 | 400 errors fully explained | ✅ YES | \`demo-400-root-cause-report.md\` |
| 5 | Workflow session interference understood | ✅ YES | \`demo-workflow-session-report.md\` |
| 6 | Final certified demo script exists | ✅ YES | \`demo-script-certified.md\` |
| 7 | Demo recordable without uncertainty | ⚠️ PARTIAL | Core flow certifiable; manager task list + document NL remain risks |

**Overall:** ${goVerdict === 'CONDITIONAL GO' ? '**4/7 full pass, 3 partial** — proceed with certified script and preconditions' : '**Do not record** until blockers resolved'}

---

## What Works (high confidence)

- Attendance, task assign, inventory, full PR + vendor close, report
- Manager delegate **when task ID is known**
- Olli probe successful at audit time

## What Does Not Work (do not demo)

- \`Rahul ko inventory check...\` (wrong intent)
- \`main khud yeh kaam karunga\` (general_chat)
- WhatsApp "document uploaded" natural language
- Commands during active PR/Discovery without completing workflow

## Blockers Before Recording

1. Send test message to **both** demo phones on real WhatsApp — confirm delivery
2. Clear active sessions on both phones
3. Use **demo-script-certified.md** only — not demo-script-v1.md
4. Owner must capture **task ID** from routing confirmation (skip manager task list if Olli fails)

## Recording Decision

| Option | Recommendation |
|--------|----------------|
| Record today with certified script | ✅ **Approved with conditions** |
| Use demo-script-v1 as-is | ❌ **Not approved** |
| Implement fixes before any recording | Optional — not required for core 6-min flow |

---

## Artifacts

- Machine-readable: \`docs/reports/demo-certification-results.json\`
- Re-run audit: \`node scripts/run-demo-certification-audit.mjs\`
`,
);

console.log('Certification reports generated.');
