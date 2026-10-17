-- ============================================================
-- Worklog AI — Control Plane Schema (Supabase PostgreSQL)
-- Migration 00001: Initial tables
-- ============================================================

-- 1. profiles
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. accounts
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. account_members
create table if not exists account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

-- 4. subscriptions
create table if not exists subscriptions (
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

-- 5. entitlements
create table if not exists entitlements (
  account_id uuid not null references accounts(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  limit_value bigint,
  updated_at timestamptz not null default now(),
  primary key (account_id, feature_key)
);

-- 6. user_preferences
create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme_id text not null default 'appraiseme',
  density text not null default 'comfortable',
  week_starts_on smallint not null default 1,
  default_report_style text not null default 'balanced',
  advanced_ai_settings boolean not null default false,
  telemetry_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 7. devices
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null,
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- 8. credentials (encrypted secrets)
create table if not exists credentials (
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

-- 9. data_connections
create table if not exists data_connections (
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

-- 10. ai_connections
create table if not exists ai_connections (
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

-- 11. security_events
create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table accounts enable row level security;
alter table account_members enable row level security;
alter table subscriptions enable row level security;
alter table entitlements enable row level security;
alter table user_preferences enable row level security;
alter table devices enable row level security;
alter table credentials enable row level security;
alter table data_connections enable row level security;
alter table ai_connections enable row level security;
alter table security_events enable row level security;

-- Helper: user is a member of account
create or replace function is_account_member(check_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from account_members
    where account_id = check_account_id
    and user_id = auth.uid()
  );
$$;

-- profiles: users can CRUD their own profile
create policy "Users can view own profile"
  on profiles for select
  using (user_id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert
  with check (user_id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- accounts: visible to members
create policy "Members can view account"
  on accounts for select
  using (is_account_member(id));

-- account_members: visible to account members
create policy "Members can view memberships"
  on account_members for select
  using (is_account_member(account_id));

-- subscriptions: visible to account members
create policy "Members can view subscriptions"
  on subscriptions for select
  using (is_account_member(account_id));

-- entitlements: visible to account members
create policy "Members can view entitlements"
  on entitlements for select
  using (is_account_member(account_id));

-- user_preferences: users can CRUD their own
create policy "Users can view own preferences"
  on user_preferences for select
  using (user_id = auth.uid());

create policy "Users can insert own preferences"
  on user_preferences for insert
  with check (user_id = auth.uid());

create policy "Users can update own preferences"
  on user_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- devices: users can manage their own
create policy "Users can view own devices"
  on devices for select
  using (user_id = auth.uid());

create policy "Users can insert own devices"
  on devices for insert
  with check (user_id = auth.uid());

create policy "Users can update own devices"
  on devices for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own devices"
  on devices for delete
  using (user_id = auth.uid());

-- credentials: account members can view metadata
create policy "Members can view credentials"
  on credentials for select
  using (is_account_member(account_id));

-- data_connections: account members can view
create policy "Members can view data connections"
  on data_connections for select
  using (is_account_member(account_id));

-- ai_connections: account members can view
create policy "Members can view ai connections"
  on ai_connections for select
  using (is_account_member(account_id));

-- security_events: account members can view
create policy "Members can view security events"
  on security_events for select
  using (is_account_member(account_id));

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on profiles
  for each row execute function update_updated_at();

create trigger set_updated_at_accounts
  before update on accounts
  for each row execute function update_updated_at();

create trigger set_updated_at_subscriptions
  before update on subscriptions
  for each row execute function update_updated_at();

create trigger set_updated_at_entitlements
  before update on entitlements
  for each row execute function update_updated_at();

create trigger set_updated_at_user_preferences
  before update on user_preferences
  for each row execute function update_updated_at();

create trigger set_updated_at_credentials
  before update on credentials
  for each row execute function update_updated_at();

create trigger set_updated_at_data_connections
  before update on data_connections
  for each row execute function update_updated_at();

create trigger set_updated_at_ai_connections
  before update on ai_connections
  for each row execute function update_updated_at();
