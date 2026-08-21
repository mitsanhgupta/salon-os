/* app.js — router, app shell, AI copilot for Salon OS */
const App = (function () {
  const rootEl = () => document.getElementById('app-root');
  let _user = null;
  try { _user = JSON.parse(sessionStorage.getItem('salon_os_user')); } catch (e) {}

  const setUser = (u) => { _user = u; try { sessionStorage.setItem('salon_os_user', JSON.stringify(u)); } catch (e) {} };
  const getUser = () => _user;
  const homeFor = (role) => (role === 'owner' ? '#/owner/pulse' : role === 'customer' ? '#/customer/chat' : '#/reception/home');

  // ---------- Role navigation ----------
  const NAV = {
    owner: [
      { sec: 'Salon Pulse', id: null },
      { id: 'pulse', label: 'Pulse', icon: 'sun', hash: '#/owner/pulse' },
      { id: 'actions', label: 'AI Actions', icon: 'zap', hash: '#/owner/actions' },
      { id: 'revenue', label: 'Revenue', icon: 'trend', hash: '#/owner/revenue' },
      { id: 'customers', label: 'Customers', icon: 'users', hash: '#/owner/customers' },
      { sec: 'Operations', id: null },
      { id: 'appointments', label: 'Appointments', icon: 'calendar', hash: '#/owner/appointments' },
      { id: 'staff', label: 'Staff', icon: 'crown', hash: '#/owner/staff' },
      { id: 'campaigns', label: 'Campaigns', icon: 'megaphone', hash: '#/owner/campaigns' },
      { id: 'insights', label: 'AI Insights', icon: 'sparkle', hash: '#/owner/insights' }
    ],
    receptionist: [
      { sec: 'Operations', id: null },
      { id: 'home', label: 'Today', icon: 'home', hash: '#/reception/home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', hash: '#/reception/inbox' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar', hash: '#/reception/calendar' },
      { id: 'customers', label: 'Customers', icon: 'users', hash: '#/reception/customers' },
      { sec: 'Salon', id: null },
      { id: 'services', label: 'Services', icon: 'scissors', hash: '#/reception/services' },
      { id: 'staff', label: 'Staff', icon: 'shield', hash: '#/reception/staff' },
      { id: 'payments', label: 'Payments', icon: 'wallet', hash: '#/reception/payments' }
    ],
    manager: [
      { sec: 'Operations', id: null },
      { id: 'home', label: 'Today', icon: 'home', hash: '#/reception/home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', hash: '#/reception/inbox' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar', hash: '#/reception/calendar' },
      { id: 'customers', label: 'Customers', icon: 'users', hash: '#/reception/customers' },
      { sec: 'Management', id: null },
      { id: 'staff', label: 'Staff', icon: 'crown', hash: '#/reception/staff' },
      { id: 'payments', label: 'Payments', icon: 'wallet', hash: '#/reception/payments' }
    ],
    customer: [
      { sec: 'Your salon', id: null },
      { id: 'chat', label: 'WhatsApp chat', icon: 'message', hash: '#/customer/chat' },
      { id: 'appointments', label: 'My appointments', icon: 'calendar', hash: '#/customer/appointments' }
    ]
  };

  // ---------- Route table ----------
  const R = {
    reception: { home: ['Today', ReceptionView.home], inbox: ['Inbox', ReceptionView.inbox], calendar: ['Calendar', ReceptionView.calendar], customers: ['Customers', ReceptionView.customers], services: ['Services', ReceptionView.services], staff: ['Staff', ReceptionView.staff], payments: ['Payments', ReceptionView.payments] },
    owner: { pulse: ['Salon Pulse', OwnerView.pulse], actions: ['AI Actions', OwnerView.actions], revenue: ['Revenue Intelligence', OwnerView.revenue], customers: ['Customer Intelligence', OwnerView.customers], appointments: ['Appointments', OwnerView.appointments], staff: ['Staff Intelligence', OwnerView.staff], campaigns: ['Campaign Center', OwnerView.campaigns], insights: ['AI Insights', OwnerView.insights] },
    customer: { chat: ['WhatsApp AI', CustomerView.chat], appointments: ['My Appointments', CustomerView.appointments] }
  };

  // ---------- Shell ----------
  function renderShell(role, routeId) {
    const u = _user || {};
    const nav = NAV[role] || NAV.receptionist;
    rootEl().innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <span class="brand-mark">${I('sparkle', 17)}</span>
            <div><div class="brand-name">Salon OS</div><div class="brand-sub">AI OS for salons</div></div>
          </div>
          <div class="salon-chip"><span class="dot"></span><span style="font-weight:550">Looks Salon</span><span class="faint" style="margin-left:auto">₹</span></div>
          <nav class="sidebar-nav">${nav.map((n) => n.sec ? `<div class="nav-sec">${n.sec}</div>` : `<a class="nav-item ${routeId === n.id ? 'active' : ''}" href="${n.hash}">${I(n.icon, 17)}<span>${n.label}</span></a>`).join('')}</nav>
          <div class="sidebar-foot">
            ${UI.avatar(u.name || '?', 34)}
            <div class="meta"><b>${UI.esc(u.name || '')}</b><span>${role}</span></div>
            <button id="logout" title="Log out" style="color:var(--text-tertiary)">${I('logout', 16)}</button>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <div><div class="page-crumbs">salonOS.com · ${role}</div><div class="page-title" id="top-title">…</div></div>
            <div class="topbar-spacer"></div>
            ${role !== 'customer' ? `<button class="copilot-trigger" id="copilot-open">${I('sparkle', 15)} AI Copilot</button>` : `<span class="pill blue"><span class="dot"></span>${u.name ? UI.esc(u.name.split(' ')[0]) : 'Guest'}</span>`}
          </header>
          <main class="content" id="view"></main>
        </div>
      </div>`;
    document.getElementById('logout').addEventListener('click', async () => {
      try { await API.logout(); } catch (e) {}
      API.setToken(null); setUser(null); location.hash = '#/login';
    });
    const co = document.getElementById('copilot-open');
    if (co) co.addEventListener('click', openCopilot);
  }

  // ---------- Router ----------
  async function route() {
    const hash = location.hash || '#/login';
    if (hash === '#/login') { setUser(null); LoginView.render(rootEl()); return; }
    const u = _user;
    if (!u || !API.getToken()) { LoginView.render(rootEl()); return; }
    const parts = hash.replace('#/', '').split('/');
    const role = parts[0], viewId = parts[1];
    const table = R[role];
    if (!table || !table[viewId]) { location.hash = homeFor(u.role); return; }
    const def = table[viewId];
    renderShell(u.role, viewId);
    document.getElementById('top-title').textContent = def[0];
    try { await def[1](document.getElementById('view')); }
    catch (e) { document.getElementById('view').innerHTML = `<div class="empty-state">${UI.esc(e.message)}</div>`; }
  }


  // ---------- AI Copilot ----------
  function openCopilot() {
    const CPS = ['Find Rahul an appointment tomorrow after 5', "Who hasn't confirmed tomorrow?", "Show today's cancellations", 'Find customers overdue', 'Fill the empty 2 PM slot', "Show today's VIP customers", 'I have a slow Sunday'];
    const close = UI.modal(`
      <div class="copilot-modal">
        <div class="copilot-head">${I('sparkle', 20)}<b>AI Copilot</b><span class="small muted">ask in plain language</span><div style="flex:1"></div><button class="btn sm ghost" id="cop-close">${I('x', 15)} Close</button></div>
        <div class="copilot-body" id="cop-body">
          <div style="display:flex;flex-wrap:wrap;gap:8px">${CPS.map((s) => `<button class="copilot-q" data-q="${UI.esc(s)}">${I('sparkle', 11)} ${UI.esc(s)}</button>`).join('')}</div>
          <div style="margin-top:8px;padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px">Ask anything about today. Type a command or tap a suggestion.<br/>Try "Find Rahul an appointment tomorrow after 5"</div>
        </div>
        <div class="copilot-run"><input id="cop-in" placeholder="Type a command…" /><button class="btn primary" id="cop-go">${I('zap', 15)} Run</button></div>
      </div>`);
    const body = document.getElementById('cop-body');
    const ask = async (q) => {
      body.insertAdjacentHTML('beforeend', `<div style="display:flex;justify-content:flex-end"><div class="bubble out" style="max-width:90%">${UI.esc(q)}</div></div>`);
      const t = document.createElement('div'); t.className = 'copilot-answer'; t.innerHTML = `${I('sparkle', 13)} thinking…`; body.appendChild(t);
      try {
        const res = await API.post('/api/copilot', { query: q });
        t.remove(); body.insertAdjacentHTML('beforeend', `<div class="copilot-answer">${UI.esc(res.message)}</div>`);
      } catch (e) { t.remove(); body.insertAdjacentHTML('beforeend', `<div class="copilot-answer">${UI.esc(e.message)}</div>`); }
      body.scrollTop = body.scrollHeight;
    };
    document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.q)));
    document.getElementById('cop-go').addEventListener('click', () => { const i = document.getElementById('cop-in'); if (i && i.value.trim()) { ask(i.value.trim()); i.value = ''; } });
    document.getElementById('cop-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const i = document.getElementById('cop-in'); if (i && i.value.trim()) { ask(i.value.trim()); i.value = ''; } } });
    document.getElementById('cop-close').addEventListener('click', close);
  }

  // ---------- Boot ----------
  window.addEventListener('hashchange', () => route());
  if (!location.hash || location.hash === '#/') location.hash = '#/login';
  route();

    return { setUser, getUser, homeFor };
})();