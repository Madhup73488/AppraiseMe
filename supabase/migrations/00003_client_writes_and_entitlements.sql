-- ============================================================
-- Worklog AI — Control Plane
-- Migration 00003: Client write policies + signup entitlements
-- ============================================================

-- data_connections: members can create/manage
create policy "Members can create data connections"
  on data_connections for insert
  with check (
    is_account_member(account_id) and created_by = auth.uid()
  );

create policy "Members can update data connections"
  on data_connections for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "Members can delete data connections"
  on data_connections for delete
  using (is_account_member(account_id));

-- ai_connections: members can create/manage
create policy "Members can create ai connections"
  on ai_connections for insert
  with check (
    is_account_member(account_id) and created_by = auth.uid()
  );

create policy "Members can update ai connections"
  on ai_connections for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "Members can delete ai connections"
  on ai_connections for delete
  using (is_account_member(account_id));

-- security_events: authenticated users may append; nobody reads via client
create policy "Authenticated can log security events"
  on security_events for insert
  with check (auth.uid() is not null);

-- ============================================================
-- Signup provisioning: also seed subscription + free entitlements
-- (supersedes handle_new_user from migration 00002)
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  -- 1. Create personal account
  insert into accounts (name, owner_user_id)
  values (coalesce(new.raw_user_meta_data->>'display_name', 'Personal'), new.id)
  returning id into new_account_id;

  -- 2. Add user as owner of the account
  insert into account_members (account_id, user_id, role)
  values (new_account_id, new.id, 'owner');

  -- 3. Create profile
  insert into profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');

  -- 4. Create default preferences
  insert into user_preferences (user_id)
  values (new.id);

  -- 5. Create active subscription row (free-only product)
  insert into subscriptions (account_id, status)
  values (new_account_id, 'active');

  -- 6. Seed fully-unlocked entitlements (free-only product; see
  -- @appraiseme/entitlements PLAN_LIMITS — flip when billing launches)
  insert into entitlements (account_id, feature_key, enabled, limit_value) values
    (new_account_id, 'entries',           true, null),
    (new_account_id, 'projects',          true, null),
    (new_account_id, 'reports',           true, null),
    (new_account_id, 'databases',         true,  3),
    (new_account_id, 'ai_enrichment',     true, null),
    (new_account_id, 'ai_reports',        true, null),
    (new_account_id, 'quarterly_reports', true, null),
    (new_account_id, 'yearly_reports',    true, null),
    (new_account_id, 'analytics_export',  true, null),
    (new_account_id, 'priority_support',  false, null);

  return new;
end;
$$;
