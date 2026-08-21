/**
 * index.js — Salon OS web server.
 * Serves the SPA and a REST API. Data lives in data/db.json (see db.js).
 * On first boot with no database, the demo dataset is seeded automatically.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const { db, load, save, nextId, reset } = require('./db');
const ai = require('./ai');
const copilot = require('./copilot');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------- Bootstrap ----------
if (!fs.existsSync(path.join(__dirname, '..', 'data', 'db.json'))) {
  reset();
  require('./seed').build();
  save();
  console.log('→ No database found. Seeded demo data for Looks Salon.');
}

// ---------- Simple token auth (demo-grade) ----------
const tokens = new Map();
function authUser(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const uid = tokens.get(t);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  req.user = db().users.find((u) => u.id === uid);
  req.token = t;
  next();
}

function publicUser(u) {
  return { id: u.id, name: u.name, role: u.role, email: u.email };
}

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { email, phone, password } = req.body;
  const key = (email || phone || '').toString().toLowerCase().trim();
  const user = db().users.find((u) => (u.email || '').toLowerCase() === key);
  if (!user || user.pass !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Try owner@lookssalon.com / owner123' });
  }
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  tokens.set(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', authUser, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', (req, res) => {
  if (req.headers.authorization) tokens.delete(req.headers.authorization.replace('Bearer ', ''));
  res.json({ ok: true });
});

app.get('/api/meta', authUser, (req, res) => {
  res.json({ salon: db().salon, user: publicUser(req.user) });
});

app.get('/api/reset', authUser, (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  reset();
  require('./seed').build();
  save();
  res.json({ ok: true, message: 'Demo data reset.' });
});

// ---------- Customers ----------
function customerView(c) {
  const visits = db().appointments.filter((a) => a.customerId === c.id).length;
  return { ...c, totalAppointments: visits };
}

app.get('/api/customers', authUser, (req, res) => {
  const list = db().customers.map(customerView).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  res.json(list);
});

app.get('/api/customers/:id', authUser, (req, res) => {
  const c = db().customers.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Not found' });
  const history = db().appointments.filter((a) => a.customerId === c.id).sort((a, b) => b.start.localeCompare(a.start));
  res.json({ ...customerView(c), history });
});

app.post('/api/customers', authUser, (req, res) => {
  const c = {
    id: nextId('customers'), name: req.body.name, phone: req.body.phone || '',
    gender: req.body.gender || '', language: 'Hindi', birthday: '',
    preferredStylistId: req.body.preferredStylistId || null,
    preferredServiceIds: req.body.preferredServiceIds || [],
    typicalInterval: req.body.typicalInterval || 30, lifetimeValue: 0,
    visitCount: 1, attendance: 100, lastVisitAt: null, createdAt: new Date().toISOString(),
    tags: [], notes: ''
  };
  db().customers.push(c);
  save();
  res.json(customerView(c));
});

// ---------- Appointments ----------
const statusLabel = { pending: 'Pending', confirmed: 'Confirmed', arrived: 'Arrived', 'in-service': 'In service', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-show' };

function appointmentView(a) {
  const c = db().customers.find((x) => x.id === a.customerId);
  const s = db().staff.find((x) => x.id === a.staffId);
  const svcs = a.serviceIds.map((id) => db().services.find((x) => x.id === id) || {});
  return {
    ...a,
    customerName: c ? c.name : '—',
    customerPhone: c ? c.phone : '',
    staffName: s ? s.name : '—',
    staffColor: s ? s.color : '#666',
    services: svcs.map((x) => x.name).filter(Boolean),
    statusLabel: statusLabel[a.status] || a.status
  };
}

app.get('/api/appointments', authUser, (req, res) => {
  const day = Number(req.query.day || 0);
  if (isNaN(day) || day < -14 || day > 30) return res.status(400).json({ error: 'Bad day' });
  const d = new Date(); d.setDate(d.getDate() + day);
  const dayStr = d.toDateString();
  const list = db().appointments
    .filter((a) => new Date(a.start).toDateString() === dayStr)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(appointmentView);
  res.json({ day, list });
});

app.post('/api/appointments', authUser, (req, res) => {
  const { customerId, staffId, serviceIds, start, notes, source } = req.body;
  if (!customerId || !staffId || !serviceIds || !serviceIds.length || !start) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const duration = db().services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.durationMin, 30);
  const price = db().services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0);
  const a = {
    id: nextId('appointments'), customerId, staffId, serviceIds,
    start, end: new Date(new Date(start).getTime() + duration * 60000).toISOString(),
    durationMin: duration, price, notes: notes || '', source: source || 'manual',
    status: 'confirmed', confirmation: 'confirmed', createdAt: new Date().toISOString()
  };
  db().appointments.push(a);
  save();
  res.json(appointmentView(a));
});

app.patch('/api/appointments/:id', authUser, (req, res) => {
  const a = db().appointments.find((x) => x.id === Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  if (req.body.status) a.status = req.body.status;
  if (req.body.confirmation) a.confirmation = req.body.confirmation;
  if (req.body.notes !== undefined) a.notes = req.body.notes;
  if (req.body.staffId) a.staffId = req.body.staffId;
  if (req.body.start) { a.start = req.body.start; a.end = new Date(new Date(a.start).getTime() + a.durationMin * 60000).toISOString(); }
  save();
  res.json(appointmentView(a));
});

// ---------- Conversations ----------
function conversationView(c) {
  const cust = db().customers.find((x) => x.id === c.customerId);
  return { ...c, customerName: cust ? cust.name : 'Unknown', customerPhone: cust ? cust.phone : '' };
}

app.get('/api/conversations', authUser, (req, res) => {
  const list = db().conversations.map(conversationView).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  res.json(list);
});

app.post('/api/conversations/:id/messages', authUser, (req, res) => {
  const conv = db().conversations.find((x) => x.id === Number(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Not found' });
  const msg = { id: conv.messages.length + 1, from: req.body.from || 'staff', text: req.body.text, at: new Date().toISOString() };
  conv.messages.push(msg);
  conv.lastMessage = msg.text;
  conv.lastAt = msg.at;
  if (msg.from !== 'customer') { conv.unread = 0; conv.status = 'waiting'; }
  save();
  res.json(conversationView(conv));
});

app.post('/api/conversations/:id/takeover', authUser, (req, res) => {
  const conv = db().conversations.find((x) => x.id === Number(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Not found' });
  conv.autoMode = false;
  conv.managedBy = req.user.name;
  save();
  res.json(conversationView(conv));
});

// ---------- Services / Staff / Payments ----------
app.get('/api/services', authUser, (req, res) => res.json(db().services));

app.patch('/api/services/:id', authUser, (req, res) => {
  const s = db().services.find((x) => x.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (req.body.isActive !== undefined) s.isActive = req.body.isActive;
  if (req.body.price !== undefined) s.price = req.body.price;
  save();
  res.json(s);
});

app.get('/api/staff', authUser, (req, res) => res.json(db().staff));

app.get('/api/payments', authUser, (req, res) => {
  const list = db().payments.map((p) => ({ ...p, customerName: ai.custName(p.customerId) })).sort((a, b) => b.at.localeCompare(a.at));
  res.json(list);
});

app.post('/api/payments/:id/collect', authUser, (req, res) => {
  const p = db().payments.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  p.status = 'paid';
  p.method = req.body.method || p.method || 'UPI';
  save();
  res.json(p);
});

// ---------- Campaigns ----------
app.get('/api/campaigns', authUser, (req, res) => res.json(db().campaigns));

app.post('/api/campaigns', authUser, (req, res) => {
  const c = {
    id: nextId('campaigns'), name: req.body.name || 'Untitled',
    message: req.body.message, audience: req.body.audience || '',
    status: 'draft', sentAt: null, sentCount: 0
  };
  db().campaigns.push(c);
  save();
  res.json(c);
});

app.post('/api/campaigns/:id/send', authUser, (req, res) => {
  const c = db().campaigns.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Not found' });
  c.status = 'sent';
  c.sentAt = new Date().toISOString();
  c.sentCount = db().customers.length;
  save();
  res.json(c);
});

// ---------- Owner / AI overview ----------
app.get('/api/owner/overview', authUser, (req, res) => {
  res.json({
    today: ai.computeTodaySummary(),
    moneyLeft: ai.computeMoneyLeft(),
    noShowRisks: ai.computeNoShowRisks(),
    emptySlots: ai.computeEmptySlots(),
    overdue: ai.computeOverdue(),
    staffUtil: ai.computeStaffUtilization(),
    segments: ai.computeSegments(),
    conversations: db().conversations.length
  });
});

app.get('/api/owner/actions', authUser, (req, res) => {
  const risks = ai.computeNoShowRisks();
  const empty = ai.computeEmptySlots()[0];
  const overdue = ai.computeOverdue().find((o) => o.risk === 'HIGH');
  const actions = [
    { id: 1, kind: 'warning', title: 'Two high-value customers haven\'t confirmed tomorrow.', detail: `Total at risk: ₹${(risks[0] || {}).price || 0 + (risks[1] || {}).price || 0}, for ${(risks[0] || {}).customer || '—'} & ${(risks[1] || {}).customer || '—'}`, cta: 'Fix', target: 'appointments', day: 1 },
    { id: 2, kind: 'slot', title: `${empty ? empty.fromLabel + '–' + empty.toLabel + ' is empty' : 'No large empty window today'}`, detail: `${empty ? empty.staff + ' has capacity. ' : ''}Recommended: reach your overdue list.`, cta: 'Fill slot', target: 'customers' },
    { id: 3, kind: 'reactivate', title: `${(overdue || {}).name || 'A high-value customer'} is overdue.`, detail: `Gap ${(overdue || {}).gap || '65'} days vs normal ${(overdue || {}).typicalInterval || '30'}. LTV ₹${((overdue || {}).lifetimeValue || 0).toLocaleString('en-IN')}.`, cta: 'Reactivate', target: 'customers' },
    { id: 4, kind: 'investigate', title: 'Hair-color product consumption is unusually high.', detail: 'Orders are 32% above the trailing 4-week average. Verify stock levels.', cta: 'Investigate', target: 'reports' }
  ];
  res.json(actions);
});

app.get('/api/owner/insights', authUser, (req, res) => {
  const overdue = ai.computeOverdue().filter((o) => o.risk === 'HIGH');
  const util = ai.computeStaffUtilization();
  const top = util[0];
  const insights = [
    { id: 1, type: 'churn', severity: 'high', title: `${overdue.length} customers showing churn signals`, detail: overdue.slice(0, 3).map((o) => `${o.name}: gap ${o.gap}d vs ${o.typicalInterval}d`).join(' · '), recommendation: 'Send personalized reactivation messages with a [Reactivate] action.' },
    { id: 2, type: 'staffing', severity: 'medium', title: `${top ? top.name : 'Aman'} is consistently overbooked between 6–8 PM`, detail: top ? `${top.name} is at ${top.utilization}% utilization today.` : '', recommendation: 'Consider assigning another stylist during this window.' },
    { id: 3, type: 'revenue', severity: 'medium', title: 'Weekend demand is trending up', detail: 'Saturday bookings are 14% ahead of the 4-week average.', recommendation: 'Open thinner service time-slots on Saturday — facial + makeup demand is rising.' },
    { id: 4, type: 'reactivation', severity: 'low', title: `${ai.computeOverdue().length} overdue customers could return this week`, detail: 'Combined LTV of the overdue list makes them the single largest recoverable pool.', recommendation: 'Suggested campaign: "Sunday slots are open ❤️ Want your usual appointment?"' }
  ];
  res.json(insights);
});

// ---------- AI Copilot ----------
app.post('/api/copilot', authUser, (req, res) => {
  try {
    const result = copilot.execute(req.body.query || '');
    res.json(result);
  } catch (e) {
    res.status(400).json({ intent: 'error', message: 'Could not parse that command. ' + e.message });
  }
});

// ---------- Customer portal auth ----------
app.post('/api/auth/customer', (req, res) => {
  const phone = normPhone(req.body.phone);
  let cust = db().customers.find((c) => normPhone(c.phone) === phone);
  if (!cust) {
    cust = { id: nextId('customers'), name: req.body.name || 'New Customer', phone: req.body.phone || '', gender: '', language: 'Hindi', birthday: '', preferredStylistId: null, preferredServiceIds: [1], typicalInterval: 30, lifetimeValue: 0, visitCount: 0, attendance: 100, lastVisitAt: null, createdAt: new Date().toISOString(), tags: ['New'], notes: '' };
    db().customers.push(cust);
    save();
  }
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  tokens.set(token, 'cust-' + cust.id);
  res.json({ token, user: { id: cust.id, name: cust.name, phone: cust.phone, role: 'customer' } });
});

function normPhone(p) { return (p || '').replace(/[^\d]/g, ''); }

function findByToken(t) { const uid = tokens.get(t); if (!uid) return null; if (String(uid).startsWith('cust-')) return { cust: db().customers.find((c) => c.id === Number(uid.split('-')[1])) }; return { user: db().users.find((u) => u.id === uid) }; }

function slotTimesFor(dayOffset) {
  const d = new Date(); d.setDate(d.getDate() + dayOffset);
  const dayStr = d.toDateString();
  const hours = [10, 10.5, 11, 11.5, 12, 12.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5];
  return { d, dayStr, hours };
}
function isFree(staffId, dayOffset, hour) {
  const { dayStr } = slotTimesFor(dayOffset);
  return !db().appointments.some((a) => a.staffId === staffId && new Date(a.start).toDateString() === dayStr &&
    ai.ACTIVE.includes(a.status) && Math.abs((new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60) - hour) < 0.5);
}
function freeSlotsFor(staffId, dayOffset, afterHour) {
  const { dayStr, hours } = slotTimesFor(dayOffset);
  const taken = db().appointments.filter((a) => a.staffId === staffId && new Date(a.start).toDateString() === dayStr && ai.ACTIVE.includes(a.status));
  return hours.filter((h) => !(afterHour && h < afterHour) && !taken.some((a) => Math.abs((new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60) - h) < 0.5));
}
function lbl(h) { return new Date(0, 0, 0, Math.floor(h), Math.round((h - Math.floor(h)) * 60)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

function svcKeywords(norm) {
  const map = { 'haircut': 1, 'beard': 2, 'facial': 6, 'manicure': 7, 'pedicure': 8, 'keratin': 4, 'hair color': 3, 'colour': 3, 'hair spa': 5, 'bridal': 10, 'makeup': 10, 'threading': 11, 'waxing': 12, 'massage': 9, 'skin': 14 };
  const hits = [];
  Object.keys(map).forEach((k) => { if (norm.includes(k)) hits.push(map[k]); });
  return hits.length ? [...new Set(hits)] : null;
}
function parseDay(norm) {
  if (norm.includes('today')) return 0;
  if (norm.includes('tomorrow') || norm.includes('tommorow')) return 1;
  if (norm.includes('saturday')) return (6 - new Date().getDay() + 7) % 7;
  if (norm.includes('sunday')) return (7 - new Date().getDay()) % 7;
  return 1;
}
function parseTime(norm) {
  let m = norm.match(/(\d{1,2})(?::|\.)(\d{2})/);
  let h, min;
  if (m) { h = parseInt(m[1], 10); min = parseInt(m[2], 10); if (h < 8) h += 12; }
  else { m = norm.match(/(\d{1,2})\s*(am|pm)/i); if (m) { h = parseInt(m[1], 10); if (/pm/i.test(m[2]) && h < 12) h += 12; if (/am/i.test(m[2]) && h === 12) h = 0; } }
  return h != null && h >= 10 ? { h, m: min || 0 } : null;
}

// ---------- WhatsApp AI brain ----------
function createBooking(customer, serviceIds, staffId, dayOffset, hour) {
  const D = db();
  const { d } = slotTimesFor(dayOffset);
  let h = hour;
  const duration = D.services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.durationMin, 30);
  const price = D.services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0);
  if (!isFree(staffId, dayOffset, h)) {
    const next = freeSlotsFor(staffId, dayOffset, h)[0];
    if (next == null) return null;
    h = next;
  }
  d.setHours(Math.floor(h), Math.round((h - Math.floor(h)) * 60), 0, 0);
  const start = d.toISOString();
  const appt = {
    id: nextId('appointments'), customerId: customer.id, staffId, serviceIds,
    start, end: new Date(new Date(start).getTime() + duration * 60000).toISOString(),
    durationMin: duration, price, notes: '', source: 'AI WhatsApp', status: 'confirmed',
    confirmation: 'pending', createdAt: new Date().toISOString()
  };
  D.appointments.push(appt);
  const svNames = serviceIds.map((id) => (D.services.find((s) => s.id === id) || {}).name).join(' + ');
  const st = D.staff.find((s) => s.id === staffId);
  const when = new Date(start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const at = new Date(start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { appt, text: `Booked ✅ ${svNames} · ${when} · ${at} · with ${st ? st.name : 'us'} · ₹${price.toLocaleString('en-IN')}\nI\'ll send a reminder before your visit.` };
}

function aiReply(customer, conv, text) {
  const D = db();
  const norm = text.toLowerCase();
  const lastAi = [...conv.messages].reverse().find((m) => m.from !== 'customer');
  const lastAiText = lastAi ? (lastAi.text || '').toLowerCase() : '';
  const upcoming = D.appointments.filter((a) => a.customerId === customer.id && ai.ACTIVE.includes(a.status) && new Date(a.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (norm.includes('cancel')) {
    if (upcoming.length) {
      upcoming[0].status = 'cancelled';
      save();
      return `Sure — your ${dayNames[new Date(upcoming[0].start).getDay()]} appointment with ${ai.staffName(upcoming[0].staffId)} is cancelled. Booking you in is one message away whenever you're ready ❤️`;
    }
    return 'You don\'t have any upcoming appointments, so nothing to cancel 😊';
  }

  if (norm.includes('how much') || norm.includes('price') || norm.includes('cost') || norm.includes('rate')) {
    const svcs = svcKeywords(norm);
    if (svcs) {
      return svcs.map((id) => { const s = D.services.find((x) => x.id === id); return `${s.name}: ₹${s.price.toLocaleString('en-IN')} (~${s.durationMin} min)`; }).join(' · ') + `. Want me to book it?`;
    }
    return `Our services run from ₹80 (threading) to ₹8,000 (bridal makeup). What are you looking for?`;
  }

  if (norm.includes('pay') || norm.includes('bill')) {
    const p = D.payments.find((x) => x.customerId === customer.id && x.status === 'pending');
    return p ? `Your outstanding bill is ₹${p.amount.toLocaleString('en-IN')}.\n[Pay ₹${p.amount.toLocaleString('en-IN')}] via UPI · receipt auto-generated ✅` : 'You\'re all settled up ✅ No pending bills.';
  }

  if (norm.includes('reschedule') || norm.includes('move') || (norm.includes('change') && upcoming.length)) {
    const slots = freeSlotsFor(customer.preferredStylistId || 1, 1).slice(0, 3);
    return slots.length ? `I can move your appointment. Free slots tomorrow: ${slots.map(lbl).join(', ')}. Which works for you?` : 'Tomorrow looks full — want me to check the day after?';
  }

  if (norm.includes('usual') || norm.includes('ususal') || norm.includes('same as last')) {
    const svcs = (customer.preferredServiceIds && customer.preferredServiceIds.length ? customer.preferredServiceIds : [1]).slice(0, 2);
    const st = customer.preferredStylistId || 1;
    const slots = freeSlotsFor(st, 1).slice(0, 3);
    const svNames = svcs.map((id) => (D.services.find((s) => s.id === id) || {}).name).join(' + ');
    if (slots.length) return `Your usual is ${svNames} with ${ai.staffName(st)}. Tomorrow: ${slots.map(lbl).join(', ')}. Which works?`;
    return `Tomorrow with ${ai.staffName(st)} is full 😔 Want a different time or stylist?`;
  }

  const wasOffer = lastAiText && (lastAiText.includes('which works') || lastAiText.includes('available') || lastAiText.includes('which would you like'));
  const choiceStaff = D.staff.find((s) => norm.includes(s.name.toLowerCase()));
  const choiceTime = parseTime(norm);
  if (wasOffer && (choiceStaff || choiceTime)) {
    const staffId = choiceStaff ? choiceStaff.id : (customer.preferredStylistId || 1);
    const hour = choiceTime ? choiceTime.h + choiceTime.m / 60 : freeSlotsFor(staffId, 1)[0];
    const book = createBooking(customer, (customer.preferredServiceIds && customer.preferredServiceIds.length ? customer.preferredServiceIds : [1]), staffId, 1, hour);
    return book ? book.text : 'That slot just got taken 😐 Let me find another — one sec.';
  }

  const svcs = svcKeywords(norm);
  const time = parseTime(norm);
  const dayOff = parseDay(norm);
  if (svcs && time) {
    const staffId = customer.preferredStylistId || D.staff[0].id;
    const book = createBooking(customer, svcs, staffId, dayOff, time.h + time.m / 60);
    return book ? book.text : 'That exact slot isn\'t free 😕 Tell me another time.';
  }

  if (svcs) {
    const staffId = customer.preferredStylistId || D.staff[0].id;
    const slots = freeSlotsFor(staffId, dayOff).slice(0, 3);
    const svNames = svcs.map((id) => (D.services.find((s) => s.id === id) || {}).name).join(' + ');
    return slots.length ? `Great — ${svNames} with ${ai.staffName(staffId)}. Coming up we have ${slots.map(lbl).join(', ')}. Which works for you?` : 'That day looks full for your usual stylist — want me to check another day?';
  }

  if (/^(hi|hii+|hello|hey|namaste|good\s*(morning|evening|afternoon))/.test(norm)) {
    return `Hey ${customer.name.split(' ')[0]} 👋 Welcome to ${D.salon.name}!\n\nWhat would you like to do?\n\n• Book an appointment\n• See services\n• Talk to the salon\n\nOr just type naturally — "Haircut tomorrow evening" works fine 🙂`;
  }

  if (norm.includes('service') || norm.includes('offer') || norm.includes('menu')) {
    return D.services.filter((s) => s.isActive).slice(0, 8).map((s) => `${s.name} — ₹${s.price}`).join('\n') + '\n\nWant me to book any of these?';
  }

  return `I can book, reschedule or cancel appointments, check prices and send bills. Try:\n• "Haircut tomorrow evening"\n• "Book my usual"\n• "How much is keratin?"`;
}

// ---------- WhatsApp / customer routes ----------
function customerAuth(req) { const a = findByToken((req.headers.authorization || '').replace('Bearer ', '')); return a && a.cust ? a.cust : null; }

app.post('/api/whatsapp', (req, res) => {
  const cust = customerAuth(req);
  if (!cust) return res.status(401).json({ error: 'Unauthorized' });
  let conv = db().conversations.find((c) => c.customerId === cust.id && c.channel === 'WhatsApp');
  if (!conv) {
    conv = { id: nextId('conversations'), customerId: cust.id, channel: 'WhatsApp', status: 'waiting', lastMessage: '', lastAt: new Date().toISOString(), aiSuggestion: '', unread: 0, messages: [] };
    db().conversations.push(conv);
  }
  const now = new Date().toISOString();
  conv.messages.push({ id: conv.messages.length + 1, from: 'customer', text: req.body.message, at: now });
  const reply = aiReply(cust, conv, req.body.message);
  conv.messages.push({ id: conv.messages.length + 1, from: 'ai', text: reply, at: new Date().toISOString() });
  conv.lastMessage = reply;
  conv.lastAt = new Date().toISOString();
  conv.status = 'waiting';
  save();
  res.json({ reply, conversation: conv });
});

app.get('/api/whatsapp/history', (req, res) => {
  const cust = customerAuth(req);
  if (!cust) return res.status(401).json({ error: 'Unauthorized' });
  const conv = db().conversations.find((c) => c.customerId === cust.id && c.channel === 'WhatsApp') || { messages: [] };
  res.json(conv);
});

app.get('/api/customer/appointments', (req, res) => {
  const cust = customerAuth(req);
  if (!cust) return res.status(401).json({ error: 'Unauthorized' });
  const list = db().appointments.filter((a) => a.customerId === cust.id)
    .sort((a, b) => b.start.localeCompare(a.start))
    .map(appointmentView);
  res.json(list);
});

app.post('/api/customer/appointments/:id/cancel', (req, res) => {
  const cust = customerAuth(req);
  if (!cust) return res.status(401).json({ error: 'Unauthorized' });
  const a = db().appointments.find((x) => x.id === Number(req.params.id) && x.customerId === cust.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.status = 'cancelled';
  save();
  res.json(appointmentView(a));
});

// ---------- Static SPA ----------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 4123;
app.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────┐');
  console.log('│  Salon OS — the AI OS for salons          │');
  console.log(`│  http://localhost:${PORT}                     │`);
  console.log('└──────────────────────────────────────────┘');
  console.log('Demo logins: owner@lookssalon.com / owner123 · reception@lookssalon.com / reception123');
});