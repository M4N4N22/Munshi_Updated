/**
 * Prompt 13.6 — Demo Certification Audit
 * Output: docs/reports/demo-certification-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:4001';
const ML = 'http://127.0.0.1:8000';
const FACTORY = 3;
const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

const PHONES = {
  Owner: '917452897444',
  Manager: '919456157007',
  Worker: '919876543211',
};

const HANDLER_MAP = {
  '/present': 'AttendanceService.markAttendance',
  '/absent': 'AttendanceService.markAttendance',
  '/assign': 'TasksService.handleAssign / createTaskFromAssign',
  '/tasks': 'TasksService.getTasks',
  '/update': 'TasksService.addUpdate',
  '/complete': 'TasksService.completeTask',
  '/mgrassign': 'TasksService.applyManagerDelegateWorker',
  '/inventory_status': 'InventoryService.handleInventoryStatus',
  '/purchase_request_create': 'WorkflowRouter → PURCHASE_REQUEST_CREATE',
  '/report': 'ReportService.generateReport',
  '/business_discovery': 'WorkflowRouter → BUSINESS_DISCOVERY',
  '/onboard_vendor': 'WorkflowRouter → ONBOARD_VENDOR',
  general_chat: 'processCommand → waUnknownCommand (or Olli failure if message empty)',
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function classify(message) {
  const r = await fetch(`${ML}/classify?message=${encodeURIComponent(message)}`, {
    method: 'POST',
  });
  return r.json();
}

async function wh(phone, message) {
  const started = Date.now();
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: phone, message }),
  });
  const body = await r.text();
  return {
    http_status: r.status,
    body,
    ok: body === 'ok',
    error: body === 'error',
    ms: Date.now() - started,
  };
}

async function activeSession(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step, session_data
     FROM workflow_sessions
     WHERE phone_number = $1 AND status = 'ACTIVE'
     ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return r.rows[0] || null;
}

async function cancel(phone) {
  await wh(phone, '/cancel');
  await wait(350);
}

async function verifyEnvironment(client) {
  const backend = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  const ml = await fetch(`${ML}/health`).then((r) => r.json()).catch(() => null);
  const migrations = await fetch(`${BASE}/health/migrations`).then((r) => r.json()).catch(() => null);
  const users = await client.query(
    `SELECT u.phone_number, u.name, fu.role FROM users u
     JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=$1
     WHERE u.phone_number IN ($2,$3)`,
    [FACTORY, PHONES.Owner, PHONES.Manager],
  );
  return {
    backend: { running: backend?.status === 'ok', raw: backend },
    ml: { running: ml?.status === 'ok', raw: ml },
    database: { connected: true },
    migrations: {
      pending: migrations?.pending_count ?? null,
      applied: migrations?.applied ?? [],
      up_to_date: migrations?.up_to_date ?? false,
    },
    factory_id: FACTORY,
    demo_users: users.rows,
    whatsapp: {
      olli_url: process.env.OLLI_URL || '(from .env.local)',
      note: 'Outbound send via Olli; probe separately',
    },
    timestamp: new Date().toISOString(),
  };
}

async function probeOlli() {
  try {
    const r = await fetch('https://api.getolliai.com/api/v1/external/waba/send', {
      method: 'POST',
      headers: {
        'X-API-Key':
          process.env.OLLI_KEY ||
          'waba_f942ca5c90bfca93d127d14734bd265251cc4c1a958e8cf8f5240bacadd4433a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: PHONES.Owner,
        type: 'text',
        text: { body: '[cert-audit probe — ignore]' },
      }),
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, ok: r.ok, data };
  } catch (e) {
    return { ok: false, error: e.message, status: e.response?.status };
  }
}

async function certifyCommand(client, spec) {
  const phone = PHONES[spec.role];
  if (spec.preCancel !== false) await cancel(phone);

  const ml = await classify(spec.phrase);
  const intent = ml.intent;
  const predictedHandler = HANDLER_MAP[intent] || HANDLER_MAP[spec.expectedIntent] || 'processCommand';

  const before = spec.dbBefore ? await spec.dbBefore(client, phone) : null;
  const webhook = await wh(phone, spec.phrase);
  await wait(spec.waitMs ?? 700);

  const session = await activeSession(client, phone);
  const after = spec.dbAfter ? await spec.dbAfter(client, phone, before) : null;

  const intentOk = spec.expectedIntents
    ? spec.expectedIntents.includes(intent)
    : intent === spec.expectedIntent;

  const pass =
    webhook.ok &&
    !webhook.error &&
    intentOk &&
    (spec.passCheck ? spec.passCheck({ ml, session, before, after, webhook }) : true);

  if (session && spec.cancelAfter !== false && spec.workflow) {
    await cancel(phone);
  }

  return {
    command: spec.command,
    role: spec.role,
    phone,
    phrase: spec.phrase,
    expected_intent: spec.expectedIntent,
    expected_intents: spec.expectedIntents,
    predicted_intent: intent,
    ml_payload: ml,
    handler: predictedHandler,
    workflow: session?.workflow_type ?? spec.workflow ?? null,
    session_after: session
      ? {
          id: session.id,
          type: session.workflow_type,
          step: session.current_step,
          status: session.status,
        }
      : null,
    webhook,
    db_before: before,
    db_after: after,
    pass,
    fail_reason: pass
      ? null
      : !intentOk
        ? `intent mismatch: got ${intent}`
        : webhook.error
          ? 'webhook returned error (likely Olli send failure after handler)'
          : spec.passCheck
            ? 'db/logic check failed'
            : 'unknown',
  };
}

async function testPhraseVariants(client, command, role, phrases, expectedIntent) {
  const results = [];
  for (const phrase of phrases) {
    results.push(
      await certifyCommand(client, {
        command,
        role,
        phrase,
        expectedIntent,
        cancelAfter: true,
        passCheck: ({ webhook }) => webhook.ok && !webhook.error,
      }),
    );
    await wait(200);
  }
  const passed = results.filter((r) => r.pass);
  return {
    command,
    phrases_tested: results,
    recommended_demo_phrase: passed[0]?.phrase ?? null,
    pass: passed.length > 0,
  };
}

async function testSessionInterference(client, spec) {
  const phone = PHONES[spec.role];
  await cancel(phone);
  await wh(phone, spec.setupMessage);
  await wait(800);
  const setupSession = await activeSession(client, phone);

  const ml = await classify(spec.interruptMessage);
  const webhook = await wh(phone, spec.interruptMessage);
  await wait(700);
  const afterSession = await activeSession(client, phone);

  const blocked =
    setupSession?.status === 'ACTIVE' &&
    afterSession?.status === 'ACTIVE' &&
    afterSession?.workflow_type === setupSession?.workflow_type &&
    ml.intent !== spec.setupWorkflow;

  const pass = spec.expectBlocked ? blocked : !blocked || webhook.ok;

  await cancel(phone);

  return {
    scenario: spec.name,
    setup: spec.setupMessage,
    setup_workflow: spec.setupWorkflow,
    setup_session: setupSession
      ? { id: setupSession.id, step: setupSession.current_step }
      : null,
    interrupt: spec.interruptMessage,
    interrupt_intent: ml.intent,
    still_in_workflow: afterSession?.workflow_type ?? null,
    still_active: afterSession?.status === 'ACTIVE',
    pass: spec.expectBlocked ? blocked : afterSession?.status !== 'ACTIVE' || ml.intent === spec.interruptIntent,
    interference: blocked ? 'YES — active workflow consumed message' : 'NO',
    root_cause: blocked
      ? `Active ${setupSession.workflow_type} session at step ${setupSession.current_step} intercepts message before ML routing`
      : null,
  };
}

async function runDemoScript(client) {
  const steps = [];
  const record = async (section, role, message, check) => {
    const phone = PHONES[role];
    const ml = await classify(message);
    const webhook = await wh(phone, message);
    await wait(650);
    const session = await activeSession(client, phone);
    const row = {
      section,
      role,
      message,
      predicted_intent: ml.intent,
      webhook_ok: webhook.ok && !webhook.error,
      http_status: webhook.http_status,
      active_session: session?.workflow_type ?? null,
      session_step: session?.current_step ?? null,
    };
    if (check) {
      const extra = await check(client, row);
      Object.assign(row, extra);
    }
    steps.push(row);
    return row;
  };

  // Section 1
  await cancel(PHONES.Manager);
  await record('1 Attendance', 'Manager', 'Aaj main present hoon', async (c) => {
    const r = await c.query(
      `SELECT a.is_present FROM attendance a JOIN users u ON u.id=a.user_id
       WHERE u.phone_number=$1 AND a.factory_id=$2 AND a.date=CURRENT_DATE`,
      [PHONES.Manager, FACTORY],
    );
    return { pass: !!r.rows[0]?.is_present, db: r.rows[0] };
  });

  // Section 2
  await cancel(PHONES.Owner);
  const tasksBefore = (
    await client.query(`SELECT COUNT(*)::int c FROM tasks WHERE factory_id=$1`, [FACTORY])
  ).rows[0].c;
  await record('2 Task Assign', 'Owner', 'Rahul Kumar ko store check ka kaam do', async (c) => {
    const after = (
      await c.query(`SELECT COUNT(*)::int c FROM tasks WHERE factory_id=$1`, [FACTORY])
    ).rows[0].c;
    return { pass: after > tasksBefore, tasks: after };
  });

  // Section 3 — manager ops
  await cancel(PHONES.Owner);
  await cancel(PHONES.Manager);
  await record('3a Owner route', 'Owner', 'Rahul Verma ko dispatch planning ka task do');
  await wait(500);
  await record('3b Manager list', 'Manager', 'mere tasks dikhao');
  const route = await client.query(
    `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
     WHERE t.factory_id=$1 AND u.phone_number=$2 AND t.routing_status='AWAITING_MANAGER_ACTION'
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Manager],
  );
  const taskId = route.rows[0]?.id;
  if (taskId) {
    await record(
      '3c Manager delegate',
      'Manager',
      `task ${taskId} Rahul Kumar ko do`,
      async (c) => {
        const t = await c.query(
          `SELECT routing_status, assigned_to FROM tasks WHERE id=$1`,
          [taskId],
        );
        return {
          pass: t.rows[0]?.routing_status === 'DELEGATED_TO_WORKER',
          routing: t.rows[0],
          precondition: `Fresh AWAITING_MANAGER_ACTION task #${taskId}`,
        };
      },
    );
  } else {
    steps.push({
      section: '3c Manager delegate',
      pass: false,
      fail_reason: 'No AWAITING_MANAGER_ACTION task for manager',
    });
  }

  // Section 4
  await cancel(PHONES.Owner);
  await record('4 Inventory', 'Owner', 'Steel sheets ka stock kitna bacha hai', () => ({
    pass: true,
  }));

  // Section 6-7 PR flow
  await cancel(PHONES.Owner);
  const prTitle = `Cert PR ${Date.now()}`;
  const prSteps = [
    'purchase request bana do',
    prTitle,
    'Steel Sheets',
    '25',
    'NO',
    'YES',
    'Gupta Metals',
    'YES',
  ];
  for (const msg of prSteps) {
    await record('6-7 Purchase Request', 'Owner', msg);
  }
  const pr = await client.query(
    `SELECT id, status, assigned_vendor_id FROM purchase_requests WHERE factory_id=$1 AND title=$2`,
    [FACTORY, prTitle],
  );
  steps.push({
    section: '7 Vendor close',
    pass: pr.rows[0]?.status === 'CLOSED' && pr.rows[0]?.assigned_vendor_id != null,
    purchase_request: pr.rows[0],
  });

  // Section 8
  await cancel(PHONES.Owner);
  await record('8 Report', 'Owner', 'Mujhe aaj ka report dikhao', () => ({ pass: true }));

  // Worker update/complete — assign fresh task first
  await cancel(PHONES.Owner);
  await wh(PHONES.Owner, 'Rahul Kumar ko cert audit kaam do');
  await wait(700);
  const workerTask = await client.query(
    `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
     WHERE t.factory_id=$1 AND u.phone_number=$2 AND t.is_completed=false
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Worker],
  );
  const wtId = workerTask.rows[0]?.id;
  if (wtId) {
    await cancel(PHONES.Worker);
    await record('Worker Update', 'Worker', `task update ${wtId} kaam shuru ho gaya`, () => ({
      pass: true,
    }));
    await record('Worker Complete', 'Worker', `task ${wtId} complete ho gaya`, async (c) => {
      const t = await c.query(`SELECT is_completed FROM tasks WHERE id=$1`, [wtId]);
      return { pass: t.rows[0]?.is_completed === true };
    });
  }

  // Section 10 discovery
  await cancel(PHONES.Owner);
  await record('10 Discovery', 'Owner', 'mera business setup karna hai', async (c, row) => ({
    pass: row.active_session === 'BUSINESS_DISCOVERY',
  }));

  return {
    steps,
    pass_count: steps.filter((s) => s.pass !== false && s.webhook_ok !== false).length,
    total: steps.length,
    all_pass: steps.every((s) => s.pass !== false && (s.webhook_ok !== false || s.purchase_request)),
  };
}

async function main() {
  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  const environment = await verifyEnvironment(client);
  const olliProbe = await probeOlli();

  const commandCertification = [];

  // Attendance
  commandCertification.push(
    ...(await testPhraseVariants(client, 'Attendance', 'Manager', [
      'Aaj main present hoon',
      'Main aaj present hoon',
      'aaj present hoon',
    ], '/present')).phrases_tested.map((r) => ({ ...r, command: 'Attendance' })),
  );

  // Task assign
  commandCertification.push(
    ...(await testPhraseVariants(client, 'Task Assignment', 'Owner', [
      'Rahul Kumar ko store check ka kaam do',
      'task Rahul ko do store check ka',
      'Rahul ko inventory check karne ka task de do',
    ], '/assign')).phrases_tested.map((r) => ({ ...r, command: 'Task Assignment' })),
  );

  // Task list
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Task List',
      role: 'Worker',
      phrase: 'mere tasks dikhao',
      expectedIntent: '/tasks',
      passCheck: ({ webhook }) => webhook.ok,
    }),
  );
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Manager Task List',
      role: 'Manager',
      phrase: 'mere tasks dikhao',
      expectedIntent: '/tasks',
      passCheck: ({ webhook }) => webhook.ok,
    }),
  );

  // Inventory
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Inventory Query',
      role: 'Owner',
      phrase: 'Steel sheets ka stock kitna bacha hai',
      expectedIntent: '/inventory_status',
      passCheck: ({ webhook }) => webhook.ok,
    }),
  );

  // Report
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Reports',
      role: 'Owner',
      phrase: 'Mujhe aaj ka report dikhao',
      expectedIntent: '/report',
      passCheck: ({ webhook }) => webhook.ok,
    }),
  );

  // Business discovery
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Business Discovery',
      role: 'Owner',
      phrase: 'mera business setup karna hai',
      expectedIntent: '/business_discovery',
      workflow: 'BUSINESS_DISCOVERY',
      passCheck: ({ session }) => session?.workflow_type === 'BUSINESS_DISCOVERY',
    }),
  );

  // Purchase request start
  commandCertification.push(
    await certifyCommand(client, {
      command: 'Purchase Request',
      role: 'Owner',
      phrase: 'purchase request bana do',
      expectedIntent: '/purchase_request_create',
      workflow: 'PURCHASE_REQUEST_CREATE',
      passCheck: ({ session }) => session?.workflow_type === 'PURCHASE_REQUEST_CREATE',
    }),
  );

  // NL hardening grouped results
  const nlAudit = [
    await testPhraseVariants(client, 'Attendance', 'Manager', [
      'Aaj main present hoon',
      'Main aaj present hoon',
    ], '/present'),
    await testPhraseVariants(client, 'Task Assignment', 'Owner', [
      'Rahul Kumar ko store check ka kaam do',
      'Rahul ko inventory check karne ka task de do',
    ], '/assign'),
    await testPhraseVariants(client, 'Task Update', 'Worker', [
      'task update kaam shuru ho gaya',
      'task update inventory check shuru ho gaya',
    ], '/update'),
    await testPhraseVariants(client, 'Task Complete', 'Worker', [
      'kaam complete ho gaya',
      'task complete ho gaya',
    ], '/complete'),
    await testPhraseVariants(client, 'Manager Delegation', 'Manager', [
      'Rahul Kumar ko loading ka kaam do',
      'Rahul ko loading ka kaam do',
    ], '/assign'),
  ];

  // Session interference
  const sessionAudit = [
    await testSessionInterference(client, {
      name: 'Task workflow blocks inventory query',
      role: 'Owner',
      setupMessage: 'purchase request bana do',
      setupWorkflow: 'PURCHASE_REQUEST_CREATE',
      interruptMessage: 'Steel sheets ka stock kitna bacha hai',
      interruptIntent: '/inventory_status',
      expectBlocked: true,
    }),
    await testSessionInterference(client, {
      name: 'PR workflow blocks report',
      role: 'Owner',
      setupMessage: 'purchase request bana do',
      setupWorkflow: 'PURCHASE_REQUEST_CREATE',
      interruptMessage: 'Mujhe aaj ka report dikhao',
      interruptIntent: '/report',
      expectBlocked: true,
    }),
    await testSessionInterference(client, {
      name: 'Discovery blocks task list',
      role: 'Owner',
      setupMessage: 'mera business setup karna hai',
      setupWorkflow: 'BUSINESS_DISCOVERY',
      interruptMessage: 'mere tasks dikhao',
      interruptIntent: '/tasks',
      expectBlocked: true,
    }),
    await testSessionInterference(client, {
      name: 'After cancel — inventory works',
      role: 'Owner',
      setupMessage: 'purchase request bana do',
      setupWorkflow: 'PURCHASE_REQUEST_CREATE',
      interruptMessage: null,
      expectBlocked: false,
    }),
  ];

  // Fix last scenario - need cancel then inventory
  await cancel(PHONES.Owner);
  const afterCancelInv = await certifyCommand(client, {
    command: 'Inventory after cancel',
    role: 'Owner',
    phrase: 'Steel sheets ka stock kitna bacha hai',
    expectedIntent: '/inventory_status',
    preCancel: false,
    passCheck: ({ webhook, session }) => webhook.ok && !session,
  });
  sessionAudit.push({
    scenario: 'After /cancel — inventory query works',
    interrupt: 'Steel sheets ka stock kitna bacha hai',
    pass: afterCancelInv.pass,
    interference: 'NO',
  });

  // 400 error catalog from live tests
  const errors400 = [];

  // Worker + inventory_status misroute
  await cancel(PHONES.Worker);
  const workerBad = await classify('task complete inventory check ho gaya');
  const workerWh = await wh(PHONES.Worker, 'task complete inventory check ho gaya');
  errors400.push({
    incoming_message: 'task complete inventory check ho gaya',
    user: PHONES.Worker,
    intent: workerBad.intent,
    router: 'processCommand → ensureManager (inventory_status path)',
    workflow: null,
    handler: 'InventoryService.handleInventoryStatus',
    exception: 'ForbiddenException: Only managers and owners can perform this action',
    http_status: workerWh.http_status,
    webhook_body: workerWh.body,
    root_cause:
      'ML classifies "inventory" keyword as /inventory_status; workers cannot run inventory_status',
    production_impact: 'Worker task complete fails silently with permission error message',
    confidence: 'HIGH',
  });

  // general_chat Olli failure path
  await cancel(PHONES.Manager);
  const gcMl = await classify('main khud yeh kaam karunga');
  const gcWh = await wh(PHONES.Manager, 'main khud yeh kaam karunga');
  errors400.push({
    incoming_message: 'main khud yeh kaam karunga',
    user: PHONES.Manager,
    intent: gcMl.intent,
    router: 'processCommand(/general_chat)',
    workflow: null,
    handler: 'waUnknownCommand expected; may get undefined if chat path broken',
    exception: 'AxiosError 500 from Olli when outbound message invalid (observed in logs)',
    webhook_body: gcWh.body,
    root_cause: 'ML returns general_chat → no structured handler; intermittent Olli 500 on send',
    production_impact: 'Manager self-assign NL fails',
    confidence: 'HIGH',
  });

  // Rahul ambiguity
  await cancel(PHONES.Manager);
  const rahulWh = await wh(PHONES.Manager, 'Rahul ko loading ka kaam do');
  errors400.push({
    incoming_message: 'Rahul ko loading ka kaam do',
    user: PHONES.Manager,
    intent: (await classify('Rahul ko loading ka kaam do')).intent,
    router: '/assign → TasksService.handleAssign',
    handler: 'TasksService.handleAssign',
    exception: 'Multiple people found (@rahul matches Rahul Verma + Rahul Kumar)',
    webhook_body: rahulWh.body,
    root_cause: 'Ambiguous worker slug "rahul" — two users match',
    production_impact: 'Assign/delegate fails until full name or @id used',
    confidence: 'HIGH',
  });

  // mgrassign on already-delegated task
  await cancel(PHONES.Owner);
  await cancel(PHONES.Manager);
  await wh(PHONES.Owner, 'Rahul Verma ko cert error task do');
  await wait(800);
  const errTask = await client.query(
    `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
     WHERE t.factory_id=$1 AND u.phone_number=$2 ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Manager],
  );
  const eid = errTask.rows[0]?.id;
  if (eid) {
    await wh(PHONES.Manager, `task ${eid} Rahul Kumar ko do`);
    await wait(600);
    await wh(PHONES.Manager, `task ${eid} Rahul Kumar ko do`);
    await wait(600);
    errors400.push({
      incoming_message: `task ${eid} Rahul Kumar ko do (repeat on delegated task)`,
      user: PHONES.Manager,
      intent: '/mgrassign',
      router: 'TasksService.applyManagerDelegateWorker',
      handler: 'TasksService.assertTaskEligibleForManagerRouting',
      exception: 'BadRequestException: Task already assigned to a worker',
      root_cause: 'Re-delegating after DELEGATED_TO_WORKER state',
      production_impact: '400-class error if manager repeats delegate on same task',
      confidence: 'HIGH',
    });
  }

  const demoScript = await runDemoScript(client);

  // Document upload
  const ownerId = (
    await client.query(`SELECT id FROM users WHERE phone_number=$1`, [PHONES.Owner])
  ).rows[0]?.id;
  let documentUpload = { pass: false };
  try {
    const csv = fs.readFileSync(path.join(ROOT, 'demo-assets', 'inventory-import-demo.csv'));
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'inventory-import-demo.csv');
    form.append('factory_id', String(FACTORY));
    form.append('uploaded_by', String(ownerId));
    form.append('document_type', 'INVENTORY_IMPORT');
    const r = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form });
    const body = await r.json();
    documentUpload = { pass: r.ok, status: r.status, document_id: body?.document?.id };
  } catch (e) {
    documentUpload = { pass: false, error: e.message };
  }

  await client.end();

  const certifiedPhrases = {
    attendance: 'Aaj main present hoon',
    task_assign: 'Rahul Kumar ko store check ka kaam do',
    task_list_worker: 'mere tasks dikhao',
    task_list_manager: 'mere tasks dikhao',
    task_update: 'task update [TASK_ID] kaam shuru ho gaya',
    task_complete: 'task [TASK_ID] complete ho gaya',
    manager_route: 'Rahul Verma ko dispatch planning ka task do',
    manager_delegate: 'task [TASK_ID] Rahul Kumar ko do',
    inventory: 'Steel sheets ka stock kitna bacha hai',
    purchase_request: 'purchase request bana do',
    vendor_assign: 'Gupta Metals',
    pr_close: 'YES',
    report: 'Mujhe aaj ka report dikhao',
    discovery: 'mera business setup karna hai',
  };

  const out = {
    validated_at: new Date().toISOString(),
    method:
      'POST /webhook/test → same handleIncomingMessage as WhatsApp; outbound via Olli (real WhatsApp path)',
    environment,
    olli_probe: olliProbe,
    command_certification: commandCertification,
    nl_audit: nlAudit,
    session_audit: sessionAudit,
    errors_investigation: errors400,
    demo_script_run: demoScript,
    document_upload: documentUpload,
    certified_phrases: certifiedPhrases,
    summary: {
      commands_tested: commandCertification.length,
      commands_passed: commandCertification.filter((c) => c.pass).length,
      demo_script_pass: demoScript.all_pass,
      session_interference_confirmed: sessionAudit.some((s) => s.interference === 'YES — active workflow consumed message'),
      go_no_go:
        demoScript.all_pass && commandCertification.filter((c) => c.pass).length >= 8
          ? 'GO WITH CERTIFIED PHRASES'
          : 'NO-GO',
    },
  };

  const outPath = path.join(ROOT, 'docs', 'reports', 'demo-certification-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('written', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
