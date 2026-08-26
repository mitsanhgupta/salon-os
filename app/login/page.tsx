"use client";

/**
 * /login — Clerk-powered sign-in, wrapped in the existing Direktor design.
 *
 * Flow (Clerk 7.8 custom-flow API):
 *   signIn.create({ identifier, password }) → complete? finalize() : password()
 *   → finalize() (activates the Clerk session) → resolve role → redirect.
 *
 * Validation errors come from Clerk; no more "Invalid login credentials".
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { useAuth } from "../../components/auth/AuthContext";

/** Pull a human-readable message out of a Clerk error response. */
function clerkErrorMessage(err: any): string {
  const first = err?.errors?.[0];
  if (first?.message) return first.message;
  if (err?.message) return err.message;
  return "We couldn't sign you in. Please try again.";
}

export default function LoginPage() {
  const { signIn } = useSignIn();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.error) {
        setError(clerkErrorMessage(res.error));
        return;
      }

      // If the identifier/password didn't complete in one step, submit the
      // password as the first factor explicitly.
      if (signIn.status !== "complete") {
        const pw = await signIn.password({ identifier: email.trim(), password });
        if (pw.error) {
          setError(clerkErrorMessage(pw.error));
          return;
        }
      }

      if (signIn.status === "complete") {
        await signIn.finalize(); // activates the Clerk session
        await refresh(); // resolve role from Clerk → profile → membership
        router.push("/");
        return;
      }

      setError("Additional verification is required. Please complete the sign-in flow.");
    } catch (err: any) {
      setError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md surface p-8 rounded-card">
        <div className="mb-8">
          <div className="text-3xl mb-2">💇</div>
          <h1 className="font-display text-2xl font-semibold">Direktor</h1>
          <p className="text-text-secondary text-sm mt-1">
            Sign in to your salon workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@your-salon.com"
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-md">{error}</div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-text-secondary">
          New salon?{" "}
          <Link href="/register" className="text-accent font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}