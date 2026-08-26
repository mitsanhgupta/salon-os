--- 006_functions.sql — Database functions for AI computations

--- Trigger: updated_at
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trig_customers_updated
  before update on customers for each row execute function trigger_set_updated_at();
create trigger trig_staff_updated
  before update on staff for each row execute function trigger_set_updated_at();
create trigger trig_services_updated
  before update on services for each row execute function trigger_set_updated_at();
create trigger trig_appointments_updated
  before update on appointments for each row execute function trigger_set_updated_at();

--- RPC: Get salon overview (today's summary + key metrics)
create or replace function get_salon_overview(p_salon uuid)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'salonName', s.name,
    'today', jsonb_build_object(
      'appointments', (select count(*) from appointments a
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and a.status in ('confirmed','arrived','in-service','pending')),
      'expectedRevenue', (select coalesce(sum(a.price),0) from appointments a
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and a.status in ('confirmed','arrived','in-service','pending')),
      'todayRevenue', (select coalesce(sum(a.price),0) from appointments a
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and a.status = 'completed'),
      'completedCount', (select count(*) from appointments a
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and a.status = 'completed'),
      'newCustomers', (select count(distinct a.customer_id) from appointments a
        left join customers c on c.id = a.customer_id
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and c.visit_count = 1),
      'returningCustomers', (select count(distinct a.customer_id) from appointments a
        left join customers c on c.id = a.customer_id
        where a.salon_id = p_salon and date_trunc('day', a.start_time) = date_trunc('day', now())
        and c.visit_count > 1)
    ),
    'conversations', (select count(*) from conversations
      where salon_id = p_salon and status = 'needs-action')
  )
  into result
  from salons s where s.id = p_salon;
  return result;
end;
$$ language plpgsql;

--- RPC: Get overdue customers
create or replace function get_overdue_customers(p_salon uuid)
returns table (
  id uuid, name text, phone text, gap integer,
  typical_interval integer, lifetime_value numeric, risk text
) as $$
begin
  return query
  select c.id, c.name, c.phone,
    extract(days from (now() - c.last_visit_at))::integer as gap,
    c.typical_interval_days as typical_interval,
    c.lifetime_value,
    case
      when extract(days from (now() - c.last_visit_at)) > (c.typical_interval_days + 25) then 'HIGH'
      when extract(days from (now() - c.last_visit_at)) > (c.typical_interval_days + 5) then 'MEDIUM'
      else 'LOW'
    end as risk
  from customers c
  where c.salon_id = p_salon
    and c.last_visit_at is not null
    and c.visit_count > 1
    and extract(days from (now() - c.last_visit_at)) > (c.typical_interval_days + 5)
  order by c.lifetime_value desc;
end;
$$ language plpgsql;