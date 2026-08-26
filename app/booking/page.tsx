"use client";

/**
 * /booking — Customer-facing booking flow (real Supabase data).
 * Step 1: choose service → Step 2: choose staff → Step 3: choose date/time → confirm.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth/AuthContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import { getActiveServices } from "../../lib/supabase/services-services";
import { getStaff } from "../../lib/supabase/services-staff";
import { createAppointment } from "../../lib/supabase/services-appointments";
import type { Service, Staff } from "../../lib/types";
import { formatPrice } from "../../lib/utils";

const TIME_SLOTS = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30"];

export default function BookingPage() {
  useAuthGuard();
  const { user } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.salonId) return;
        const [svcs, stf] = await Promise.all([
          getActiveServices(user.salonId),
          getStaff(user.salonId),
        ]);
        setServices(svcs);
        setStaff(stf);
        setCustomerId(user.id);
        if (!selectedDate) setSelectedDate(new Date().toISOString().split("T")[0]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.salonId]);

  async function handleConfirm() {
    setError(null);
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) {
      setError("Please select a service, staff, date and time.");
      return;
    }
    const u = user;
    if (!u?.salonId) {
      setError("Not signed in to a salon.");
      return;
    }
    const startTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const endTime = new Date(startTime.getTime() + (selectedService.duration_min || 30) * 60000);
    try {
      await createAppointment(u.salonId, {
        customer_id: customerId || u.id,
        staff_id: selectedStaff.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_min: selectedService.duration_min,
        price: selectedService.price,
        status: "pending",
        source: "customer",
        confirmation: "pending",
        notes: "",
      });
      setSuccess(
        `Booked! ${selectedService.name} with ${selectedStaff.name} on ${selectedDate} at ${selectedTime}.`
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-text-secondary">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg pb-16">
      <div className="max-w-md mx-auto px-4 pt-8">
        <h1 className="font-display text-2xl font-semibold mb-1">Book an appointment</h1>
        <p className="text-text-secondary text-sm mb-6">
          {user?.full_name ? `Hi ${user.full_name.split(" ")[0]}, ` : ""}pick a service and time.
        </p>

        {success ? (
          <div className="surface p-6 rounded-card text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="font-display text-lg font-semibold mb-2">Appointment confirmed!</h2>
            <p className="text-text-secondary text-sm">{success}</p>
            <button onClick={() => window.location.reload()} className="mt-6 btn-primary">
              Book another
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-text-secondary mb-3">1 · Choose a service</h2>
              <div className="space-y-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setSelectedStaff(null); setSelectedTime(""); }}
                    className={`w-full text-left surface p-4 rounded-card transition ${
                      selectedService?.id === s.id ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-text-secondary">{s.duration_min} min</div>
                      </div>
                      <div className="font-semibold text-accent">{formatPrice(s.price)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selectedService && (
              <section>
                <h2 className="text-sm font-semibold text-text-secondary mb-3">2 · Choose a stylist</h2>
                <div className="space-y-2">
                  {staff.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => { setSelectedStaff(st); setSelectedTime(""); }}
                      className={`w-full text-left surface p-4 rounded-card transition ${
                        selectedStaff?.id === st.id ? "ring-2 ring-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                          style={{ backgroundColor: st.color || "#E8492D", color: "#fff" }}
                        >
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{st.name}</div>
                          {st.specialization && (
                            <div className="text-xs text-text-secondary">{st.specialization}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {selectedStaff && (
              <section>
                <h2 className="text-sm font-semibold text-text-secondary mb-3">3 · Choose date &amp; time</h2>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 rounded-md border border-border bg-surface focus:outline-none"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-2 py-2 rounded-md text-sm border transition ${
                        selectedTime === t
                          ? "bg-accent text-white border-accent"
                          : "border-border bg-surface hover:border-accent/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-md">{error}</div>
            )}

            {selectedService && selectedStaff && selectedDate && (
              <button onClick={handleConfirm} className="w-full btn-primary">
                Confirm booking
                {selectedService && ` · ${formatPrice(selectedService.price)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
