-- Owners may head multiple departments (interim) until a line manager is assigned.
-- Managers remain one department head per user (enforced in application code).

ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS uq_departments_factory_manager;
