# Direktor — Supabase Setup & Run Guide

Direktor is a full-stack salon management web app. The frontend is Next.js (App Router); the backend/database is **Supabase** (PostgreSQL + Auth + RLS).

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`.env.local` is **git-ignored**. Never commit the service-role key.

## 2. Apply the database schema

The schema is in:

- `supabase/schema.sql` — the complete schema in one file (enums, tables, indexes, RLS, trigger)
- `supabase/migrations/001-006` — the same, split per concern
- `supabase/fix_trigger.sql` — repairs the profile auto-create trigger if needed

If your project tables do not exist yet, open the Supabase Dashboard → SQL Editor → paste the entire contents of `supabase/schema.sql` → Run.

## 3. Fix row-level security recursion (REQUIRED — do this once)

The RLS helper functions (`get_user_salon_id`, `get_user_role_in`) must be **SECURITY DEFINER**, otherwise RLS recurses infinitely whenever any business table policy runs — so authenticated users cannot read salon data (error 42P17). The `004_rls_policies.sql` migration already declares them as SECURITY DEFINER. If you applied an older schema first, paste the helper function definitions from `supabase/fix_trigger.sql` or `supabase/migrations/004_rls_policies.sql` into the SQL Editor to update them to SECURITY DEFINER.

## 4. Install dependencies

```bash
npm install
```

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000

## 6. Create your salon

Click **Create an account** on the login screen. Enter your name + salon
name + email + password and Direktor creates a fresh, empty salon for you.

There are **no demo accounts** — every user signs up for real.

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | public | Sign in to an existing salon |
| `/register` | public | Create a new salon + owner account |
| `/booking` | customer | Customer booking flow (real data) |
| `/owner/dashboard` | owner/manager | Salon Pulse, revenue, overdue, staff |
| `/reception/calendar` | receptionist/stylist | Today appointments + status flow |

## Architecture

```
Browser (Next.js)
   |  supabase-js (anon key, RLS enforced)
   v
Supabase
   +-- Auth (email/password, JWT)
   +-- PostgreSQL (multi-tenant, salon_id scoped)
   +-- RLS (tenants isolated at the DB level)
   +-- Realtime (appointments, conversations)
```

All client queries go through lib/supabase/*. The salon_id on every row + Row Level Security guarantees one salon can never see another salons data, even if a request is hand-crafted.
