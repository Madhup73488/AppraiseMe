export const SCHEMA_VERSION = 1

/**
 * One-time setup SQL for the user's own Supabase project.
 * Paste into: Supabase dashboard → SQL Editor → Run once.
 * Tables live in `public` so PostgREST can reach them; timestamps are TEXT
 * (canonical ISO) so they round-trip identically across adapters.
 */
export const SUPABASE_SETUP_SQL = `
create table if not exists worklog_meta (
  key text primary key,
  value text not null,
  updated_at text not null
);
insert into worklog_meta (key, value, updated_at)
values ('schema_version', '${SCHEMA_VERSION}', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
on conflict (key) do nothing;

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
  ai_metadata jsonb not null default '{}',
  version integer not null default 1,
  device_id text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);
create index if not exists idx_work_entries_owner_occurred
  on work_entries (owner_id, occurred_at desc);

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

create table if not exists tags (
  id text primary key,
  owner_id text not null,
  name text not null,
  created_at text not null,
  unique (owner_id, name)
);

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
  content_json jsonb,
  ai_provider text,
  ai_model text,
  prompt_version text,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

-- The app talks to these tables with a plain API key (no per-user auth
-- context), so RLS must stay OFF and the roles need CRUD grants. This makes
-- the setup safe to re-run even if RLS was toggled on in the dashboard.
alter table if exists worklog_meta disable row level security;
alter table if exists work_entries disable row level security;
alter table if exists projects disable row level security;
alter table if exists tags disable row level security;
alter table if exists achievements disable row level security;
alter table if exists reports disable row level security;

grant select, insert, update, delete on worklog_meta, work_entries, projects, tags, achievements, reports to anon;
grant select, insert, update, delete on worklog_meta, work_entries, projects, tags, achievements, reports to authenticated;
grant select, insert, update, delete on worklog_meta, work_entries, projects, tags, achievements, reports to service_role;

-- make PostgREST see the tables immediately
notify pgrst, 'reload schema';
` as const
