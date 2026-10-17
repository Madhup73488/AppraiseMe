export const SCHEMA_VERSION = 1

export const postgresMigration = `
-- worklog_meta
CREATE TABLE IF NOT EXISTS worklog_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO worklog_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')
  ON CONFLICT (key) DO NOTHING;

-- work_entries
CREATE TABLE IF NOT EXISTS work_entries (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  project_id UUID,
  content TEXT NOT NULL,
  content_plain TEXT,
  entry_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  importance SMALLINT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMPTZ NOT NULL,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  ai_summary TEXT,
  ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_work_entries_owner_occurred
  ON work_entries(owner_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_entries_project_occurred
  ON work_entries(project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_entries_type
  ON work_entries(owner_id, entry_type);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id UUID NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entry_id, tag_id)
);

-- entry_impacts
CREATE TABLE IF NOT EXISTS entry_impacts (
  id UUID PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_name TEXT,
  metric_before NUMERIC,
  metric_after NUMERIC,
  metric_unit TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  importance SMALLINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'user',
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS achievement_entries (
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  relevance NUMERIC,
  PRIMARY KEY(achievement_id, entry_id)
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  date_from TIMESTAMPTZ NOT NULL,
  date_to TIMESTAMPTZ NOT NULL,
  style TEXT NOT NULL DEFAULT 'balanced',
  status TEXT NOT NULL DEFAULT 'draft',
  content_markdown TEXT,
  content_json JSONB,
  ai_provider TEXT,
  ai_model TEXT,
  prompt_version TEXT,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_claims (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS report_evidence (
  claim_id UUID NOT NULL REFERENCES report_claims(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  relevance NUMERIC,
  PRIMARY KEY(claim_id, entry_id)
);

-- entry_embeddings
CREATE TABLE IF NOT EXISTS entry_embeddings (
  entry_id UUID NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding BYTEA,
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(entry_id, model)
);
`
