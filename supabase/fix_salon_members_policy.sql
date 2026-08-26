-- ============================================================
-- fix_salon_members_policy.sql — Fix infinite recursion on salon_members
-- FIXED to be idempotent (safe to run multiple times)
--
-- Problem: the SELECT policy on salon_members queries salon_members itself:
--   using (exists (select 1 from public.salon_members sm ...))
-- This triggers infinite recursion (error 500 / 'infinite recursion detected').
--
-- FIX: Use a SECURITY DEFINER helper function instead of self-referencing.
-- ============================================================

-- Helper: does the current user belong to the same salon?
drop function if exists is_custom_member_of(uuid) cascade;
create or replace function is_custom_member_of(p_salon uuid)
returns boolean language sql security definer set search_path=public stable as
$$ select exists(select 1 from public.salon_members sm where sm.user_id = auth.uid() and sm.salon_id = p_salon and sm.status = 'active') $$;

grant execute on function is_custom_member_of(uuid) to authenticated, anon;

-- Drop ALL existing policies on salon_members (including the ones created by
-- fix_rls_recursion.sql: salon_members_update + salon_members_delete).
-- The list includes every name variant used across migrations.
drop policy if exists "salon_members_select" on salon_members;
drop policy if exists "salon_members_update" on salon_members;
drop policy if exists "salon_members_delete" on salon_members;
drop policy if exists "salon_members_insert" on salon_members;
drop policy if exists "salon_members crud" on salon_members;
drop policy if exists "salon_members select" on salon_members;
drop policy if exists "salon_members all" on salon_members;

-- Recreate with non-recursive helper
create policy "salon_members_select" on salon_members
  for select using (public.is_custom_member_of(salon_id));

create policy "salon_members_insert" on salon_members
  for insert with check (public.get_user_role_in(salon_id) = 'owner');

create policy "salon_members_update" on salon_members
  for update using (public.is_custom_member_of(salon_id) and public.get_user_role_in(salon_id) = 'owner')
  with check (public.get_user_role_in(salon_id) = 'owner');

create policy "salon_members_delete" on salon_members
  for delete using (public.is_custom_member_of(salon_id) and public.get_user_role_in(salon_id) = 'owner');

-- Verify: users can now read their own membership without recursion
select count(*) from public.salon_members;