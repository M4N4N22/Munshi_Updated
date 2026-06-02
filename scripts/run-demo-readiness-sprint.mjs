/**
 * Prompt 13.5 — Demo Readiness Sprint validation + dry run.
 * Output: docs/reports/demo-readiness-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:4001';
const ML = process.env.DEMO_ML || 'http://127.0.0.1:8000';
const FACTORY = 3;
const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

const PHONES = {
  Owner: '917452897444',
  Manager: '919456157007',
  Worker: '919876543211',
};

const DEMO_PHRASES = [
  {
    id: 'attendance_present',
    phone: 'Manager',
    phrase: 'Aaj main present hoon',
    expectedIntent: '/present',
    workflow: null,
    dbCheck: 'attendance',
  },
  {
    id: 'task_assign',
    phone: 'Owner',
    phrase: 'Rahul Kumar ko store check ka kaam do',
    expectedIntent: '/assign',
    workflow: null,
    dbCheck: 'tasks',
  },
  {
    id: 'inventory_status',
    phone: 'Owner',
    phrase: 'Steel sheets ka stock kitna bacha hai',
    expectedIntent: '/inventory_status',
    workflow: null,
    dbCheck: 'inventory_read',
  },
  {
    id: 'vendor_onboard',
    phone: 'Owner',
    phrase: 'Naya vendor Gupta Metals add karo',
    expectedIntent: '/onboard_vendor',
    workflow: 'ONBOARD_VENDOR',
    dbCheck: 'workflow_start',
  },
  {
    id: 'purchase_request',
    phone: 'Owner',
    phrase: 'purchase request bana do',
    expectedIntent: '/purchase_request_create',
    workflow: 'PURCHASE_REQUEST_CREATE',
    dbCheck: 'workflow_start',
  },
  {
    id: 'report',
    phone: 'Owner',
    phrase: 'Mujhe aaj ka report dikhao',
    expectedIntent: '/report',
    workflow: null,
    dbCheck: 'report',
  },
  {
    id: 'tasks_list',
    phone: 'Worker',
    phrase: 'mere tasks dikhao',
    expectedIntent: '/tasks',
    workflow: null,
    dbCheck: 'tasks_read',
  },
  {
    id: 'task_update',
    phone: 'Worker',
    phrase: 'task update kaam shuru ho gaya',
    expectedIntent: '/update',
    workflow: null,
    dbCheck: 'task_updates',
  },
  {
    id: 'task_complete',
    phone: 'Worker',
    phrase: 'kaam complete ho gaya',
    expectedIntent: '/complete',
    workflow: null,
    dbCheck: 'task_complete',
  },
  {
    id: 'mgr_delegate',
    phone: 'Manager',
    phrase: 'Rahul ko loading ka kaam do',
    expectedIntent: '/mgrassign',
    workflow: null,
    dbCheck: 'manager_ops',
  },
  {
    id: 'mgr_self',
    phone: 'Manager',
    phrase: 'main khud yeh kaam karunga',
    expectedIntent: '/mgrself',
    workflow: null,
    dbCheck: 'manager_ops',
  },
  {
    id: 'business_discovery',
    phone: 'Owner',
    phrase: 'mera business setup karna hai',
    expectedIntent: '/business_discovery',
    workflow: 'BUSINESS_DISCOVERY',
    dbCheck: 'workflow_start',
  },
];

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wh(phone, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: phone, message }),
  });
  const text = await r.text();
  return { status: r.status, body: text, ok: text === 'ok' };
}

async function classify(message) {
  const r = await fetch(`${ML}/classify?message=${encodeURIComponent(message)}`, {
    method: 'POST',
  });
  return r.json();
}

async function activeSession(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step FROM workflow_sessions
     WHERE phone_number = $1 AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return r.rows[0] || null;
}

async function checkEnvironment() {
  const backend = await fetch(`${BASE}/health`)
    .then((r) => r.json())
    .catch(() => ({ status: 'down' }));
  const ml = await fetch(`${ML}/health`)
    .then((r) => r.json())
    .catch(() => ({ status: 'down' }));
  const migrations = await fetch(`${BASE}/health/migrations`)
    .then((r) => r.json())
    .catch(() => null);
  return {
    backend_running: backend?.status === 'ok' || backend?.details?.Postgres?.status === 'up',
    ml_running: ml?.status === 'ok',
    backend,
    ml,
    migrations,
    pending_migrations:
      migrations?.pending?.length ??
      migrations?.notApplied?.length ??
      0,
  };
}

async function validateUsers(client) {
  const expected = [
    { label: 'Owner', phone: PHONES.Owner, role: 'OWNER' },
    { label: 'Manager', phone: PHONES.Manager, role: 'MANAGER' },
  ];
  const results = [];
  for (const e of expected) {
    const r = await client.query(
      `SELECT u.id, u.name, u.phone_number, fu.role,
              (SELECT json_agg(json_build_object('id', d.id, 'name', d.name))
               FROM departments d WHERE d.factory_id=$1 AND d.manager_user_id=u.id) AS managed_depts
       FROM users u
       JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=$1
       WHERE u.phone_number=$2`,
      [FACTORY, e.phone],
    );
    const row = r.rows[0];
    results.push({
      ...e,
      exists: !!row,
      user_id: row?.id ?? null,
      name: row?.name ?? null,
      actual_role: row?.role ?? null,
      role_ok: row?.role === e.role,
      departments: row?.managed_depts ?? [],
      pass: !!row && row.role === e.role,
    });
  }
  return {
    results,
    pass: results.every((x) => x.pass),
  };
}

async function validateDataset(client) {
  const checks = {};
  const q = async (key, sql, params = [FACTORY]) => {
    const r = await client.query(sql, params);
    checks[key] = r.rows;
  };
  await q(
    'departments',
    `SELECT id, name, slug FROM departments WHERE factory_id=$1 AND name IN ('Operations','Sales','Inventory') ORDER BY name`,
  );
  await q(
    'demo_vendor',
    `SELECT id, name FROM vendors WHERE factory_id=$1 AND LOWER(name)=LOWER('Gupta Metals')`,
  );
  await q(
    'steel_item',
    `SELECT id, name, sku, current_quantity FROM inventory_items WHERE factory_id=$1 AND sku='DEMO-STEEL-001'`,
  );
  await q(
    'demo_worker',
    `SELECT u.id, u.name FROM users u JOIN factory_users fu ON fu.user_id=u.id
     WHERE fu.factory_id=$1 AND u.name ILIKE '%Rahul%' AND fu.role='WORKER'`,
  );
  await q('categories', `SELECT id, name FROM inventory_categories WHERE factory_id=$1 LIMIT 5`);
  await q('locations', `SELECT id, name FROM inventory_locations WHERE factory_id=$1 LIMIT 5`);
  return {
    checks,
    pass:
      checks.departments?.length >= 3 &&
      checks.demo_vendor?.length >= 1 &&
      checks.steel_item?.length >= 1 &&
      checks.demo_worker?.length >= 1,
  };
}

async function validatePhrase(client, item) {
  const phone = PHONES[item.phone];
  await wh(phone, '/cancel');
  await wait(350);

  const tasksBefore =
    item.dbCheck === 'tasks'
      ? (await client.query(`SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id=$1`, [FACTORY]))
          .rows[0].c
      : null;
  const attendanceBefore =
    item.dbCheck === 'attendance'
      ? (
          await client.query(
            `SELECT COUNT(*)::int AS c FROM attendance a JOIN users u ON u.id=a.user_id
             WHERE a.factory_id=$1 AND u.phone_number=$2 AND a.date=CURRENT_DATE`,
            [FACTORY, phone],
          )
        ).rows[0].c
      : null;

  const ml = await classify(item.phrase);
  const webhook = await wh(phone, item.phrase);
  await wait(700);

  const sess = await activeSession(client, phone);
  let dbMutation = { ok: false, detail: null };

  if (item.dbCheck === 'attendance') {
    const after = (
      await client.query(
        `SELECT a.is_present FROM attendance a JOIN users u ON u.id=a.user_id
         WHERE a.factory_id=$1 AND u.phone_number=$2 AND a.date=CURRENT_DATE`,
        [FACTORY, phone],
      )
    ).rows[0];
    dbMutation = { ok: !!after?.is_present, detail: after ?? 'no row' };
  } else if (item.dbCheck === 'tasks') {
    const after = (
      await client.query(`SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id=$1`, [FACTORY])
    ).rows[0].c;
    dbMutation = { ok: after > tasksBefore, detail: { before: tasksBefore, after } };
  } else if (item.dbCheck === 'inventory_read') {
    dbMutation = { ok: webhook.ok, detail: 'read path — webhook ok suffices' };
  } else if (item.dbCheck === 'workflow_start') {
    dbMutation = {
      ok: sess?.workflow_type === item.workflow && sess?.status === 'ACTIVE',
      detail: sess,
    };
  } else if (item.dbCheck === 'report') {
    dbMutation = { ok: webhook.ok, detail: 'report text returned via webhook' };
  } else if (item.dbCheck === 'tasks_read' || item.dbCheck === 'task_updates' || item.dbCheck === 'task_complete' || item.dbCheck === 'manager_ops') {
    dbMutation = { ok: webhook.ok, detail: item.dbCheck };
  }

  const classificationOk = ml.intent === item.expectedIntent;
  const pass = classificationOk && webhook.ok && (item.workflow ? dbMutation.ok : dbMutation.ok !== false);

  if (sess?.status === 'ACTIVE') {
    await wh(phone, '/cancel');
    await wait(200);
  }

  return {
    ...item,
    phone,
    predicted_intent: ml.intent,
    confidence: ml.confidence ?? null,
    classification_ok: classificationOk,
    webhook_status: webhook.status,
    webhook_ok: webhook.ok,
    session: sess,
    db_mutation: dbMutation,
    pass,
    safety: classificationOk && webhook.ok ? 'SAFE' : 'RISKY',
  };
}

async function dryRunManagerFlow(client) {
  const owner = PHONES.Owner;
  const manager = PHONES.Manager;
  await wh(owner, '/cancel');
  await wh(manager, '/cancel');
  await wait(400);

  const ownerMsg = 'Rahul Verma ko dispatch planning ka task do';
  await wh(owner, ownerMsg);
  await wait(900);

  const route = await client.query(
    `SELECT t.id, t.routing_status FROM tasks t
     JOIN users u ON u.id = t.assigned_to
     WHERE t.factory_id = $1 AND u.phone_number = $2
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, manager],
  );
  const taskId = route.rows[0]?.id;
  if (!taskId) {
    return { pass: false, reason: 'no_routed_task', ownerMsg };
  }

  const delegatePhrase = `task ${taskId} Rahul Kumar ko do`;
  const ml = await classify(delegatePhrase);
  const webhook = await wh(manager, delegatePhrase);
  await wait(700);

  const after = await client.query(
    `SELECT routing_status, assigned_to FROM tasks WHERE id = $1`,
    [taskId],
  );

  return {
    ownerMsg,
    delegatePhrase,
    taskId,
    predicted_intent: ml.intent,
    classification_ok: ml.intent === '/mgrassign',
    webhook_ok: webhook.ok,
    routing_status: after.rows[0]?.routing_status ?? null,
    pass:
      ml.intent === '/mgrassign' &&
      webhook.ok &&
      after.rows[0]?.routing_status === 'DELEGATED_TO_WORKER',
  };
}

async function dryRunPurchaseFlow(client) {
  const phone = PHONES.Owner;
  const ts = Date.now();
  const title = `Demo PR ${ts}`;
  await wh(phone, '/cancel');
  await wait(300);
  const steps = [
    { msg: 'purchase request bana do', step: 'REQUEST_CREATION' },
    { msg: title, step: 'ITEM_NAME' },
    { msg: 'Steel Sheets', step: 'ITEM_QTY' },
    { msg: '25', step: 'ADD_MORE' },
    { msg: 'NO', step: 'APPROVAL' },
    { msg: 'YES', step: 'VENDOR_ASSIGNMENT' },
    { msg: 'Gupta Metals', step: 'CLOSE' },
    { msg: 'YES', step: 'COMPLETE' },
  ];
  const trace = [];
  for (const s of steps) {
    const w = await wh(phone, s.msg);
    await wait(650);
    const sess = await activeSession(client, phone);
    trace.push({
      input: s.msg,
      expected_step: s.step,
      webhook_ok: w.ok,
      current_step: sess?.current_step ?? null,
      session_status: sess?.status ?? null,
    });
  }
  const pr = await client.query(
    `SELECT id, title, status, assigned_vendor_id FROM purchase_requests
     WHERE factory_id=$1 AND title=$2 ORDER BY id DESC LIMIT 1`,
    [FACTORY, title],
  );
  const sess = await client.query(
    `SELECT status FROM workflow_sessions WHERE phone_number=$1 ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return {
    title,
    trace,
    purchase_request: pr.rows[0] ?? null,
    session_status: sess.rows[0]?.status ?? null,
    pass:
      !!pr.rows[0] &&
      pr.rows[0].assigned_vendor_id != null &&
      sess.rows[0]?.status === 'COMPLETED',
  };
}

async function testDocumentUpload(ownerId) {
  const csvPath = path.join(ROOT, 'demo-assets', 'inventory-import-demo.csv');
  if (!fs.existsSync(csvPath)) {
    return { pass: false, reason: 'missing_csv' };
  }
  const buffer = fs.readFileSync(csvPath);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'text/csv' }), 'inventory-import-demo.csv');
  form.append('factory_id', String(FACTORY));
  form.append('uploaded_by', String(ownerId));
  form.append('document_type', 'INVENTORY_IMPORT');
  form.append('auto_process', 'true');

  const r = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form });
  const body = await r.json().catch(() => ({}));
  return {
    pass: r.ok,
    status: r.status,
    document_id: body?.document?.id ?? null,
    processing: body?.processing ?? null,
  };
}

async function main() {
  for (let i = 0; i < 25; i++) {
    try {
      const h = await fetch(`${BASE}/health`);
      if (h.ok) break;
    } catch {
      /* retry */
    }
    await wait(1500);
  }

  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  const environment = await checkEnvironment();
  const users = await validateUsers(client);
  const dataset = await validateDataset(client);

  const nlResults = [];
  for (const p of DEMO_PHRASES) {
    nlResults.push(await validatePhrase(client, p));
    await wait(250);
  }

  const dryRun = {
    manager_delegation: await dryRunManagerFlow(client),
    purchase_request_flow: await dryRunPurchaseFlow(client),
  };

  const ownerId = users.results.find((u) => u.label === 'Owner')?.user_id ?? 21;
  const documentDemo = await testDocumentUpload(ownerId);

  await client.end();

  const out = {
    validated_at: new Date().toISOString(),
    phones: PHONES,
    factory_id: FACTORY,
    environment,
    users,
    dataset,
    natural_language: {
      results: nlResults,
      pass_count: nlResults.filter((r) => r.pass).length,
      total: nlResults.length,
      safe_count: nlResults.filter((r) => r.safety === 'SAFE').length,
    },
    dry_run: dryRun,
    document_demo: documentDemo,
    summary: {
      env_pass:
        environment.backend_running &&
        environment.ml_running &&
        (environment.pending_migrations === 0 ||
          environment.migrations?.allApplied === true),
      users_pass: users.pass,
      dataset_pass: dataset.pass,
      nl_pass: nlResults.every((r) => r.pass),
      dry_run_pass:
        dryRun.purchase_request_flow.pass && dryRun.manager_delegation.pass,
      document_pass: documentDemo.pass,
    },
  };

  out.summary.overall_pass =
    out.summary.env_pass &&
    out.summary.users_pass &&
    out.summary.dataset_pass &&
    out.summary.dry_run_pass &&
    nlResults.filter((r) => r.pass).length >= Math.floor(nlResults.length * 0.85);

  const outPath = path.join(ROOT, 'docs', 'reports', 'demo-readiness-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('written', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
