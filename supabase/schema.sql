--- 001_initial_schema.sql — Enums + Core Tables
--- Multi-tenant schema for Direktor

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

--- ENUM TYPES
create type user_role as enum ('owner', 'receptionist', 'manager', 'staff', 'customer');
create type user_status as enum ('active', 'inactive', 'invited');

create type appointment_status as enum
  ('pending', 'confirmed', 'arrived', 'in-service', 'completed', 'cancelled', 'no-show');

create type booking_source as enum ('receptionist', 'customer', 'whatsapp', 'ai', 'owner');
create type confirmation_status as enum ('pending', 'confirmed', 'cancelled');

create type payment_method as enum ('cash', 'card', 'upi', 'online', 'other');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

create type conversation_status as enum
  ('needs-action', 'waiting', 'booked', 'reschedule', 'payment', 'feedback');
create type conversation_channel as enum ('whatsapp', 'sms', 'email');
create type message_sender as enum ('customer', 'ai', 'staff', 'receptionist');

create type campaign_status as enum ('draft', 'approved', 'sending', 'sent', 'failed');
create type campaign_channel as enum ('whatsapp', 'sms', 'email');

create type insight_type as enum
  ('churn', 'staffing', 'revenue', 'reactivation', 'no-show', 'demand',
   'inventory', 'campaign', 'overdue_customer');
create type insight_severity as enum ('low', 'medium', 'high', 'critical');
create type insight_status as enum ('active', 'resolved', 'dismissed');

create type action_status as enum ('pending', 'completed', 'dismissed', 'expired');

--- CORE TABLES

