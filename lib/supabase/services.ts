/**
 * lib/supabase/services.ts — App session user resolution.
 *
 * Authentication is handled by Clerk. This module resolves the application
 * user (profile → salon membership → role) for an authenticated Clerk user id.
 *
 * Deprecated: signIn / signUp / signOut used Supabase Auth for password auth.
 * Those flows now live in Clerk (see /login and /register pages).
 */
import supabase from "./client";
import type { SessionUser } from "../types";

/**
 * Resolve a Clerk-authenticated user into a SessionUser by looking up their
 * profile (via clerk_id) and their active salon membership/role.
 */
export async function getCurrentUser(clerkId?: string | null): Promise<SessionUser | null> {
  if (!clerkId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  // Salon context via SECURITY DEFINER RPC helpers (resolve Clerk identity).
  const { data: salonRaw } = await supabase.rpc("get_user_salon_id");
  const salonId = typeof salonRaw === "string" && salonRaw ? salonRaw : "";

  const { data: roleRaw } = await supabase.rpc("get_user_role");
  const role = (typeof roleRaw === "string" ? roleRaw : "customer") as SessionUser["role"];

  const fallbackName = profile?.full_name || "User";

  if (!salonId) {
    // Authenticated but not yet part of a salon — treat as a standalone customer.
    return {
      id: profile?.id || clerkId,
      full_name: fallbackName,
      role: "customer" as SessionUser["role"],
      salonId: "",
      phone: profile?.phone,
      avatar_url: profile?.avatar_url,
    };
  }

  return {
    id: profile?.id || clerkId,
    full_name: fallbackName,
    role,
    salonId,
    phone: profile?.phone,
    avatar_url: profile?.avatar_url,
  };
}