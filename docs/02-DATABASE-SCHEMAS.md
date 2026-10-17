# Database Schemas

There are two databases with intentionally different responsibilities.

# Part A --- Our SaaS Control Plane (Supabase PostgreSQL)

## 1. `profiles`

Supabase Auth remains the identity source. `profiles` stores application
profile data.

```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 2. `accounts`

Even if V1 is primarily individual users, account boundaries make
billing/team evolution safer.

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 3. `account_members`

```sql
create table account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
```

## 4. `subscriptions`

```sql
create table subscriptions (
  account_id uuid primary key references accounts(id) on delete cascade,
  provider text not null default 'stripe',
  customer_id text,
  subscription_id text,
  price_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
```

Do not use the subscription table alone for authorization. Derive
explicit entitlements.

## 5. `entitlements`

```sql
create table entitlements (
  account_id uuid not null references accounts(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  limit_value bigint,
  updated_at timestamptz not null default now(),
  primary key (account_id, feature_key)
);
```

## 6. `user_preferences`

```sql
create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_id text not null default 'worklog',
  density text not null default 'comfortable',
  week_starts_on smallint not null default 1,
  default_report_style text not null default 'balanced',
  advanced_ai_settings boolean not null default false,
  telemetry_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
```

## 7. `devices`

```sql
create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null,
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

## 8. `credentials`

One generic encrypted-secret table reduces duplication.

```sql
create table credentials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('database','ai')),
  encrypted_payload bytea not null,
  encryption_key_version text not null,
  encryption_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);
```

Rules: - never log `encrypted_payload` or decrypted values -
encryption/decryption occurs only in trusted server/native security
boundary - use envelope encryption/KMS - support `device_only` mode
where no cloud credential row is created

## 9. `data_connections`

```sql
create table data_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  provider text not null,
  engine text not null,
  credential_id uuid references credentials(id) on delete set null,
  credential_mode text not null check (credential_mode in ('cloud_encrypted','device_only')),
  non_secret_config jsonb not null default '{}'::jsonb,
  schema_version integer,
  status text not null default 'unverified',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`non_secret_config` may include safe fields such as provider project
reference or display hostname, but never passwords/tokens.

## 10. `ai_connections`

```sql
create table ai_connections (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  provider text not null,
  credential_id uuid references credentials(id) on delete set null,
  credential_mode text not null check (credential_mode in ('cloud_encrypted','device_only')),
  base_url text,
  default_model text,
  enrichment_model text,
  report_model text,
  embedding_model text,
  enabled boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 11. `security_events`

Store metadata only.

```sql
create table security_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Never place API keys, DB URLs containing passwords, note content,
prompts or work-report content in this table.

## RLS

Every account-scoped table must enforce membership. Do not trust
`account_id` supplied by the client. Use RLS policies based on
`auth.uid()` membership.

Privileged service credentials must never ship to browser/Desktop
bundles.

---

# Part B --- Customer-Owned Work Database

This is the canonical relational model. PostgreSQL-family adapters use
it directly; SQLite/Turso use equivalent types.

## 1. `worklog_meta`

```sql
create table worklog_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
```

Store `schema_version`, installation id and compatible feature flags.

## 2. `work_entries`

```sql
create table work_entries (
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

create index idx_work_entries_owner_occurred
  on work_entries(owner_id, occurred_at desc);

create index idx_work_entries_project_occurred
  on work_entries(project_id, occurred_at desc);

create index idx_work_entries_type
  on work_entries(owner_id, entry_type);
```

`owner_id` is an opaque stable identifier from the app. Avoid coupling
customer data to Supabase-specific UUID semantics.

## 3. `projects`

```sql
create table projects (
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
```

Add the FK from `work_entries.project_id` where the target engine/setup
supports it.

## 4. `tags` and `entry_tags`

```sql
create table tags (
  id uuid primary key,
  owner_id text not null,
  name text not null,
  created_at timestamptz not null,
  unique(owner_id, name)
);

create table entry_tags (
  entry_id uuid not null references work_entries(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key(entry_id, tag_id)
);
```

## 5. `entry_impacts`

```sql
create table entry_impacts (
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
```

AI must never invent numeric metrics. AI-derived impacts should be
labeled and editable.

## 6. `achievements`

```sql
create table achievements (
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

create table achievement_entries (
  achievement_id uuid not null references achievements(id) on delete cascade,
  entry_id uuid not null references work_entries(id) on delete cascade,
  relevance numeric,
  primary key(achievement_id, entry_id)
);
```

## 7. `reports`

```sql
create table reports (
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
```

## 8. `report_claims` and evidence

Do not merely link a report to all entries. Preserve evidence at
claim/section level.

```sql
create table report_claims (
  id uuid primary key,
  report_id uuid not null references reports(id) on delete cascade,
  section_key text not null,
  claim_text text not null,
  sort_order integer not null,
  created_at timestamptz not null
);

create table report_evidence (
  claim_id uuid not null references report_claims(id) on delete cascade,
  entry_id uuid not null references work_entries(id) on delete cascade,
  relevance numeric,
  primary key(claim_id, entry_id)
);
```

## 9. Embeddings

Keep embeddings optional because not every destination supports the same
vector facilities.

```text
entry_embeddings
- entry_id
- model
- dimensions
- embedding / provider-specific vector representation
- content_hash
- created_at
```

The `SearchRepository` decides whether semantic search is available. The
product must still work without embeddings.

## 10. Local desktop tables

Desktop SQLite additionally owns operational tables that do not need to
sync:

```text
sync_outbox
sync_state
local_drafts
local_credentials_refs
cache_metadata
```

Do not confuse local operational state with canonical user work data.

## Migration rules

- migrations are immutable after release
- migrations are versioned per engine
- migrations are idempotent where setup requires reruns
- destructive changes require explicit migration strategy
- adapter must expose current schema version
- app blocks incompatible writes and offers a migration flow
- backup/export guidance before destructive migration
