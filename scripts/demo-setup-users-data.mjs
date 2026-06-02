/**
 * Demo 13.5 — idempotent user + dataset preparation for Factory 3.
 */
import pg from 'pg';

const PG =
  process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data';
const FACTORY = 3;

const DEMO = {
  ownerPhone: '917452897444',
  ownerName: 'Shantanu Garg',
  managerPhone: '919456157007',
  managerName: 'Rahul Verma',
  workerName: 'Rahul Kumar',
  workerPhone: '919876543211',
  vendorName: 'Gupta Metals',
    vendorPhone: '9999999999',
  steelItem: 'Steel Sheets',
  steelSku: 'DEMO-STEEL-001',
  departments: ['Operations', 'Sales', 'Inventory'],
};

const c = new pg.Client({ connectionString: PG });
await c.connect();

const log = [];

function note(msg, data) {
  log.push({ msg, ...data });
  console.log(msg, data ?? '');
}

async function ensureOwner() {
  const u = await c.query(`SELECT id FROM users WHERE phone_number=$1`, [
    DEMO.ownerPhone,
  ]);
  if (!u.rows.length) {
    note('MISSING owner user', { phone: DEMO.ownerPhone });
    return null;
  }
  const userId = u.rows[0].id;
  await c.query(
    `UPDATE factory_users SET role='OWNER' WHERE factory_id=$1 AND user_id=$2`,
    [FACTORY, userId],
  );
  const managed = await c.query(
    `SELECT id, name, slug FROM departments WHERE factory_id=$1 AND manager_user_id=$2`,
    [FACTORY, userId],
  );
  for (const dept of managed.rows) {
    if (dept.slug === 'inventory') continue;
    const fallbackMgr = await c.query(
      `SELECT u.id FROM users u
       JOIN factory_users fu ON fu.user_id=u.id AND fu.factory_id=$1
       WHERE fu.role='MANAGER' AND u.id <> $2
         AND NOT EXISTS (
           SELECT 1 FROM departments d WHERE d.factory_id=$1 AND d.manager_user_id=u.id
         )
       ORDER BY u.id LIMIT 1`,
      [FACTORY, userId],
    );
    if (fallbackMgr.rows.length) {
      await c.query(`UPDATE departments SET manager_user_id=$1 WHERE id=$2`, [
        fallbackMgr.rows[0].id,
        dept.id,
      ]);
      note('Reassigned department manager', {
        dept: dept.name,
        to: fallbackMgr.rows[0].id,
      });
    }
  }
  note('Owner role set', { userId, phone: DEMO.ownerPhone });
  return userId;
}

