/**
 * seed.js — Generates a rich, realistic demo dataset for "Looks Salon".
 * Run directly:  node server/seed.js   (writes data/db.json)
 * Imported by index.js on first boot when no database exists.
 */
const { db, save, reset } = require('./db');

// Deterministic PRNG so regeneration reproduces the same dataset.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(n, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  if (h !== undefined && h !== null) d.setHours(h, m || 0, 0, 0);
  return d.toISOString();
}

function build() {
  const D = db();
  D.salon = {
    id: 1,
    name: 'Looks Salon',
    tagline: 'The AI-Native Salon',
    address: 'G-14, C-Scheme, Jaipur',
    phone: '+91 98290 12345',
    email: 'hello@lookssalon.in',
    currency: '₹',
    hours: { open: 10, close: 21 },
    plan: 'Growth'
  };

  D.users = [
    { id: 1, role: 'owner', name: 'Amit Sharma', email: 'owner@lookssalon.com', phone: '9829000001', pass: 'owner123' },
    { id: 2, role: 'receptionist', name: 'Ritu Verma', email: 'reception@lookssalon.com', phone: '9829000002', pass: 'reception123' },
    { id: 3, role: 'manager', name: 'Varun Mehta', email: 'manager@lookssalon.com', phone: '9829000003', pass: 'manager123' }
  ];

  D.staff = [
    { id: 1, name: 'Aman', role: 'Lead Stylist', services: [1, 2, 3, 4, 5, 13], color: '#5B9DFF' },
    { id: 2, name: 'Simran', role: 'Stylist', services: [1, 2, 5, 6, 11, 12], color: '#3ECF8E' },
    { id: 3, name: 'Priya', role: 'Senior Stylist', services: [6, 7, 8, 10, 11, 12, 14], color: '#FF6B4A' },
    { id: 4, name: 'Vikram', role: 'Stylist', services: [1, 2, 3, 4, 5, 13], color: '#F5B841' }
  ];

  D.services = [
    { id: 1, name: 'Haircut', category: 'Hair', durationMin: 30, price: 250, isActive: true },
    { id: 2, name: 'Beard Trim', category: 'Grooming', durationMin: 20, price: 100, isActive: true },
    { id: 13, name: 'Haircut + Beard', category: 'Hair', durationMin: 45, price: 330, isActive: true },
    { id: 3, name: 'Hair Color', category: 'Hair', durationMin: 120, price: 1200, isActive: true },
    { id: 4, name: 'Keratin', category: 'Hair', durationMin: 150, price: 2500, isActive: true },
    { id: 5, name: 'Hair Spa', category: 'Hair', durationMin: 60, price: 800, isActive: true },
    { id: 6, name: 'Facial', category: 'Skin', durationMin: 60, price: 900, isActive: true },
    { id: 14, name: 'Skin Treatment', category: 'Skin', durationMin: 90, price: 1500, isActive: true },
    { id: 7, name: 'Manicure', category: 'Nails', durationMin: 45, price: 400, isActive: true },
    { id: 8, name: 'Pedicure', category: 'Nails', durationMin: 60, price: 500, isActive: true },
    { id: 10, name: 'Bridal Makeup', category: 'Makeup', durationMin: 180, price: 8000, isActive: true },
    { id: 11, name: 'Threading', category: 'Grooming', durationMin: 15, price: 80, isActive: true },
    { id: 12, name: 'Waxing', category: 'Grooming', durationMin: 40, price: 500, isActive: true },
    { id: 9, name: 'Head Massage', category: 'Spa', durationMin: 30, price: 350, isActive: true }
  ];
  D.customers = [
    { id: 1, name: 'Rahul Sharma', phone: '98111 00001', gender: 'M', language: 'Hindi', birthday: '1990-04-12', preferredStylistId: 1, preferredTime: '5–8 PM', preferredServiceIds: [1, 2], typicalInterval: 35, lifetimeValue: 28400, visitCount: 18, attendance: 92, lastVisitAt: iso(-32, 18), createdAt: iso(-420), tags: ['vip', 'overdue'], notes: 'Usually visits weekends, books haircut + beard.' },
    { id: 2, name: 'Neha Gupta', phone: '98111 00002', gender: 'F', language: 'Hindi', birthday: '1993-08-19', preferredStylistId: 3, preferredTime: 'Evening', preferredServiceIds: [6, 7, 10], typicalInterval: 31, lifetimeValue: 42800, visitCount: 26, attendance: 95, lastVisitAt: iso(-67, 19), createdAt: iso(-700), tags: ['at-risk', 'overdue'], notes: 'High-value. Gap 67d vs normal ~31d. Churn risk HIGH.' },
    { id: 3, name: 'Arjun Mehta', phone: '98111 00003', gender: 'M', language: 'Hindi', birthday: '1995-01-03', preferredStylistId: 1, preferredTime: 'Morning', preferredServiceIds: [1], typicalInterval: 30, lifetimeValue: 21000, visitCount: 12, attendance: 88, lastVisitAt: iso(-12, 11), createdAt: iso(-360), tags: [], notes: '' },
    { id: 4, name: 'Kavya Rao', phone: '98111 00004', gender: 'F', language: 'English', birthday: '1991-11-22', preferredStylistId: 2, preferredTime: 'Weekend', preferredServiceIds: [6, 8], typicalInterval: 28, lifetimeValue: 36000, visitCount: 20, attendance: 94, lastVisitAt: iso(-5, 17), createdAt: iso(-380), tags: ['vip'], notes: 'Prefers Simran. Manicure + pedicure regular.' },
    { id: 5, name: 'Dev Kapoor', phone: '98111 00005', gender: 'M', language: 'Hindi', birthday: '1988-06-09', preferredStylistId: 4, preferredTime: 'Evening', preferredServiceIds: [1], typicalInterval: 40, lifetimeValue: 9500, visitCount: 6, attendance: 78, lastVisitAt: iso(-60, 19), createdAt: iso(-320), tags: ['overdue'], notes: '' },
    { id: 6, name: 'Ananya Iyer', phone: '98111 00006', gender: 'F', language: 'English', birthday: '1996-02-27', preferredStylistId: 3, preferredTime: 'Evening', preferredServiceIds: [6, 10], typicalInterval: 25, lifetimeValue: 31000, visitCount: 17, attendance: 90, lastVisitAt: iso(-20, 18), createdAt: iso(-300), tags: ['vip'], notes: 'Occasional bridal client.' },
    { id: 7, name: 'Rohan Singh', phone: '98111 00007', gender: 'M', language: 'Hindi', birthday: '1994-12-30', preferredStylistId: 1, preferredTime: '5–8 PM', preferredServiceIds: [1], typicalInterval: 35, lifetimeValue: 14200, visitCount: 9, attendance: 85, lastVisitAt: iso(-38, 18), createdAt: iso(-280), tags: ['overdue'], notes: '' },
    { id: 8, name: 'Meera Joshi', phone: '98111 00008', gender: 'F', language: 'Hindi', birthday: '1992-03-15', preferredStylistId: 2, preferredTime: 'Afternoon', preferredServiceIds: [7, 8], typicalInterval: 45, lifetimeValue: 6800, visitCount: 4, attendance: 82, lastVisitAt: iso(-15, 14), createdAt: iso(-140), tags: [], notes: 'Newer client.' },
    { id: 9, name: 'Kabir Malhotra', phone: '98111 00009', gender: 'M', language: 'English', birthday: '1989-09-25', preferredStylistId: 4, preferredTime: 'Evening', preferredServiceIds: [1, 2], typicalInterval: 28, lifetimeValue: 18300, visitCount: 11, attendance: 91, lastVisitAt: iso(-8, 19), createdAt: iso(-300), tags: [], notes: '' },
    { id: 10, name: 'Sana Qureshi', phone: '98111 00010', gender: 'F', language: 'Hindi', birthday: '1997-07-05', preferredStylistId: 3, preferredTime: 'Late evening', preferredServiceIds: [6, 7], typicalInterval: 30, lifetimeValue: 27000, visitCount: 15, attendance: 93, lastVisitAt: iso(-2, 20), createdAt: iso(-260), tags: ['vip'], notes: '' },
    { id: 11, name: 'Zoya Khan', phone: '98111 00011', gender: 'F', language: 'Hindi', birthday: '1990-10-11', preferredStylistId: 2, preferredTime: 'Weekend', preferredServiceIds: [6, 11], typicalInterval: 26, lifetimeValue: 22400, visitCount: 14, attendance: 96, lastVisitAt: iso(-55, 16), createdAt: iso(-340), tags: ['at-risk', 'overdue'], notes: 'Gap 55d.' },
    { id: 12, name: 'Ayan Verma', phone: '98111 00012', gender: 'M', language: 'Hindi', birthday: '1998-05-20', preferredStylistId: 1, preferredTime: 'Morning', preferredServiceIds: [1, 2], typicalInterval: 32, lifetimeValue: 12800, visitCount: 8, attendance: 84, lastVisitAt: iso(-33, 10), createdAt: iso(-220), tags: ['overdue'], notes: '' },
    { id: 13, name: 'Isha Nair', phone: '98111 00013', gender: 'F', language: 'English', birthday: '1995-04-02', preferredStylistId: 3, preferredTime: 'Afternoon', preferredServiceIds: [8], typicalInterval: 42, lifetimeValue: 7400, visitCount: 5, attendance: 80, lastVisitAt: iso(-10, 15), createdAt: iso(-180), tags: [], notes: '' },
    { id: 14, name: 'Tanya Bansal', phone: '98111 00014', gender: 'F', language: 'Hindi', birthday: '1993-12-08', preferredStylistId: 2, preferredTime: 'Evening', preferredServiceIds: [7, 8], typicalInterval: 29, lifetimeValue: 15200, visitCount: 9, attendance: 89, lastVisitAt: iso(-21, 18), createdAt: iso(-240), tags: [], notes: '' },
    { id: 15, name: 'Aditya Rao', phone: '98111 00015', gender: 'M', language: 'English', birthday: '1987-02-14', preferredStylistId: 1, preferredTime: 'Evening', preferredServiceIds: [1, 2, 5], typicalInterval: 34, lifetimeValue: 19800, visitCount: 13, attendance: 90, lastVisitAt: iso(-6, 19), createdAt: iso(-310), tags: ['vip'], notes: 'Hair spa regular.' },
    { id: 16, name: 'Nisha Verma', phone: '98111 00016', gender: 'F', language: 'Hindi', birthday: '1992-09-01', preferredStylistId: 3, preferredTime: 'Evening', preferredServiceIds: [6, 7, 10], typicalInterval: 27, lifetimeValue: 26500, visitCount: 16, attendance: 95, lastVisitAt: iso(-1, 19), createdAt: iso(-420), tags: ['vip'], notes: '' }
  ];


  // ---- Appointment generation ----
  const slotTimes = [10, 10.5, 11, 11.5, 12, 12.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20];
  const staffPool = D.staff.map((s) => s.id);
  const rnd = mulberry32(20240820);
  let apptId = 1;

  function addAppt(day, customerId, staffId, hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const svc = D.customers.find((c) => c.id === customerId);
    const serviceIds = (svc && svc.preferredServiceIds && svc.preferredServiceIds.length ? svc.preferredServiceIds : [1]).slice(0, 2);
    const duration = D.services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.durationMin, 30);
    const price = D.services.filter((s) => serviceIds.includes(s.id)).reduce((a, s) => a + s.price, 0);
    const start = iso(day, h, m);
    const end = new Date(new Date(start).getTime() + duration * 60000).toISOString();
    return { id: apptId++, customerId, staffId, serviceIds, start, end, durationMin: duration, price, notes: '', source: 'AI', createdAt: iso(-6, 9) };
  }

  const days = [0, 1, 2];
  const dayTargets = { 0: 42, 1: 30, 2: 22 };

  days.forEach((day) => {
    let target = dayTargets[day];
    let guard = 0;
    while (target > 0 && guard < 400) {
      guard++;
      const staffId = staffPool[Math.floor(rnd() * staffPool.length)];
      const hour = slotTimes[Math.floor(rnd() * slotTimes.length)];
      if (rnd() < 0.18) continue;
      const customer = D.customers[Math.floor(rnd() * D.customers.length)];
      const clash = D.appointments.some((a) =>
        a.staffId === staffId &&
        a.start.slice(0, 10) === iso(day, 10).slice(0, 10) &&
        Math.abs((new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60) - hour) < 0.5);
      if (clash) continue;
      let chosenStaff = staffId;
      if (rnd() < 0.55 && customer.preferredStylistId) chosenStaff = customer.preferredStylistId;
      D.appointments.push(addAppt(day, customer.id, chosenStaff, hour));
      target--;
    }
  });

  const nowHours = new Date().getHours() + new Date().getMinutes() / 60;
  D.appointments.forEach((a) => {
    const h = new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60;
    const isToday = new Date(a.start).toDateString() === new Date().toDateString();
    const isTomorrow = new Date(a.start).getTime() - new Date().getTime() < 48 * 3600e3 && new Date(a.start).toDateString() !== new Date().toDateString();
    if (isToday) {
      if (h + 1 < nowHours) a.status = 'completed';
      else if (h <= nowHours) a.status = rnd() < 0.5 ? 'in-service' : 'arrived';
      else a.status = 'confirmed';
      a.confirmation = a.start < iso(0, 0) ? 'confirmed' : (rnd() < 0.7 ? 'confirmed' : 'pending');
    } else if (isTomorrow) {
      a.status = 'confirmed';
      a.confirmation = rnd() < 0.72 ? 'confirmed' : 'pending';
    } else {
      a.status = 'confirmed';
      a.confirmation = 'confirmed';
    }
  });

  const todayConfirmed = D.appointments.filter((a) => new Date(a.start).toDateString() === new Date().toDateString());
  [0, 1, 2].forEach((i) => { if (todayConfirmed[i]) { todayConfirmed[i].status = 'no-show'; todayConfirmed[i].confirmation = 'confirmed'; } });
  [3, 4].forEach((i) => { if (todayConfirmed[i]) todayConfirmed[i].status = 'cancelled'; });

  // ---- Conversations (WhatsApp inbox) ----
  let cid = 1;
  function conv(customerId, status, messages, lastAt, aiSuggestion) {
    const msgs = messages.map((m, i) => ({ id: i + 1, from: m[0], text: m[1], at: m[2] }));
    const last = msgs.length ? msgs[msgs.length - 1] : null;
    return {
      id: cid++, customerId, channel: 'WhatsApp', status,
      lastMessage: last ? last.text : '', lastAt: iso(lastAt || 0, 18),
      aiSuggestion: aiSuggestion || '', unread: status === 'needs-action' ? 1 : 0,
      messages: msgs
    };
  }
  D.conversations = [
    conv(1, 'needs-action', [['customer', 'Hey, can I get a haircut tomorrow?', -1], ['ai', 'Hi Rahul! Aman is available tomorrow at 5:30 PM or 7:00 PM. Which works for you?', -1], ['customer', 'Aman 5:30 pls book', 0]], 0, 'Book 5:30 PM with Aman'),
    conv(2, 'needs-action', [['ai', 'Hey Neha 👋 it has been a while. Want your usual facial + manicure this week?', -2], ['customer', 'Can I come Thursday evening?', -1], ['ai', 'Priya has Thursday 6 PM. Shall I book?', 0]], 0, 'Book Thursday 6 PM with Priya'),
    conv(4, 'booked', [['customer', 'Book pedicure Sat 5 PM with Simran pls', -3], ['ai', 'Done ✅ Simran · Sat · 5 PM · Pedicure ₹500. See you then!', -3]], -3, ''),
    conv(15, 'booked', [['customer', 'Haircut + hair spa Friday', -2], ['ai', 'Booked with Aman, Friday 6:30 PM. Haircut ₹250 + Hair Spa ₹800.', -2]], -2, ''),
    conv(3, 'booked', [['customer', 'Usual haircut tomorrow morning', -1], ['ai', 'Aman tomorrow 10:30 AM. Confirmed ✅', -1]], -1, ''),
    conv(10, 'waiting', [['customer', 'How much for keratin?', 0]], 0, 'Reply: Keratin ₹2,500 (90–120 min)'),
    conv(6, 'reschedule', [['ai', 'Ananya, your facial is tomorrow 6 PM.', -1], ['customer', 'Can we move it to Saturday instead?', 0]], 0, 'Find Saturday slot with Priya'),
    conv(9, 'booked', [['customer', 'Haircut + beard with Vikram Saturday', -2], ['ai', 'Booked Vikram, Saturday 5 PM. Haircut + Beard ₹330 ✅', -2]], -2, ''),
    conv(16, 'feedback', [['customer', 'Amazing service! ⭐⭐⭐⭐⭐', -1], ['ai', 'So glad you loved it ❤️ Want to share a quick review?', -1]], -1, 'Send public review link'),
    conv(11, 'needs-action', [['ai', 'Zoya, your usual facial + threading is due. Weekend slots open ❤️', -1], ['customer', 'ok maybe', 0]], 0, 'Suggest Saturday 4 PM with Simran'),
    conv(13, 'payment', [['customer', 'Pedicure done, please send bill', -1], ['ai', 'Today bill: ₹500. Pay here 👇', -1]], -1, 'Send payment link'),
    conv(7, 'waiting', [['customer', 'Any slot after 8 tonight?', 0]], 0, 'Show 8 PM availability')
  ];

  // ---- Payments ----
  D.payments = [
    { id: 1, appointmentId: null, customerId: 16, amount: 2100, method: 'UPI', status: 'paid', at: iso(0, 13), receiptNo: 'R-1042' },
    { id: 2, appointmentId: null, customerId: 13, amount: 500, method: 'UPI', status: 'paid', at: iso(0, 16), receiptNo: 'R-1043' },
    { id: 3, appointmentId: null, customerId: 10, amount: 1200, method: 'Card', status: 'paid', at: iso(0, 12), receiptNo: 'R-1041' },
    { id: 4, appointmentId: null, customerId: 2, amount: 1850, method: 'UPI', status: 'pending', at: iso(0, 19), receiptNo: 'R-1044' },
    { id: 5, appointmentId: null, customerId: 4, amount: 1400, method: 'UPI', status: 'paid', at: iso(-1, 19), receiptNo: 'R-1040' }
  ];

  // ---- Campaign ----
  D.campaigns = [
    { id: 1, name: 'Sunday slots open', message: 'Sunday slots are open ❤️ Want me to find your usual appointment?', audience: 'Weekend visitors · 40+ days inactive', status: 'approved', sentAt: iso(-2, 10), sentCount: 17 }
  ];

  D.meta = { seededAt: new Date().toISOString(), version: 1 };
  return D;
}

if (require.main === module) {
  reset();
  build();
  save();
  console.log('Seeded Looks Salon:', {
    customers: db().customers.length,
    staff: db().staff.length,
    services: db().services.length,
    appointments: db().appointments.length
  });
}

module.exports = { build };
