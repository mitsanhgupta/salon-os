/**
 * ai.js — The AI engine. Computes live business intelligence from the shared
 * data layer: revenue, no-show risk, overdue customers, empty slots, staff
 * utilization, customer segments, the owner's AI Action Center, and suggested
 * replies. This is the "AI Brain" of Salon OS.
 */
const { db } = require('./db');

const ACTIVE = ['confirmed', 'arrived', 'in-service', 'pending'];
const TODAY0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
function daysGap(fromIso) { return Math.max(0, Math.round((new Date() - new Date(fromIso)) / 86400000)); }

function byId(list, id) { return list.find((x) => x.id === id); }
function staffName(id) { return (byId(db().staff, id) || {}).name || '—'; }
function custName(id) { const c = byId(db().customers, id); return c ? c.name : 'Unknown'; }

function averageBill() {
  const a = db().appointments.filter((x) => ACTIVE.includes(x.status) && x.price);
  if (!a.length) return 700;
  return Math.round(a.reduce((s, x) => s + x.price, 0) / a.length);
}

function todayAppts() { return db().appointments.filter((a) => sameDay(a.start, new Date())); }
function tomorrowAppts() { const t = TODAY0(); t.setDate(t.getDate() + 1); return db().appointments.filter((a) => sameDay(a.start, t)); }

// ---------- Revenue & daily summary ----------
function computeTodaySummary() {
  const appts = todayAppts();
  const bookable = appts.filter((a) => ACTIVE.includes(a.status));
  const completed = appts.filter((a) => a.status === 'completed');
  const todayRevenue = completed.reduce((s, a) => s + a.price, 0);
  const expectedRevenue = bookable.reduce((s, a) => s + a.price, 0);
  const returning = bookable.filter((a) => { const c = byId(db().customers, a.customerId); return c && c.visitCount > 1; }).length;
  const newCusts = bookable.filter((a) => { const c = byId(db().customers, a.customerId); return c && (c.visitCount || 0) <= 1; }).length;
  return {
    appointments: bookable.length,
    expectedRevenue,
    todayRevenue,
    completedCount: completed.length,
    avgBill: bookable.length ? Math.round(expectedRevenue / bookable.length) : 0,
    newCustomers: newCusts,
    returningCustomers: returning
  };
}

// ---------- No-show risk (tomorrow's unconfirmed, high-value) ----------
function computeNoShowRisks() {
  return tomorrowAppts()
    .filter((a) => a.confirmation === 'pending' && ACTIVE.includes(a.status))
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map((a) => ({
      id: a.id, customerId: a.customerId, customer: custName(a.customerId),
      staff: staffName(a.staffId), price: a.price, at: a.start
    }));
}

