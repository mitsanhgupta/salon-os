# Direktor — AI Operating System for Salons

One salon. One system. Three experiences.

Direktor is a full-stack, multi-tenant salon management web application:

- **Owner** — *Business Brain*: Direktor Pulse, revenue, overdue customers, staff intelligence
- **Receptionist** — *Operations Center*: today's calendar, appointment status flow
- **Customer** — *Booking*: pick a service, stylist, and time; create a real appointment

The backend is **Supabase** (PostgreSQL + Auth + RLS). The frontend is **Next.js** (App Router, React 19, TypeScript, Tailwind v4). Each salon is a tenant — `salon_id` on every row, Row Level Security isolating tenants at the database level.

## Tech stack

| Layer | Technology |
|-----------|------------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Backend/Database | Supabase (PostgreSQL, PostgREST, Auth) |
| Client | `@supabase/supabase-js` |
| CLI utilities | `server/check-health.js`, `server/cleanup-supabase.js` |

## Quick start

```bash
npm install
```

### 1. Configure `.env.local`

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL, publishable (anon) key, and service-role key.
See `docs/SETUP.md` for details.

### 2. Apply the database schema (once)

If tables don't exist, run the whole `supabase/schema.sql` in the **Supabase SQL Editor**.

### 3. Fix the auth trigger (once — required for login)

Run **`supabase/fix_trigger.sql`** in the SQL Editor to repair the profile-creation
trigger that would otherwise block signup/login with *"Database error creating new user"*.

### 4. Create your salon

Open the app and sign up:

```bash
npm run dev
# -> http://localhost:3000
```

Click **Create an account** on the login screen, enter your name + salon name +
email + password, and Direktor creates a fresh, empty salon for you. No demo data —
everything you see starts with what you add.

### 5. Run

```bash
npm run dev        # http://localhost:3000
# or production
npm run build && npm start
```


## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | public | Sign in |
| `/register` | public | Create salon + owner account |
| `/booking` | customer | Book a service (real data → real appointment) |
| `/owner/dashboard` | owner/manager | Direktor Pulse, revenue, overdue, staff |
| `/reception/calendar` | receptionist/staff | Today's calendar + appointment status flow |

## Architecture

```
Browser (Next.js)
   │  @supabase/supabase-js (anon key, RLS enforced)
   ▼
Supabase
   ├── Auth         JWT, email/password
   ├── PostgreSQL   multi-tenant (salon_id on every row)
   ├── RLS          tenants isolated at the database level
   └── Realtime     appointments, conversations, AI actions
```

## Data access

All queries live in `lib/supabase/*` (`services.ts`, `services-appointments.ts`,
`services-intelligence.ts`, …). Components consume these service functions — never
hand-written queries in JSX.

### Multi-tenancy & RLS

Every business table carries a `salon_id`. Row Level Security policies scope all reads and
writes to the authenticated user's salon via `get_user_salon_id()`. A user from Salon A
simply cannot see or modify Salon B's data, even with a hand-crafted API request.

## Database schema

`schema.sql` defines:

- Enums (appointment status, booking source, payment method/status, conversation/campaign
  status, insight severity/type, action status, roles)
- `salons`, `profiles`, `salon_members` (the auth/tenant core)
- `staff`, `customers`, `services`, `appointments`, `payments` (business)
- `conversations`, `messages` (WhatsApp/support chats)
- `campaigns`, `ai_insights`, `ai_actions`, `audit_logs` (AI + marketing + audit)
- Indexes, RLS policies, the profile auto-create trigger, and AI helper functions

## Documentation

See `docs/SETUP.md` for the full environment + Supabase setup walkthrough.

---

## Authentication — Clerk (since the auth migration)

Identity is handled entirely by **Clerk** (`@clerk/nextjs` 7.x). Supabase remains
the application database (multi-tenant, RLS).

### 1. Environment variables (`.env.local`)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Get both from the Clerk Dashboard → **API Keys**. `.env.local` is git-ignored.
The secret key must never be used client-side.

### 2. Clerk → Supabase integration (one-time, dashboard only)

1. **Clerk Dashboard** → *Advanced → Supabase integration* → **Activate Supabase
   integration** → copy the **Clerk domain**.
2. **Supabase Dashboard** → *Authentication → Third-party auth providers* →
   add Clerk as a provider with the Clerk domain.
3. **Clerk Dashboard** → *JWT Templates* → confirm the **`supabase`** template
   exists (activating the Supabase integration creates it). Client code in
   `AuthContext` forwards this template token (via `getToken({ template:
   'supabase' })`), never the raw session token.

This makes Supabase accept Clerk tokens. The `supabase` template mints a JWT
whose `iss` is the Supabase project, `aud: "authenticated"`, and which carries
`sub` (the Clerk user id) — the RLS policies read it via
`auth.jwt() ->> 'user_id'` (falling back to `'sub'`) in `current_clerk_id()`.

### 3. Apply the Clerk database migration

Run **`supabase/migrations/007_clerk_authentication.sql`** in the **Supabase
Dashboard → SQL Editor** (or `supabase db push` if using the CLI).

What it does:
- Adds `profiles.clerk_id` (unique) — the Clerk user → profile mapping.
- Repoints `salon_members.user_id` FK from `auth.users` → `profiles`.
- Replaces the `auth.uid()`-based SECURITY DEFINER helpers with
  `current_clerk_id()` (reads the Clerk JWT claim).
- Updates `profiles` / `salons` / `salon_members` RLS policies to the new
  Clerk identity (no insecure `WITH CHECK (true)` policies are added).

### 4. Migrate existing (legacy Supabase-Auth) users

```bash
node server/migrate-existing-users.js
```

Links existing `profiles` to their Clerk user by **email**, so their salons,
memberships and roles keep working. Users that don’t match any Clerk user are
reported and should be re-invited in Clerk (passwords are never migrated).

### 5. First sign-up / sign-in

- `/register` → creates the Clerk account, then server-side
  `POST /api/onboarding` provisions `profile → salon → salon_members(owner)`
  with the service-role client (RLS is never bypassed for user requests).
- `/login` → Clerk sign-in; the Clerk **`supabase`-template** token is forwarded
  to Supabase so RLS resolves the exact app user → salon → role → dashboard.

### 6. Route protection

`middleware.ts` runs Clerk’s `clerkMiddleware`: `/owner/*`, `/reception/*` and
`/staff/*` require a session; `/`, `/login`, `/register`, `/booking` are public.
Client-side `useAuthGuard` remains as UX, not as the security boundary.
