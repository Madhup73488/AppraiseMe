-- ============================================================
-- Worklog AI — Customer-Owned Work Database
-- Engine: PostgreSQL (Supabase, Neon, generic)
-- Migration 00001: Initial schema
-- ============================================================

-- 1. worklog_meta
create table if not exists worklog_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into worklog_meta (key, value) values ('schema_version', '1')
on conflict (key) do nothing;

-- 2. work_entries
create table if not exists work_entries (
  id uuid primary key,
  owner_id text not null,
  project_id uuid,
  content text not null,
  content_plain text,
  entry_type text not null default 'other',
  status text not null default 'active',
  importance smallint not null default 0,
  source text not null default 'manual',
  occurred_at timestamptz not null,
  ai_status text not null default 'pending',
  ai_summary text,
  ai_metadata jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  device_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists idx_work_entries_owner_occurred
  on work_entries(owner_id, occurred_at desc);

create index if not exists idx_work_entries_project_occurred
  on work_entries(project_id, occurred_at desc);

create index if not exists idx_work_entries_type
  on work_entries(owner_id, entry_type);

-- 3. projects
create table if not exists projects (
  id uuid primary key,
  owner_id text not null,
  name text not null,
  description text,
  status text not null default 'active',
  started_at timestamptz,
  ended_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- 4. tags
create table if not exists tags (
  id uuid primary key,
  owner_id text not null,
  name text not null,
  created_at timestamptz not null,
  unique(owner_id, name)
);

-- 5. entry_tags
create table if not exists entry_tags (
  entry_id uuid not null references work_entries(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key(entry_id, tag_id)
);

-- 6. entry_impacts
create table if not exists entry_impacts (
  id uuid primary key,
  entry_id uuid not null references work_entries(id) on delete cascade,
  impact_type text not null,
  description text not null,
  metric_name text,
  metric_before numeric,
  metric_after numeric,
  metric_unit text,
  source text not null default 'user',
  confidence numeric,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- 7. achievements
create table if not exists achievements (
  id uuid primary key,
  owner_id text not null,
  title text not null,
  description text,
  impact text,
  importance smallint not null default 0,
  status text not null default 'active',
  started_at timestamptz,
  completed_at timestamptz,
  source text not null default 'user',
  version bigint not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists achievement_entries (
  achievement_id uuid not null references achievements(id) on delete cascade,
  entry_id uuid not null references work_entries(id) on delete cascade,
  relevance numeric,
  primary key(achievement_id, entry_id)
);

-- 8. reports
create table if not exists reports (
  id uuid primary key,
  owner_id text not null,
  title text not null,
  report_type text not null,
  date_from timestamptz not null,
  date_to timestamptz not null,
  style text not null default 'balanced',
  status text not null default 'draft',
  content_markdown text,
  content_json jsonb,
  ai_provider text,
  ai_model text,
  prompt_version text,
  version bigint not null default 1,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- 9. report_claims and evidence
create table if not exists report_claims (
  id uuid primary key,
  report_id uuid not null references reports(id) on delete cascade,
  section_key text not null,
  claim_text text not null,
  sort_order integer not null,
  created_at timestamptz not null
);

create table if not exists report_evidence (
  claim_id uuid not null references report_claims(id) on delete cascade,
  entry_id uuid not null references work_entries(id) on delete cascade,
  relevance numeric,
  primary key(claim_id, entry_id)
);

-- 10. entry_embeddings (optional)
create table if not exists entry_embeddings (
  entry_id uuid not null references work_entries(id) on delete cascade,
  model text not null,
  dimensions integer not null,
  embedding vector,
  content_hash text not null,
  created_at timestamptz not null,
  primary key(entry_id, model)
);
