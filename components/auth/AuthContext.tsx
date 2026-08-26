"use client";

/**
 * AuthContext — Bridges Clerk (identity) to the Direktor app session user.
 *
 * Clerk provides sign-in/sign-up/session; this provider:
 *   1. Waits for the Clerk session.
 *   2. Presents the Clerk session token to Supabase (RLS identity).
 *   3. Resolves the application user (profile → salon membership → role).
 *
 * The rest of the app keeps using `useAuth()` with the same shape as before:
 * { status, user, isLoading, refresh, signOut }.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { getCurrentUser } from "../../lib/supabase/services";
import { setSupabaseToken } from "../../lib/supabase/client";
import type { SessionUser } from "../../lib/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !user) {
      setSupabaseToken(null);
      setSessionUser(null);
      setStatus("unauthenticated");
      return;
    }

    // Give Supabase the Clerk session token so RLS can resolve this identity.
    //
    // IMPORTANT: this MUST be Clerk's "supabase" JWT template, not the plain
    // session token. The template mints a token Supabase trusts (iss == the
    // Supabase project's issuer, aud == "authenticated", sub == Clerk user id).
    // The default session token has a different issuer (Clerk's domain), so
    // Supabase rejects it -> auth.jwt() is empty -> current_clerk_id() is NULL
    // -> RLS blocks every tenant read/write (data appears "missing", dashboards
    // render empty / loop back to /login).
    //
    // Create the template in Clerk Dashboard -> JWT Templates -> "Supabase"
    // (Advanced -> Supabase integration activates it). Falls back to the session
    // token only if no template is configured yet, so the app never hard-crashes.
    const token = await getToken({ template: "supabase" }).catch(() =>
      getToken({ skipCache: true }).catch(() => null)
    );
    if (token) setSupabaseToken(token);

    const appUser = await getCurrentUser(user.id);
    setSessionUser(appUser);
    setStatus(appUser ? "authenticated" : "unauthenticated");
  }, [isSignedIn, user, getToken]);

  // Re-resolve whenever Clerk loading/auth state changes (login, refresh, logout).
  useEffect(() => {
    if (!isLoaded) {
      setStatus("loading");
      return;
    }
    refresh();
  }, [isLoaded, refresh]);

  const signOut = useCallback(async () => {
    setSupabaseToken(null);
    await clerkSignOut();
    setSessionUser(null);
    setStatus("unauthenticated");
    router.push("/login");
  }, [clerkSignOut, router]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user: sessionUser,
        isLoading: status === "loading",
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}