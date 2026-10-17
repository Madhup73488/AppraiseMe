-- ============================================================
-- Worklog AI — Control Plane
-- Migration 00002: Auto-create profile + account + member on signup
-- ============================================================

-- When a new user signs up via Supabase Auth, automatically:
-- 1. Create a personal account
-- 2. Create an account_member (owner role)
-- 3. Create a profile row
-- 4. Create default user_preferences

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

  return new;
end;
$$;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
