-- ============================================================
-- 007_clerk_authentication.sql
-- Migrate Direktor identity from Supabase Auth → Clerk.
--
-- KEY IDEA
--   Clerk is now the identity provider. Supabase keeps storing application
--   data. RLS reads the authenticated user's Clerk ID from the session token
--   (auth.jwt() ->> 'user_id' / 'sub') instead of Supabase's auth.uid().
--
--   `profiles.clerk_id` maps a Clerk user → application profile → role.
-- ============================================================

-- ---------- STEP 1. Decouple `profiles` from Supabase Auth ----------
-- profiles.id stays an internal UUID primary key (unchanged FKs stay valid),
-- but it no longer references auth.users.
alter table public.profiles drop constraint if exists "profiles_id_fkey";

-- New Clerk users are not Supabase Auth users. profiles.id now defaults to a
-- fresh generator. Existing rows are untouched.
alter table public.profiles alter column id set default gen_random_uuid();

-- Add the Clerk → profile mapping (single, unique, nullable so existing rows
-- migrate safely).
alter table public.profiles add column if not exists clerk_id text;
create unique index if not exists idx_profiles_clerk_id
  on public.profiles (clerk_id)
  where clerk_id is not null;

-- ---------- STEP 2. Repoint salon_members.user_id ----------
alter table public.salon_members drop constraint if exists "salon_members_user_id_fkey";
alter table public.salon_members
  add constraint salon_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ---------- STEP 3. RLS helper: resolve current Clerk user id ----------
create or replace function public.current_clerk_id()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(nullif(auth.jwt() ->> 'user_id', ''), nullif(auth.jwt() ->> 'sub', ''))
$$;

grant execute on function public.current_clerk_id() to authenticated, anon;

-- ---------- STEP 4. Rebuild the SECURITY DEFINER salon-context helpers ----------
-- Old versions were bound to auth.uid() (a Supabase concept). Now they resolve
-- Clerk identity → profiles.clerk_id → salon_members.
drop function if exists public.get_user_salon_id() cascade;
drop function if exists public.get_user_role_in(uuid) cascade;
drop function if exists public.user_can_access_salon(uuid) cascade;
drop function if exists public.get_user_role() cascade;
drop function if exists public.is_custom_member_of(uuid) cascade;

create or replace function public.get_user_salon_id()
returns uuid language sql security definer set search_path = public stable as
$$
  select sm.salon_id
  from public.salon_members sm
  join public.profiles p on p.id = sm.user_id
  where p.clerk_id = public.current_clerk_id()
    and sm.status = 'active'
  limit 1
$$;

create or replace function public.get_user_role()
returns text language sql security definer set search_path = public stable as
$$
  select sm.role::text
  from public.salon_members sm
  join public.profiles p on p.id = sm.user_id
  where p.clerk_id = public.current_clerk_id()
    and sm.status = 'active'
  limit 1
$$;

create or replace function public.get_user_role_in(p_salon uuid)
returns text language sql security definer set search_path = public stable as
$$
  select sm.role::text
  from public.salon_members sm
  join public.profiles p on p.id = sm.user_id
  where p.clerk_id = public.current_clerk_id()
    and sm.salon_id = p_salon
    and sm.status = 'active'
  limit 1
$$;

-- ---------- STEP 5? Actually STEP 4 continued: user_can_access_salon & is_custom_member_of
create or replace function public.user_can_access_salon(target_salon uuid)
returns boolean language sql security definer set search_path = public stable as
$$
  select exists(
    select 1
    from public.salon_members sm
    join public.profiles p on p.id = sm.user_id
    where p.clerk_id = public.current_clerk_id()
      and sm.salon_id = target_salon
      and sm.status = 'active'
  )
$$;

create or replace function public.is_custom_member_of(p_salon uuid)
returns boolean language sql security definer set search_path = public stable as
$$
  select exists(
    select 1
    from public.salon_members sm
    join public.profiles p on p.id = sm.user_id
    where p.clerk_id = public.current_clerk_id()
      and sm.salon_id = p_salon
      and sm.status = 'active'
  )
$$;

grant execute on function public.get_user_salon_id() to authenticated, anon;
grant execute on function public.get_user_role_in(uuid) to authenticated, anon;
grant execute on function public.user_can_access_salon(uuid) to authenticated, anon;
grant execute on function public.get_user_role() to authenticated, anon;
grant execute on function public.is_custom_member_of(uuid) to authenticated, anon;

-- ---------- STEP 5. profiles RLS: own row via Clerk id ----------
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (clerk_id = public.current_clerk_id());

create policy "profiles_insert" on public.profiles
  for insert with check (clerk_id = public.current_clerk_id());

create policy "profiles_update" on public.profiles
  for update using (clerk_id = public.current_clerk_id())
  with check (clerk_id = public.current_clerk_id());

create policy "profiles_delete" on public.profiles
  for delete using (clerk_id = public.current_clerk_id());

-- ---------- STEP 6. salon owner gates via Clerk ----------
drop policy if exists "salons_select" on public.salons;
drop policy if exists "salons_insert_owner" on public.salons;
drop policy if exists "salons_update_owner" on public.salons;
drop policy if exists "salons_delete_owner" on public.salons;

-- A salon member may read the salon. Owners may update/delete.
create policy "salons_select" on public.salons
  for select using (public.user_can_access_salon(id));

create policy "salons_update_owner" on public.salons
  for update using (public.get_user_role_in(id) = 'owner')
  with check (public.get_user_role_in(id) = 'owner');

create policy "salons_delete_owner" on public.salons
  for delete using (public.get_user_role_in(id) = 'owner');

-- NOTE: deliberately NO `salons_insert_owner with check (true)` here.
-- First-time provisioning runs server-side onboarding (service-role) — never through an
-- unauthenticated/anon token. This removes the
-- "new row violates row-level security policy for table salons" error for good.

-- ---------- STEP 7. salon_members: secure CRUD via Clerk helpers ----------
drop policy if exists "salon_members_select" on public.salon_members;
drop policy if exists "salon_members_insert" on public.salon_members;
drop policy if exists "salon_members_update" on public.salon_members;
drop policy if exists "salon_members_delete" on public.salon_members;
drop policy if exists "salon_members_select_own" on public.salon_members;

create policy "salon_members_select" on public.salon_members
  for select using (public.is_custom_member_of(salon_id));

create policy "salon_members_insert" on public.salon_members
  for insert with check (
    public.get_user_role_in(salon_id) = 'owner'
    or public.current_clerk_id() = (select p.clerk_id from public.profiles p where p.id = user_id)
  );

create policy "salon_members_update" on public.salon_members
  for update using (public.is_custom_member_of(salon_id) and public.get_user_role_in(salon_id) = 'owner')
  with check (public.get_user_role_in(salon_id) = 'owner');

create policy "salon_members_delete" on public.salon_members
  for delete using (public.is_custom_member_of(salon_id) and public.get_user_role_in(salon_id) = 'owner');

-- A user can always read their own membership rows (needed for role resolution).
create policy "salon_members_select_own" on public.salon_members
  for select using (
    public.is_custom_member_of(salon_id)
    or (
      public.current_clerk_id() is not null
      and user_id in (select p.id from public.profiles p where p.clerk_id = public.current_clerk_id())
    )
  );

-- ---------- STEP 8. Profile auto-create trigger on auth.users ----------
-- Kept as a no-op for legacy Supabase-auth compatibility. New profiles are
-- created by the server-side onboarding route (service-role), never through an
-- anon/authenticated client token.