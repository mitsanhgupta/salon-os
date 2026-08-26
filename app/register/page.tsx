"use client";

/**
 * /register — Clerk-powered salon + owner onboarding, in the Direktor design.
 *
 * Flow (Clerk 7.8 custom-flow API):
 *   signUp.create({ firstName, lastName, emailAddress, password })
 *     → complete? finalize() : verification required (check inbox)
 *   → POST /api/onboarding provisions profile → salon → owner membership
 *     (server-side, service-role — RLS never blocks first setup)
 *   → redirect to the owner dashboard.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useAuth } from "../../components/auth/AuthContext";

function clerkErrorMessage(err: any): string {
  const first = err?.errors?.[0];
  if (first?.message) return first.message;
  if (err?.message) return err.message;
  return "We couldn't create your account. Please try again.";
}

export default function RegisterPage() {
  const { signUp } = useSignUp();
  const { refresh } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp || loading) return;
    setError(null);
    setLoading(true);

    try {
      const [firstName, ...rest] = fullName.trim().split(" ");

      const res = await signUp.create({
        firstName,
        lastName: rest.length ? rest.join(" ") : undefined,
        emailAddress: email.trim(),
        password,
      });
      if (res.error) {
        setError(clerkErrorMessage(res.error));
        return;
      }

      if (signUp.status !== "complete") {
        setError("A verification step is required. Please check your inbox to confirm your email, then sign in.");
        return;
      }

      // Activate the Clerk session.
      await signUp.finalize();

      // Provision profile + salon + owner membership on the server.
      const onboardRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, salonName }),
      });

      if (!onboardRes.ok) {
        const payload = await onboardRes.json().catch(() => ({}));
        setError(payload?.error || "Your account was created, but we couldn't set up your salon. Please sign in.");
        return;
      }

      await refresh(); // resolve the fresh owner SessionUser
      router.push("/owner/dashboard");
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
          <div className="text-3xl mb-2">💈</div>
          <h1 className="font-display text-2xl font-semibold">Create your salon</h1>
          <p className="text-text-secondary text-sm mt-1">
            Set up Direktor for your business in under a minute.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Salon name</label>
            <input
              type="text"
              required
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="e.g. Golden Scissors"
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-md">{error}</div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-60">
            {loading ? "Creating…" : "Create salon"}
          </button>
        </form>

        <div className="mt-6 text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium">Sign in</Link>
        </div>
      </div>
    </main>
  );
}