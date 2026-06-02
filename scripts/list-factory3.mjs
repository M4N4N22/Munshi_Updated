import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://munshi:munshi@65.1.128.181:5431/munshi_data',
});
await c.connect();
const users = await c.query(`
  SELECT u.id, u.name, u.phone_number, fu.role
  FROM users u
  JOIN factory_users fu ON fu.user_id = u.id
  WHERE fu.factory_id = 3
  ORDER BY u.name
`);
const tasks = await c.query(`
  SELECT id, assigned_to, assigned_by, description, routing_status
  FROM tasks WHERE factory_id = 3
  ORDER BY id DESC LIMIT 15
`);
console.log('users', users.rows);
console.log('tasks', tasks.rows);
await c.end();
