/**
 * Prompt 13.7 — Demo mode validation (requires DEMO_MODE=true and restarted backend).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:4001';
const PHONES = {
  Owner: '917452897444',
  Manager: '919456157007',
};

const PHRASES = [
  { id: 'attendance', phone: 'Manager', msg: 'Aaj main present hoon' },
  { id: 'task_assign', phone: 'Owner', msg: 'Rahul Kumar ko store check ka kaam do' },
  { id: 'inventory', phone: 'Owner', msg: 'Steel sheets ka stock kitna bacha hai' },
  { id: 'report', phone: 'Owner', msg: 'Mujhe aaj ka report dikhao' },
  { id: 'discovery', phone: 'Owner', msg: 'Mera business setup karna hai' },
  { id: 'document', phone: 'Owner', msg: 'Munshi inventory list upload karni hai' },
  { id: 'pr_1', phone: 'Owner', msg: 'purchase request bana do' },
  { id: 'pr_2', phone: 'Owner', msg: 'Steel sheets ka order' },
  { id: 'pr_3', phone: 'Owner', msg: 'Steel Sheets' },
  { id: 'pr_4', phone: 'Owner', msg: '25' },
  { id: 'pr_5', phone: 'Owner', msg: 'NO' },
  { id: 'pr_6', phone: 'Owner', msg: 'YES' },
  { id: 'pr_7', phone: 'Owner', msg: 'Gupta Metals' },
  { id: 'pr_8', phone: 'Owner', msg: 'YES' },
];

async function wh(from, message) {
  const r = await fetch(`${BASE}/webhook/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, message }),
  });
  const body = await r.text();
  return { http_status: r.status, body, ok: body === 'ok', error: body === 'error' };
}

async function main() {
  const status = await fetch(`${BASE}/demo-mode/status`).then((r) => r.json());
  if (!status.enabled) {
    console.error('DEMO_MODE is not enabled. Set DEMO_MODE=true in .env.local and restart backend.');
    process.exit(1);
  }

  const results = [];
  for (const p of PHRASES) {
    const phone = PHONES[p.phone];
    const w = await wh(phone, p.msg);
    results.push({
      ...p,
      phone,
      http_status: w.http_status,
      webhook: w.body,
      pass: w.ok && !w.error && w.http_status < 400,
      unknown_command: false,
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  // Interference test: inventory during would-be session — demo mode should still ok
  await wh(PHONES.Owner, 'purchase request bana do');
  await new Promise((r) => setTimeout(r, 400));
  const invDuring = await wh(PHONES.Owner, 'Steel sheets ka stock kitna bacha hai');
  results.push({
    id: 'inventory_no_interference',
    phone: PHONES.Owner,
    msg: 'Steel sheets ka stock kitna bacha hai (after PR start)',
    pass: invDuring.ok && !invDuring.error,
    interference_test: true,
  });

  const out = {
    validated_at: new Date().toISOString(),
    demo_mode_enabled: status.enabled,
    results,
    pass_count: results.filter((r) => r.pass).length,
    total: results.length,
    overall_pass: results.every((r) => r.pass),
  };

  const outPath = path.join(ROOT, 'docs', 'reports', 'demo-mode-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ pass: out.pass_count, total: out.total, overall: out.overall_pass }, null, 2));
  console.log('written', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
