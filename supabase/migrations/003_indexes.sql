--- 003_indexes.sql — Performance indexes

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
create index if not exists idx_audit_salon on audit_logs (salon_id);