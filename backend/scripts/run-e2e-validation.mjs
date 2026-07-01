/**
 * Full E2E business workflow validation — QA only.
 * Output: docs/docs_local/ml_hardening/e2e-validation-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { webhookTestHeaders } from './lib/dev-request-headers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:4001';
const ML = 'http://127.0.0.1:8000';
const FACTORY = 3;
const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

const PHONES = {
  Owner: '918604856137',
  Manager: '917452897444',
  Worker: '918950411406',
};

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseWebhookBody(raw) {
  if (raw === 'ok') return { ok: true, raw };
  try {
    const j = JSON.parse(raw);
    const data = j?.data ?? j?.message;
    if (data === 'ok' || j?.meta?.success === true) return { ok: true, raw };
  } catch {
    /* plain text */
  }
  return { ok: false, raw };
}

async function wh(phone, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: webhookTestHeaders(),
    body: JSON.stringify({ from: phone, message }),
  });
  const raw = await r.text();
  const parsed = parseWebhookBody(raw);
  return { status: r.status, body: raw, ok: parsed.ok && r.status >= 200 && r.status < 300 };
}

async function classify(message) {
  const r = await fetch(`${ML}/classify?message=${encodeURIComponent(message)}`, {
    method: 'POST',
  });
  return r.json();
}

async function runSteps(phone, steps) {
  await wh(phone, '/cancel');
  await wait(400);
  for (const msg of steps) {
    const res = await wh(phone, msg);
    if (!res.ok) return { ok: false, failedAt: msg, res };
    await wait(600);
  }
  return { ok: true };
}

async function activeSession(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step FROM workflow_sessions
     WHERE phone_number = $1 AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return r.rows[0] || null;
}

async function lastSession(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step FROM workflow_sessions
     WHERE phone_number = $1 ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return r.rows[0] || null;
}

async function testCase(client, { name, phone, phrase, expectedIntent, workflowType, dbCheck }) {
  await wh(phone, '/cancel');
  await wait(300);
  const ml = await classify(phrase);
  const webhook = await wh(phone, phrase);
  await wait(700);
  const sess = workflowType ? await activeSession(client, phone) : null;
  const db = dbCheck ? await dbCheck(client) : null;
  const intentOk = ml.intent === expectedIntent;
  const webhookOk = webhook.ok;
  const sessionOk = workflowType
    ? sess?.workflow_type === workflowType && sess?.status === 'ACTIVE'
    : true;
  const dbOk = dbCheck ? !!db?.ok : true;
  return {
    name,
    phrase,
    phone_role: Object.entries(PHONES).find(([, p]) => p === phone)?.[0],
    expected_intent: expectedIntent,
    predicted_intent: ml.intent,
    intent_ok: intentOk,
    webhook_ok: webhookOk,
    webhook_status: webhook.status,
    workflow_type: sess?.workflow_type ?? null,
    session_ok: sessionOk,
    db: db ?? null,
    db_ok: dbOk,
    pass: intentOk && webhookOk && sessionOk && dbOk,
  };
}

