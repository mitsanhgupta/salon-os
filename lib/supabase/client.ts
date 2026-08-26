/**
 * lib/supabase/client.ts — Browser Supabase client (RLS-protected).
 *
 * Identity comes from Clerk. This client presents the Clerk session token as a
 * Bearer token to Supabase; with Clerk configured as a third-party auth provider,
 * RLS reads the Clerk user id from auth.jwt().
 *
 * `setSupabaseToken()` is called by AuthProvider whenever the Clerk session
 * changes so every subsequent data access uses the current identity.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local");
}

// Clerk session token (JWT) that Supabase accepts once Clerk is registered as a
// third-party auth provider in the Supabase dashboard.
let authToken: string | null = null;

// Inject apikey + Bearer token on every request without rebuilding the client,
// so the singleton stays valid for all lib/supabase/services-*.ts.
const fetchWithAuth: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers ?? {});
  headers.set("apikey", supabaseAnonKey);
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithAuth },
  auth: {
    // Supabase Auth is not used for login; do not persist a session.
    storage: typeof window !== "undefined" ? localStorage : undefined,
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    params: {
      apikey: supabaseAnonKey,
    },
  },
});

/**
 * Set (or clear) the Clerk session token used for Supabase requests.
 * Call after Clerk signs in/out or on session refresh.
 */
export function setSupabaseToken(token: string | null): void {
  authToken = token;
}

export default supabase;