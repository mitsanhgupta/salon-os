/**
 * server/migrate-existing-users.js
 * ============================================================
 * Backfill `profiles.clerk_id` for users created under the OLD Supabase Auth
 * system (before the Clerk migration).
 *
 * Passwords CANNOT be extracted or migrated — never try. What this script does
 * is link a legacy application profile to its matching Clerk user by EMAIL so
 * that after they set/re-enter their password through Clerk, the existing
 * profile, salon and salon_members (roles) keep working unchanged.
 *
 * Flow:
 *   1. List legacy Supabase Auth users (email + id).
 *   2. List application profiles without a clerk_id.
 *   3. List Clerk users (email + Clerk id).
 *   4. For each profile whose legacy email matches a Clerk user email,
 *      set profiles.clerk_id = <Clerk user id>.
 *
 * Users whose emails do NOT match any Clerk user are reported so they can be
 * invited/recreated in Clerk (they'll be treated as new users on sign-in).
 *
 * Usage: node server/migrate-existing-users.js
 * Requires (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / CLERK_SECRET_KEY
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

if (!URL || !SERVICE_KEY || !CLERK_SECRET || !CLERK_SECRET.startsWith("sk_")) {
  console.error(
    "Missing env vars. Add NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a valid CLERK_SECRET_KEY to .env.local"
  );
  process.exit(1);
}

const sb = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Fetch ALL Clerk users (paginated). */
async function getClerkUsers() {
  const users = [];
  let offset = 0;
  const LIMIT = 100;
  for (;;) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=${LIMIT}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET}` } }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clerk API error ${res.status}: ${text.slice(0, 300)}`);
    }
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    users.push(...page);
    offset += page.length;
    if (page.length < LIMIT) break;
  }
  return users;
}

async function main() {
  console.log("\n=== Direktor · Clerk user backfill ===\n");

  // 1. Legacy Supabase Auth users (email -> id)
  console.log("-- Fetching legacy Supabase Auth users --");
  const { data: legacyUsers, error: luErr } = await sb.auth.admin.listUsers();
  if (luErr) throw luErr;
  const emailToLegacyId = new Map();
  for (const u of legacyUsers.users || []) {
    if (u.email) emailToLegacyId.set(u.email.toLowerCase(), u.id);
  }
  console.log(`  Found ${emailToLegacyId.size} legacy Supabase Auth users`);

  // 2. Profiles without a clerk_id
  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, full_name, clerk_id")
    .is("clerk_id", null);
  if (pErr) throw pErr;
  console.log(`  Found ${(profiles || []).length} profiles without clerk_id`);

  if (!profiles || profiles.length === 0) {
    console.log("\nNothing to migrate. All profiles already linked to Clerk.\n");
    return;
  }

  // 3. Clerk users (email -> clerk id)
  console.log("-- Fetching Clerk users --");
  const clerkUsers = await getClerkUsers();
  const emailToClerk = new Map();
  for (const cu of clerkUsers) {
    for (const em of cu.email_addresses || []) {
      emailToClerk.set(em.email_address.toLowerCase(), cu.id);
    }
  }
  console.log(`  Found ${clerkUsers.length} Clerk users`);

  // 4. Match by email and update
  console.log("\n-- Backfilling clerk_id --");
  let linked = 0;
  let skipped = 0;
  const unmatched = [];
  for (const profile of profiles) {
    // profiles don't store an email address: the legacy link is
    // profile.id == legacy Supabase Auth uid, so find the legacy email by id.
    let legacyEmail = null;
    for (const [em, id] of emailToLegacyId.entries()) {
      if (id === profile.id) {
        legacyEmail = em;
        break;
      }
    }

    if (!legacyEmail) {
      skipped++;
      unmatched.push({ id: profile.id, name: profile.full_name, reason: "no legacy auth user with matching id" });
      continue;
    }

    const clerkId = emailToClerk.get(legacyEmail);
    if (!clerkId) {
      skipped++;
      unmatched.push({ id: profile.id, name: profile.full_name, reason: `no Clerk user for ${legacyEmail}` });
      continue;
    }

    const { error: upErr } = await sb
      .from("profiles")
      .update({ clerk_id: clerkId })
      .eq("id", profile.id);
    if (upErr) {
      skipped++;
      unmatched.push({ id: profile.id, name: profile.full_name, reason: `update error: ${upErr.message}` });
    } else {
      linked++;
    }
  }

  console.log(`  Linked ${linked} profiles to Clerk users`);
  console.log(`  Skipped   ${skipped} profiles`);
  if (unmatched.length) {
    console.log("\n-- Unmatched profiles (need manual attention) --");
    for (const u of unmatched.slice(0, 50)) {
      console.log(`   ${u.name || u.id}  (${u.reason})`);
    }
    if (unmatched.length > 50) console.log(`   … and ${unmatched.length - 50} more`);
  }

  console.log(
    "\nDone. Users that were linked will keep their existing salon, memberships and roles.\n" +
      "Users NOT linked should sign up again / be invited in Clerk; their old data stays in\n" +
      "Supabase and can be re-linked later by email.\n"
  );
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});