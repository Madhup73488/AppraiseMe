-- ============================================================
-- Worklog AI — Customer-Owned Work Database
-- Engine: SQLite (local desktop cache / standalone)
-- Migration 00001: Initial schema
-- ============================================================

-- 1. worklog_meta
create table if not exists worklog_meta (
  key text primary key,
  value text not null,
  updated_at text not null default (datetime('now'))
);

insert or ignore into worklog_meta (key, value) values ('schema_version', '1');

-- 2. work_entries
create table if not exists work_entries (
  id text primary key,
  owner_id text not null,
  project_id text,
  content text not null,
  content_plain text,
  entry_type text not null default 'other',
  status text not null default 'active',
  importance integer not null default 0,
  source text not null default 'manual',
  occurred_at text not null,
  ai_status text not null default 'pending',
  ai_summary text,
  ai_metadata text not null default '{}',
  version integer not null default 1,
  device_id text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create index if not exists idx_work_entries_owner_occurred
  on work_entries(owner_id, occurred_at desc);

create index if not exists idx_work_entries_project_occurred
  on work_entries(project_id, occurred_at desc);

create index if not exists idx_work_entries_type
  on work_entries(owner_id, entry_type);

-- 3. projects
create table if not exists projects (
  id text primary key,
  owner_id text not null,
  name text not null,
  description text,
  status text not null default 'active',
  started_at text,
  ended_at text,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

-- 4. tags
create table if not exists tags (
  id text primary key,
  owner_id text not null,
  name text not null,
  created_at text not null,
  unique(owner_id, name)
);

-- 5. entry_tags
create table if not exists entry_tags (
  entry_id text not null references work_entries(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  primary key(entry_id, tag_id)
);

-- 6. entry_impacts
create table if not exists entry_impacts (
  id text primary key,
  entry_id text not null references work_entries(id) on delete cascade,
  impact_type text not null,
  description text not null,
  metric_name text,
  metric_before real,
  metric_after real,
  metric_unit text,
  source text not null default 'user',
  confidence real,
  created_at text not null,
  updated_at text not null
);

-- 7. achievements
create table if not exists achievements (
  id text primary key,
  owner_id text not null,
  title text not null,
  description text,
  impact text,
  importance integer not null default 0,
  status text not null default 'active',
  started_at text,
  completed_at text,
  source text not null default 'user',
  version integer not null default 1,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists achievement_entries (
  achievement_id text not null references achievements(id) on delete cascade,
  entry_id text not null references work_entries(id) on delete cascade,
  relevance real,
  primary key(achievement_id, entry_id)
);

-- 8. reports
create table if not exists reports (
  id text primary key,
  owner_id text not null,
  title text not null,
  report_type text not null,
  date_from text not null,
  date_to text not null,
  style text not null default 'balanced',
  status text not null default 'draft',
  content_markdown text,
  content_json text,
  ai_provider text,
  ai_model text,
  prompt_version text,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

-- 9. report_claims and evidence
create table if not exists report_claims (
  id text primary key,
  report_id text not null references reports(id) on delete cascade,
  section_key text not null,
  claim_text text not null,
  sort_order integer not null,
  created_at text not null
);

create table if not exists report_evidence (
  claim_id text not null references report_claims(id) on delete cascade,
  entry_id text not null references work_entries(id) on delete cascade,
  relevance real,
  primary key(claim_id, entry_id)
);

-- 10. entry_embeddings (optional)
create table if not exists entry_embeddings (
  entry_id text not null references work_entries(id) on delete cascade,
  model text not null,
  dimensions integer not null,
  embedding blob,
  content_hash text not null,
  created_at text not null,
  primary key(entry_id, model)
);

-- 11. Local desktop operational tables
create table if not exists sync_outbox (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at text not null,
  updated_at text not null
);

create table if not exists sync_state (
  key text primary key,
  value text not null,
  updated_at text not null
);

create table if not exists local_drafts (
  id text primary key,
  content text not null,
  project_id text,
  entry_type text,
  created_at text not null,
  updated_at text not null
);

create table if not exists cache_metadata (
  key text primary key,
  value text not null,
  expires_at text,
  updated_at text not null
);
