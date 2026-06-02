/**
 * Genuine demo validation — ML + backend handlers, no demo-mode intercept.
 * Uses /webhook/test?dry=1 to capture reply text + length without Olli send.
 *
 * Output: docs/reports/genuine-demo-validation-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4001';
const ML = process.env.ML_URL || 'http://127.0.0.1:8000';
const FACTORY = 3;
const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

/** WhatsApp Cloud API max; flag above 3500 as risky for Olli. */
const WA_MAX = 4096;
const OLLI_WARN = 3500;

const PHONES = {
  Owner: '917452897444',
  Manager: '919456157007',
  Worker: '919876543211',
};

const USER_IDS = {
  Owner: 21,
  Manager: 34,
  Worker: 35,
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function classify(message) {
  const r = await fetch(`${ML}/classify?message=${encodeURIComponent(message)}`, {
    method: 'POST',
  });
  if (!r.ok) throw new Error(`ML ${r.status}`);
  return r.json();
}

async function dryWh(phone, message) {
  const started = Date.now();
  const r = await fetch(`${BASE}/webhook/test?dry=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: phone, message }),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = {
      status: text === 'ok' ? 'ok' : text,
      reply: text,
      replyLength: text.length,
      legacyPlainText: true,
    };
  }
  return {
    http_status: r.status,
    ms: Date.now() - started,
    ...data,
  };
}

async function cancel(phone) {
  await dryWh(phone, '/cancel');
  await wait(300);
}

function lengthFlags(len) {
  return {
    length: len,
    olli_risk: len > OLLI_WARN,
    wa_over_limit: len > WA_MAX,
  };
}

const results = {
  validated_at: new Date().toISOString(),
  demo_mode: null,
  environment: {},
  message_length_audit: [],
  ml_checks: [],
  flow_checks: [],
  summary: { pass: 0, fail: 0, warn: 0 },
};

function recordFlow(name, pass, detail, extra = {}) {
  results.flow_checks.push({ name, pass, ...detail, ...extra });
  if (pass) results.summary.pass++;
  else results.summary.fail++;
}

function recordMl(phrase, expected, ml) {
  const ok = ml.intent === expected;
  results.ml_checks.push({
    phrase,
    expected,
    got: ml.intent,
    worker_slug: ml.worker_slug,
    depart_slug: ml.depart_slug,
    pass: ok,
  });
  if (!ok) results.summary.fail++;
  else results.summary.pass++;
  return ok;
}

function auditReply(step, phone, phrase, dry) {
  const len = dry.replyLength ?? (dry.reply || '').length;
  const flags = lengthFlags(len);
  results.message_length_audit.push({
    step,
    phone,
    phrase,
    ...flags,
    preview: (dry.reply || '').slice(0, 120),
  });
  if (flags.olli_risk) results.summary.warn++;
  return flags;
}

async function main() {
  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  try {
    const demoStatus = await fetch(`${BASE}/demo-mode/status`)
      .then((r) => r.json())
      .catch(() => null);
    results.demo_mode = demoStatus;

    const backend = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
    const mlHealth = await fetch(`${ML}/health`).then((r) => r.json()).catch(() => null);
    results.environment = {
      backend_ok: backend?.status === 'ok',
      ml_ok: mlHealth?.status === 'ok',
      demo_mode_enabled: demoStatus?.enabled === true,
    };

    if (!results.environment.backend_ok || !results.environment.ml_ok) {
      console.error('Backend or ML not running');
      process.exit(1);
    }

    if (results.environment.demo_mode_enabled) {
      console.warn('WARNING: DEMO_MODE is still true — flows may be hardcoded');
      results.summary.warn++;
    }

    // --- ML intent checks (certified script phrases) ---
    const mlPhrases = [
      ['Aaj main present hoon', '/present'],
      ['Rahul Kumar ko store check ka kaam do', '/assign'],
      ['Rahul Verma ko dispatch planning ka task do', '/assign'],
      ['Steel sheets ka stock kitna bacha hai', '/inventory_status'],
      ['purchase request bana do', '/purchase_request_create'],
      ['Mujhe aaj ka report dikhao', '/report'],
      ['mere tasks dikaho', '/tasks'],
    ];
    for (const [phrase, expected] of mlPhrases) {
      recordMl(phrase, expected, await classify(phrase));
    }

    // --- Flow 1: Manager attendance ---
    await cancel(PHONES.Manager);
    const att = await dryWh(PHONES.Manager, 'Aaj main present hoon');
    auditReply('1_attendance', PHONES.Manager, 'Aaj main present hoon', att);
    const attRow = await client.query(
      `SELECT is_present FROM attendance a
       JOIN users u ON u.id=a.user_id
       WHERE u.phone_number=$1 AND a.factory_id=$2 AND a.date=CURRENT_DATE`,
      [PHONES.Manager, FACTORY],
    );
    recordFlow(
      '1_manager_attendance',
      att.status === 'ok' && attRow.rows[0]?.is_present === true,
      { intent: '/present', replyLength: att.replyLength },
    );

    // --- Flow 2: Owner assign worker ---
    await cancel(PHONES.Owner);
    const beforeTasks = (
      await client.query('SELECT COUNT(*)::int c FROM tasks WHERE factory_id=$1', [
        FACTORY,
      ])
    ).rows[0].c;
    const assignWorker = await dryWh(
      PHONES.Owner,
      'Rahul Kumar ko store check ka kaam do',
    );
    auditReply('2_assign_worker', PHONES.Owner, assignWorker.phrase, assignWorker);
    await wait(500);
    const workerTask = await client.query(
      `SELECT id, description, assigned_to, routing_status
       FROM tasks WHERE factory_id=$1 ORDER BY id DESC LIMIT 1`,
      [FACTORY],
    );
    const wt = workerTask.rows[0];
    recordFlow(
      '2_owner_assign_worker',
      assignWorker.status === 'ok' &&
        wt?.assigned_to === USER_IDS.Worker &&
        wt?.routing_status === 'DIRECT' &&
        wt?.description?.includes('store check'),
      {
        task_id: wt?.id,
        description: wt?.description,
        routing_status: wt?.routing_status,
        reply: assignWorker.reply?.slice(0, 200),
      },
    );

    // --- Flow 3: Owner assign manager (routing) ---
    await cancel(PHONES.Owner);
    const assignMgr = await dryWh(
      PHONES.Owner,
      'Rahul Verma ko dispatch planning ka task do',
    );
    auditReply('3_assign_manager', PHONES.Owner, 'Rahul Verma ko dispatch planning ka task do', assignMgr);
    await wait(600);
    const mgrTask = await client.query(
      `SELECT id, description, assigned_to, routing_status, department_id
       FROM tasks WHERE factory_id=$1 ORDER BY id DESC LIMIT 1`,
      [FACTORY],
    );
    const mt = mgrTask.rows[0];
    const mgrOk =
      assignMgr.status === 'ok' &&
      mt?.assigned_to === USER_IDS.Manager &&
      mt?.routing_status === 'AWAITING_MANAGER_ACTION' &&
      (assignMgr.reply || '').includes(`#${mt?.id}`);
    recordFlow('3_owner_assign_manager', mgrOk, {
      task_id: mt?.id,
      assigned_to: mt?.assigned_to,
      routing_status: mt?.routing_status,
      replyIncludesTaskId: (assignMgr.reply || '').includes(`#${mt?.id}`),
      reply: assignMgr.reply?.slice(0, 250),
    });

    const routeTaskId = mt?.id;

    // --- Flow 4: Manager task list ---
    await cancel(PHONES.Manager);
    const mgrList = await dryWh(PHONES.Manager, 'mere tasks dikaho');
    auditReply('4_manager_tasks', PHONES.Manager, 'mere tasks dikaho', mgrList);
    const listShowsRouteTask =
      routeTaskId && (mgrList.reply || '').includes(`#${routeTaskId}`);
    const listNotFactoryWide = !(mgrList.reply || '').includes('Evidence routing');
    recordFlow('4_manager_task_list', mgrList.status === 'ok' && listNotFactoryWide, {
      showsRouteTask: listShowsRouteTask,
      notFactoryWide: listNotFactoryWide,
      replyLength: mgrList.replyLength,
    });

    // --- Flow 5: Manager delegate ---
    if (routeTaskId) {
      await cancel(PHONES.Manager);
      const delegate = await dryWh(
        PHONES.Manager,
        `task ${routeTaskId} Rahul Kumar ko do`,
      );
      auditReply('5_delegate', PHONES.Manager, `task ${routeTaskId} Rahul Kumar ko do`, delegate);
      await wait(500);
      const delegated = await client.query(
        'SELECT assigned_to, routing_status FROM tasks WHERE id=$1',
        [routeTaskId],
      );
      const d = delegated.rows[0];
      recordFlow(
        '5_manager_delegate',
        delegate.status === 'ok' &&
          d?.assigned_to === USER_IDS.Worker &&
          d?.routing_status === 'DELEGATED_TO_WORKER',
        { task_id: routeTaskId, ...d },
      );
    }

    // --- Flow 6: Inventory ---
    await cancel(PHONES.Owner);
    const inv = await dryWh(PHONES.Owner, 'Steel sheets ka stock kitna bacha hai');
    auditReply('6_inventory', PHONES.Owner, 'Steel sheets ka stock kitna bacha hai', inv);
    recordFlow(
      '6_inventory',
      inv.status === 'ok' && (inv.reply || '').toLowerCase().includes('steel'),
      { replyLength: inv.replyLength },
    );

    // --- Flow 7: Report ---
    await cancel(PHONES.Owner);
    const report = await dryWh(PHONES.Owner, 'Mujhe aaj ka report dikhao');
    auditReply('7_report', PHONES.Owner, 'Mujhe aaj ka report dikhao', report);
    recordFlow(
      '7_report',
      report.status === 'ok' && (report.reply || '').includes('report'),
      { replyLength: report.replyLength },
    );

    // --- Flow 8: PR start (workflow only — first step) ---
    await cancel(PHONES.Owner);
    const pr = await dryWh(PHONES.Owner, 'purchase request bana do');
    auditReply('8_pr_start', PHONES.Owner, 'purchase request bana do', pr);
    const prSession = await client.query(
      `SELECT workflow_type, status FROM workflow_sessions
       WHERE phone_number=$1 AND status='ACTIVE' ORDER BY id DESC LIMIT 1`,
      [PHONES.Owner],
    );
    recordFlow(
      '8_pr_workflow_start',
      pr.status === 'ok' && prSession.rows[0]?.workflow_type === 'PURCHASE_REQUEST_CREATE',
      { session: prSession.rows[0] },
    );
    await cancel(PHONES.Owner);

    // --- Static outbound template length estimate (manager routing prompt) ---
    const workers = await client.query(
      `SELECT u.id, u.name, u.phone_number FROM users u
       JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=$1 AND fu.role='WORKER'
       ORDER BY u.name LIMIT 10`,
      [FACTORY],
    );
    let workerBlock = '\n👷 *Workers you can assign*\n';
    workers.rows.slice(0, 6).forEach((w, i) => {
      workerBlock += `\n${i + 1}. *${w.name}*\n   @${w.id} or @${w.phone_number}\n   Dept: _Not assigned_\n`;
    });
    const mgrPromptSample =
      `━━━━━━━━━━━━━━━━\n📋 *New task from owner — Task #999*\n━━━━━━━━━━━━━━━━\n\n` +
      `🏭 *Factory:* Demo Factory\n📝 dispatch planning ka task\n` +
      `*What would you like to do?*\n\n` +
      `• "I will do task 999" — you handle it\n` +
      `• "task 999 @name ko do" — delegate to a worker\n` +
      `• "/mgrtransfer 999 sales" — wrong department\n` +
      `• "/mgrreject 999 not our scope" — reject with reason\n` +
      workerBlock +
      `━━━━━━━━━━━━━━━━`;
    results.message_length_audit.push({
      step: 'outbound_manager_routing_prompt_estimate',
      ...lengthFlags(mgrPromptSample.length),
      note: 'Fire-and-forget WhatsApp to manager on owner→manager assign',
    });

    results.verdict =
      results.summary.fail === 0
        ? results.summary.warn === 0
          ? 'GO'
          : 'GO_WITH_WARNINGS'
        : 'NO_GO';

    const outPath = path.join(ROOT, 'docs', 'reports', 'genuine-demo-validation-results.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    console.log('\n=== Genuine Demo Validation ===');
    console.log('Demo mode enabled:', results.environment.demo_mode_enabled);
    console.log('Pass:', results.summary.pass, 'Fail:', results.summary.fail, 'Warn:', results.summary.warn);
    console.log('Verdict:', results.verdict);
    console.log('Report:', outPath);

    const longMsgs = results.message_length_audit.filter((m) => m.olli_risk || m.wa_over_limit);
    if (longMsgs.length) {
      console.log('\nLong messages (>3500 chars):');
      for (const m of longMsgs) {
        console.log(`  ${m.step}: ${m.length} chars`);
      }
    }

    const failed = results.flow_checks.filter((f) => !f.pass);
    if (failed.length) {
      console.log('\nFailed flows:');
      for (const f of failed) console.log(' ', f.name, f);
    }

    process.exit(results.summary.fail > 0 ? 1 : 0);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
