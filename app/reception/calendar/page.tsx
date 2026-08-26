"use client";

/**
 * /reception/calendar — Receptionist "Operations Center" calendar.
 * Shows today's appointments from Supabase, with quick status updates.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "../../../components/auth/AuthContext";
import { useAuthGuard } from "../../../hooks/useAuthGuard";
import { getAppointments, updateAppointmentStatus } from "../../../lib/supabase/services-appointments";
import { formatTime } from "../../../lib/utils";

const STATUS_FLOW = ["pending", "confirmed", "arrived", "in-service", "completed"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-info text-white",
  arrived: "bg-success-soft text-success",
  "in-service": "bg-accent-soft text-accent",
  completed: "bg-success text-white",
  cancelled: "bg-surface-alt text-text-tertiary",
  "no-show": "bg-danger-soft text-danger",
};

export default function ReceptionCalendarPage() {
  useAuthGuard("receptionist");
  const { user, signOut } = useAuth();

  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(salonId: string) {
    const today = new Date().toISOString().split("T")[0];
    const data = await getAppointments(salonId, { date: today });
    setAppts(data);
  }

  useEffect(() => {
    (async () => {
      try {
        if (user?.salonId) await load(user.salonId);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.salonId]);

  async function advanceStatus(appt: any) {
    if (!user?.salonId) return;
    const idx = STATUS_FLOW.indexOf(appt.status);
    const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : "completed";
    try {
      await updateAppointmentStatus(user.salonId, appt.id, next as any);
      await load(user.salonId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-text-secondary">Loading calendar…</main>;
  }

  return (
    <main className="min-h-screen bg-bg pb-16">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight">Today&apos;s calendar</h1>
          <p className="text-xs text-text-secondary">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {appts.length} appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && <div className="text-xs text-text-secondary hidden sm:block">{user.full_name.split(" ")[0]}</div>}
          <Link href="/booking" className="btn-primary text-sm px-4 py-2">+ New</Link>
          <button onClick={() => signOut()} className="btn-ghost">Sign out</button>
          <UserButton />
        </div>
      </header>

      {error && <div className="mx-6 mt-4 text-sm text-danger bg-danger-soft px-3 py-2 rounded-md">{error}</div>}

      <div className="max-w-3xl mx-auto px-6 pt-6">
        {appts.length === 0 ? (
          <div className="surface p-10 rounded-card text-center text-text-secondary">
            <div className="text-4xl mb-3">🗓️</div>
            No appointments today.
          </div>
        ) : (
          <ul className="space-y-3">
            {appts
              .slice()
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((a) => (
                <li key={a.id} className="surface p-4 rounded-card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-medium text-sm w-16 flex-shrink-0">{formatTime(a.start_time)}</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.customers?.name || "Customer"}</div>
                      <div className="text-xs text-text-secondary truncate">
                        {a.staff?.name || "No stylist"} · {a.price ? `₹${Number(a.price).toLocaleString("en-IN")}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`status-pill ${STATUS_COLORS[a.status] || "bg-surface-alt"}`}>{a.status}</span>
                    {a.status !== "cancelled" && a.status !== "no-show" && (
                      <button
                        onClick={() => advanceStatus(a)}
                        className="text-xs btn-primary px-3 py-1.5"
                        title="Advance status"
                      >
                        →
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </main>
  );
}