--- 004_rls_policies.sql — Row Level Security setup + security-definer helper functions

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
grant execute on function get_user_role() to authenticated, anon;