create table salons (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tagline      text,
  address      text,
  phone        text,
  email        text,
  currency     text default '₹',
  timezone     text default 'Asia/Kolkata',
  open_hour    integer default 10,
  close_hour   integer default 21,
  plan         text default 'Growth',
  logo_url     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table salon_members (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid references salons on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  role       user_role not null,
  status     user_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (salon_id, user_id)
);--- 002_business_tables.sql — Part 1: Staff, Customers, Services, Appointments

create table staff (
  id                  uuid primary key default gen_random_uuid(),
  salon_id            uuid references salons on delete cascade not null,
  profile_id          uuid references profiles on delete set null,
  name                text not null,
  phone               text,
  email               text,
  role                text not null,
  specialization      text,
  avatar_url          text,
  color               text,
  commission_pct      numeric(5,2) default 0,
  status              user_status default 'active',
  rating              numeric(3,2),
  review_count        integer default 0,
  working_hours       jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table customers (
  id                    uuid primary key default gen_random_uuid(),
  salon_id                uuid references salons on delete cascade not null,
  profile_id              uuid references profiles on delete set null,
  name                    text not null,
  phone                   text,
  email                   text,
  gender                  text,
  language                text,
  birthday                date,
  preferred_stylist_id    uuid references staff on delete set null,
  preferred_time          text,
  preferred_service_ids   uuid[],
  typical_interval_days   integer,
  lifetime_value          numeric(10,2) default 0,
  visit_count             integer default 0,
  attendance_pct          integer,
  last_visit_at           timestamptz,
  tags                    text[],
  notes                   text,
  source                  text default 'manual',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create table services (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid references salons on delete cascade not null,
  name         text not null,
  description  text,
  category     text not null,
  duration_min integer not null,
  price        numeric(10,2) not null,
  is_active    boolean default true,
  image_url    text,
  rating       numeric(3,2),
  book_count   integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table service_staff (
  salon_id   uuid references salons on delete cascade not null,
  staff_id   uuid references staff on delete cascade not null,
  service_id uuid references services on delete cascade not null,
  primary key (staff_id, service_id)
);

create table appointments (
  id               uuid primary key default gen_random_uuid(),
  salon_id         uuid references salons on delete cascade not null,
  customer_id      uuid references customers on delete restrict not null,
  staff_id         uuid references staff on delete set null,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  duration_min     integer,
  price            numeric(10,2),
  status           appointment_status default 'pending',
  source           booking_source default 'receptionist',
  confirmation     confirmation_status default 'pending',
  notes            text,
  created_by       uuid references profiles on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table appointment_services (
  appointment_id uuid references appointments on delete cascade not null,
  service_id     uuid references services on delete cascade not null,
  primary key (appointment_id, service_id)
);--- 003_business_tables.sql — Part 2: Payments, Conversations, Messages, Campaigns, AI, Audit

create table payments (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid references salons on delete cascade not null,
  appointment_id  uuid references appointments on delete set null,
  customer_id     uuid references customers on delete set null,
  amount          numeric(10,2) not null,
  method          payment_method,
  status          payment_status default 'pending',
  transaction_ref   text,
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

create table conversations (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid references salons on delete cascade not null,
  customer_id    uuid references customers on delete set null,
  channel        conversation_channel default 'whatsapp',
  status         conversation_status default 'waiting',
  last_message   text,
  last_at        timestamptz,
  ai_suggestion  text,
  unread         integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade not null,
  sender          message_sender not null,
  text            text,
  sent_at         timestamptz default now()
);

create table campaigns (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid references salons on delete cascade not null,
  name            text not null,
  objective       text,
  audience_desc   text,
  message         text,
  channel         campaign_channel not null,
  status          campaign_status default 'draft',
  target_count    integer,
  sent_count      integer default 0,
  approved_by     uuid references profiles on delete set null,
  created_at      timestamptz default now(),
  sent_at         timestamptz
);

create table ai_insights (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid references salons on delete cascade not null,
  type          insight_type not null,
  severity      insight_severity not null,
  title         text not null,
  description   text,
  recommendation text,
  entity_type   text,
  entity_id     uuid,
  status        insight_status default 'active',
  created_at    timestamptz default now(),
  resolved_at   timestamptz
);

create table ai_actions (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid references salons on delete cascade not null,
  type            text not null,
  title           text not null,
  description     text,
  recommendation  text,
  entity_type     text,
  entity_id       uuid,
  estimated_value numeric(10,2),
  status          action_status default 'pending',
  created_at      timestamptz default now(),
  completed_at    timestamptz,
  completed_by    uuid references profiles on delete set null
);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid references salons on delete cascade not null,
  user_id     uuid references profiles on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz default now()
);--- 003_indexes.sql — Performance indexes

create index if not exists idx_profiles_id on profiles (id);
create index if not exists idx_salon_members_user on salon_members (user_id);
create index if not exists idx_salon_members_salon on salon_members (salon_id);
create index if not exists idx_customers_salon on customers (salon_id);
create index if not exists idx_customers_phone on customers (salon_id, phone);
create index if not exists idx_customers_last_visit on customers (salon_id, last_visit_at desc);
create index if not exists idx_customers_ltv on customers (salon_id, lifetime_value desc);
create index if not exists idx_staff_salon on staff (salon_id);
create index if not exists idx_services_salon on services (salon_id);
create index if not exists idx_appointments_salon_start on appointments (salon_id, start_time);
create index if not exists idx_appointments_salon_status on appointments (salon_id, status);
create index if not exists idx_appointments_customer on appointments (salon_id, customer_id);
create index if not exists idx_appointments_staff on appointments (salon_id, staff_id);
create index if not exists idx_payments_salon on payments (salon_id);
create index if not exists idx_conversations_salon on conversations (salon_id);
create index if not exists idx_conversations_customer on conversations (salon_id, customer_id);
create index if not exists idx_campaigns_salon on campaigns (salon_id);
create index if not exists idx_ai_insights_salon on ai_insights (salon_id, status);
create index if not exists idx_ai_actions_salon on ai_actions (salon_id, status);
create index if not exists idx_audit_salon on audit_logs (salon_id);--- 004_rls_policies.sql — Row Level Security setup + security-definer helper functions

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

-- Security-definer helpers (prevent infinite RLS recursion)
create or replace function get_user_salon_id()
returns uuid language sql security definer set search_path=public stable as
$$ select sm.salon_id from public.salon_members sm where sm.user_id = auth.uid() and sm.status='active' limit 1 $$;

create or replace function user_can_access_salon(target_salon uuid)
returns boolean language sql security definer set search_path=public stable as
$$ select exists(select 1 from public.salon_members sm where sm.user_id=auth.uid() and sm.salon_id=target_salon and sm.status='active') $$;

create or replace function get_user_role()
returns text language sql security definer set search_path=public stable as
$$ select sm.role::text from public.salon_members sm where sm.user_id=auth.uid() and sm.status='active' limit 1 $$;

grant execute on function get_user_salon_id() to authenticated, anon;
grant execute on function user_can_access_salon(uuid) to authenticated, anon;
grant execute on function get_user_role() to authenticated, anon;-- ============================================================
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