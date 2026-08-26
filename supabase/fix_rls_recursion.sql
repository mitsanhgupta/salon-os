-- ============================================================
-- fix_rls_recursion.sql — COMPLETE single-paste fix
-- Fixes:
--   1. RLS infinite recursion (error 42P17 / 406 on salon_members queries)
--   2. Broken profile auto-create trigger (signup/login fails)
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--   4. Then: npm run seed:supabase  (re-links users to salon)
--   5. Restart dev server:  npx next dev
-- ============================================================

-- STEP 1: Drop old non-security-definer helpers (CASCADE drops dependent policies)
drop function if exists public.get_user_salon_id() cascade;
drop function if exists public.get_user_role_in(uuid) cascade;
drop function if exists public.user_can_access_salon(uuid) cascade;
drop function if exists public.get_user_role() cascade;

-- STEP 2: Recreate as SECURITY DEFINER (bypasses RLS internally, no recursion)
create or replace function public.get_user_salon_id()
returns uuid language sql security definer set search_path=public stable as
$$ select sm.salon_id from public.salon_members sm where sm.user_id = auth.uid() and sm.status = 'active' limit 1 $$;

create or replace function public.get_user_role_in(p_salon uuid)
returns text language sql security definer set search_path=public stable as
$$ select sm.role::text from public.salon_members sm where sm.user_id = auth.uid() and sm.salon_id = p_salon and sm.status = 'active' limit 1 $$;

create or replace function public.user_can_access_salon(target_salon uuid)
returns boolean language sql security definer set search_path=public stable as
$$ select exists(select 1 from public.salon_members sm where sm.user_id = auth.uid() and sm.salon_id = target_salon and sm.status = 'active') $$;

create or replace function public.get_user_role()
returns text language sql security definer set search_path=public stable as
$$ select sm.role::text from public.salon_members sm where sm.user_id = auth.uid() and sm.status = 'active' limit 1 $$;

grant execute on function public.get_user_salon_id() to authenticated, anon;
grant execute on function public.get_user_role_in(uuid) to authenticated, anon;
grant execute on function public.user_can_access_salon(uuid) to authenticated, anon;
grant execute on function public.get_user_role() to authenticated, anon;

-- STEP 3: Drop ALL existing RLS policies
drop policy if exists "salon_members select" on salon_members;
drop policy if exists "salon_members all" on salon_members;
drop policy if exists "salon_members_select" on salon_members;
drop policy if exists "salon_members_insert" on salon_members;
drop policy if exists "salon_members_update" on salon_members;
drop policy if exists "salon_members_delete" on salon_members;
drop policy if exists "salons select" on salons;
drop policy if exists "salons all" on salons;
drop policy if exists "salons_select" on salons;
drop policy if exists "salons_insert_owner" on salons;
drop policy if exists "salons_update_owner" on salons;
drop policy if exists "salons_delete_owner" on salons;
drop policy if exists "profiles select" on profiles;
drop policy if exists "profiles update" on profiles;
drop policy if exists "profiles insert" on profiles;
drop policy if exists "profiles delete" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
drop policy if exists "profiles_delete" on profiles;
drop policy if exists "customers crud" on customers;
drop policy if exists "customers_crud" on customers;
drop policy if exists "staff crud" on staff;
drop policy if exists "staff_crud" on staff;
drop policy if exists "services crud" on services;
drop policy if exists "services_crud" on services;
drop policy if exists "service_staff crud" on service_staff;
drop policy if exists "service_staff_crud" on service_staff;
drop policy if exists "appointments crud" on appointments;
drop policy if exists "appointments_crud" on appointments;
drop policy if exists "appointment_services crud" on appointment_services;
drop policy if exists "appointment_services_crud" on appointment_services;
drop policy if exists "payments crud" on payments;
drop policy if exists "payments_crud" on payments;
drop policy if exists "conversations crud" on conversations;
drop policy if exists "conversations_crud" on conversations;
drop policy if exists "messages crud" on messages;
drop policy if exists "messages_crud" on messages;
drop policy if exists "campaigns crud" on campaigns;
drop policy if exists "campaigns_crud" on campaigns;
drop policy if exists "ai_insights crud" on ai_insights;
drop policy if exists "ai_insights_crud" on ai_insights;
drop policy if exists "ai_actions crud" on ai_actions;
drop policy if exists "ai_actions_crud" on ai_actions;
drop policy if exists "audit_logs crud" on audit_logs;
drop policy if exists "audit_logs_crud" on audit_logs;

-- STEP 4: Re-enable RLS
alter table profiles enable row level security;
alter table salon_members enable row level security;
alter table customers enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table service_staff enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table payments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table campaigns enable row level security;
alter table ai_insights enable row level security;
alter table ai_actions enable row level security;
alter table audit_logs enable row level security;
alter table salons enable row level security;

-- STEP 5: Create policies
create policy "salon_members_select" on salon_members for select using (exists (select 1 from public.salon_members sm where sm.user_id = auth.uid() and sm.salon_id = salon_members.salon_id and sm.status='active'));
create policy "salon_members_insert" on salon_members for insert with check (public.get_user_role_in(salon_id) = 'owner');
create policy "salon_members_update" on salon_members for update using (exists (select 1 from public.salon_members sm where sm.user_id=auth.uid() and sm.salon_id=salon_members.salon_id and sm.role='owner')) with check (public.get_user_role_in(salon_id) = 'owner');
create policy "salon_members_delete" on salon_members for delete using (exists (select 1 from public.salon_members sm where sm.user_id=auth.uid() and sm.salon_id=salon_members.salon_id and sm.role='owner'));

create policy "salons_select" on salons for select using (exists (select 1 from public.salon_members sm where sm.user_id=auth.uid() and sm.salon_id=salons.id));
create policy "salons_insert_owner" on salons for insert with check (true);
create policy "salons_update_owner" on salons for update using (public.get_user_role_in(id)='owner') with check (public.get_user_role_in(id)='owner');
create policy "salons_delete_owner" on salons for delete using (public.get_user_role_in(id)='owner');

create policy "profiles_select" on profiles for select using (id = auth.uid());
create policy "profiles_insert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete" on profiles for delete using (id = auth.uid());

create policy "customers_crud" on customers for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "staff_crud" on staff for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "services_crud" on services for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "service_staff_crud" on service_staff for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "appointments_crud" on appointments for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "appointment_services_crud" on appointment_services for all using (exists (select 1 from public.appointments a where a.id=appointment_services.appointment_id and a.salon_id=public.get_user_salon_id())) with check (exists (select 1 from public.appointments a where a.id=appointment_services.appointment_id and a.salon_id=public.get_user_salon_id()));
create policy "payments_crud" on payments for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "conversations_crud" on conversations for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "messages_crud" on messages for all using (exists (select 1 from public.conversations c where c.id=messages.conversation_id and c.salon_id=public.get_user_salon_id())) with check (exists (select 1 from public.conversations c where c.id=messages.conversation_id and c.salon_id=public.get_user_salon_id()));
create policy "campaigns_crud" on campaigns for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "ai_insights_crud" on ai_insights for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "ai_actions_crud" on ai_actions for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());
create policy "audit_logs_crud" on audit_logs for all using (salon_id = public.get_user_salon_id()) with check (salon_id = public.get_user_salon_id());

-- STEP 6: Fix signup trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (new.id, coalesce(new.raw_user_metadata->>'full_name', new.email), now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- STEP 7: Grants
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all functions in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- Verify
select tgname from pg_trigger where tgname = 'on_auth_user_created';