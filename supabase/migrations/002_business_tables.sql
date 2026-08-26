--- 002_business_tables.sql — Part 1: Staff, Customers, Services, Appointments

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
);