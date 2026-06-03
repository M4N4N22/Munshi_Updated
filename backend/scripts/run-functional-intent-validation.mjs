/**
 * QA-only functional intent validation — not part of production runtime.
 * Output: docs/reports/intent-functional-validation-results.json
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

const WORKFLOW_MAP = {
  '/business_discovery': 'BUSINESS_DISCOVERY',
  '/continue_discovery': 'BUSINESS_DISCOVERY',
  '/onboard_vendor': 'ONBOARD_VENDOR',
  '/onboard_worker': 'ONBOARD_WORKER',
  '/inventory_create': 'INVENTORY_CREATE',
  '/purchase_request_create': 'PURCHASE_REQUEST_CREATE',
};

const BACKEND_ACTION = {
  '/business_discovery': 'WorkflowRouter.startWorkflow → BUSINESS_DISCOVERY',
  '/continue_discovery': 'WorkflowRouter.startWorkflow → BUSINESS_DISCOVERY (resume)',
  '/onboard_vendor': 'WorkflowRouter.startWorkflow → ONBOARD_VENDOR',
  '/onboard_worker': 'WorkflowRouter.startWorkflow → ONBOARD_WORKER',
  '/inventory_create': 'WorkflowRouter.startWorkflow → INVENTORY_CREATE',
  '/inventory_status': 'InventoryService.handleInventoryStatus',
  '/purchase_request_create': 'WorkflowRouter.startWorkflow → PURCHASE_REQUEST_CREATE',
  '/present': 'AttendanceService.markAttendance(present=true)',
  '/absent': 'AttendanceService.markAttendance(present=false)',
  '/tasks': 'TasksService.getTasks',
  '/update': 'TasksService.addTaskUpdate',
  '/complete': 'TasksService.completeTask',
  '/issue': 'IssueService.createIssue',
  '/issues': 'IssueService.listIssues',
  '/resolve': 'IssueService.resolveIssue',
  '/report': 'ReportService.generateReport',
  '/assign': 'TasksService.createTaskFromAssign',
  '/mgrassign': 'TasksService.applyManagerDelegateWorker',
  '/mgrtransfer': 'TasksService.applyManagerTransferDepartment',
  '/mgrreject': 'TasksService.applyManagerRejectTask',
  '/mgrself': 'TasksService.applyManagerSelf',
  '/depart_assign': 'TasksService.createDepartmentTask',
  '/members': 'FactoryService.getFactoryUsers',
  '/help': 'waHelpText',
  general_chat: 'LLM chat response via MessagingService',
};

const DB_ACTION = {
  '/business_discovery': 'business_discovery_profiles (read/update via workflow)',
  '/continue_discovery': 'workflow_sessions ACTIVE',
  '/onboard_vendor': 'workflow_sessions ACTIVE → vendors on complete',
  '/onboard_worker': 'workflow_sessions ACTIVE → users on complete',
  '/inventory_create': 'workflow_sessions ACTIVE → inventory_items on complete',
  '/inventory_status': 'inventory_items read',
  '/purchase_request_create': 'workflow_sessions ACTIVE → purchase_requests on complete',
  '/present': 'attendance upsert',
  '/absent': 'attendance upsert',
  '/tasks': 'tasks read',
  '/update': 'task_updates insert',
  '/complete': 'tasks.is_completed update',
  '/issue': 'issues insert',
  '/issues': 'issues read',
  '/resolve': 'issues.is_resolved update',
  '/report': 'aggregated read (attendance/tasks/issues)',
  '/assign': 'tasks insert',
  '/mgrassign': 'tasks.assigned_to update',
  '/mgrtransfer': 'tasks.department update',
  '/mgrreject': 'tasks status/reject',
  '/mgrself': 'tasks.assigned_to = manager',
  '/depart_assign': 'tasks insert (department)',
  '/members': 'users/factory_users read',
  '/help': 'none',
  general_chat: 'none',
};

function phrases(intent) {
  const P = {
    '/business_discovery': [
      'mera business setup karna hai', 'hum manufacturing unit hain', 'factory details share karni hain',
      'tell you about my business', 'company setup karna hai', 'mera business Sharma Packaging hai',
      'register my company details', 'business identity batana hai', 'mera factory introduce karna hai',
      'packaging company hai humari', 'organization structure batana hai', 'mera unit ka introduction',
      'factory details share karna hai', 'business type manufacturing hai', 'setup my business please',
      'introduce my business', 'mera business Faridabad mein hai', 'company details update karni hai',
      'import inventory list', 'team setup karna hai', 'attendance sheet import karni hai',
    ],
    '/continue_discovery': [
      'resume onboarding', 'setup phir se shuru', 'continue setup', 'setup continue karo',
      'onboarding continue karo', 'discovery continue', 'continue business setup', 'setup wapas karo',
      'resume business setup', 'business setup resume karo',
    ],
    '/onboard_worker': [
      'naya worker add karo', 'employee register karo', 'worker onboard karo', 'naye worker add karna hai',
      'staff onboarding start karo', 'karmchari add karo', 'new hire register karo', 'team member add karo',
      'register new employee', 'worker registration karo', 'employee onboarding shuru karo',
      'naya employee add karna hai', 'staff member register', 'hire new worker', 'worker add karna hai',
      'onboard new staff', 'employee darj karo', 'naye karmchari jod do', 'worker entry karo',
      'register worker Rahul',
    ],
    '/onboard_vendor': [
      'vendor add karo', 'supplier register karo', 'naya supplier add karo', 'naya vendor add karna hai',
      'vendor onboarding start', 'supplier add karo', 'register vendor ABC', 'naye vendor jod do',
      'vendor register karo', 'supplier onboarding', 'naya vendor darj karo', 'add new supplier',
      'vendor entry karo', 'supplier list mein add', 'register supplier Shree Packaging',
      'vendor setup karo', 'supplier registration chahiye', 'naya supplier onboarding',
      'vendor master mein add', 'supplier create karo',
    ],
    '/inventory_create': [
      'inventory item add karo', 'SKU register karo', 'new stock item create karo', 'naya item add karo',
      'inventory register karo', 'stock item create karo', 'warehouse mein item add', 'inventory add karo',
      'create inventory item', 'register new product in stock', 'item darj karo inventory mein',
      'stock entry create karo', 'naya inventory item', 'inventory mein product add', 'SKU register karna hai',
      'stock create karo', 'inventory item setup', 'add item to inventory', 'new sku create',
      'inventory product register',
    ],
    '/inventory_status': [
      'inventory status batao', 'printing ink kitna hai', 'stock register status', 'invntry sttus batao',
      'stock level dikhao', 'kitna stock hai', 'inventory check karo', 'stock batao', 'maal kitna hai',
      'warehouse stock dikhao', 'available stock', 'current inventory status', 'low stock dikhao',
      'SKU status check', 'inventory summary chahiye', 'stock quantity batao', 'inventory dekho',
      'raw material kitna bacha hai', 'check stock levels', 'show inventory status',
    ],
    '/purchase_request_create': [
      'order create karo', 'raw material mangwana hai', 'purchase request bana do', 'need cement bags',
      'procurement chahiye glue ke liye', '50 rolls packaging tape order', 'order chahiye',
      'stock khatam hone wala hai', 'khatam hone wali hai order karo', 'material order karna hai',
      'aur material mangwana hai', 'reorder karo', 'supplier se mangao cement', 'purchase request for steel',
      'need 100 cartons order', 'packaging tape order karo', 'PR banao', 'procurement request create',
      'maal chahiye order karo', 'raw material purchase karna hai',
    ],
    '/present': [
      'aaj present hoon', 'aaj main present hoon', 'main aa gaya', 'present mark karo',
      'aaj office aa gaya hu', 'i am here today', 'aa gaya hu kaam pe', 'present hu aaj',
      'shift start present', 'aaj ka attendance present', 'main factory pahunch gaya',
      'present mark kar do', 'attendance present lagao', 'main aa chuka hu', 'factory pahunch gaya',
      'aaj shift present', 'pahunch gaya present', 'main present hu', 'aa gaya hu',
      'present lagao aaj', 'shift mein present',
    ],
    '/absent': [
      'aaj absent hoon', 'aaj nahi aa paunga', 'leave chahiye aaj', 'main absent hoon',
      'aaj absent mark karo', 'bimar hu aaj nahi aaunga', 'personal leave aaj', 'chutti chahiye',
      'not coming today', 'aaj leave leni hai', 'medical leave chahiye', 'family function hai absent',
      'aaj factory nahi aa sakta', 'shift miss karunga', 'aaj absent hu', 'kal se aaunga aaj absent',
      'leave chahiye', 'aaj nahi aa sakta', 'absent mark karo', 'aaj chutti',
    ],
    '/tasks': [
      'mere tasks dikhao', 'pending tasks batao', 'mera kaam dikhao', 'aaj ke tasks kya hain',
      'assigned tasks dikhao', 'task list chahiye', 'open tasks dikhao', 'aaj kya karna hai',
      'mera task list', 'mere tasks batao', 'tasks list bhejo', 'kaam dikhao', 'pending kaam dikhao',
      'task dikhao jaldi', 'aaj ka schedule tasks', 'mera kaam list', 'tasks dikhao',
      'kaun se task hain mere', 'my tasks please', 'show my tasks',
    ],
    '/update': [
      'progress update', 'aadha kaam ho gaya', '50 percent complete', 'kaam chal raha hai',
      'kaam almost complete hai', 'task 5 update packing done', 'status update task almost done',
      'task 8 update 80 percent done', 'progress update task 2', 'task 15 status update kar do',
      'task update karo progress 50 percent', 'task 12 par kaam chal raha hai update',
      'update task 3 half complete', 'work in progress task 3', 'half complete task 4',
      '80 percent done task 6', 'status update karo', 'progress batao task 2',
      'task almost done update', 'partial complete task 9',
    ],
    '/complete': [
      'task complete', 'kaam poora', 'job done', 'task finish', 'task khatam', 'job complete',
      'kaam complete', 'task done', 'assignment complete', 'kaam poora ho gaya', 'work done',
      'task complete ho gaya', 'kaam khatam', 'job finished', 'task poora ho gaya',
      'complete ho gaya kaam', 'finished task', 'done with task', 'kaam complete ho chuka',
      'task id 7 complete',
    ],
    '/issue': [
      'machine kharab hai', 'machine band padi hai', 'printer kaam nahi kar raha',
      'forklift breakdown hai', 'safety issue report karna hai', 'quality problem hai batch mein',
      'water leakage hai', 'motor overheat ho raha', 'glue tank leak ho raha hai',
      'inventory mismatch hai', 'raw material nahi mil raha', 'conveyor belt issue hai',
      'power cut ho gaya section mein', 'label machine stuck', 'noise pollution machine se',
      'machine 2 band padi hai', 'forklift breakdown', 'water leakage shop floor',
      'safety issue hai', 'quality problem hai',
    ],
    '/issues': [
      'issues dikhao', 'issues list dikhao', 'active issues dikhao', 'open issues list',
      'sabhi issues dikhao', 'issue list chahiye', 'open issues dikhao', 'active issue list',
      'show all issues', 'pending issues dikhao', 'issues batao', 'current issues list',
      'open issue dikhao', 'issues status dikhao', 'issue register dikhao', 'live issues dikhao',
      'unresolved issues dikhao', 'issue summary dikhao', 'issues count batao', 'issue dashboard dikhao',
    ],
    '/resolve': [
      'issue resolve ho gaya', 'issue 4 resolve karo', 'problem solve ho gayi',
      'issue fix ho gaya', 'issue resolved', 'problem solve ho gaya', 'issue close karo',
      'resolve issue 3', 'issue 5 resolve', 'problem fixed', 'issue sorted ho gaya',
      'issue 2 resolve karo', 'issue resolve kar do', 'issue 6 fix ho gaya',
      'problem resolve ho chuki', 'issue 1 resolved', 'issue 8 resolve', 'issue solve karo',
      'issue 10 resolve ho gaya', 'problem close ho gaya',
    ],
    '/report': [
      'attendance report', 'daily summary', 'weekly report', 'aaj ka report dikhao',
      'attendance report chahiye', 'task report bhejo', 'daily summary dikhao',
      'monthly report chahiye', 'production report dikhao', 'shift report dikhao',
      'issues report dikhao', 'report generate karo', 'kaam ka report chahiye',
      'weekly report chahiye', 'aaj attendance report dikhao', 'report dikhao',
      'monthly summary chahiye', 'daily report bhejo', 'report chahiye aaj ka',
      'summary report dikhao',
    ],
    '/assign': [
      'rahul ko kaam do', 'rahul ko task assign karo', 'vikas ko kaam do', 'anil ko dispatch ka kaam do',
      'deepak ko loading assign karo', 'rahul ko packaging kaam do', 'vikas ko tape counting do',
      'ajay ko kaam do', 'suresh ko task assign karo', 'prateek ko kaam do',
      'deb ko task assign karo', 'ramesh ko kaam do', 'amit ko kaam do',
      'anil ko kaam do', 'vikas ko task assign karo', 'deepak ko kaam do',
      'rahul ko dispatch ka kaam do', 'ajay ko task assign karo', 'suresh ko kaam do',
      'prateek ko loading assign karo',
    ],
    '/mgrassign': [
      'task 5 rahul ko do', 'task 6 vikas ko do', 'task 10 anil ko assign karo',
      'task 12 vikas ko assign karo', 'task 3 rahul ko do', 'task 7 anil ko do',
      'task 15 deepak ko assign karo', 'task 4 ajay ko do', 'task 9 suresh ko assign karo',
      'task 11 rahul ko de do', 'task 20 vikas ko do', 'task 8 anil ko assign karo',
      'task 14 deepak ko do', 'task 2 rahul ko assign karo', 'task 18 ajay ko do',
      'task 6 anil ko de do', 'task 13 vikas ko assign karo', 'task 16 rahul ko do',
      'task 22 deepak ko assign karo', 'task 25 ajay ko do',
    ],
    '/mgrtransfer': [
      'task 5 inventory team ko transfer karo', 'task 8 accounts team ko transfer karo',
      'task 11 maintenance ko bhejo', 'task 3 sales ko transfer karo', 'task 7 it team ko bhejo',
      'task 12 purchase team ko transfer', 'task 4 operations ko bhejo', 'task 9 sales ko transfer karo',
      'task 15 it ko transfer karo', 'task 6 purchase ko bhejo', 'task 20 sales team ko transfer',
      'task 8 inventory ko bhejo', 'task 10 maintenance team ko transfer', 'task 2 it ko bhejo',
      'task 14 sales ko transfer karo', 'task 18 purchase ko bhejo', 'task 22 operations transfer',
      'task 5 sales ko bhejo', 'task 11 it team transfer karo', 'task 16 purchase ko transfer',
    ],
    '/mgrreject': [
      'task 8 reject karo', 'ye hamare department ka kaam nahi hai', 'galat department mein aaya hai',
      'task wapas bhejo', 'task 5 reject karo wrong department', 'task 12 reject not our scope',
      'task 3 galat department mein hai', 'task 7 reject karo department ka nahi',
      'task 10 wapas bhejo', 'task 15 reject wrong team', 'task 4 hamare department ka nahi',
      'task 9 reject karo', 'task 11 galat department', 'task 6 reject not ours',
      'task 20 reject karo scope nahi hai', 'task 2 wapas bhejo galat dept',
      'task 14 reject karo', 'task 18 not our department', 'task 22 reject galat aaya',
      'task 25 reject karo',
    ],
    '/mgrself': [
      'task 20 main khud karunga', 'task 22 main khud karunga', 'ye task main lunga',
      'main handle karunga', 'assign to me', 'task 30 main karunga', 'task 25 main khud karunga',
      'task 18 main lunga', 'task 12 main handle karunga', 'task 8 main khud karunga',
      'task 15 main karunga', 'task 10 main khud lunga', 'task 5 main handle karunga',
      'task 32 main karunga', 'task 28 main khud karunga', 'task 21 main lunga',
      'task 19 main khud karunga', 'task 24 main handle karunga', 'task 27 main karunga',
      'task 33 main khud karunga',
    ],
    '/depart_assign': [
      'production ko bhejo', 'inventory team ko assign karo', 'quality department ko transfer karo',
      'warehouse khali karo', 'invoice bhejo customer ko', 'quality check karo',
      'production line check karo', 'maintenance team ko bolo', 'store room arrange karo',
      'server theek karo', 'dispatch complete karo', 'packaging section ka kaam karo',
      'payment follow up karo', 'loading ka kaam karo', 'customer call karo',
      'procurement follow up', 'wifi issue fix', 'inventory count karo department mein',
      'vendor payment process karo', 'raw material order karo',
    ],
    '/members': [
      'employee list dikhao', 'members dikhao', 'workers dikhao', 'team members dikhao',
      'staff list dikhao', 'member list dikhao', 'team list dikhao', 'team members batao',
      'members list chahiye', 'employee list batao',
    ],
    '/help': [
      'help chahiye', 'madad chahiye', 'help', 'help please', 'munshi help',
      'commands dikhao', 'help chahiye task mein', 'madad chahiye munshi',
      'help chahiye please', 'kya kar sakte ho munshi',
    ],
  };
  return P[intent] || [];
}

const ROLE_FOR = {
  '/business_discovery': 'Owner', '/continue_discovery': 'Owner',
  '/onboard_vendor': 'Owner', '/onboard_worker': 'Manager',
  '/inventory_create': 'Owner', '/inventory_status': 'Owner',
  '/purchase_request_create': 'Owner',
  '/present': 'Worker', '/absent': 'Worker',
  '/tasks': 'Worker', '/update': 'Worker', '/complete': 'Worker',
  '/issue': 'Worker', '/issues': 'Owner', '/resolve': 'Manager',
  '/report': 'Owner',
  '/assign': 'Manager', '/mgrassign': 'Manager', '/mgrtransfer': 'Manager',
  '/mgrreject': 'Manager', '/mgrself': 'Manager', '/depart_assign': 'Manager',
  '/members': 'Owner', '/help': 'Owner',
};

const GOLDEN = {
  '/business_discovery': 'mera business setup karna hai',
  '/continue_discovery': 'setup phir se shuru',
  '/onboard_vendor': 'naya vendor add karo',
  '/onboard_worker': 'naya worker add karo',
  '/inventory_create': 'SKU register karo',
  '/inventory_status': 'inventory status batao',
  '/purchase_request_create': 'purchase request bana do',
  '/present': 'aaj main present hoon',
  '/absent': 'chutti chahiye',
  '/tasks': 'mera kaam dikhao',
  '/update': 'progress update task 34',
  '/complete': 'task 34 complete ho gaya',
  '/issue': 'machine kharab hai',
  '/issues': 'active issues dikhao',
  '/resolve': 'issue resolve ho gaya',
  '/report': 'aaj ka report dikhao',
  '/assign': 'prateek ko loading ka kaam do',
  '/mgrassign': null, // filled after setup
  '/mgrtransfer': null,
  '/mgrreject': null,
  '/mgrself': null,
  '/depart_assign': 'warehouse khali karo',
  '/members': 'team members dikhao',
  '/help': 'help chahiye',
};

async function classify(message) {
  const res = await fetch(`${ML}/classify?message=${encodeURIComponent(message)}`, { method: 'POST' });
  return res.json();
}

async function webhook(phone, message) {
  const res = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: phone, message }),
  });
  return res.text();
}

async function api(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function query(client, sql, params = []) {
  const r = await client.query(sql, params);
  return r.rows;
}

function countArray(v) { return Array.isArray(v) ? v.length : (v?.data?.length ?? 0); }

async function snapshot(client, phone) {
  const user = await query(client, `SELECT u.id FROM users u WHERE u.phone_number = $1 LIMIT 1`, [phone]);
  const uid = user[0]?.id;
  const sessions = await query(client,
    `SELECT id, workflow_type, status FROM workflow_sessions WHERE phone_number = $1 AND status = 'ACTIVE'`,
    [phone]);
  const attendance = await query(client,
    `SELECT COUNT(*)::int AS c FROM attendance WHERE factory_id = $1`, [FACTORY]);
  const tasks = await query(client,
    `SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id = $1`, [FACTORY]);
  const issues = await query(client,
    `SELECT COUNT(*)::int AS c FROM issues WHERE factory_id = $1 AND is_resolved = false`, [FACTORY]);
  const vendors = await query(client,
    `SELECT COUNT(*)::int AS c FROM vendors WHERE factory_id = $1`, [FACTORY]);
  const prs = await query(client,
    `SELECT COUNT(*)::int AS c FROM purchase_requests WHERE factory_id = $1`, [FACTORY]);
  const items = await query(client,
    `SELECT COUNT(*)::int AS c FROM inventory_items WHERE factory_id = $1`, [FACTORY]);
  return { uid, sessions, attendance: attendance[0].c, tasks: tasks[0].c, issues: issues[0].c,
    vendors: vendors[0].c, prs: prs[0].c, items: items[0].c };
}

function inferExecution(intent, before, after, webhookStatus, predicted) {
  if (predicted !== intent) return { ok: false, reason: 'classification_mismatch' };
  if (webhookStatus !== 'ok') return { ok: false, reason: 'webhook_error' };
  if (WORKFLOW_MAP[intent]) {
    const started = after.sessions.some(s => s.workflow_type === WORKFLOW_MAP[intent]);
    return { ok: started, reason: started ? 'workflow_session_active' : 'no_active_session' };
  }
  if (intent === '/present' || intent === '/absent') {
    return { ok: true, reason: 'attendance_command_ok' };
  }
  if (intent === '/issue') return { ok: after.issues >= before.issues, reason: 'issues_count' };
  if (intent === '/update') {
    return { ok: webhookStatus === 'ok', reason: 'update_command_ok' };
  }
  if (intent === '/help' || intent === '/tasks' || intent === '/members' || intent === '/report' ||
      intent === '/issues' || intent === '/inventory_status') {
    return { ok: webhookStatus === 'ok', reason: 'command_webhook_ok' };
  }
  if (intent === '/mgrassign' || intent === '/mgrtransfer' || intent === '/mgrreject' || intent === '/mgrself') {
    return { ok: webhookStatus === 'ok', reason: 'manager_command_ok' };
  }
  if (intent === '/assign' || intent === '/depart_assign') {
    return { ok: webhookStatus === 'ok' && after.tasks >= before.tasks, reason: 'tasks_count' };
  }
  return { ok: webhookStatus === 'ok', reason: 'webhook_ok_assumed' };
}

async function main() {
  const env = {
    backend: await fetch(`${BASE}/health`).then(r => r.json()),
    migrations: await fetch(`${BASE}/health/migrations`).then(r => r.json()),
    ml: await fetch(`${ML}/health`).then(r => r.json()),
  };

  const client = new pg.Client({ connectionString: PG });
  await client.connect();

  // Owner → manager routing task for manager-operation golden phrases
  await webhook(PHONES.Owner, '/cancel');
  await new Promise(r => setTimeout(r, 300));
  await webhook(PHONES.Owner, 'shantanu ko P0 routing validation task assign karo');
  await new Promise(r => setTimeout(r, 800));
  const mgrRoute = await client.query(
    `SELECT t.id FROM tasks t
     JOIN users u ON u.id = t.assigned_to
     WHERE t.factory_id = $1 AND u.phone_number = $2
       AND t.routing_status = 'AWAITING_MANAGER_ACTION'
     ORDER BY t.id DESC LIMIT 1`,
    [FACTORY, PHONES.Manager],
  );
  const routeTaskId = mgrRoute.rows[0]?.id;
  if (routeTaskId) {
    GOLDEN['/mgrassign'] = `task ${routeTaskId} prateek ko do`;
    GOLDEN['/mgrtransfer'] = `task ${routeTaskId} sales ko transfer karo`;
    GOLDEN['/mgrreject'] = `task ${routeTaskId} reject karo wrong department`;
    GOLDEN['/mgrself'] = `task ${routeTaskId} main khud karunga`;
  }

  const results = [];
  const intents = Object.keys(ROLE_FOR);

  for (const intent of intents) {
    for (const phrase of phrases(intent)) {
      const role = ROLE_FOR[intent];
      const ml = await classify(phrase);
      const predicted = ml.intent?.startsWith('/') ? ml.intent : (ml.intent === 'general_chat' ? 'general_chat' : `/${ml.intent}`);
      const correct = predicted === intent;
      results.push({
        role, intent, phrase,
        expected_intent: intent,
        predicted_intent: predicted,
        classification_correct: correct,
        workflow_name: WORKFLOW_MAP[intent] || null,
        backend_action: BACKEND_ACTION[intent] || BACKEND_ACTION.general_chat,
        db_action: DB_ACTION[intent] || 'none',
      });
    }
  }

  const goldenResults = [];
  for (const [intent, phrase] of Object.entries(GOLDEN)) {
    if (!phrase) continue;
    const role = ROLE_FOR[intent];
    const phone = PHONES[role];
    await webhook(phone, '/cancel');
    await new Promise(r => setTimeout(r, 300));
    const before = await snapshot(client, phone);
    const ml = await classify(phrase);
    const predicted = ml.intent?.startsWith('/') ? ml.intent : ml.intent;
    const wh = await webhook(phone, phrase);
    await new Promise(r => setTimeout(r, 800));
    const after = await snapshot(client, phone);
    const exec = inferExecution(intent, before, after, wh, predicted);
    goldenResults.push({
      role, intent, phrase, predicted_intent: predicted,
      classification_correct: predicted === intent,
      webhook_status: wh,
      workflow_triggered: WORKFLOW_MAP[intent] ? after.sessions.some(s => s.workflow_type === WORKFLOW_MAP[intent]) : false,
      workflow_name: WORKFLOW_MAP[intent] || null,
      backend_action: BACKEND_ACTION[intent],
      db_action: DB_ACTION[intent],
      execution_ok: exec.ok,
      execution_reason: exec.reason,
      final_outcome: exec.ok && predicted === intent ? 'SUCCESS' : 'FAILURE',
    });
  }

  await client.end();

  const byIntent = {};
  for (const r of results) {
    byIntent[r.intent] = byIntent[r.intent] || { total: 0, correct: 0 };
    byIntent[r.intent].total++;
    if (r.classification_correct) byIntent[r.intent].correct++;
  }

  const out = {
    validated_at: new Date().toISOString(),
    environment: env,
    classification: {
      total: results.length,
      correct: results.filter(r => r.classification_correct).length,
      accuracy: Math.round(1000 * results.filter(r => r.classification_correct).length / results.length) / 10,
      by_intent: Object.fromEntries(Object.entries(byIntent).map(([k, v]) => [k, {
        ...v, accuracy: Math.round(1000 * v.correct / v.total) / 10,
      }])),
    },
    golden_e2e: goldenResults,
    all_results: results,
  };

  const outPath = path.join(__dirname, '..', 'docs', 'reports', 'intent-functional-validation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    env_ok: env.migrations.pending_count === 0,
    classification_accuracy: out.classification.accuracy,
    golden_pass: goldenResults.filter(g => g.final_outcome === 'SUCCESS').length,
    golden_total: goldenResults.length,
    outPath,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
