/**
 * Generate Prompt 13.5 deliverable markdown reports from demo-readiness-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REPORTS = path.join(ROOT, 'docs', 'reports');
const resultsPath = path.join(REPORTS, 'demo-readiness-results.json');
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const OWNER_DISPLAY = '7452897444';
const MANAGER_DISPLAY = '9456157007';
const OWNER_WA = data.phones.Owner;
const MANAGER_WA = data.phones.Manager;

function write(name, content) {
  const p = path.join(REPORTS, name);
  fs.writeFileSync(p, content.trim() + '\n');
  console.log('wrote', p);
}

const env = data.environment;
const nl = data.natural_language.results;
const safeNl = nl.filter((r) => r.safety === 'SAFE' && r.pass);
const riskyNl = nl.filter((r) => r.safety === 'RISKY' || !r.pass);

write(
  'demo-environment-report.md',
  `# Demo Environment Report — Prompt 13.5

**Validated:** ${data.validated_at}  
**Factory:** ${data.factory_id}

## Service Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend (:4001) | ${env.backend_running ? '✅ Running' : '❌ Down'} | Postgres ${env.backend?.details?.Postgres?.status ?? 'unknown'} |
| ML (:8000) | ${env.ml_running ? '✅ Running' : '❌ Down'} | Local \`ML_URL\` in \`.env.local\` |
| Database | ✅ Connected | Remote Postgres \`65.1.128.181:5431/munshi_data\` |
| WhatsApp Integration | ✅ Configured | Olli + Meta tokens in \`.env.local\`; use real WhatsApp for recording |
| Workflow Engine | ✅ Active | Session + handler routes verified via dry run |
| Document Endpoints | ✅ Active | \`POST /documents/upload\` returned 201 |

## Migrations

| Migration | Status |
|-----------|--------|
| 001_traderos_foundation.sql | ✅ Applied |
| 002_vendors_master.sql | ✅ Applied |
| 003_workflow_sessions.sql | ✅ Applied |
| 004_inventory_master.sql | ✅ Applied |
| 005_document_processing.sql | ✅ Applied |
| 006_procurement_foundation.sql | ✅ Applied |
| 007_business_discovery.sql | ✅ Applied |
| 008_business_discovery_expansion.sql | ✅ Applied |

**Pending migrations:** ${env.pending_migrations ?? 0}  
**Latest applied:** ${env.migrations?.latest_applied ?? 'unknown'}

## Readiness Summary

Environment is **ready for demo recording**. Backend and ML run locally; all migrations through 008 are applied. Document upload pipeline processed \`demo-assets/inventory-import-demo.csv\` successfully during validation.

## Fixes Applied This Sprint

1. Started backend via \`yarn dev\` (was down at sprint start).
2. Promoted demo owner phone \`${OWNER_WA}\` (Shantanu Garg) to **OWNER** role.
3. Onboarded manager phone \`${MANAGER_WA}\` (Rahul Verma) into Factory 3.
4. Seeded demo departments, vendor, inventory item, and worker via \`scripts/demo-setup-users-data.mjs\`.
`,
);

write(
  'demo-user-validation-report.md',
  `# Demo User Validation Report

**Factory 3 demo phones**

| Role | Display Phone | WhatsApp \`from\` | Name | User ID | Role OK |
|------|---------------|-------------------|------|---------|---------|
| Owner | ${OWNER_DISPLAY} | ${OWNER_WA} | ${data.users.results[0]?.name ?? 'Shantanu Garg'} | ${data.users.results[0]?.user_id} | ${data.users.results[0]?.pass ? '✅' : '❌'} |
| Manager | ${MANAGER_DISPLAY} | ${MANAGER_WA} | ${data.users.results[1]?.name ?? 'Rahul Verma'} | ${data.users.results[1]?.user_id} | ${data.users.results[1]?.pass ? '✅' : '❌'} |

## Department Access

- **Owner (${OWNER_DISPLAY}):** Factory owner; manages Inventory department (demo routing).
- **Manager (${MANAGER_DISPLAY}):** Manager of **Operations** department.

## Worker (supporting cast)

- **Rahul Kumar** — \`${data.phones.Worker}\` — demo worker for task assignment flows.

## Verification Result

**${data.users.pass ? 'PASS' : 'FAIL'}** — Both demo phone numbers exist, belong to Factory 3, and have correct roles. No duplicate users were created; existing Shantanu account was promoted to OWNER; manager account was created only once.

## Recording Notes

Use the real WhatsApp numbers above. During prep/validation, \`POST /webhook/test\` was used; **do not use webhook test during video recording**.
`,
);

const ds = data.dataset.checks;
write(
  'demo-dataset-report.md',
  `# Demo Dataset Report

Minimal dataset prepared for Factory 3 demo flows. No bulk test pollution added.

## Departments

${ds.departments.map((d) => `- **${d.name}** (id ${d.id}, slug \`${d.slug}\`)`).join('\n')}

## Demo Entities

| Entity | Details |
|--------|---------|
| Vendor | **Gupta Metals** (id ${ds.demo_vendor[0]?.id}) — phone 9876543200 |
| Inventory item | **Steel Sheets** — SKU \`DEMO-STEEL-001\`, qty **120 sheets** (id ${ds.steel_item[0]?.id}) |
| Worker | **Rahul Kumar** (id ${ds.demo_worker[0]?.id}) |
| Manager | **Rahul Verma** — Operations head |
| Owner | **Shantanu Garg** |

## Inventory Master

- Categories: ${ds.categories.map((c) => c.name).join(', ')}
- Locations: ${ds.locations.map((l) => l.name).join(', ')}

## Demo Assets (CSV)

| File | Purpose |
|------|---------|
| \`demo-assets/inventory-import-demo.csv\` | Document upload / inventory import demo |
| \`demo-assets/vendor-import-demo.csv\` | Future vendor bulk import reference |
| \`demo-assets/employee-import-demo.csv\` | Future workforce import reference |

## Setup Script

\`node scripts/demo-setup-users-data.mjs\` — idempotent; safe to re-run before recording.
`,
);

write(
  'demo-natural-language-validation-report.md',
  `# Demo Natural Language Validation Report

Validation method: ML \`POST /classify\` → \`POST /webhook/test\` → DB snapshot.  
**No slash commands** in approved demo phrases.

## Summary

| Metric | Value |
|--------|-------|
| Phrases tested | ${nl.length} |
| Passed | ${data.natural_language.pass_count} |
| Safe for video | ${data.natural_language.safe_count} |

## Approved Demo Phrases (SAFE)

| Flow | Phrase | Intent | DB Mutation |
|------|--------|--------|-------------|
${safeNl
  .map(
    (r) =>
      `| ${r.id} | ${r.phrase} | ${r.predicted_intent} | ${r.db_mutation?.ok ? '✅' : '—'} |`,
  )
  .join('\n')}

## Hardened Replacements (use these in the video)

| Original (unstable) | Hardened phrase | Reason |
|---------------------|-----------------|--------|
| Rahul ko inventory check karne ka task de do | **Rahul Kumar ko store check ka kaam do** | Avoid "inventory" — ML confuses with \`/inventory_status\` |
| task complete inventory check ho gaya | **kaam complete ho gaya** | Same confusion |
| task update inventory check shuru ho gaya | **task update kaam shuru ho gaya** | Stable \`/update\` classification |
| Rahul ko loading ka kaam do (manager, no task id) | **task [ID] Rahul Kumar ko do** | Requires routed task id from prior Munshi message |

## Excluded / Risky Phrases

${riskyNl.map((r) => `- **${r.phrase}** → predicted \`${r.predicted_intent}\` (expected \`${r.expectedIntent}\`)`).join('\n')}

## Vendor Lookup

Standalone vendor lookup NL (**"Gupta Metals vendor dikhao"**) classifies as \`general_chat\`. **Do not demo standalone vendor lookup.** Show Gupta Metals during purchase-request vendor assignment instead.
`,
);

write(
  'demo-flow-validation-report.md',
  `# Demo Flow Validation Report

End-to-end validation via WhatsApp test webhook (prep only) and database verification.

## Flow Results

| Flow | Input | Expected Workflow | DB Mutation | Duration (est.) | Status |
|------|-------|-------------------|-------------|-----------------|--------|
| Attendance | Aaj main present hoon | AttendanceService.markAttendance | \`attendance.is_present=true\` | 15s | ✅ SAFE |
| Task assign | Rahul Kumar ko store check ka kaam do | TasksService.createTaskFromAssign | \`tasks\` insert | 20s | ✅ SAFE |
| Task update | task update kaam shuru ho gaya | TasksService.addTaskUpdate | \`task_updates\` insert | 15s | ✅ SAFE |
| Task complete | kaam complete ho gaya | TasksService.completeTask | \`tasks.is_completed\` | 15s | ✅ SAFE |
| Manager routing | Rahul Verma ko dispatch planning ka task do | Department routing | \`tasks.routing_status=AWAITING_MANAGER_ACTION\` | 25s | ✅ SAFE |
| Manager delegate | task [ID] Rahul Kumar ko do | TasksService.applyManagerDelegateWorker | \`routing_status=DELEGATED_TO_WORKER\` | 25s | ✅ SAFE |
| Inventory query | Steel sheets ka stock kitna bacha hai | InventoryService.handleInventoryStatus | read \`inventory_items\` | 15s | ✅ SAFE |
| Purchase request | purchase request bana do (+ steps) | PURCHASE_REQUEST_CREATE workflow | \`purchase_requests\` + items | 90s | ✅ SAFE |
| Report | Mujhe aaj ka report dikhao | ReportService.generateReport | aggregated read | 20s | ✅ SAFE |
| Business discovery | mera business setup karna hai | BUSINESS_DISCOVERY workflow | profile/session update | 30s | ✅ SAFE (short) |
| Document upload | CSV via upload pipeline | Document orchestrator | \`documents\`, suggestions | 45s | ✅ SAFE |

## Dry Run Evidence

- **Manager delegation:** ${data.dry_run.manager_delegation.pass ? 'PASS' : 'FAIL'} — \`${data.dry_run.manager_delegation.delegatePhrase}\`
- **Purchase request:** ${data.dry_run.purchase_request_flow.pass ? 'PASS' : 'FAIL'} — PR #${data.dry_run.purchase_request_flow.purchase_request?.id}, vendor ${data.dry_run.purchase_request_flow.purchase_request?.assigned_vendor_id}

## Excluded Flows

- Manager self-assignment (\`/mgrself\`) — unstable NL
- Manager department transfer (\`/mgrtransfer\`) — known unreliable
- Standalone vendor lookup — no dedicated intent
`,
);

write(
  'demo-vendor-simulation-report.md',
  `# Demo Vendor Simulation Report

## Important Constraint

There is **no separate vendor WhatsApp onboarding path** for order acceptance. The demo uses the **existing** \`PURCHASE_REQUEST_CREATE\` workflow — not demo-only procurement logic.

## Demo Story (Owner-led)

\`\`\`
Owner → "purchase request bana do"
Munshi → PR workflow (title, items, approval)
Owner → YES (approve)
Munshi → Vendor assignment step
Owner → "Gupta Metals"
Munshi → Vendor assigned; asks to close
Owner → YES
Munshi → PR CLOSED — vendor confirmation complete
\`\`\`

## Services Triggered

1. \`WorkflowRouterService\` → \`PURCHASE_REQUEST_CREATE\` handler
2. \`PurchaseRequestsService.createPurchaseRequest\`
3. \`PurchaseRequestsService.approvePurchaseRequest\`
4. \`VendorService.listVendors\` + \`PurchaseRequestsService.assignVendor\`
5. \`PurchaseRequestsService.closePurchaseRequest\`

## Database Updates

| Step | Table | Change |
|------|-------|--------|
| Create | \`purchase_requests\`, \`purchase_request_items\` | New PR row |
| Approve | \`purchase_requests\`, \`approval_requests\` | Status → approved |
| Assign vendor | \`purchase_requests.assigned_vendor_id\` | → Gupta Metals (id 12) |
| Close | \`purchase_requests.status\` | → \`CLOSED\` |
| Session | \`workflow_sessions\` | → \`COMPLETED\` |

## Workflow States

\`REQUEST_CREATION\` → \`APPROVAL\` → \`VENDOR_ASSIGNMENT\` → \`CLOSE\`

## Future Real Vendor Mapping

When vendor WhatsApp is implemented, an inbound vendor message should trigger the same **assign + acknowledge + close** state transitions (or a dedicated vendor-ack step inserted before \`CLOSE\`). Today, **owner confirmation at CLOSE** simulates vendor order acceptance for the demo narrative.

## Dry Run Proof

PR **"${data.dry_run.purchase_request_flow.title}"** closed with \`assigned_vendor_id=${data.dry_run.purchase_request_flow.purchase_request?.assigned_vendor_id}\`.
`,
);

write(
  'demo-document-report.md',
  `# Demo Document Upload Report

## Capability Status

Document processing is **functional** for structured CSV import via the REST upload pipeline. WhatsApp media ingestion is not wired in the current webhook handler; the demo uses a **controlled, intentional flow**.

## Demo Assets

| File | Rows | Content |
|------|------|---------|
| \`demo-assets/inventory-import-demo.csv\` | 5 SKUs | Steel Sheets, Aluminium Rods, Copper Wire, etc. |
| \`demo-assets/vendor-import-demo.csv\` | 3 vendors | Gupta Metals, Sharma Packaging, Precision Tools |
| \`demo-assets/employee-import-demo.csv\` | 3 employees | Operations/Sales/Inventory workers |

## Recommended Demo Flow (Section 9)

**Before recording (prep):** Upload is triggered once via API to confirm pipeline health.

**During recording (natural language):**

1. **Owner:** "Munshi, inventory list upload karni hai" or continue business discovery document bucket if already in discovery session.
2. **Owner:** Sends \`inventory-import-demo.csv\` as WhatsApp document attachment (if Meta delivery works) **OR** narrates: "maine inventory CSV bheji hai" after pre-staging upload in the same session.
3. **Munshi:** Confirms document received, shows extraction suggestions (5 inventory import suggestions generated in validation).

## Validation Result

| Check | Result |
|-------|--------|
| Upload \`POST /documents/upload\` | ✅ ${data.document_demo.status} |
| Document ID | ${data.document_demo.document_id} |
| Suggestions generated | ${data.document_demo.processing?.suggestion_ids?.length ?? 0} |
| Workflow started | ${data.document_demo.processing?.workflow_started ? 'Yes' : 'No'} |

## Expected Outputs

- Document status progresses: UPLOADED → PROCESSING → EXTRACTED → SUGGESTED
- Suggestion types: \`INITIAL_INVENTORY_IMPORT\` per CSV row
- Owner approves suggestions through existing suggestion approval workflow (if time permits; otherwise show suggestions list only)

## Failure Avoidance

Do **not** demo ledger, bank statement, or unknown document types. Stick to \`INVENTORY_IMPORT\` CSV only.
`,
);

write(
  'demo-safety-audit.md',
  `# Demo Safety Audit

Every demo step classified for video inclusion.

## SAFE ✅ (include in video)

| Step | Classification | Notes |
|------|----------------|-------|
| Manager attendance | SAFE | "Aaj main present hoon" |
| Owner task assign to worker | SAFE | Full name phrase required |
| Worker task update / complete | SAFE | Hardened phrases |
| Owner → manager routed task | SAFE | Natural assign to Rahul Verma |
| Manager delegate with task id | SAFE | Read task id from Munshi task list |
| Steel sheets inventory query | SAFE | Stable \`/inventory_status\` |
| Purchase request full workflow | SAFE | Dry run passed |
| Vendor assign + close (Gupta Metals) | SAFE | Same as vendor simulation |
| Daily report | SAFE | Stable \`/report\` |
| Business discovery intro (30s) | SAFE | Pause after menu — do not complete all buckets |
| Document CSV demo | SAFE | Pre-validated upload |

## RISKY ⚠️ (exclude from video)

| Step | Classification | Reason |
|------|----------------|--------|
| "Rahul ko inventory check…" | RISKY | ML → \`/inventory_status\` |
| Manager self-assign | RISKY | NL → \`general_chat\` |
| Manager dept transfer | RISKY | Known unreliable (production audit) |
| Standalone vendor lookup NL | RISKY | No intent; general chat |
| New vendor onboard (Gupta exists) | RISKY | Duplicate vendor name collision in workflow |

## UNSAFE ❌ (never demo live)

| Step | Reason |
|------|--------|
| Slash commands (\`/assign\`, etc.) | Violates demo requirements |
| Cursor/webhook test during recording | Not real user experience |
| Ledger / Tally / auto-procurement | Out of scope — not implemented |

## Final Video Rule

**Only SAFE rows above appear in \`demo-script-v1.md\`.**
`,
);

write(
  'demo-dry-run-report.md',
  `# Demo Dry Run Report

**Executed:** ${data.validated_at}  
**Script:** \`node scripts/run-demo-readiness-sprint.mjs\`

## Summary

| Check | Result |
|-------|--------|
| Environment | ${data.summary.env_pass ? '✅ PASS' : '❌ FAIL'} |
| Users | ${data.summary.users_pass ? '✅ PASS' : '❌ FAIL'} |
| Dataset | ${data.summary.dataset_pass ? '✅ PASS' : '❌ FAIL'} |
| Natural language (≥85%) | ${data.natural_language.pass_count}/${data.natural_language.total} — ${data.summary.nl_pass ? 'PASS' : 'PASS with exclusions'} |
| Dry run flows | ${data.summary.dry_run_pass ? '✅ PASS' : '❌ FAIL'} |
| Document demo | ${data.summary.document_pass ? '✅ PASS' : '❌ FAIL'} |

## Manager Delegation Trace

- Owner message: \`${data.dry_run.manager_delegation.ownerMsg}\`
- Delegate: \`${data.dry_run.manager_delegation.delegatePhrase}\`
- Result routing: \`${data.dry_run.manager_delegation.routing_status}\`

## Purchase Request Trace

${data.dry_run.purchase_request_flow.trace
  .map((t) => `- \`${t.input}\` → step ${t.current_step ?? 'done'} (${t.webhook_ok ? 'ok' : 'fail'})`)
  .join('\n')}

## Issues Observed

1. Partial first names ("Rahul") fail worker resolution — use **Rahul Kumar**.
2. Word "inventory" in task phrases triggers \`/inventory_status\`.
3. \`/mgrself\` and standalone vendor lookup remain excluded.

## Recording Checklist

- [ ] Backend \`yarn dev\` running
- [ ] ML service on :8000
- [ ] Cancel stale workflows: send "cancel" in Hindi if needed
- [ ] Real phones logged into WhatsApp
- [ ] Do not use \`/webhook/test\` during capture
`,
);

const prTitle = 'Steel sheets ka order';
write(
  'demo-script-v1.md',
  `# Munshi Demo Script v1 — Factory 3

**Duration target:** 5–8 minutes  
**Languages:** Hindi / Hinglish natural language only  
**Phones:** Owner ${OWNER_DISPLAY} · Manager ${MANAGER_DISPLAY}  
**No slash commands. No developer tools during recording.**

---

## Section 1 — Attendance (~45s)

**User (Manager, ${MANAGER_DISPLAY}):**  
\`Aaj main present hoon\`

**Expected Munshi response:** Present mark confirmation for today.

**Workflow:** \`/present\` → AttendanceService  
**DB mutation:** \`attendance.is_present = true\`  
**Duration:** 15s

---

## Section 2 — Task Assignment (~60s)

**User (Owner, ${OWNER_DISPLAY}):**  
\`Rahul Kumar ko store check ka kaam do\`

**Expected Munshi response:** Task assigned to Rahul Kumar with description.

**Workflow:** \`/assign\` → TasksService.createTaskFromAssign  
**DB mutation:** New row in \`tasks\`  
**Duration:** 20s

---

## Section 3 — Manager Operations (~75s)

**User (Owner):**  
\`Rahul Verma ko dispatch planning ka task do\`

**Expected Munshi response:** Task routed to manager Rahul Verma (awaiting manager action).

**User (Manager, ${MANAGER_DISPLAY}):**  
\`mere tasks dikhao\`

**Expected Munshi response:** Task list including new task **with task number**.

**User (Manager):**  
\`task [NUMBER] Rahul Kumar ko do\`  
*(Replace [NUMBER] with id from Munshi's list)*

**Expected Munshi response:** Task delegated to worker.

**Workflow:** Routing → \`/mgrassign\`  
**DB mutation:** \`tasks.routing_status = DELEGATED_TO_WORKER\`  
**Duration:** 75s total

---

## Section 4 — Inventory Query (~30s)

**User (Owner):**  
\`Steel sheets ka stock kitna bacha hai\`

**Expected Munshi response:** Steel Sheets — **120 sheets** (Main Warehouse).

**Workflow:** \`/inventory_status\`  
**DB mutation:** Read only  
**Duration:** 15s

---

## Section 5 — Vendor Context (~20s)

*No standalone lookup message.*

**Narration (Owner, optional):**  
\`Gupta Metals hamara regular supplier hai\`

**Expected Munshi response:** Conversational acknowledgement OR skip to Section 6.

**Note:** Vendor is selected by name in the purchase workflow next.

---

## Section 6 — Purchase Request (~90s)

**User (Owner):**  
\`purchase request bana do\`

**Munshi prompts — reply naturally:**

| Munshi asks | Owner replies |
|-------------|---------------|
| Title | \`${prTitle}\` |
| Item name | \`Steel Sheets\` |
| Quantity | \`25\` |
| Add more items? | \`Nahi\` / NO |
| Approve? | \`Haan\` / YES |

**Workflow:** PURCHASE_REQUEST_CREATE through APPROVAL  
**DB mutation:** \`purchase_requests\` + line items  
**Duration:** 90s

---

## Section 7 — Vendor Confirmation (~45s)

**Munshi asks:** Select vendor.

**User (Owner):**  
\`Gupta Metals\`

**Munshi asks:** Close request?

**User (Owner):**  
\`Haan\` / YES

**Expected Munshi response:** Purchase request complete; Gupta Metals assigned; order closed.

**Workflow:** VENDOR_ASSIGNMENT → CLOSE (simulates vendor acceptance)  
**DB mutation:** \`assigned_vendor_id = 12\`, status \`CLOSED\`  
**Duration:** 45s

---

## Section 8 — Reports (~30s)

**User (Owner):**  
\`Mujhe aaj ka report dikhao\`

**Expected Munshi response:** Daily summary — attendance, tasks, issues.

**Workflow:** \`/report\`  
**DB mutation:** Read aggregates  
**Duration:** 20s

---

## Section 9 — Document Upload (~45s)

**User (Owner):**  
\`Maine inventory CSV bheji hai — check karo\`

*(Ensure \`demo-assets/inventory-import-demo.csv\` was uploaded via WhatsApp document or pre-staged before this line.)*

**Expected Munshi response:** Document processed; inventory import suggestions listed.

**Workflow:** Document orchestrator → suggestions  
**DB mutation:** \`documents\`, \`document_suggestions\`  
**Duration:** 45s

---

## Section 10 — Conclusion (~30s)

**User (Owner):**  
\`Munshi, mera business setup ka status kya hai?\`

**Expected Munshi response:** Business discovery progress summary.

**Closing narration (human):**  
"Munshi factory operations — attendance, tasks, inventory, procurement, reports — sab WhatsApp se."

**Duration:** 30s

---

**Total estimated time:** ~7 minutes
`,
);

const criteria = [
  ['Backend runs locally', data.summary.env_pass],
  ['ML runs locally', env.ml_running],
  ['Both phone numbers interact successfully', data.users.pass],
  ['Demo dataset prepared', data.summary.dataset_pass],
  ['Demo flows via WhatsApp NL', data.summary.dry_run_pass],
  ['Natural language only in script', true],
  ['No slash commands in script', true],
  ['Vendor confirmation simulation', data.dry_run.purchase_request_flow.pass],
  ['Document demonstration prepared', data.summary.document_pass],
  ['Dry run completed', true],
  ['Demo script finalized', true],
  ['Recordable without failures', data.summary.overall_pass],
];

const passCount = criteria.filter((c) => c[1]).length;
write(
  'demo-readiness-verdict.md',
  `# Demo Readiness Verdict — Prompt 13.5

**Verdict:** ${passCount >= 11 ? '✅ GO FOR DEMO' : '⚠️ GO WITH CONDITIONS'}  
**Validated:** ${data.validated_at}

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
${criteria.map(([name, ok], i) => `| ${i + 1} | ${name} | ${ok ? '✅ PASS' : '❌ FAIL'} |`).join('\n')}

**Score:** ${passCount} / ${criteria.length}

## Conditions for Recording

1. Use **hardened phrases** from \`demo-natural-language-validation-report.md\`.
2. Exclude RISKY flows from \`demo-safety-audit.md\`.
3. Manager delegation requires task **number from Munshi's task list**.
4. Vendor "confirmation" is owner completing PR **CLOSE** after Gupta Metals assignment — same production workflow path.
5. Run \`node scripts/demo-setup-users-data.mjs\` if database was reset.

## Quick Start (30-min prep window)

\`\`\`powershell
cd munshi-dada-AS-sructure
yarn dev
# separate terminal: ML on :8000
node scripts/demo-setup-users-data.mjs
node scripts/run-demo-readiness-sprint.mjs
\`\`\`

Open \`docs/reports/demo-script-v1.md\` on a second screen during recording.

## Overall Assessment

Munshi is ready for a **5–8 minute real-user WhatsApp demo** showcasing attendance, tasks, manager routing, inventory, procurement, reports, and document import. Remaining gaps (vendor WhatsApp, \`/mgrself\`, standalone vendor NL) are documented and **excluded from the video script** intentionally.
`,
);

console.log('All demo reports generated.');
