import pg from 'pg';

const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';
const FACTORY = 3;

const c = new pg.Client({ connectionString: PG });
await c.connect();

const users = await c.query(
  `SELECT u.id, u.name, u.phone_number, fu.role, d.name AS dept
   FROM users u
   JOIN factory_users fu ON fu.user_id = u.id AND fu.factory_id = $1
   LEFT JOIN departments d ON d.manager_user_id = u.id AND d.factory_id = $1
   WHERE u.phone_number IN ('917452897444', '919456157007', '918604856137')
   ORDER BY u.phone_number`,
  [FACTORY],
);
console.log('demo phones', users.rows);

const depts = await c.query(
  `SELECT id, name, slug, manager_user_id FROM departments WHERE factory_id = $1 ORDER BY name`,
  [FACTORY],
);
console.log('departments', depts.rows);

const vendors = await c.query(
  `SELECT id, name, phone_number, is_active FROM vendors WHERE factory_id = $1 ORDER BY name LIMIT 20`,
  [FACTORY],
);
console.log('vendors', vendors.rows);

const itemCols = await c.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='inventory_items' ORDER BY ordinal_position`,
);
console.log('inventory_columns', itemCols.rows.map((r) => r.column_name));

const items = await c.query(
  `SELECT id, name, sku, current_quantity FROM inventory_items WHERE factory_id = $1 ORDER BY name LIMIT 20`,
  [FACTORY],
);
console.log('inventory', items.rows);

const cats = await c.query(
  `SELECT id, name FROM inventory_categories WHERE factory_id = $1`,
  [FACTORY],
);
console.log('categories', cats.rows);

const locs = await c.query(
  `SELECT id, name FROM inventory_locations WHERE factory_id = $1`,
  [FACTORY],
);
console.log('locations', locs.rows);

const mig = await c.query(
  `SELECT version, applied_at FROM schema_migrations ORDER BY version`,
);
console.log('migrations', mig.rows);

await c.end();
