import pg from 'pg';

const F = 3;
const phones = ['918604856137', '917452897444', '918950411406'];
const cs =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';

const client = new pg.Client({ connectionString: cs });
await client.connect();
const q = async (sql, p) => (await client.query(sql, p)).rows;

const discovery = {
  factory: (await q('SELECT id, name, created_at FROM factories WHERE id=$1', [F]))[0],
  users: await q(
    `SELECT u.id, u.name, u.phone_number, fu.role
     FROM factory_users fu JOIN users u ON u.id = fu.user_id
     WHERE fu.factory_id=$1 ORDER BY fu.role, u.name`,
    [F],
  ),
  departments: await q('SELECT id, name FROM departments WHERE factory_id=$1 ORDER BY name', [F]),
  vendors_count: (await q('SELECT COUNT(*)::int AS c FROM vendors WHERE factory_id=$1', [F]))[0].c,
  vendors_sample: await q(
    'SELECT id, name, phone_number FROM vendors WHERE factory_id=$1 ORDER BY id DESC LIMIT 10',
    [F],
  ),
  inventory_count: (await q('SELECT COUNT(*)::int AS c FROM inventory_items WHERE factory_id=$1', [F]))[0].c,
  inventory_sample: await q(
    `SELECT id, sku, name, current_quantity, reorder_threshold
     FROM inventory_items WHERE factory_id=$1 ORDER BY id DESC LIMIT 10`,
    [F],
  ),
  categories: await q(
    'SELECT id, name FROM inventory_categories WHERE factory_id=$1 AND is_active=true LIMIT 10',
    [F],
  ),
  locations: await q('SELECT id, name FROM inventory_locations WHERE factory_id=$1 LIMIT 10', [F]),
  pr_count: (await q('SELECT COUNT(*)::int AS c FROM purchase_requests WHERE factory_id=$1', [F]))[0].c,
  pr_sample: await q(
    'SELECT id, title, status, created_at FROM purchase_requests WHERE factory_id=$1 ORDER BY id DESC LIMIT 8',
    [F],
  ),
  tasks_open: (await q('SELECT COUNT(*)::int AS c FROM tasks WHERE factory_id=$1 AND is_completed=false', [F]))[0]
    .c,
  issues_open: (await q('SELECT COUNT(*)::int AS c FROM issues WHERE factory_id=$1 AND is_resolved=false', [F]))[0]
    .c,
  active_workflows: await q(
    `SELECT id, phone_number, workflow_type, status, current_step, updated_at
     FROM workflow_sessions WHERE status='ACTIVE' AND phone_number = ANY($1::text[])
     ORDER BY id DESC`,
    [phones],
  ),
  attendance_today: await q(
    `SELECT u.name, u.phone_number, a.is_present
     FROM attendance a JOIN users u ON u.id = a.user_id
     WHERE a.factory_id=$1 AND a.date = CURRENT_DATE ORDER BY u.name`,
    [F],
  ),
};

console.log(JSON.stringify(discovery, null, 2));
await client.end();