async function ensureManager(ownerId) {
  let u = await c.query(`SELECT id FROM users WHERE phone_number=$1`, [
    DEMO.managerPhone,
  ]);
  let userId;
  if (!u.rows.length) {
    const ins = await c.query(
      `INSERT INTO users (name, phone_number, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
      [DEMO.managerName, DEMO.managerPhone],
    );
    userId = ins.rows[0].id;
    note('Created manager user', { userId, phone: DEMO.managerPhone });
  } else {
    userId = u.rows[0].id;
    await c.query(`UPDATE users SET name=$1 WHERE id=$2`, [
      DEMO.managerName,
      userId,
    ]);
    note('Manager user exists', { userId, phone: DEMO.managerPhone });
  }

  const fu = await c.query(
    `SELECT id FROM factory_users WHERE factory_id=$1 AND user_id=$2`,
    [FACTORY, userId],
  );
  if (!fu.rows.length) {
    await c.query(
      `INSERT INTO factory_users (factory_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, 'MANAGER', NOW(), NOW())`,
      [FACTORY, userId],
    );
    note('Linked manager to factory', { userId });
  } else {
    await c.query(
      `UPDATE factory_users SET role='MANAGER' WHERE factory_id=$1 AND user_id=$2`,
      [FACTORY, userId],
    );
  }
  return userId;
}

async function ensureDepartment(name, managerUserId) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  let d = await c.query(
    `SELECT id, manager_user_id FROM departments WHERE factory_id=$1 AND slug=$2`,
    [FACTORY, slug],
  );
  if (!d.rows.length) {
    const ins = await c.query(
      `INSERT INTO departments (factory_id, name, slug, manager_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
      [FACTORY, name, slug, managerUserId],
    );
    note('Created department', { id: ins.rows[0].id, name, managerUserId });
    return ins.rows[0].id;
  }
  if (managerUserId && d.rows[0].manager_user_id !== managerUserId) {
    await c.query(`UPDATE departments SET manager_user_id=$1 WHERE id=$2`, [
      managerUserId,
      d.rows[0].id,
    ]);
    note('Updated department manager', { name, managerUserId });
  }
  return d.rows[0].id;
}

async function ensureWorker(managerId, deptId) {
  let u = await c.query(`SELECT id FROM users WHERE phone_number=$1`, [
    DEMO.workerPhone,
  ]);
  let userId;
  if (!u.rows.length) {
    const ins = await c.query(
      `INSERT INTO users (name, phone_number, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
      [DEMO.workerName, DEMO.workerPhone],
    );
    userId = ins.rows[0].id;
    note('Created demo worker', { userId, name: DEMO.workerName });
  } else {
    userId = u.rows[0].id;
    await c.query(`UPDATE users SET name=$1 WHERE id=$2`, [
      DEMO.workerName,
      userId,
    ]);
  }

  const fu = await c.query(
    `SELECT id FROM factory_users WHERE factory_id=$1 AND user_id=$2`,
    [FACTORY, userId],
  );
  if (!fu.rows.length) {
    await c.query(
      `INSERT INTO factory_users (factory_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, 'WORKER', NOW(), NOW())`,
      [FACTORY, userId],
    );
    note('Linked worker to factory', { userId });
  } else {
    await c.query(
      `UPDATE factory_users SET role='WORKER' WHERE factory_id=$1 AND user_id=$2`,
      [FACTORY, userId],
    );
  }

  return userId;
}

async function ensureVendor() {
  let v = await c.query(
    `SELECT id FROM vendors WHERE factory_id=$1 AND LOWER(name)=LOWER($2)`,
    [FACTORY, DEMO.vendorName],
  );
  if (v.rows.length) {
    await c.query(
      `UPDATE vendors SET phone_number=$1 WHERE id=$2`,
      [DEMO.vendorPhone, v.rows[0].id],
    );
    note('Vendor exists', { id: v.rows[0].id, name: DEMO.vendorName, phone: DEMO.vendorPhone });
    return v.rows[0].id;
  }
  const ins = await c.query(
    `INSERT INTO vendors (factory_id, name, phone_number, address, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, 'Faridabad Industrial Area', true, NOW(), NOW()) RETURNING id`,
    [FACTORY, DEMO.vendorName, DEMO.vendorPhone],
  );
  note('Created vendor', { id: ins.rows[0].id, name: DEMO.vendorName });
  return ins.rows[0].id;
}

async function ensureInventory(ownerId) {
  let cat = await c.query(
    `SELECT id, name FROM inventory_categories WHERE factory_id=$1 AND LOWER(name)='raw materials'`,
    [FACTORY],
  );
  let catId;
  if (!cat.rows.length) {
    const ins = await c.query(
      `INSERT INTO inventory_categories (factory_id, name, description, is_active, created_at, updated_at)
       VALUES ($1, 'Raw Materials', 'Demo raw materials', true, NOW(), NOW()) RETURNING id`,
      [FACTORY],
    );
    catId = ins.rows[0].id;
    note('Created category', { id: catId, name: 'Raw Materials' });
  } else {
    catId = cat.rows[0].id;
  }

  let loc = await c.query(
    `SELECT id FROM inventory_locations WHERE factory_id=$1 AND LOWER(name)='main warehouse'`,
    [FACTORY],
  );
  let locId;
  if (!loc.rows.length) {
    const ins = await c.query(
      `INSERT INTO inventory_locations (factory_id, name, created_at, updated_at)
       VALUES ($1, 'Main Warehouse', NOW(), NOW()) RETURNING id`,
      [FACTORY],
    );
    locId = ins.rows[0].id;
    note('Created location', { id: locId, name: 'Main Warehouse' });
  } else {
    locId = loc.rows[0].id;
  }

  let item = await c.query(
    `SELECT id, current_quantity FROM inventory_items WHERE factory_id=$1 AND sku=$2`,
    [FACTORY, DEMO.steelSku],
  );
  if (!item.rows.length) {
    const ins = await c.query(
      `INSERT INTO inventory_items (
         factory_id, name, sku, category_id, location_id, unit, current_quantity,
         reorder_threshold, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'sheets', 120, 20, true, NOW(), NOW())
       RETURNING id, current_quantity`,
      [FACTORY, DEMO.steelItem, DEMO.steelSku, catId, locId],
    );
    note('Created steel sheets item', ins.rows[0]);
    return ins.rows[0].id;
  }
  note('Steel sheets item exists', item.rows[0]);
  return item.rows[0].id;
}

try {
  const ownerId = await ensureOwner();
  const managerId = await ensureManager(ownerId);
  const opsId = await ensureDepartment('Operations', managerId);
  await ensureDepartment('Sales', null);
  const invDeptId = await ensureDepartment('Inventory', ownerId);
  await ensureWorker(managerId, opsId);
  const vendorId = await ensureVendor();
  const itemId = await ensureInventory(ownerId);

  const summary = {
    owner: { phone: DEMO.ownerPhone, userId: ownerId },
    manager: { phone: DEMO.managerPhone, userId: managerId },
    departments: { operations: opsId, inventory: invDeptId },
    vendor: { id: vendorId, name: DEMO.vendorName },
    inventory: { id: itemId, name: DEMO.steelItem, sku: DEMO.steelSku },
    log,
  };

  console.log('\n=== DEMO SETUP COMPLETE ===');
  console.log(JSON.stringify(summary, null, 2));
} catch (e) {
  console.error('Setup failed', e);
  process.exit(1);
} finally {
  await c.end();
}
