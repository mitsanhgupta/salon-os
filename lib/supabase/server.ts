/**
 * lib/supabase/server.ts — Server-side Supabase clients
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars in server context');
}

/**
 * Server-side client with service_role (bypasses RLS).
 * ONLY use for privileged server-side operations (seeding, admin tasks).
 * Never import in client components.
 */
export function createServiceClient() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server-side client that respects the user's JWT (RLS enforced).
 * Use for operations that should honor tenant isolation.
 */
export function createServerClient(jwt?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: jwt
      ? {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default createServiceClient;

