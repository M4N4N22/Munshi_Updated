-- Munshi Document Processing Foundation (Prompt 7)
-- Apply after migrations 001-004.

BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  factory_id INTEGER NOT NULL,
  uploaded_by INTEGER,
  document_type VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
  status VARCHAR(32) NOT NULL DEFAULT 'UPLOADED',
  file_name VARCHAR(512),
  storage_ref VARCHAR(1024),
  mime_type VARCHAR(128),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_factory_id ON documents (factory_id);
CREATE INDEX IF NOT EXISTS idx_documents_factory_status ON documents (factory_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents (document_type);

CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  factory_id INTEGER NOT NULL,
  job_type VARCHAR(64) NOT NULL DEFAULT 'EXTRACTION',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_document_id
  ON document_processing_jobs (document_id);
CREATE INDEX IF NOT EXISTS idx_document_processing_jobs_factory_id
  ON document_processing_jobs (factory_id);

CREATE TABLE IF NOT EXISTS document_extractions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  factory_id INTEGER NOT NULL,
  extraction_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  document_type_detected VARCHAR(64),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id
  ON document_extractions (document_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_factory_id
  ON document_extractions (factory_id);

CREATE TABLE IF NOT EXISTS document_suggestions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  factory_id INTEGER NOT NULL,
  extraction_id INTEGER NOT NULL,
  suggestion_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payload JSONB NOT NULL DEFAULT '{}',
  workflow_session_id INTEGER,
  rejection_reason TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_suggestions_document_id
  ON document_suggestions (document_id);
CREATE INDEX IF NOT EXISTS idx_document_suggestions_factory_status
  ON document_suggestions (factory_id, status);
CREATE INDEX IF NOT EXISTS idx_document_suggestions_type
  ON document_suggestions (suggestion_type);

COMMIT;
