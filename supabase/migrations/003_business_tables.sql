--- 003_business_tables.sql — Part 2: Payments, Conversations, Messages, Campaigns, AI, Audit

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
);