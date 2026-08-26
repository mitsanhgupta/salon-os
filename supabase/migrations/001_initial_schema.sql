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
);