export const SCHEMA_VERSION = 1

export const tursoMigration = `
-- worklog_meta
CREATE TABLE IF NOT EXISTS worklog_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO worklog_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');

-- work_entries
CREATE TABLE IF NOT EXISTS work_entries (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  project_id TEXT,
  content TEXT NOT NULL,
  content_plain TEXT,
  entry_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  importance INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  occurred_at TEXT NOT NULL,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  ai_summary TEXT,
  ai_metadata TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  device_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_work_entries_owner_occurred
  ON work_entries(owner_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_entries_project_occurred
  ON work_entries(project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_entries_type
  ON work_entries(owner_id, entry_type);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT,
  ended_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, name)
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS entry_impacts (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_name TEXT,
  metric_before REAL,
  metric_after REAL,
  metric_unit TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  confidence REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  importance INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT,
  completed_at TEXT,
  source TEXT NOT NULL DEFAULT 'user',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS achievement_entries (
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  relevance REAL,
  PRIMARY KEY(achievement_id, entry_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'balanced',
  status TEXT NOT NULL DEFAULT 'draft',
  content_markdown TEXT,
  content_json TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  prompt_version TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS report_claims (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_evidence (
  claim_id TEXT NOT NULL REFERENCES report_claims(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  relevance REAL,
  PRIMARY KEY(claim_id, entry_id)
);

CREATE TABLE IF NOT EXISTS entry_embeddings (
  entry_id TEXT NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedding BLOB,
  content_hash TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id, model)
);
`
