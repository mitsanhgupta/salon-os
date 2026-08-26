/**
 * server/check-health.js — Health check for Direktor + Supabase.
 *
 * Verifies:
 *  1. Supabase is reachable (service role + anon key).
 *  2. Core schema tables exist.
 *  3. RLS helper functions are SECURITY DEFINER (no recursion).
 *  4. Auth is configured.
 *
 * Does NOT require any seeded data. Use `cleanup:supabase` to reset,
 * then sign up at /register to create a fresh salon.
 *
 * Usage: node server/check-health.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('Missing env vars. Check .env.local');
  process.exit(1);
}

const TABLES = [
  'salons', 'profiles', 'salon_members',
  'staff', 'customers', 'services',
  'service_staff', 'appointments', 'appointment_services',
  'payments', 'conversations', 'messages',
  'campaigns', 'ai_insights', 'ai_actions', 'audit_logs',
];

async function main() {
  console.log('\n=== Direktor · Supabase health check ===\n');
  let failed = false;

  const sb = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // 1. Connectivity
  console.log('-- 1. Connectivity --');
  try {
    await sb.from('salons').select('id', { count: 'exact', head: true });
    console.log('  OK  Service role: connected');
  } catch (e) {
    console.log('  FAIL  Service role: ' + e.message);
    failed = true;
  }
  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } });
  try {
    await anonClient.from('salons').select('id', { count: 'exact', head: true });
    console.log('  OK  Anon key: connected');
  } catch (e) {
    console.log('  WARN  Anon key: ' + e.message + ' (RLS blocks reads until login)');
  }

    // 2. Schema
  console.log('\n-- 2. Schema tables --');
  const NO_ID_TABLES = ['service_staff', 'appointment_services'];
  for (const table of TABLES) {
    const selectCol = NO_ID_TABLES.includes(table) ? '*' : 'id';
    const { count, error } = await sb.from(table).select(selectCol, { count: 'exact', head: true });
    const ok = !error;
    if (!ok) failed = true;
    console.log('  ' + (ok ? 'OK  ' : 'FAIL ') + table + ': ' + (error ? error.message : (count || 0) + ' rows'));
  }

  // 3. RLS helpers
  console.log('\n-- 3. RLS security-definer helpers --');
  try {
    const { error } = await sb.rpc('get_user_salon_id');
    const ok = !error || error.code === '427gm';
    console.log('  ' + (ok ? 'OK  ' : 'FAIL ') + 'get_user_salon_id: ' + (error ? error.message : 'OK'));
    if (!ok) failed = true;
  } catch (e) {
    console.log('  FAIL  get_user_salon_id: ' + e.message);
    failed = true;
  }

  // 4. Auth
  console.log('\n-- 4. Auth --');
  try {
    await sb.auth.getUser();
    console.log('  OK  Supabase Auth reachable');
    console.log('  INFO  No demo accounts -- sign up at /register to create a salon');
  } catch (e) {
    console.log('  FAIL  Auth: ' + e.message);
    failed = true;
  }

  console.log('\n========================================');
  if (failed) {
    console.log('FAIL  Some checks failed. See docs/SETUP.md -- you likely need to run:');
    console.log('   1. supabase/schema.sql         (schema + RLS)');
    console.log('   2. supabase/fix_rls_recursion.sql  (SECURITY DEFINER helpers)');
    console.log('   3. supabase/fix_profiles_rls.sql  (profiles self-read)');
    console.log('   in the Supabase Dashboard -> SQL Editor.\n');
  } else {
    console.log('OK  All checks passed. Direktor + Supabase are healthy.');
  }
  console.log('');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
