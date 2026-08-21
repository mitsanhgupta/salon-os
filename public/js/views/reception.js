/* views/reception.js — Operations Center (Receptionist) */
const ReceptionView = (function () {

  async function home(content) {
    content.innerHTML = UI.loading;
    const [res, convs, week] = await Promise.all([
      API.get('/api/owner/overview'),
      API.get('/api/conversations'),
      API.get('/api/appointments?day=0')
    ]);
    const waits = convs.filter((c) => c.status === 'waiting').length;
    const needs = convs.filter((c) => c.status === 'needs-action').length;
    const t = week.list.filter((a) => a.status !== 'cancelled').slice(0, 9);
    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    const statRow = `
      <div class="stat-strip">
        ${UI.kcard('', 'Appointments today', `<span style="color:var(--text-primary)">${t.length}</span>`, { sub: 'on the books' })}
        ${UI.kcard('', 'Waiting', `<span style="color:var(--warning)">${waits}</span>`, { sub: 'awaiting replies', delay: 60 })}
        ${UI.kcard('', 'Needs attention', `<span style="color:var(--danger)">${needs}</span>`, { sub: 'AI escalated these', delay: 120 })}
        ${UI.kcard('', 'Empty slots', `<span style="color:var(--info)">${res.emptySlots.length || 0}</span>`, { sub: 'recoverable revenue', delay: 180 })}
      </div>`;

    const line = (a) => `
      <div class="titem anim-in">
        <div class="time">${UI.time(a.start)}</div>
        ${UI.avatar(a.customerName, 30)}
        <div class="who"><b>${UI.esc(a.customerName)}</b><span>${a.services.join(' + ')} · ${UI.esc(a.staffName)}</span></div>
        ${UI.statusPill(a.status)}
        <span class="staff-dot" style="background:${a.staffColor}"></span>
      </div>`;

    const aiActions = [];
    res.noShowRisks.forEach((r) => aiActions.push(`<div class="ai-action"><div class="ic warn">${I('warn', 15)}</div><div><b>No-show risk</b><span>${UI.esc(r.customer)} · ${UI.inr(r.price)} tomorrow at ${UI.time(r.at)}</span></div><button class="btn sm" data-remind="${r.id}" style="margin-left:auto">Remind</button></div>`));
    res.emptySlots.slice(0, 2).forEach((e) => aiActions.push(`<div class="ai-action"><div class="ic info">${I('clock', 15)}</div><div><b>Empty slot</b><span>${UI.esc(e.staff)} free ${e.fromLabel}–${e.toLabel}</span></div><button class="btn sm" data-fill="${e.staffId}" style="margin-left:auto">Fill</button></div>`));
    aiActions.push(`<div class="ai-action"><div class="ic green">${I('users', 15)}</div><div><b>Ready for reactivation</b><span>${res.overdue.length} overdue customers this week</span></div><button class="btn sm" data-nav="customers" style="margin-left:auto">View</button></div>`);

    content.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:20px">
        <div>
          <div class="kicker">Receptionist · ${todayStr}</div>
          <div class="view-title">Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${(App.user && App.user.name.split(' ')[0]) || '—'} 👋</div>
          <div class="view-sub">What do you need to handle right now?</div>
        </div>
        <button class="btn primary" data-nav="calendar">${I('plus', 15)} New booking</button>
      </div>
      <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:18px;align-items:start">
        <div>
          ${statRow}
          <div class="card mt16"><div class="spread mb16"><h3 style="font-size:16px">Today's appointments</h3><span class="small muted">${t.length} booked</span></div><div class="today-timeline">${t.map(line).join('') || '<div class="empty-state">No appointments yet</div>'}</div></div>
        </div>
        <div class="card"><div class="spread mb16"><h3 style="font-size:16px">AI actions</h3><span class="pill accent">${aiActions.length} available</span></div><div class="ai-actions">${aiActions.join('') || '<div class="empty-state">All clear ✅</div>'}</div></div>
      </div>`;

    content.querySelectorAll('[data-remind]').forEach((b) => b.addEventListener('click', async () => { await API.patch(`/api/appointments/${b.dataset.remind}`, { confirmation: 'confirmed' }); UI.toast('Confirmation requested on WhatsApp', true); b.textContent = 'Reminded'; }));
    content.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/reception/' + b.dataset.nav; }));
    content.querySelectorAll('[data-fill]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/reception/calendar'; }));
  }

  async function inbox(content) {
    content.innerHTML = UI.loading;
    const convs = await API.get('/api/conversations');
    const counts = {};
    convs.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    let sel = null, currentFilter = null;
    const ORDER = ['needs-action', 'waiting', 'booked', 'reschedule', 'payment', 'feedback'];
    const body = document.createElement('div');
    const pane = document.createElement('div');

    const listItem = (c) => `
      <div class="conv-item ${sel && sel.id === c.id ? 'sel' : ''}" data-cid="${c.id}">
        ${UI.avatar(c.customerName, 34)}
        <div class="body">
          <div class="head"><b>${UI.esc(c.customerName)}</b><time>${UI.rel(c.lastAt)}</time></div>
          <div class="msg">${UI.esc(c.lastMessage)}</div>
          ${c.aiSuggestion ? `<div class="suggest">${I('sparkle', 11)} AI: ${UI.esc(c.aiSuggestion)}</div>` : ''}
        </div>
      </div>`;

    function drawList() {
      const list = currentFilter ? convs.filter((c) => c.status === currentFilter) : convs;
      body.innerHTML = `<div class="conv-list">${list.map(listItem).join('') || '<div class="empty-state">No conversations here</div>'}</div>`;
      body.querySelectorAll('.conv-item').forEach((el) => el.addEventListener('click', () => {
        sel = convs.find((x) => x.id === Number(el.dataset.cid));
        drawList(); drawPane();
      }));
    }

    async function sendText(text, from) {
      if (!sel) return;
      sel = await API.post(`/api/conversations/${sel.id}/messages`, { text, from: from || 'staff' });
      const idx = convs.findIndex((x) => x.id === sel.id);
      if (idx > -1) convs[idx] = sel;
      drawList(); drawPane();
    }

    function drawPane() {
      const c = sel;
      if (!c) { pane.innerHTML = `<div class="empty-state" style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center">${I('inbox', 34)}<br/>Select a conversation</div>`; return; }
      pane.innerHTML = `
        <div class="chat-head">${UI.avatar(c.customerName, 38)}
          <div class="who"><b>${UI.esc(c.customerName)}</b><span>${UI.esc(c.customerPhone)} · ${c.channel || 'WhatsApp'}</span></div>
          ${UI.convPill(c.status)}${c.autoMode === false ? '<span class="pill accent">Human takeover</span>' : '<span class="pill blue">AI managed</span>'}
        </div>
        <div class="chat-msgs">${c.messages.map((m) => `<div class="bubble ${m.from === 'customer' ? 'in' : m.from === 'ai' ? 'ai' : 'out'}">${UI.esc(m.text)}</div>`).join('')}</div>
        ${c.aiSuggestion ? `<div class="chat-suggest"><span>${I('sparkle', 14)} ${UI.esc(c.aiSuggestion)}</span><button class="btn sm primary" data-usesug>Send</button></div>` : ''}
        <div style="display:flex;gap:8px;margin:0 14px 12px"><button class="btn sm" data-takeover>${I('shield', 13)} Take over conversation</button></div>
        <div class="chat-input"><input placeholder="Reply as the salon…" /><button class="btn primary" data-send>${I('send', 15)}</button></div>`;
      pane.querySelector('[data-send]').addEventListener('click', () => { const i = pane.querySelector('.chat-input input'); if (i && i.value.trim()) sendText(i.value.trim()); });
      pane.querySelector('.chat-input input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { const i = pane.querySelector('.chat-input input'); if (i && i.value.trim()) sendText(i.value.trim()); } });
      if (c.aiSuggestion) pane.querySelector('[data-usesug]').addEventListener('click', () => sendText(c.aiSuggestion));
      pane.querySelector('[data-takeover]').addEventListener('click', async () => { const upd = await API.post(`/api/conversations/${c.id}/takeover`, {}); sel = upd; UI.toast('You are now running this conversation', true); drawPane(); });
      setTimeout(() => { const m = pane.querySelector('.chat-msgs'); if (m) m.scrollTop = m.scrollHeight; }, 30);
    }

    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:16px">
        <div class="kicker">Unified inbox</div>
        <div class="view-title">Every conversation, classified by AI</div>
        <div class="view-sub">The AI resolves what it can and surfaces what needs you.</div>
      </div>
      <div class="status-rail">${ORDER.map((s) => `<button class="pill ${UI.CONVSTATUS[s].cls}" data-filter="${s}"><span class="dot"></span>${UI.CONVSTATUS[s].label} ${counts[s] || 0}</button>`).join('')}</div>
      <div class="inbox-wrap"><div id="ib-list"></div><div id="ib-pane" class="chat-pane"></div></div>`;
    content.querySelector('#ib-list').replaceWith(body);
    content.querySelector('#ib-pane').replaceWith(pane);
    body.style.cssText = 'overflow-y:auto;display:flex;flex-direction:column';
    content.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      currentFilter = currentFilter === b.dataset.filter ? null : b.dataset.filter;
      content.querySelectorAll('[data-filter]').forEach((x) => x.classList.toggle('accent', x === b && !!currentFilter));
      drawList();
    }));
    drawPane();
    drawList();
  }

  async function calendar(content) {
    content.innerHTML = UI.loading;
    let dayOffset = 0;
    let [staff, services, customers] = await Promise.all([API.get('/api/staff'), API.get('/api/services'), API.get('/api/customers')]);
    let week = await API.get('/api/appointments?day=0');

    const OPEN = 10, CLOSE = 20.5, ROW = 30;
    const closeModal = () => { document.getElementById('modal-root').innerHTML = ''; };
    const hourLabel = (h) => new Date(0, 0, 0, Math.floor(h), Math.round((h % 1) * 60)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    async function load() { week = await API.get('/api/appointments?day=' + dayOffset); render(); }

    function render() {
      const staffCols = staff.map((s) => {
        const appts = week.list.filter((a) => a.staffId === s.id && ['confirmed', 'arrived', 'in-service', 'pending', 'completed'].includes(a.status));
        const blocks = appts.map((a) => {
          const top = ((new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60) - OPEN) * 2 * ROW + 34;
          const h = (a.durationMin || 40) / 30 * ROW;
          return `<div class="cal-slot" data-apt="${a.id}" style="top:${top}px;height:${Math.max(h - 3, 14)}px;left:6px;right:6px;background:${a.staffColor}22;border-color:${a.staffColor}55">
            <b>${UI.time(a.start)} · ${UI.esc(a.customerName)}</b><div class="meta">${a.services.join(' + ')}</div></div>`;
        }).join('');
        const empties = [];
        for (let h = OPEN; h < CLOSE; h += 0.5) {
          if (appts.some((a) => { const sm = new Date(a.start).getHours() + new Date(a.start).getMinutes() / 60; return Math.abs(sm - h) < 0.4; })) continue;
          empties.push(`<div class="cal-slot cal-empty" data-empty="${h}" style="top:${(h - OPEN) * 2 * ROW + 34}px;height:${ROW - 2}px;left:6px;right:6px"></div>`);
        }
        return `<div class="cal-staff-col">
          <div class="cal-staff-head"><span class="staff-dot" style="background:${s.color};display:inline-block"></span> ${UI.esc(s.name)}</div>
          ${blocks}${empties.join('')}
        </div>`;
      }).join('');
      const times = [];
      for (let h = OPEN; h < CLOSE; h += 0.5) times.push(`<div class="cal-time" style="height:${ROW}px">${hourLabel(h)}</div>`);
      const dayName = new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      content.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:16px">
          <div><div class="kicker">Calendar</div><div class="view-title">${dayName}</div></div>
          <div class="cal-toolbar"><button class="btn sm" data-d="-1">${I('chevL', 14)}</button><button class="btn sm" data-d="0">Today</button><button class="btn sm" data-d="1">${I('chevR', 14)}</button></div>
        </div>
        <div class="cal-legend">${Object.keys(UI.STATUS).map((k) => `<span class="pill ${UI.STATUS[k].cls}"><span class="dot"></span>${UI.STATUS[k].label}</span>`).join('')}</div>
        <div class="cal-grid"><div class="cal-time-col">${times.join('')}</div>${staffCols}</div>
        <div class="small muted mt8">Click any empty space to book. Click an appointment to update its status.</div>`;
      content.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { dayOffset = Number(b.dataset.d); load(); }));
      content.querySelectorAll('.cal-empty').forEach((el) => el.addEventListener('click', () => openBooking(Number(el.dataset.empty))));
      content.querySelectorAll('.cal-slot[data-apt]').forEach((el) => el.addEventListener('click', () => openApptActions(Number(el.dataset.apt))));
    }

    function openBooking(hour) {
      const day = new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      closeModal();
      UI.modal(`
        <h3 style="margin-bottom:14px">New booking · ${day} · ${hourLabel(hour)}</h3>
        <div class="field"><label>Customer</label><select id="nb-cust">${customers.map((c) => `<option value="${c.id}">${UI.esc(c.name)} · ${UI.esc(c.phone)}</option>`).join('')}</select></div>
        <div class="field"><label>Services (hold ⌘/Ctrl to pick more)</label><select id="nb-svc" multiple style="height:120px">${services.filter((s) => s.isActive).map((s) => `<option value="${s.id}">${UI.esc(s.name)} · ${UI.inr(s.price)} · ${s.durationMin}min</option>`).join('')}</select></div>
        <div class="field"><label>Stylist</label><select id="nb-staff">${staff.map((s) => `<option value="${s.id}">${UI.esc(s.name)}</option>`).join('')}</select></div>
        <div style="display:flex;gap:10px"><button class="btn primary" id="nb-save" style="flex:1">Confirm booking</button><button class="btn ghost" data-close>Cancel</button></div>`);
      const cbtn = document.querySelector('[data-close]'); if (cbtn) cbtn.addEventListener('click', closeModal);
      document.getElementById('nb-save').addEventListener('click', async () => {
        const start = new Date();
        start.setDate(start.getDate() + dayOffset); start.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
        const svcs = [...document.getElementById('nb-svc').selectedOptions].map((o) => Number(o.value));
        if (!svcs.length) { UI.toast('Pick at least one service'); return; }
        try {
          await API.post('/api/appointments', { customerId: Number(document.getElementById('nb-cust').value), staffId: Number(document.getElementById('nb-staff').value), serviceIds: svcs, start: start.toISOString() });
          UI.toast('Appointment booked', true); closeModal(); load();
        } catch (e) { UI.toast(e.message); }
      });
    }

    function openApptActions(id) {
      const a = week.list.find((x) => x.id === id);
      if (!a) return;
      closeModal();
      UI.modal(`
        <div class="row" style="margin-bottom:16px">${UI.avatar(a.customerName, 40)}<div><h3 style="font-size:17px">${UI.esc(a.customerName)}</h3><span class="small muted">${a.services.join(' + ')} · ${UI.time(a.start)} · ${UI.esc(a.staffName)} · ${UI.inr(a.price)}</span></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn sm" data-st="arrived">Arrived</button>
          <button class="btn sm" data-st="in-service">In service</button>
          <button class="btn sm success" data-st="completed">Complete</button>
          <button class="btn sm danger" data-st="cancelled">Cancel</button>
          <button class="btn sm" data-st="no-show">Mark no-show</button>
        </div>`);
      const cbtn = document.querySelector('[data-close]'); if (cbtn) cbtn.addEventListener('click', closeModal);
      document.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', async () => {
        await API.patch(`/api/appointments/${id}`, { status: b.dataset.st });
        UI.toast('Updated', true); closeModal(); load();
      }));
    }

    render();
  }

  async function customers(content) {
    content.innerHTML = UI.loading;
    const [list, staffL, svcL] = await Promise.all([API.get('/api/customers'), API.get('/api/staff'), API.get('/api/services')]);
    const sidById = (i) => staffL.find((s) => s.id === i);
    const svcById = (i) => svcL.find((s) => s.id === i);
    let selId = null, detail = null;

    async function showDetail(id) { selId = id; detail = await API.get('/api/customers/' + id); drawTable(); drawDetail(); }

    function drawTable() {
      const q = (content.querySelector('#table-search') || {}).value ? content.querySelector('#table-search').value.toLowerCase() : '';
      const rows = list.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)).map((c) => `
        <tr class="clickable" data-id="${c.id}" style="${selId === c.id ? 'background:var(--accent-soft)' : ''}">
          <td><div class="row">${UI.avatar(c.name, 30)}<div><b>${UI.esc(c.name)}</b><div class="small faint">${UI.esc(c.phone)}</div></div></div></td>
          <td class="mono">${UI.inr(c.lifetimeValue)}</td><td>${c.visitCount}</td><td>${c.attendance}%</td>
          <td>${c.lastVisitAt ? UI.day(c.lastVisitAt) : '—'}</td>
          <td>${(c.tags || []).map((t) => `<span class="pill accent">${t}</span>`).join(' ')}</td>
        </tr>`).join('');
      document.querySelector('#cust-tbl-body').innerHTML = rows || '<tr><td colspan="6" class="empty-state">Nobody matches</td></tr>';
      document.querySelectorAll('#cust-tbl-body tr').forEach((r) => r.addEventListener('click', () => showDetail(Number(r.dataset.id))));
    }

    function drawDetail() {
      if (!detail) return;
      const d = detail, gap = d.lastVisitAt ? Math.round((Date.now() - new Date(d.lastVisitAt)) / 86400000) : null;
      const mem = [];
      if (d.preferredStylistId) mem.push('Prefers ' + ((sidById(d.preferredStylistId) || {}).name || '—'));
      if (d.preferredTime) mem.push('Usually visits ' + d.preferredTime);
      if (d.typicalInterval) mem.push('Books every ~' + d.typicalInterval + ' days');
      if (d.preferredServiceIds && d.preferredServiceIds.length) mem.push('Usual: ' + d.preferredServiceIds.map((s) => (svcById(s) || {}).name || '').join(' + '));
      if (gap != null && d.typicalInterval && gap > d.typicalInterval) mem.push('Overdue by ' + (gap - d.typicalInterval) + 'd');
      const hist = (d.history || []).slice(0, 5);
      document.getElementById('cust-detail').innerHTML = `
        <div class="spread"><div class="row">${UI.avatar(d.name, 44)}<div><h3 style="font-size:17px">${UI.esc(d.name)}</h3><span class="small muted">${UI.esc(d.phone)}</span></div></div>${(d.tags || []).map((t) => `<span class="pill accent">${t}</span>`).join('')}</div>
        <div style="margin-top:16px">
          <div class="stat-line"><span class="k">Lifetime value</span><span class="v">${UI.inr(d.lifetimeValue)}</span></div>
          <div class="stat-line"><span class="k">Visits</span><span class="v">${d.visitCount}</span></div>
          <div class="stat-line"><span class="k">Attendance</span><span class="v">${d.attendance}%</span></div>
          <div class="stat-line"><span class="k">Last visit</span><span class="v">${d.lastVisitAt ? UI.day(d.lastVisitAt) + ' · ' + gap + 'd ago' : '—'}</span></div>
          <div class="stat-line"><span class="k">Typical interval</span><span class="v">${d.typicalInterval}d</span></div>
        </div>
        <div class="kicker mt16">AI memory</div>
        <div style="margin-top:8px">${mem.map((m) => `<span class="memory-chip">${m}</span>`).join('') || '<span class="small muted">Learning this customer…</span>'}</div>
        <div class="kicker mt16">Recent appointments</div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${hist.map((h) => `<div class="row" style="justify-content:space-between"><span>${UI.day(h.start)} · ${h.services.map((x) => x.name).join(' + ') || '—'}</span><span class="small muted">${UI.inr(h.price)}</span>${UI.statusPill(h.status)}</div>`).join('') || '<span class="small muted">No history</span>'}</div>`;
    }

    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:16px">
        <div class="kicker">Customers</div>
        <div class="view-title">The profile the AI actually uses</div>
        <div class="view-sub">Search, then click a row for memory, value and history.</div>
      </div>
      <div class="cust-wrap">
        <div>
          <div class="cust-search"><input id="table-search" placeholder="Search by name or phone…" /><button class="btn" id="new-cust">${I('plus', 14)} New</button></div>
          <div class="cust-table-wrap"><table class="tbl"><thead><tr><th>Customer</th><th>LTV</th><th>Visits</th><th>Attendance</th><th>Last visit</th><th>Segment</th></tr></thead><tbody id="cust-tbl-body"></tbody></table></div>
        </div>
        <div class="cust-detail" id="cust-detail"><div class="empty-state">Select a customer to see their AI profile</div></div>
      </div>`;
    content.querySelector('#table-search').addEventListener('input', drawTable);
    content.querySelector('#new-cust').addEventListener('click', () => {
      const close = UI.modal(`
        <h3 style="margin-bottom:14px">New customer</h3>
        <div class="field"><label>Name</label><input id="nc-name" /></div>
        <div class="field"><label>Phone</label><input id="nc-phone" placeholder="98111 00000" /></div>
        <div style="display:flex;gap:10px"><button class="btn primary" id="nc-save" style="flex:1">Add</button><button class="btn ghost" data-close>Cancel</button></div>`);
      document.getElementById('nc-save').addEventListener('click', async () => {
        try {
          const c = await API.post('/api/customers', { name: document.getElementById('nc-name').value, phone: document.getElementById('nc-phone').value });
          list.unshift(c); UI.toast('Customer added', true); close(); showDetail(c.id);
        } catch (e) { UI.toast(e.message); }
      });
      const cbtn = document.querySelector('[data-close]'); if (cbtn) cbtn.addEventListener('click', close);
    });
    drawTable();
  }

  async function services(content) {
    content.innerHTML = UI.loading;
    const list = await API.get('/api/services');
    const cats = [...new Set(list.map((s) => s.category))];
    function draw() {
      content.innerHTML = `
        <div class="view-brief" style="margin-bottom:16px">
          <div class="kicker">Services & pricing</div>
          <div class="view-title">The menu your AI books from</div>
          <div class="view-sub">Toggle availability or edit a price — the WhatsApp AI uses this instantly.</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${list.map((s) => `
          <div class="card card-hover" data-id="${s.id}" style="${!s.isActive ? 'opacity:.5' : ''}">
            <div class="spread"><b>${UI.esc(s.name)}</b>${UI.statusPill(s.isActive ? 'confirmed' : 'cancelled')}</div>
            <div class="small faint">${s.category} · ${s.durationMin} min</div>
            <div class="row" style="margin-top:10px">
              <span class="mono" style="font-size:19px;font-weight:600">${UI.inr(s.price)}</span>
              <span style="flex:1"></span>
              <button class="btn sm" data-pricemode>Edit</button>
              <button class="btn sm ${s.isActive ? 'danger' : 'success'}" data-toggle>${s.isActive ? 'Hide' : 'Show'}</button>
            </div>
          </div>`).join('')}</div>`;
      content.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async (e) => {
        const card = e.target.closest('[data-id]'); const s = list.find((x) => x.id === Number(card.dataset.id));
        s.isActive = !s.isActive; await API.patch('/api/services/' + s.id, { isActive: s.isActive }); UI.toast(s.name + (s.isActive ? ' shown' : ' hidden'), true); draw();
      }));
      content.querySelectorAll('[data-pricemode]').forEach((b) => b.addEventListener('click', async (e) => {
        const card = e.target.closest('[data-id]'); const s = list.find((x) => x.id === Number(card.dataset.id));
        const close = UI.modal(`<h3 style="margin-bottom:14px">${UI.esc(s.name)} price</h3><div class="field"><label>Price (₹)</label><input id="p-val" type="number" value="${s.price}" /></div><button class="btn primary" id="p-save" style="width:100%">Save</button>`);
        document.getElementById('p-save').addEventListener('click', async () => {
          const v = Number(document.getElementById('p-val').value);
          await API.patch('/api/services/' + s.id, { price: v }); s.price = v; UI.toast('Price updated', true); close(); draw();
        });
      }));
    }
    draw();
  }

  async function staff(content) {
    content.innerHTML = UI.loading;
    const [staffL, res] = await Promise.all([API.get('/api/staff'), API.get('/api/owner/overview')]);
    const util = res.staffUtil;
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:16px">
        <div class="kicker">Staff</div>
        <div class="view-title">Today's teams, at a glance</div>
        <div class="view-sub">Live utilization from today's bookings.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">${staffL.map((s) => {
        const u = util.find((x) => x.id === s.id) || { utilization: 0, todayBooked: 0, revenue: 0, avgBill: 0, repeatPct: 0, noShowRate: 0 };
        return `
        <div class="card">
          <div class="spread">
            <div class="row">${UI.avatar(s.name, 42)}<div><b style="font-size:15px">${UI.esc(s.name)}</b><div class="small muted">${UI.esc(s.role)}</div></div></div>
            <span class="pill accent">${u.utilization}% booked</span>
          </div>
          <div class="prog mt16"><i style="width:${u.utilization}%;background:${s.color}"></i></div>
          <div class="grid4" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px">
            <div><div class="mono" style="font-size:16px">${u.todayBooked}</div><div class="small faint">today</div></div>
            <div><div class="mono" style="font-size:16px">${UI.inr(u.avgBill)}</div><div class="small faint">avg bill</div></div>
            <div><div class="mono" style="font-size:16px">${u.repeatPct}%</div><div class="small faint">repeat</div></div>
            <div><div class="mono" style="font-size:16px">${u.noShowRate}%</div><div class="small faint">no-show</div></div>
          </div>
        </div>`;
      }).join('')}</div>
      <div class="card mt16" style="border-left:3px solid var(--accent)">${I('sparkle', 16)} <b>AI insight:</b> <span class="muted">Aman is consistently overbooked between 6–8 PM. Consider assigning another stylist during this window.</span></div>`;
  }

  async function payments(content) {
    content.innerHTML = UI.loading;
    const list = await API.get('/api/payments');
    function draw() {
      const paid = list.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
      const pending = list.filter((p) => p.status === 'pending');
      content.innerHTML = `
        <div class="view-brief" style="margin-bottom:16px">
          <div class="kicker">Payments</div>
          <div class="view-title">Today's money</div>
          <div class="view-sub">Collected today vs bills still waiting.</div>
        </div>
        <div class="stat-strip" style="grid-template-columns:repeat(3,1fr)">
          ${UI.kcard('', 'Collected today', `<span style="color:var(--success)">${UI.inr(paid)}</span>`, { sub: list.filter((p) => p.status === 'paid').length + ' payments' })}
          ${UI.kcard('', 'Awaiting', `<span style="color:var(--warning)">${UI.inr(pending.reduce((a, p) => a + p.amount, 0))}</span>`, { sub: pending.length + ' bills to follow up', delay: 60 })}
          ${UI.kcard('', 'Avg bill', `<span>${UI.inr(list.length ? paid / Math.max(1, list.filter((p) => p.status === 'paid').length) : 0)}</span>`, { sub: 'per completed payment', delay: 120 })}
        </div>
        <div class="card mt16">
          <table class="tbl">
            <thead><tr><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th><th></th></tr></thead>
            <tbody>${list.map((p) => `
              <tr>
                <td><div class="row">${UI.avatar(p.customerName, 28)}<b>${UI.esc(p.customerName)}</b></div></td>
                <td class="mono">${UI.inr(p.amount)}</td><td>${UI.esc(p.method || '—')}</td>
                <td>${p.status === 'paid' ? '<span class="pill green"><span class="dot"></span>Paid</span>' : '<span class="pill yellow"><span class="dot"></span>Pending</span>'}</td>
                <td class="mono small faint">${UI.esc(p.receiptNo || '—')}</td>
                <td style="text-align:right">${p.status === 'pending' ? `<button class="btn sm success" data-cid="${p.id}">Collect</button>` : `<span class="small faint">${UI.rel(p.at)}</span>`}</td>
              </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No payments today</td></tr>'}</tbody>
          </table>
        </div>`;
      content.querySelectorAll('[data-cid]').forEach((b) => b.addEventListener('click', async () => {
        await API.post(`/api/payments/${b.dataset.cid}/collect`, { method: 'UPI' });
        UI.toast('Payment collected · receipt sent on WhatsApp', true); payments(content);
      }));
    }
    draw();
  }

  return { home, inbox, calendar, customers, services, staff, payments };
})();