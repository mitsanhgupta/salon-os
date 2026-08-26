"use client";

/**
 * useAuthGuard — Redirects unauthenticated users to /login.
 * If requireRole is set, also redirects users without that role.
 * Returns the resolved session user (or null while loading).
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/auth/AuthContext";
import type { SessionUser, UserRole } from "../lib/types";

export function useAuthGuard(requireRole?: UserRole | UserRole[]): {
  user: SessionUser | null;
  isLoading: boolean;
} {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (user && requireRole) {
      const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
      if (!allowed.includes(user.role)) {
        // Root "/" is the role-aware hub that sends each role home.
        router.replace("/");
      }
    }
  }, [status, user, requireRole, router]);

  return { user, isLoading: status === "loading" };
}
