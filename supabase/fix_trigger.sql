-- fix_trigger.sql — Fix the profile auto-create trigger if signup fails
-- with "Database error creating new user"
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_metadata ->> 'full_name', new.email),
    now(), now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

select tgname from pg_trigger where tgname = 'on_auth_user_created';