-- Munshi core operational schema (users, factories, tasks, attendance, org)
-- Required before 001_traderos_foundation.sql on a fresh database (e.g. Supabase).
-- Idempotent: uses IF NOT EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  profile_picture VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factory_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  factory_id INTEGER NOT NULL,
  role VARCHAR(255) NOT NULL,
  doj DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factory_users_factory_id ON factory_users (factory_id);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  manager_user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_departments_factory_slug UNIQUE (factory_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_factory_id ON departments (factory_id);

CREATE TABLE IF NOT EXISTS department_workers (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_workers_department_id
  ON department_workers (department_id);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  assigned_to INTEGER NOT NULL,
  assigned_by INTEGER NOT NULL,
  description TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  deadline_breach_reminded_at TIMESTAMPTZ,
  routing_status VARCHAR(255),
  owner_id INTEGER,
  department_id INTEGER,
  completed_by INTEGER,
  rejected_by INTEGER,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_factory_id ON tasks (factory_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);

CREATE TABLE IF NOT EXISTS task_updates (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates (task_id);

CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_factory_id ON issues (factory_id);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  factory_id INTEGER NOT NULL,
  date DATE NOT NULL,
  is_present BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attendance_user_factory_date UNIQUE (user_id, factory_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_factory_date ON attendance (factory_id, date);

COMMIT;
