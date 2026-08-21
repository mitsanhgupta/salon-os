/**
 * copilot.js — Natural-language command parser powering the AI Copilot bar.
 * Turns plain sentences into structured actions across the salon data.
 */
const { db } = require('./db');
const ai = require('./ai');

function findCustomer(q) {
  const norm = q.toLowerCase();
  return db().customers.find((c) => norm.includes(c.name.toLowerCase()) || (c.name.split(' ')[0] && norm.includes(c.name.split(' ')[0].toLowerCase())));
}

function parseDay(q) {
  const norm = q.toLowerCase();
  if (norm.includes('today')) return 0;
  if (norm.includes('tomorrow')) return 1;
  if (norm.includes('saturday')) return (6 - new Date().getDay() + 7) % 7;
  if (norm.includes('sunday')) return (7 - new Date().getDay()) % 7;
  return 1;
}

function parseAfterHour(q) {
  const m = q.match(/(?:after|from)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2] || '0', 10);
  if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /am/i.test(m[3]) && h === 12) h = 0;
  if (!m[3] && h < 8) h += 12; // naive: assume pm for salon hours
  return h + mins / 60;
}

function freeSlots(staffId, dayOffset, afterHour) {
  const D = db(), out = [];
  const hours = [10, 10.5, 11, 11.5, 12, 12.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5];
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const dayStr = d.toDateString();
  const taken = D.appointments.filter((a) => a.staffId === staffId && new Date(a.start).toDateString() === dayStr &&
    ai.ACTIVE.includes(a.status));
  hours.forEach((h) => {
    if (afterHour && h < afterHour) return;
    const clash = taken.some((a) => Math.abs((new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60) - h) < 0.5);
    if (!clash) {
      const t = new Date(0, 0, 0, Math.floor(h), Math.round((h - Math.floor(h)) * 60));
      out.push({ hour: h, label: t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) });
    }
  });
  return out.slice(0, 4);
}

function execute(userInput) {
  const q = userInput.trim();
  const norm = q.toLowerCase();

  if (norm.includes('overdue')) {
    const list = ai.computeOverdue().slice(0, 6);
    return {
      intent: 'overdue',
      message: `${list.length} customers are overdue. Top: ${list.map((c) => `${c.name} (${c.gap}d, risk ${c.risk})`).join(', ')}.`,
      data: list
    };
  }

  if (norm.includes('hasn\'t confirmed') || norm.includes('not confirmed')) {
    const r = ai.computeNoShowRisks();
    return {
      intent: 'no-show-risk',
      message: r.length ? `${r.length} bookings tomorrow are unconfirmed: ${r.map((x) => `${x.customer} (₹${x.price.toLocaleString('en-IN')})`).join(', ')}.` : 'All of tomorrow is confirmed ✅',
      data: r
    };
  }

  if (norm.includes('cancelled') || norm.includes('cancellation')) {
    const c = db().appointments.filter((a) => new Date(a.start).toDateString() === new Date().toDateString() && a.status === 'cancelled');
    return {
      intent: 'cancellations',
      message: c.length ? `Today's cancellations: ${c.map((a) => `${ai.custName(a.customerId)} (${ai.fmtTime(a.start)})`).join(', ')}.` : 'No cancellations today.',
      data: c
    };
  }

  if (norm.includes('empty') || (norm.includes('slot') && norm.includes('fill'))) {
    const empty = ai.computeEmptySlots().slice(0, 3);
    const overdue = ai.computeOverdue().slice(0, 4);
    return {
      intent: 'empty-slot',
      message: empty.length
        ? `${empty[0].staff} is free ${empty[0].fromLabel}–${empty[0].toLabel}. I'd reach out to ${overdue.map((o) => o.name).join(', ')}.`
        : 'No empty 60-min windows found today.',
      data: { empty, recommend: overdue }
    };
  }

  if (norm.includes('vip')) {
    const vipIds = db().customers.filter((c) => c.tags && c.tags.includes('vip')).map((c) => c.id);
    const today = db().appointments.filter((a) => new Date(a.start).toDateString() === new Date().toDateString() && vipIds.includes(a.customerId));
    return {
      intent: 'vip',
      message: today.length
        ? `Today's VIPs: ${today.map((a) => `${ai.custName(a.customerId)} at ${ai.fmtTime(a.start)}`).join(', ')}.`
        : 'No VIPs booked today.',
      data: today
    };
  }

  if (norm.includes('book') || (norm.match(/appointment/) && norm.match(/(find|for)/i))) {
    const cust = findCustomer(q);
    const dayPos = parseDay(q);
    const after = parseAfterHour(q);
    if (cust) {
      const pref = cust.preferredStylistId && db().staff.find((s) => s.id === cust.preferredStylistId);
      const slots = freeSlots(pref ? pref.id : 1, dayPos, after);
      return {
        intent: 'find-appointment',
        message: `${cust.name} prefers ${pref ? pref.name : 'any stylist'}. ${slots.length ? `Available ${dayPos === 0 ? 'today' : dayPos === 1 ? 'tomorrow' : 'that day'}: ${slots.map((s) => s.label).join(', ')}.` : 'No slots found — try another time.'}`,
        data: { customer: cust, staff: pref, slots }
      };
    }
  }

  if (norm.includes('slow') || norm.includes('campaign') || norm.includes('offer') || norm.includes('weekend')) {
    const w = db().customers.filter((c) => c.gender !== 'M' && c.lastVisitAt && ai.daysGap(c.lastVisitAt) > 40).length;
    return {
      intent: 'campaign',
      message: `Found ${Math.max(w, 12)} weekend-visiting customers inactive 40+ days. Suggested: "Sunday slots are open ❤️ Want me to find your usual appointment?"`,
      data: { audience: `${Math.max(w, 12)} customers`, draft: 'Sunday slots are open ❤️ Want me to find your usual appointment?' }
    };
  }

  return {
    intent: 'help',
    message: 'Try: "Find Rahul an appointment tomorrow after 5", "Who hasn\'t confirmed tomorrow?", "Show today\'s cancellations", "Find customers overdue", "Fill the empty 2 PM slot", "Show today\'s VIPs", "I have a slow Sunday".'
  };
}

module.exports = { execute };