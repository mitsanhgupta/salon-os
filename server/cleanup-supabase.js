/**
 * server/cleanup-supabase.js
 * Deletes ALL data from the Supabase project (for a fresh re-seed).
 * Uses service_role key — dangerous, trusted server context only.
 *
 * Usage: node server/cleanup-supabase.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const NOOP_ID = '00000000-0000-0000-0000-000000000000';

(async () => {
  const tables = ['messages','conversations','payments','appointments','customers','services','staff','ai_actions','ai_insights','campaigns','audit_logs','salon_members','profiles','salons'];
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    if (error) { console.log(t, 'skip:', error.message); continue; }
    if ((count || 0) > 0) {
      const { error: delErr } = await sb.from(t).delete().neq('id', NOOP_ID);
      if (delErr) console.log(t, 'ERR:', delErr.message);
      else console.log('Cleared', t, '(' + count + ' rows)');
    }
  }

  let deleted = 0;
  const { data: usersData } = await sb.auth.admin.listUsers();
  for (const u of (usersData?.users || [])) {
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (!error) deleted++;
  }
  console.log('Auth users deleted:', deleted);

  const { error: ssErr } = await sb.from('service_staff').delete().neq('staff_id', NOOP_ID);
  console.log('service_staff:', ssErr ? 'ERR ' + ssErr.message : 'cleared');
  const { error: apErr } = await sb.from('appointment_services').delete().neq('appointment_id', NOOP_ID);
  console.log('appointment_services:', apErr ? 'ERR ' + apErr.message : 'cleared');

  console.log('\nCleanup complete.');
})().catch(e => console.error('Fatal:', e.message));