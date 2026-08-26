-- ============================================================
-- FIX: profiles self-read under RLS (users can't read their profile)
-- ============================================================
-- Symptom: logins work, salon data (customers/appointments/services) is
-- readable, but `profiles` returns zero rows for the auth user, so
-- `getCurrentUser()` falls back to user_metadata.
--
-- Root cause: the `profiles`/`profiles` SELECT policy is missing or was
-- dropped by an earlier migration.
--
-- Paste this file into the Supabase SQL Editor and click "Run".
-- ============================================================

-- Drop any stray/broken profiles policies (ignore "does not exist")
drop policy if exists "profiles select" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles.self" on profiles;
drop policy if exists "profiles crud" on profiles;
drop policy if exists "profiles_crud" on profiles;

-- Give the user full access to their OWN profile row
create policy "profiles_select" on profiles
  for select using (id = auth.uid());

create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_delete" on profiles
  for delete using (id = auth.uid());

-- Sanity check: the owning user can read own profile