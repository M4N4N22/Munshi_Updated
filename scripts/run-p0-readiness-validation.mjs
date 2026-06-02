/**
 * P0 readiness validation — workflow completion + blocker checks.
 * Output: docs/reports/p0-readiness-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:4001';
const ML = 'http://127.0.0.1:8000';
const FACTORY = 3;
const PG = process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

const PHONES = {
  Owner: '918604856137',
  Manager: '917452897444',
  Worker: '918950411406',
};

async function wh(phone, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: phone, message }),
  });
  return r.text();
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function session(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step FROM workflow_sessions
     WHERE phone_number = $1 ORDER BY id DESC LIMIT 1`,
    [phone],
  );
  return r.rows[0] || null;
}

async function activeSession(client, phone) {
  const r = await client.query(
    `SELECT id, workflow_type, status, current_step FROM workflow_sessions
     WHERE phone_number = $1 AND status = 'ACTIVE'`,
    [phone],
  );
  return r.rows[0] || null;
}

async function runSteps(phone, steps) {
  await wh(phone, '/cancel');
  await wait(400);
  for (const msg of steps) {
    const status = await wh(phone, msg);
    if (status !== 'ok') return { ok: false, failedAt: msg, status };
    await wait(600);
  }
  return { ok: true };
}

async function testWorkflowStarts(client) {
  const cases = [
    { intent: '/business_discovery', phone: PHONES.Owner, phrase: 'mera business setup karna hai', type: 'BUSINESS_DISCOVERY' },
    { intent: '/continue_discovery', phone: PHONES.Owner, phrase: 'setup phir se shuru', type: 'BUSINESS_DISCOVERY' },
    { intent: '/onboard_vendor', phone: PHONES.Owner, phrase: 'naya vendor add karo', type: 'ONBOARD_VENDOR' },
    { intent: '/onboard_worker', phone: PHONES.Manager, phrase: 'naya worker add karo', type: 'ONBOARD_WORKER' },
    { intent: '/inventory_create', phone: PHONES.Owner, phrase: 'SKU register karo', type: 'INVENTORY_CREATE' },
    { intent: '/purchase_request_create', phone: PHONES.Owner, phrase: 'purchase request bana do', type: 'PURCHASE_REQUEST_CREATE' },
  ];
  const results = [];
  for (const c of cases) {
    await wh(c.phone, '/cancel');
    await wait(400);
    const ml = await fetch(`${ML}/classify?message=${encodeURIComponent(c.phrase)}`, { method: 'POST' }).then(r => r.json());
    const webhook = await wh(c.phone, c.phrase);
    await wait(800);
    const sess = await activeSession(client, c.phone);
    results.push({
      intent: c.intent,
      phrase: c.phrase,
      predicted: ml.intent,
      classification_ok: ml.intent === c.intent,
      webhook,
      session_active: sess?.workflow_type === c.type && sess?.status === 'ACTIVE',
      session_id: sess?.id ?? null,
      pass: ml.intent === c.intent && webhook === 'ok' && sess?.workflow_type === c.type,
    });
    await wh(c.phone, '/cancel');
    await wait(300);
  }
  return results;
}

async function completeVendor(client) {
  const phone = PHONES.Owner;
  const ts = Date.now();
  const name = `P0 Vendor ${ts}`;
  const steps = [
    'naya vendor add karo',
    name,
    '9876543210',
    'SKIP',
    'Faridabad Industrial Area',
  ];
  const run = await runSteps(phone, steps);
  const sess = await session(client, phone);
  const vendor = await client.query(
    `SELECT id, name FROM vendors WHERE factory_id=$1 AND name=$2 ORDER BY id DESC LIMIT 1`,
    [FACTORY, name],
  );
  return {
    workflow: 'ONBOARD_VENDOR',
    ...run,
    session_id: sess?.id,
    session_status: sess?.status,
    entity_id: vendor.rows[0]?.id ?? null,
    pass: run.ok && sess?.status === 'COMPLETED' && !!vendor.rows[0]?.id,
  };
}

async function completeWorker(client, deptName) {
  const phone = PHONES.Manager;
  const ts = Date.now();
  const name = `P0 Worker ${ts}`;
  const phoneNum = `9199${String(ts).slice(-8)}`;
  const steps = [
    'naya worker add karo',
    name,
    phoneNum,
    deptName || '1',
    '2026-06-01',
  ];
  const run = await runSteps(phone, steps);
  const sess = await session(client, phone);
  const user = await client.query(
    `SELECT u.id FROM users u WHERE u.phone_number=$1`,
    [phoneNum],
  );
  return {
    workflow: 'ONBOARD_WORKER',
    ...run,
    session_id: sess?.id,
    session_status: sess?.status,
    entity_id: user.rows[0]?.id ?? null,
    pass: run.ok && sess?.status === 'COMPLETED' && !!user.rows[0]?.id,
  };
}

async function completeInventory(client, categoryName, locationName) {
  const phone = PHONES.Owner;
  const ts = Date.now();
  const sku = `P0SKU${String(ts).slice(-6)}`;
  const steps = [
    'SKU register karo',
    `P0 Item ${ts}`,
    sku,
    categoryName,
    locationName,
    'pcs',
    '10',
  ];
  const run = await runSteps(phone, steps);
  const sess = await session(client, phone);
  const item = await client.query(
    `SELECT id, sku FROM inventory_items WHERE factory_id=$1 AND sku=$2`,
    [FACTORY, sku],
  );
  return {
    workflow: 'INVENTORY_CREATE',
    ...run,
    session_id: sess?.id,
    session_status: sess?.status,
    entity_id: item.rows[0]?.id ?? null,
    pass: run.ok && sess?.status === 'COMPLETED' && !!item.rows[0]?.id,
  };
}

async function completePurchaseRequest(client) {
  const phone = PHONES.Owner;
  const ts = Date.now();
  const title = `P0 PR ${ts}`;
  const steps = [
    'purchase request bana do',
    title,
    'Cement bags',
    '50',
    'NO',
    'YES',
    'SKIP',
    'YES',
  ];
  const run = await runSteps(phone, steps);
  const sess = await session(client, phone);
  const pr = await client.query(
    `SELECT id, title FROM purchase_requests WHERE factory_id=$1 AND title=$2 ORDER BY id DESC LIMIT 1`,
    [FACTORY, title],
  );
  return {
    workflow: 'PURCHASE_REQUEST_CREATE',
    ...run,
    session_id: sess?.id,
    session_status: sess?.status,
    entity_id: pr.rows[0]?.id ?? null,
    pass: run.ok && sess?.status === 'COMPLETED' && !!pr.rows[0]?.id,
  };
}

async function completeDiscovery(client) {
  const phone = PHONES.Owner;
  const steps = [
    'mera business setup karna hai',
    '1',
    'P0 Test Packaging Co',
    'SKIP',
    'SKIP',
    'SKIP',
    'pause',
  ];
  const run = await runSteps(phone, steps);
  const sess = await session(client, phone);
  const profile = await client.query(
    `SELECT id, status, overall_completion FROM business_discovery_profiles WHERE factory_id=$1`,
    [FACTORY],
  );
  return {
    workflow: 'BUSINESS_DISCOVERY',
    ...run,
    session_id: sess?.id,
    session_status: sess?.status,
    profile_status: profile.rows[0]?.status,
    pass: run.ok && (sess?.status === 'COMPLETED' || profile.rows[0]?.status === 'PAUSED'),
  };
}

async function testManagerOps(client) {
  await wh(PHONES.Owner, '/cancel');
  await wait(300);
  await wh(PHONES.Owner, 'shantanu ko P0 mgr ops validation task assign karo');
  await wait(800);
  const route = await client.query(
    `SELECT t.id FROM tasks t JOIN users u ON u.id=t.assigned_to
     WHERE t.factory_id=$1 AND u.phone_number=$2 AND t.routing_status='AWAITING_MANAGER_ACTION'
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Manager],
  );
  const taskId = route.rows[0]?.id;
  if (!taskId) return { pass: false, reason: 'no_routing_task', results: [] };

  const cases = [
    { op: '/assign', phone: PHONES.Manager, phrase: 'prateek ko loading ka kaam do', check: 'tasks' },
    { op: '/mgrassign', phone: PHONES.Manager, phrase: `task ${taskId} prateek ko do` },
    { op: '/mgrtransfer', phone: PHONES.Manager, phrase: `task ${taskId} sales ko transfer karo` },
    { op: '/mgrself', phone: PHONES.Manager, phrase: `task ${taskId} main khud karunga` },
  ];

  const results = [];
  for (const c of cases) {
    await wh(c.phone, '/cancel');
    await wait(300);
    if (c.op === '/mgrassign' || c.op === '/mgrtransfer' || c.op === '/mgrself') {
      await wh(PHONES.Owner, 'shantanu ko P0 mgr ops validation task assign karo');
      await wait(600);
    }
    const tasksBefore = (await client.query(`SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id=$1`, [FACTORY])).rows[0].c;
    const webhook = await wh(c.phone, c.phrase);
    await wait(600);
    const tasksAfter = (await client.query(`SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id=$1`, [FACTORY])).rows[0].c;
    results.push({
      op: c.op,
      phrase: c.phrase,
      webhook,
      pass: webhook === 'ok',
      tasks_before: tasksBefore,
      tasks_after: tasksAfter,
    });
  }
  return { taskId, results, pass: results.every(r => r.pass) };
}

async function main() {
  for (let i = 0; i < 30; i++) {
    try {
      const h = await fetch(`${BASE}/health`);
      if (h.ok) break;
    } catch { /* wait */ }
    await wait(2000);
  }

  const env = {
    backend: await fetch(`${BASE}/health`).then(r => r.json()).catch(() => ({ status: 'down' })),
    ml: await fetch(`${ML}/health`).then(r => r.json()).catch(() => ({ status: 'down' })),
    migrations: await fetch(`${BASE}/health/migrations`).then(r => r.json()).catch(() => null),
  };

  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  const meta = await client.query(
    `SELECT (SELECT name FROM inventory_categories WHERE factory_id=$1 AND is_active=true LIMIT 1) AS cat,
            (SELECT name FROM inventory_locations WHERE factory_id=$1 LIMIT 1) AS loc,
            (SELECT name FROM departments WHERE factory_id=$1 LIMIT 1) AS dept`,
    [FACTORY],
  );
  const { cat, loc, dept } = meta.rows[0] || {};

  const out = {
    validated_at: new Date().toISOString(),
    environment: env,
    workflow_starts: await testWorkflowStarts(client),
    workflow_completions: {
      business_discovery: await completeDiscovery(client),
      vendor_onboarding: await completeVendor(client),
      worker_onboarding: await completeWorker(client, dept),
      inventory_create: await completeInventory(client, cat, loc),
      purchase_request: await completePurchaseRequest(client),
    },
    manager_operations: await testManagerOps(client),
  };

  out.summary = {
    workflow_start_pass: out.workflow_starts.filter(w => w.pass).length,
    workflow_start_total: out.workflow_starts.length,
    workflow_completion_pass: Object.values(out.workflow_completions).filter((w) => w.pass).length,
    workflow_completion_total: Object.keys(out.workflow_completions).length,
    manager_ops_pass: out.manager_operations.pass,
  };

  await client.end();

  const outPath = path.join(__dirname, '..', 'docs', 'reports', 'p0-readiness-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('written', outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