async function factoryDiscovery(client) {
  const factory = await client.query('SELECT id, name FROM factories WHERE id=$1', [FACTORY]);
  const users = await client.query(
    `SELECT u.id, u.name, u.phone_number, fu.role
     FROM factory_users fu JOIN users u ON u.id = fu.user_id
     WHERE fu.factory_id=$1 ORDER BY fu.role, u.name`,
    [FACTORY],
  );
  const departments = await client.query(
    'SELECT id, name FROM departments WHERE factory_id=$1 ORDER BY id',
    [FACTORY],
  );
  const vendors = await client.query(
    'SELECT id, name, phone_number FROM vendors WHERE factory_id=$1 ORDER BY id DESC LIMIT 15',
    [FACTORY],
  );
  const inventory = await client.query(
    `SELECT id, sku, name, current_quantity, reorder_threshold
     FROM inventory_items WHERE factory_id=$1 ORDER BY id DESC LIMIT 15`,
    [FACTORY],
  );
  const purchaseRequests = await client.query(
    `SELECT id, title, status FROM purchase_requests WHERE factory_id=$1 ORDER BY id DESC LIMIT 10`,
    [FACTORY],
  );
  const activeWorkflows = await client.query(
    `SELECT id, phone_number, workflow_type, status, current_step
     FROM workflow_sessions WHERE status='ACTIVE' AND phone_number = ANY($1::text[])
     ORDER BY id DESC`,
    [Object.values(PHONES)],
  );
  const tasks = await client.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_completed=false)::int AS open
     FROM tasks WHERE factory_id=$1`,
    [FACTORY],
  );
  const issues = await client.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_resolved=false)::int AS open
     FROM issues WHERE factory_id=$1`,
    [FACTORY],
  );
  const attendanceToday = await client.query(
    `SELECT COUNT(*)::int AS c FROM attendance
     WHERE factory_id=$1 AND date = CURRENT_DATE`,
    [FACTORY],
  );
  return {
    factory: factory.rows[0],
    users: users.rows,
    departments: departments.rows,
    vendors: vendors.rows,
    inventory_items: inventory.rows,
    purchase_requests: purchaseRequests.rows,
    active_workflows: activeWorkflows.rows,
    task_counts: tasks.rows[0],
    issue_counts: issues.rows[0],
    attendance_today: attendanceToday.rows[0].c,
  };
}

async function ownerJourney(client) {
  const cases = [
    {
      name: 'attendance_report',
      phone: PHONES.Owner,
      phrase: 'aaj ka attendance report bhejo',
      expectedIntent: '/report',
      workflowType: null,
      dbCheck: null,
    },
    {
      name: 'task_assign',
      phone: PHONES.Owner,
      phrase: 'prateek ko loading ka kaam do',
      expectedIntent: '/assign',
      workflowType: null,
      dbCheck: async (c) => {
        const r = await c.query(
          `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
           WHERE t.factory_id=$1 AND u.phone_number=$2 ORDER BY t.id DESC LIMIT 1`,
          [FACTORY, PHONES.Worker],
        );
        return { ok: !!r.rows[0], task_id: r.rows[0]?.id };
      },
    },
    {
      name: 'inventory_status',
      phone: PHONES.Owner,
      phrase: 'stock level dikhao',
      expectedIntent: '/inventory_status',
      workflowType: null,
    },
    {
      name: 'inventory_create_start',
      phone: PHONES.Owner,
      phrase: 'SKU register karo',
      expectedIntent: '/inventory_create',
      workflowType: 'INVENTORY_CREATE',
    },
    {
      name: 'purchase_request_start',
      phone: PHONES.Owner,
      phrase: 'purchase request bana do',
      expectedIntent: '/purchase_request_create',
      workflowType: 'PURCHASE_REQUEST_CREATE',
    },
    {
      name: 'vendor_onboard_start',
      phone: PHONES.Owner,
      phrase: 'naya vendor add karo',
      expectedIntent: '/onboard_vendor',
      workflowType: 'ONBOARD_VENDOR',
    },
    {
      name: 'members',
      phone: PHONES.Owner,
      phrase: 'team members dikhao',
      expectedIntent: '/members',
      workflowType: null,
    },
  ];
  const results = [];
  for (const c of cases) {
    results.push(await testCase(client, c));
    await wh(c.phone, '/cancel');
    await wait(300);
  }
  return results;
}

