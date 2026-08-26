"use client";

/**
 * / — Role-aware redirect hub after login.
 * Sends each role to its primary workspace.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../components/auth/AuthContext";

const homeForRole: Record<string, string> = {
  owner: "/owner/dashboard",
  manager: "/owner/dashboard",
  receptionist: "/reception/calendar",
  staff: "/reception/calendar",
  customer: "/booking",
};

export default function HomePage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (user) {
      router.replace(homeForRole[user.role] || "/login");
    }
  }, [status, user, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-text-secondary text-sm">Redirecting…</div>
    </main>
  );
}