-- Task inventory lines (Phase 0.1 foundation)
-- Links tasks to inventory items for expected/completed stock movements.
-- Apply after 009_owner_multi_department_head.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS task_inventory_lines (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  inventory_item_id INTEGER NOT NULL,
  quantity_expected NUMERIC(18, 4) NOT NULL,
  quantity_completed NUMERIC(18, 4) NOT NULL DEFAULT 0,
  movement_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_inventory_lines_task_id
  ON task_inventory_lines (task_id);

CREATE INDEX IF NOT EXISTS idx_task_inventory_lines_inventory_item_id
  ON task_inventory_lines (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_task_inventory_lines_factory_id
  ON task_inventory_lines (factory_id);

COMMIT;