async function managerJourney(client) {
  await wh(PHONES.Owner, '/cancel');
  await wait(300);
  await wh(PHONES.Owner, 'shantanu ko E2E mgr validation task assign karo');
  await wait(800);

  const route = await client.query(
    `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
     WHERE t.factory_id=$1 AND u.phone_number=$2 AND t.routing_status='AWAITING_MANAGER_ACTION'
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Manager],
  );
  const taskId = route.rows[0]?.id;

  const cases = [
    {
      name: 'mgrassign',
      phone: PHONES.Manager,
      phrase: taskId ? `task ${taskId} prateek ko do` : 'task 0 prateek ko do',
      expectedIntent: '/mgrassign',
      setup: async () => {
        await wh(PHONES.Owner, 'shantanu ko E2E mgr validation task assign karo');
        await wait(600);
      },
    },
    {
      name: 'mgrtransfer',
      phone: PHONES.Manager,
      phrase: taskId ? `task ${taskId} sales ko transfer karo` : 'task 0 sales ko transfer',
      expectedIntent: '/mgrtransfer',
      setup: async () => {
        await wh(PHONES.Owner, 'shantanu ko E2E mgr validation task assign karo');
        await wait(600);
      },
    },
    {
      name: 'mgrself',
      phone: PHONES.Manager,
      phrase: taskId ? `task ${taskId} main khud karunga` : 'task 0 main khud karunga',
      expectedIntent: '/mgrself',
      setup: async () => {
        await wh(PHONES.Owner, 'shantanu ko E2E mgr validation task assign karo');
        await wait(600);
      },
    },
    {
      name: 'mgrreject',
      phone: PHONES.Manager,
      phrase: taskId ? `task ${taskId} reject karo` : 'task 0 reject karo',
      expectedIntent: '/mgrreject',
      setup: async () => {
        await wh(PHONES.Owner, 'shantanu ko E2E mgr validation task assign karo');
        await wait(600);
      },
    },
    {
      name: 'inventory_status_mgr',
      phone: PHONES.Manager,
      phrase: 'inventory status batao',
      expectedIntent: '/inventory_status',
    },
    {
      name: 'depart_assign',
      phone: PHONES.Manager,
      phrase: 'sales department ko audit ka kaam do',
      expectedIntent: '/depart_assign',
      dbCheck: async (c) => {
        const r = await c.query(
          `SELECT t.id FROM tasks t JOIN departments d ON d.id=t.department_id
           WHERE t.factory_id=$1 AND d.name ILIKE '%sales%' ORDER BY t.id DESC LIMIT 1`,
          [FACTORY],
        );
        return { ok: !!r.rows[0], task_id: r.rows[0]?.id };
      },
    },
  ];

  const results = [];
  for (const c of cases) {
    await wh(c.phone, '/cancel');
    await wait(300);
    if (c.setup) await c.setup();
    const ml = await classify(c.phrase);
    const webhook = await wh(c.phone, c.phrase);
    await wait(700);
    const db = c.dbCheck ? await c.dbCheck(client) : null;
    results.push({
      name: c.name,
      phrase: c.phrase,
      routing_task_id: taskId,
      expected_intent: c.expectedIntent,
      predicted_intent: ml.intent,
      intent_ok: ml.intent === c.expectedIntent,
      webhook_ok: webhook.ok,
      db: db,
      pass: ml.intent === c.expectedIntent && webhook.ok && (!c.dbCheck || db?.ok),
    });
  }
  return { routing_task_id: taskId, results };
}

async function workerJourney(client) {
  const cases = [
    { name: 'present', phone: PHONES.Worker, phrase: 'aaj present hoon', expectedIntent: '/present' },
    { name: 'tasks', phone: PHONES.Worker, phrase: 'mere tasks dikhao', expectedIntent: '/tasks' },
    { name: 'update', phone: PHONES.Worker, phrase: 'task update: kaam chal raha hai', expectedIntent: '/update' },
    { name: 'issue', phone: PHONES.Worker, phrase: 'machine kharab hai issue raise karo', expectedIntent: '/issue' },
    { name: 'issues_list', phone: PHONES.Worker, phrase: 'open issues dikhao', expectedIntent: '/issues' },
  ];
  const results = [];
  for (const c of cases) {
    const beforeAtt = await client.query(
      `SELECT id FROM attendance WHERE factory_id=$1 AND user_id=(
         SELECT u.id FROM users u WHERE u.phone_number=$2 LIMIT 1
       ) AND date=CURRENT_DATE`,
      [FACTORY, c.phone],
    );
    const r = await testCase(client, c);
    if (c.name === 'present') {
      await wait(500);
      const afterAtt = await client.query(
        `SELECT id, is_present FROM attendance WHERE factory_id=$1 AND user_id=(
           SELECT u.id FROM users u WHERE u.phone_number=$2 LIMIT 1
         ) AND date=CURRENT_DATE`,
        [FACTORY, c.phone],
      );
      r.db = { before: beforeAtt.rows[0]?.id, after: afterAtt.rows[0] };
      r.db_ok = !!afterAtt.rows[0]?.is_present;
      r.pass = r.pass && r.db_ok;
    }
    if (c.name === 'issue') {
      await wait(500);
      const iss = await client.query(
        `SELECT id FROM issues WHERE factory_id=$1 ORDER BY id DESC LIMIT 1`,
        [FACTORY],
      );
      r.db = { issue_id: iss.rows[0]?.id };
      r.db_ok = !!iss.rows[0];
      r.pass = r.pass && r.db_ok;
    }
    results.push(r);
    await wh(c.phone, '/cancel');
    await wait(300);
  }
  return results;
}

async function mlHardeningClusters(client) {
  const clusters = [
    { cluster: 'assign', phone: PHONES.Owner, phrase: 'rahul ko packing ka kaam do', intent: '/assign' },
    { cluster: 'depart_assign', phone: PHONES.Manager, phrase: 'loading department ko stock count do', intent: '/depart_assign' },
    { cluster: 'assign_clarify', phone: PHONES.Owner, phrase: 'aaj website banegi', intent: '/assign_clarify' },
    { cluster: 'assign_delivery', phone: PHONES.Owner, phrase: 'rahul ko 50 cement bags deliver karo', intent: '/assign_delivery' },
    { cluster: 'task_inventory_nl', phone: PHONES.Owner, phrase: 'prateek se 20 glue bottles count karwao', intent: '/task_inventory_nl' },
    { cluster: 'inventory_status', phone: PHONES.Owner, phrase: 'kitna stock hai', intent: '/inventory_status' },
    { cluster: 'inventory_create', phone: PHONES.Owner, phrase: 'naya item add karo', intent: '/inventory_create', workflow: 'INVENTORY_CREATE' },
    { cluster: 'inventory_import_csv', phone: PHONES.Owner, phrase: 'inventory csv import karo', intent: '/inventory_import_csv', workflow: 'INVENTORY_IMPORT_CSV' },
    { cluster: 'cancel', phone: PHONES.Owner, phrase: '/cancel', intent: '/cancel' },
    { cluster: 'mgrself', phone: PHONES.Manager, phrase: 'main khud karunga task', intent: '/mgrself' },
    { cluster: 'update', phone: PHONES.Worker, phrase: 'update: half done', intent: '/update' },
  ];
  const results = [];
  for (const c of clusters) {
    await wh(c.phone, '/cancel');
    await wait(300);
    const ml = await classify(c.phrase);
    const webhook = await wh(c.phone, c.phrase);
    await wait(600);
    let workflowOk = true;
    let sess = null;
    if (c.workflow) {
      sess = await activeSession(client, c.phone);
      workflowOk = sess?.workflow_type === c.workflow && sess?.status === 'ACTIVE';
    }
    results.push({
      cluster: c.cluster,
      phrase: c.phrase,
      expected_intent: c.intent,
      predicted_intent: ml.intent,
      intent_ok: ml.intent === c.intent,
      webhook_ok: webhook.ok,
      workflow_type: sess?.workflow_type ?? null,
      workflow_ok: workflowOk,
      pass: ml.intent === c.intent && webhook.ok && workflowOk,
    });
    await wh(c.phone, '/cancel');
    await wait(200);
  }
  return results;
}

async function failureTests(client) {
  const cases = [
    { name: 'worker_cannot_onboard_vendor', phone: PHONES.Worker, phrase: 'naya vendor add karo' },
    { name: 'invalid_task_id_mgrassign', phone: PHONES.Manager, phrase: 'task 999999 prateek ko do' },
    { name: 'cancel_abandons_workflow', phone: PHONES.Owner, phrase: 'SKU register karo', followCancel: true },
    { name: 'missing_worker_assign', phone: PHONES.Owner, phrase: 'xyzunknown ko kaam do' },
  ];
  const results = [];
  for (const c of cases) {
    await wh(c.phone, '/cancel');
    await wait(300);
    if (c.followCancel) {
      await wh(c.phone, c.phrase);
      await wait(500);
      const activeBefore = await activeSession(client, c.phone);
      await wh(c.phone, '/cancel');
      await wait(500);
      const activeAfter = await activeSession(client, c.phone);
      results.push({
        name: c.name,
        graceful: activeBefore?.status === 'ACTIVE' && !activeAfter,
        pass: activeBefore?.status === 'ACTIVE' && !activeAfter,
      });
      continue;
    }
    const webhook = await wh(c.phone, c.phrase);
    results.push({
      name: c.name,
      phrase: c.phrase,
      webhook_ok: webhook.ok,
      graceful: webhook.ok,
      pass: webhook.ok,
    });
  }
  return results;
}

async function dbConsistencyAudit(client) {
  const orphans = await client.query(
    `SELECT COUNT(*)::int AS c FROM tasks t
     LEFT JOIN users u ON u.id = t.assigned_to
     WHERE t.factory_id=$1 AND t.assigned_to IS NOT NULL AND u.id IS NULL`,
    [FACTORY],
  );
  const dupAtt = await client.query(
    `SELECT user_id, date, COUNT(*)::int AS c FROM attendance
     WHERE factory_id=$1 GROUP BY user_id, date HAVING COUNT(*) > 1`,
    [FACTORY],
  );
  const stuckSessions = await client.query(
    `SELECT COUNT(*)::int AS c FROM workflow_sessions
     WHERE phone_number = ANY($1::text[]) AND status='ACTIVE'`,
    [Object.values(PHONES)],
  );
  const brokenTasks = await client.query(
    `SELECT COUNT(*)::int AS c FROM tasks
     WHERE factory_id=$1 AND routing_status='AWAITING_MANAGER_ACTION' AND assigned_to IS NULL`,
    [FACTORY],
  );
  return {
    orphan_task_assignees: orphans.rows[0].c,
    duplicate_attendance_rows: dupAtt.rows.length,
    active_test_sessions: stuckSessions.rows[0].c,
    broken_routing_tasks: brokenTasks.rows[0].c,
    pass:
      orphans.rows[0].c === 0 &&
      dupAtt.rows.length === 0 &&
      brokenTasks.rows[0].c === 0,
  };
}

async function main() {
  for (let i = 0; i < 40; i++) {
    try {
      const h = await fetch(`${BASE}/health`);
      if (h.ok) break;
    } catch {
      /* wait */
    }
    await wait(2000);
  }

  const env = {
    backend: await fetch(`${BASE}/health`)
      .then((r) => r.json())
      .catch(() => ({ status: 'down' })),
    ml: await fetch(`${ML}/health`)
      .then((r) => r.json())
      .catch(() => ({ status: 'down' })),
  };

  if (env.backend.status === 'down') {
    console.error('Backend not reachable at', BASE);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  const out = {
    validated_at: new Date().toISOString(),
    branch: 'feature/shantanu-ml-hardening-v1',
    factory_id: FACTORY,
    environment: env,
    factory_discovery: await factoryDiscovery(client),
    owner_journey: await ownerJourney(client),
    manager_journey: await managerJourney(client),
    worker_journey: await workerJourney(client),
    ml_hardening_clusters: await mlHardeningClusters(client),
    failure_tests: await failureTests(client),
    db_consistency: await dbConsistencyAudit(client),
  };

  const allTests = [
    ...out.owner_journey,
    ...out.manager_journey.results,
    ...out.worker_journey,
    ...out.ml_hardening_clusters,
    ...out.failure_tests,
  ];
  const pass = allTests.filter((t) => t.pass).length;
  const fail = allTests.filter((t) => !t.pass).length;
  const intentTests = [...out.owner_journey, ...out.manager_journey.results, ...out.worker_journey, ...out.ml_hardening_clusters];
  const intentPass = intentTests.filter((t) => t.intent_ok).length;

  out.summary = {
    total_tests: allTests.length,
    pass,
    fail,
    intent_pass: intentPass,
    intent_total: intentTests.length,
    intent_success_rate: `${((intentPass / intentTests.length) * 100).toFixed(1)}%`,
    workflow_success_rate: `${((pass / allTests.length) * 100).toFixed(1)}%`,
    db_consistency_pass: out.db_consistency.pass,
  };

  await client.end();

  const outPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'docs_local',
    'ml_hardening',
    'e2e-validation-results.json',
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('written', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