// ---------- Overdue customers ----------
function computeOverdue() {
  const out = [];
  db().customers.forEach((c) => {
    if (!c.lastVisitAt) return;
    const gap = daysGap(c.lastVisitAt);
    const threshold = (c.typicalInterval || 30) + 5;
    if (gap > threshold && c.visitCount > 1) {
      out.push({
        id: c.id, name: c.name, gap, typicalInterval: c.typicalInterval,
        lifetimeValue: c.lifetimeValue, risk: gap > threshold + 20 ? 'HIGH' : 'MEDIUM'
      });
    }
  });
  return out.sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

// ---------- Empty slots (today, per staff, >= 60 min) ----------
function computeEmptySlots() {
  const empty = [];
  db().staff.forEach((s) => {
    const dayAppts = todayAppts().filter((a) => a.staffId === s.id && ACTIVE.includes(a.status))
      .map((a) => ({ s: new Date(a.start).getHours() * 60 + new Date(a.start).getMinutes(), e: new Date(a.end).getHours() * 60 + new Date(a.end).getMinutes() }))
      .sort((a, b) => a.s - b.s);
    let cursor = 10 * 60;
    const close = 20 * 60;
    dayAppts.forEach((a) => {
      if (a.s - cursor >= 60) empty.push({ staffId: s.id, staff: s.name, from: cursor, to: a.s });
      cursor = Math.max(cursor, a.e);
    });
    if (close - cursor >= 60) empty.push({ staffId: s.id, staff: s.name, from: cursor, to: close });
  });
  return empty.map((e) => ({
    ...e,
    fromLabel: new Date(0, 0, 0, Math.floor(e.from / 60), e.from % 60).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    toLabel: new Date(0, 0, 0, Math.floor(e.to / 60), e.to % 60).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  })).sort((a, b) => b.to - b.from).slice(0, 10);
}

// ---------- Money left on the table ----------
function computeMoneyLeft() {
  const noShows = todayAppts().filter((a) => a.status === 'no-show').reduce((s, a) => s + a.price, 0);
  const cancelled = todayAppts().filter((a) => a.status === 'cancelled').reduce((s, a) => s + a.price, 0);
  const empty = computeEmptySlots();
  const ab = averageBill();
  const emptySlots = empty.length * Math.round(ab * 0.6);
  const overdue = computeOverdue();
  const overdueCusts = Math.round(overdue.length * ab * 0.7);
  const enquiry = db().conversations.filter((c) => ['needs-action', 'waiting'].includes(c.status)).length * Math.round(ab * 0.5);
  return [
    { label: 'No-shows', amount: noShows, note: `${todayAppts().filter((a) => a.status === 'no-show').length} today` },
    { label: 'Cancellations', amount: cancelled, note: 'lost today' },
    { label: 'Empty slots', amount: emptySlots, note: `${empty.length} open windows` },
    { label: 'Overdue customers', amount: overdueCusts, note: `${overdue.length} not rebooked` },
    { label: 'Unconverted enquiries', amount: enquiry, note: 'sitting in inbox' }
  ];
}

// ---------- Customer segments ----------
function computeSegments() {
  const segs = { VIP: [], 'At risk': [], Overdue: [], New: [], Lost: [], Advocates: [] };
  db().customers.forEach((c) => {
    const gap = c.lastVisitAt ? daysGap(c.lastVisitAt) : 9999;
    if (c.tags && c.tags.includes('vip')) segs.VIP.push(c);
    if (c.tags && c.tags.includes('at-risk')) segs['At risk'].push(c);
    if (c.tags && c.tags.includes('overdue')) segs.Overdue.push(c);
    if ((c.visitCount || 0) <= 2) segs.New.push(c);
    if (gap > 90) segs.Lost.push(c);
    if (c.tags && c.tags.includes('advocate')) segs.Advocates.push(c);
  });
  return Object.entries(segs).map(([label, list]) => ({ label, count: list.length, items: list }));
}

// ---------- Staff utilization ----------
function computeStaffUtilization() {
  return db().staff.map((s) => {
    const mine = todayAppts().filter((a) => a.staffId === s.id);
    const active = mine.filter((a) => ACTIVE.includes(a.status));
    const bookedHours = active.reduce((t, a) => t + (a.durationMin || 40) / 60, 0);
    const openHours = 10;
    const past = db().appointments.filter((a) => a.staffId === s.id && a.status === 'completed');
    const total = past;
    const revenue = past.reduce((sum, a) => sum + a.price, 0);
    const customers = new Set(past.map((a) => a.customerId));
    const avgBill = total.length ? Math.round(revenue / total.length) : 0;
    const noshow = db().appointments.filter((a) => a.staffId === s.id && a.status === 'no-show').length;
    const noshowTotal = db().appointments.filter((a) => a.staffId === s.id && (a.status === 'no-show' || a.status === 'completed')).length;
    return {
      id: s.id, name: s.name, color: s.color,
      utilization: Math.min(100, Math.round((bookedHours / openHours) * 100)),
      todayBooked: active.length,
      revenue, avgBill,
      repeatPct: customers.size ? Math.round((customers.size / Math.max(1, total.length)) * 100) : 0,
      noShowRate: noshowTotal ? Math.round((noshow / noshowTotal) * 100) : 0
    };
  }).sort((a, b) => b.utilization - a.utilization);
}

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

module.exports = {
  computeTodaySummary, computeNoShowRisks, computeOverdue, computeEmptySlots,
  computeMoneyLeft, computeSegments, computeStaffUtilization,
  averageBill, fmtDay, fmtTime, staffName, custName, byId, ACTIVE
};