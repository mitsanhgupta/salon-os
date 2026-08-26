"use client";

/**
 * /owner/dashboard — Owner "Business Brain" (real data from Supabase).
 * Today's appointments, expected revenue, overdue customers, staff utilization.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "../../../components/auth/AuthContext";
import { useAuthGuard } from "../../../hooks/useAuthGuard";
import { getAppointments } from "../../../lib/supabase/services-appointments";
import { getOverdueCustomers, getStaffUtilization } from "../../../lib/supabase/services-intelligence";
import { formatTime } from "../../../lib/utils";

export default function OwnerDashboardPage() {
  useAuthGuard("owner");
  const { user, signOut } = useAuth();

  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [staffUtil, setStaffUtil] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.salonId) return;
        const today = new Date().toISOString().split("T")[0];
        const [appts, overdueList, util] = await Promise.all([
          getAppointments(user.salonId, { date: today }),
          getOverdueCustomers(user.salonId),
          getStaffUtilization(user.salonId),
        ]);
        setTodayAppts(appts);
        setOverdue(overdueList);
        setStaffUtil(util);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.salonId]);

  const confirmed = todayAppts.filter((a) =>
    ["confirmed", "arrived", "in-service", "pending"].includes(a.status)
  );
  const expectedRevenue = confirmed.reduce((s, a) => s + Number(a.price || 0), 0);
  const completedRevenue = todayAppts
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + Number(a.price || 0), 0);
if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-text-secondary">Loading business data…</main>;
  }

  return (
    <main className="min-h-screen bg-bg pb-16">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-4 flex items-center justify-between">
        <div>
                    <h1 className="font-display text-lg font-semibold leading-tight">Direktor Pulse</h1>
          <p className="text-xs text-text-secondary">Decisions, not dashboards.</p>
        </div>
        <div className="flex items-center gap-2">
          {user && <div className="text-xs text-text-secondary hidden sm:block">{user.full_name} · {user.role}</div>}
          <Link href="/booking" className="btn-ghost">Book</Link>
          <button onClick={() => signOut()} className="btn-ghost">Sign out</button>
          <UserButton />
        </div>
      </header>

      {error && <div className="mx-6 mt-4 text-sm text-danger bg-danger-soft px-3 py-2 rounded-md">{error}</div>}

      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface p-5 rounded-card">
            <div className="text-xs text-text-secondary">Expected revenue today</div>
            <div className="font-display text-3xl font-semibold mt-1">₹{expectedRevenue.toLocaleString("en-IN")}</div>
          </div>
          <div className="surface p-5 rounded-card">
            <div className="text-xs text-text-secondary">Completed revenue</div>
            <div className="font-display text-3xl font-semibold mt-1">₹{completedRevenue.toLocaleString("en-IN")}</div>
          </div>
          <div className="surface p-5 rounded-card">
            <div className="text-xs text-text-secondary">Appointments today</div>
            <div className="font-display text-3xl font-semibold mt-1">{todayAppts.length}</div>
          </div>
        </div>

        <section className="surface p-6 rounded-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold">Recoverable revenue</h2>
            <span className="status-pill bg-warning-soft text-warning">{overdue.length} overdue</span>
          </div>
          {overdue.length === 0 ? (
            <p className="text-sm text-text-secondary">No overdue customers. Great retention.</p>
          ) : (
            <ul className="divide-y divide-border">
              {overdue.map((o) => (
                <li key={o.id} className="py-3 flex justify-between">
                  <div>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-text-secondary">Gap {o.gap}d · normal {o.typicalInterval}d</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="status-pill bg-danger-soft text-danger">{o.risk}</span>
                    <span className="font-semibold">₹{Number(o.lifetimeValue).toLocaleString("en-IN")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-6 rounded-card">
          <h2 className="font-display text-lg font-semibold mb-4">Today&apos;s appointments</h2>
          {todayAppts.length === 0 ? (
            <p className="text-sm text-text-secondary">No appointments scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.map((a: any) => (
                <li key={a.id} className="py-2.5 flex justify-between">
                  <div>
                    <div className="font-medium">{a.customers?.name || "Customer"}</div>
                    <div className="text-xs text-text-secondary">
                      {a.staff?.name || "No stylist"} · {formatTime(a.start_time)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="status-pill bg-surface-alt">{a.status}</span>
                    <span>{a.price ? `₹${Number(a.price).toLocaleString("en-IN")}` : "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-6 rounded-card">
          <h2 className="font-display text-lg font-semibold mb-4">Staff intelligence</h2>
          <div className="space-y-2">
            {staffUtil.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-text-secondary">{s.todayBooked} booked</span>
                </div>
                <div className="text-sm font-semibold">{s.utilization}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}