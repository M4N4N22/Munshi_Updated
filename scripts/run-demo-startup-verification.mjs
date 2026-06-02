/**
 * Prompt 13.8 — Demo startup verification (no code changes).
 * Output: docs/reports/demo-startup-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REPORTS = path.join(ROOT, 'docs', 'reports');
const BASE = 'http://127.0.0.1:4001';
const ML = 'http://127.0.0.1:8000';
const PG = 'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';
const OLLI = 'https://api.getolliai.com/api/v1/external/waba/send';

const PHONES = {
  Owner: '917452897444',
  Manager: '919456157007',
  OwnerDisplay: '7452897444',
  ManagerDisplay: '9456157007',
};

const CERTIFIED_FLOW = [
  { step: 1, role: 'Manager', msg: 'Aaj main present hoon' },
  { step: 2, role: 'Owner', msg: 'Rahul Kumar ko store check ka kaam do' },
  { step: 3, role: 'Owner', msg: 'Steel sheets ka stock kitna bacha hai' },
  { step: 4, role: 'Owner', msg: 'purchase request bana do' },
  { step: 5, role: 'Owner', msg: 'Steel sheets ka order' },
  { step: 6, role: 'Owner', msg: 'Steel Sheets' },
  { step: 7, role: 'Owner', msg: '25' },
  { step: 8, role: 'Owner', msg: 'NO' },
  { step: 9, role: 'Owner', msg: 'YES' },
  { step: 10, role: 'Owner', msg: 'Gupta Metals' },
  { step: 11, role: 'Owner', msg: 'YES' },
  { step: 12, role: 'Owner', msg: 'Mujhe aaj ka report dikhao' },
  { step: 13, role: 'Owner', msg: 'Mera business setup karna hai' },
  { step: 14, role: 'Owner', msg: 'Munshi inventory list upload karni hai', optional: true },
];

function readEnv() {
  const envPath = path.join(ROOT, '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

async function health(url, label) {
  try {
    const r = await fetch(url);
    const body = await r.json();
    return { label, url, status: r.status, ok: r.ok, body };
  } catch (e) {
    return { label, url, ok: false, error: e.message };
  }
}

async function wh(from, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, message }),
  });
  const body = await r.text();
  return { http_status: r.status, body, ok: body === 'ok', error: body === 'error' };
}

async function olliSend(to, body, olliKey) {
  try {
    const r = await fetch(OLLI, {
      method: 'POST',
      headers: { 'X-API-Key': olliKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type: 'text', text: { body } }),
    });
    const data = await r.json().catch(() => ({}));
    return { to, status: r.status, ok: r.ok, data };
  } catch (e) {
    return { to, ok: false, error: e.message };
  }
}

async function main() {
  const env = readEnv();
  const validated_at = new Date().toISOString();

  const services = {
    postgres: {
      process: 'Remote PostgreSQL (65.1.128.181:5431)',
      port: 5431,
      status: 'external',
      health: null,
    },
    backend: await health(`${BASE}/health`, 'Backend'),
    ml: await health(`${ML}/health`, 'ML'),
    demo_mode: await health(`${BASE}/demo-mode/status`, 'DemoMode'),
    migrations: await health(`${BASE}/health/migrations`, 'Migrations'),
    whatsapp: {
      process: 'Olli WABA + Meta webhook',
      port: 'HTTPS outbound',
      configured: !!(env.OLLI_KEY && env.OLLI_URL),
      olli_url: env.OLLI_URL,
    },
    schedulers: {
      process: 'NestJS @Cron (AttendanceCronService in backend)',
      status: 'embedded_in_backend',
    },
    queues: { status: 'none_required_for_demo' },
  };

  services.postgres.health = services.backend.ok
    ? services.backend.body?.details?.Postgres
    : { status: 'unknown' };
  services.postgres.status =
    services.backend.body?.details?.Postgres?.status === 'up' ? 'UP' : 'DOWN';

  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  const config = {
    demo_mode_env: env.DEMO_MODE,
    demo_mode_api: services.demo_mode.body,
    factory_3: (
      await client.query(`SELECT id, name FROM factories WHERE id=3`)
    ).rows[0],
    owner: (
      await client.query(
        `SELECT u.id,u.name,u.phone_number,fu.role FROM users u
         JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=3
         WHERE u.phone_number=$1`,
        [PHONES.Owner],
      )
    ).rows[0],
    manager: (
      await client.query(
        `SELECT u.id,u.name,u.phone_number,fu.role FROM users u
         JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=3
         WHERE u.phone_number=$1`,
        [PHONES.Manager],
      )
    ).rows[0],
    steel: (
      await client.query(
        `SELECT id,name,sku,current_quantity FROM inventory_items WHERE factory_id=3 AND sku='DEMO-STEEL-001'`,
      )
    ).rows[0],
    vendor: (
      await client.query(
        `SELECT id,name,phone_number FROM vendors WHERE factory_id=3 AND LOWER(name)=LOWER('Gupta Metals')`,
      )
    ).rows[0],
    departments: (
      await client.query(
        `SELECT name FROM departments WHERE factory_id=3 AND name IN ('Operations','Sales','Inventory') ORDER BY name`,
      )
    ).rows,
    worker: (
      await client.query(
        `SELECT u.id,u.name FROM users u JOIN factory_users fu ON fu.user_id=u.id
         WHERE fu.factory_id=3 AND u.name ILIKE '%Rahul Kumar%' AND fu.role='WORKER'`,
      )
    ).rows[0],
    active_sessions: (
      await client.query(
        `SELECT phone_number, workflow_type, current_step FROM workflow_sessions
         WHERE status='ACTIVE' AND phone_number IN ($1,$2)`,
        [PHONES.Owner, PHONES.Manager],
      )
    ).rows,
  };

  // Clear stale sessions before certified flow
  for (const p of [PHONES.Owner, PHONES.Manager]) {
    await wh(p, '/cancel');
    await new Promise((r) => setTimeout(r, 300));
  }

  const flowResults = [];
  for (const step of CERTIFIED_FLOW) {
    const phone = PHONES[step.role];
    const w = await wh(phone, step.msg);
    const sess = await client.query(
      `SELECT workflow_type, current_step, status FROM workflow_sessions
       WHERE phone_number=$1 AND status='ACTIVE' ORDER BY id DESC LIMIT 1`,
      [phone],
    );
    flowResults.push({
      ...step,
      phone,
      http_status: w.http_status,
      webhook: w.body,
      pass: w.ok && !w.error && w.http_status < 400,
      active_session: sess.rows[0] ?? null,
    });
    await new Promise((r) => setTimeout(r, 550));
  }

  const whatsapp = {
    owner_outbound: await olliSend(
      PHONES.Owner,
      'Munshi demo check — aap message bhej sakte hain. (Prep message, ignore)',
      env.OLLI_KEY,
    ),
    manager_outbound: await olliSend(
      PHONES.Manager,
      'Munshi demo check — aap message bhej sakte hain. (Prep message, ignore)',
      env.OLLI_KEY,
    ),
    owner_inbound_probe: await wh(PHONES.Owner, 'Aaj main present hoon'),
    manager_inbound_probe: await wh(PHONES.Manager, 'Aaj main present hoon'),
  };

  await client.end();

  const blockers = [];
  if (env.DEMO_MODE !== 'true') blockers.push('DEMO_MODE not true in .env.local');
  if (!services.demo_mode.body?.enabled) blockers.push('Demo mode API reports enabled:false — restart backend');
  if (!services.backend.ok) blockers.push('Backend not healthy');
  if (!services.ml.ok) blockers.push('ML not healthy (demo mode reduces dependency but service should run)');
  if (!config.owner || config.owner.role !== 'OWNER') blockers.push('Owner user missing or wrong role');
  if (!config.manager || config.manager.role !== 'MANAGER') blockers.push('Manager user missing or wrong role');
  if (!config.steel) blockers.push('Steel Sheets inventory missing');
  if (!config.vendor) blockers.push('Gupta Metals vendor missing');
  if (!whatsapp.owner_outbound.ok) blockers.push('Olli outbound to owner failed');
  if (!whatsapp.manager_outbound.ok) blockers.push('Olli outbound to manager failed');
  const flowFail = flowResults.filter((f) => !f.pass && !f.optional);
  if (flowFail.length) blockers.push(`${flowFail.length} certified flow step(s) failed`);

  const readiness = {
    recording_ready: blockers.length === 0,
    blockers,
    checklist: {
      backend_running: services.backend.ok,
      ml_running: services.ml.ok,
      demo_mode_enabled: services.demo_mode.body?.enabled === true,
      dataset_loaded: !!(config.steel && config.vendor && config.owner && config.manager),
      whatsapp_connected: whatsapp.owner_outbound.ok && whatsapp.manager_outbound.ok,
      certified_flow_validated: flowFail.length === 0,
      migrations_up_to_date: services.migrations.body?.up_to_date === true,
    },
  };

  const out = {
    validated_at,
    services,
    config,
    scripts_executed: [
      'demo-setup-users-data.mjs (this run)',
      'migration-status.mjs (this run)',
      'demo-startup-verification.mjs (this run)',
    ],
    certified_flow: flowResults,
    whatsapp,
    readiness,
    summary: {
      flow_pass: flowResults.filter((f) => f.pass).length,
      flow_total: flowResults.length,
      verdict: readiness.recording_ready ? 'PASS — RECORDING READY' : 'FAIL — SEE BLOCKERS',
    },
  };

  fs.writeFileSync(
    path.join(REPORTS, 'demo-startup-results.json'),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out.summary, null, 2));
  console.log('blockers', blockers);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
