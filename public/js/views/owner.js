/* views/owner.js — Salon Pulse (Owner) */
const OwnerView = (function () {

  async function pulse(content) {
    content.innerHTML = UI.loading;
    const [res, actions] = await Promise.all([API.get('/api/owner/overview'), API.get('/api/owner/actions')]);
    const t = res.today;
    const empty = res.emptySlots[0];
    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
    content.innerHTML = `
      <div class="briefing">
        <div>
          <div class="kicker">Good ${greeting.toLowerCase()}, ${(App.user && App.user.name.split(' ')[0]) || '—'} 👋</div>
          <div class="view-title" style="margin-top:6px">Salon Pulse</div>
          <div class="view-sub">${UI.dayFull()} · the health of ${res.salonName || 'Looks Salon'} in under two minutes.</div>
        </div>
        <div class="pulse-strip">
          ${UI.kcard('', 'Expected revenue', `<span style="color:var(--success)">${UI.inr(t.expectedRevenue)}</span>`, { sub: 'for today', delay: 0 })}
          ${UI.kcard('', 'Appointments', `<span>${t.appointments}</span>`, { sub: 'on the books', delay: 60 })}
          ${UI.kcard('', 'New customers', `<span style="color:var(--info)">${t.newCustomers}</span>`, { sub: 'first-time today', delay: 120 })}
          ${UI.kcard('', 'Returning', `<span>${t.returningCustomers}</span>`, { sub: 'regulars today', delay: 180 })}
        </div>
        <div class="line-strip">
          <div class="line-card attention"><b>${res.noShowRisks.length}</b><span>attention · no-show risk</span></div>
          <div class="line-card opportunity"><b>${UI.inr(res.moneyLeft.reduce((a, m) => a + m.amount, 0))}</b><span>opportunity · recoverable</span></div>
          <div class="line-card capacity"><b>${empty ? empty.fromLabel + '–' + empty.toLabel : 'Full'}</b><span>capacity · empty window</span></div>
          <div class="line-card customers"><b>${res.overdue.length}</b><span>customers overdue</span></div>
          <div class="line-card"><b>${res.staffUtil[0] ? res.staffUtil[0].name + ' ' + res.staffUtil[0].utilization + '%' : '—'}</b><span>busiest today</span></div>
        </div>
        <div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">
          <div class="card">
            <div class="spread mb16"><h3 style="font-size:16px">Decisions waiting on you</h3><a href="#/owner/actions" class="btn sm">Open action center</a></div>
            <div class="ai-actions">
              ${actions.map((a) => `<div class="ai-action"><div class="ic ${a.kind === 'warning' ? 'warn' : a.kind === 'slot' ? 'info' : a.kind === 'reactivate' ? 'accent' : 'green'}">${I(a.kind === 'warning' ? 'warn' : a.kind === 'slot' ? 'clock' : a.kind === 'reactivate' ? 'heart' : 'box', 15)}</div><div><b>${UI.esc(a.title)}</b><span>${UI.esc(a.detail)}</span></div><button class="btn sm" data-action="${a.id}">${a.cta}</button></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="spread mb16"><h3 style="font-size:16px">Staff utilization · today</h3></div>
            <div style="display:flex;flex-direction:column;gap:14px">${res.staffUtil.map((s) => `
              <div><div class="spread small"><b>${UI.esc(s.name)}</b><span class="muted">${s.todayBooked} bookings · ${s.utilization}%</span></div><div class="prog mt8"><i style="width:${s.utilization}%;background:${s.color}"></i></div></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    content.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/owner/actions'; }));
  }

  async function actions(content) {
    content.innerHTML = UI.loading;
    const act = await API.get('/api/owner/actions');
    const K = { warning: ['warn', 'warn'], slot: ['clock', 'slot'], reactivate: ['heart', 'heart'], investigate: ['box', 'box'] };
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">Decisions, not dashboards</div>
        <div class="view-title">You have ${act.length} decisions today</div>
        <div class="view-sub">The system surfaces problems and next moves — you decide.</div>
      </div>
      <div class="action-cards">${act.map((a) => {
        const [ic, cls] = K[a.kind] || ['zap', 'warn'];
        return `
        <div class="action-card anim-in">
          <div class="head"><div class="ic ${cls}">${I(ic, 18)}</div><b>${UI.esc(a.title)}</b></div>
          <p>${UI.esc(a.detail)}</p>
          <div class="foot"><button class="btn primary" data-go="${a.target || 'customers'}">${UI.esc(a.cta)}</button></div>
        </div>`;
      }).join('')}</div>`;
    content.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/owner/' + b.dataset.go; }));
  }

  async function revenue(content) {
    content.innerHTML = UI.loading;
    const [res, pays] = await Promise.all([API.get('/api/owner/overview'), API.get('/api/payments')]);
    const ml = res.moneyLeft;
    const max = Math.max(1, ...ml.map((m) => m.amount));
    const bars = ml.map((m) => `<div class="bar" style="height:${Math.max(8, (m.amount / max) * 100)}%" title="${UI.esc(m.label)} ${UI.inr(m.amount)}"></div>`).join('');
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">The metric that matters</div>
        <div class="view-title">Money left on the table</div>
        <div class="view-sub">The direct line between this software and your bank account.</div>
      </div>
      <div class="grid3" style="grid-template-columns:repeat(3,1fr)">
        ${UI.kcard('', 'Expected today', `<span style="color:var(--success)">${UI.inr(res.today.expectedRevenue)}</span>`, { sub: res.today.appointments + ' appointments', delay: 0 })}
        ${UI.kcard('', 'Avg bill', `<span>${UI.inr(res.today.avgBill)}</span>`, { sub: 'per appointment', delay: 60 })}
        ${UI.kcard('', 'Recoverable now', `<span style="color:var(--danger)">${UI.inr(ml.reduce((a, m) => a + m.amount, 0))}</span>`, { sub: 'total across leaks', delay: 120, cls: 'danger' })}
      </div>
      <div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;align-items:stretch">
        <div class="card">
          <div class="spread mb16"><h3 style="font-size:16px">Where it leaks</h3><span class="small muted">today</span></div>
          <div style="display:flex;flex-direction:column;gap:14px">${ml.map((m) => `
            <div>
              <div class="spread"><b style="font-size:13.5px">${UI.esc(m.label)}</b><span class="mono" style="color:var(--danger)">${UI.inr(m.amount)}</span></div>
              <div class="small faint">${UI.esc(m.note)}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="spread mb16"><h3 style="font-size:16px">Leak comparison</h3><span class="small muted">relative size</span></div>
          <div class="bars" style="margin-top:16px">${bars}</div>
          <div class="row small muted mt16" style="justify-content:space-between">${ml.map((m) => `<span>${UI.esc(m.label)}</span>`).join('')}</div>
        </div>
      </div>`;
  }

  async function customers(content) {
    content.innerHTML = UI.loading;
    const [res, custs] = await Promise.all([API.get('/api/owner/overview'), API.get('/api/customers')]);
    const segs = res.segments;
    const colorMap = { VIP: 'var(--accent-strong)', 'At risk': 'var(--danger)', Overdue: 'var(--warning)', New: 'var(--info)', Lost: '#6B6D74', Advocates: 'var(--success)' };
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">Customer intelligence</div>
        <div class="view-title">Know every segment. Rescue the ones that matter.</div>
      </div>
      <div class="segment-grid">${segs.map((s) => `
        <div class="segment-card">
          <b style="color:${colorMap[s.label] || 'var(--text-primary)'}">${s.count}</b>
          <span>${UI.esc(s.label)}</span>
          <ul>${s.items.slice(0, 3).map((c) => `<li>${UI.esc(c.name)} · ${c.lifetimeValue ? UI.inr(c.lifetimeValue) : ''}</li>`).join('')}</ul>
        </div>`).join('')}
      </div>
      <div class="view-brief mt24" style="margin-bottom:14px"><div class="kicker">Churn detection</div><h3 style="font-size:19px">Who is drifting away?</h3></div>
      <div class="grid3" style="grid-template-columns:repeat(3,1fr);gap:14px">${res.overdue.slice(0, 3).map((o) => `
        <div class="churn-card">
          <div class="spread"><b style="font-size:15px">${UI.esc(o.name)}</b><span class="risk-tag ${o.risk}">${o.risk} RISK</span></div>
          <div style="margin-top:14px">
            <div class="stat-line"><span class="k">Normal frequency</span><span class="v">${o.typicalInterval} days</span></div>
            <div class="stat-line"><span class="k">Current gap</span><span class="v" style="color:var(--danger)">${o.gap} days</span></div>
            <div class="stat-line"><span class="k">Lifetime value</span><span class="v">${UI.inr(o.lifetimeValue)}</span></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="btn primary sm" style="flex:1" data-reactivate="${o.id}">Reactivate</button><button class="btn sm" data-cust="${o.id}">Profile</button></div>
        </div>`).join('')}
      </div>`;
    const onCust = custs;
    content.querySelectorAll('[data-reactivate]').forEach((b) => b.addEventListener('click', () => { UI.toast('Reactivation message queued for ' + (onCust.find((c) => c.id === Number(b.dataset.reactivate)) || {}).name + ' on WhatsApp', true); b.textContent = 'Queued ✅'; }));
    content.querySelectorAll('[data-cust]').forEach((b) => b.addEventListener('click', () => { location.hash = '#/reception/customers'; }));
  }

  async function campaigns(content) {
    content.innerHTML = UI.loading;
    const [camps, res] = await Promise.all([API.get('/api/campaigns'), API.get('/api/owner/overview')]);
    const audience = res.overdue.length + 12;
    const draft = 'Sunday slots are open ❤️ Want me to find your usual appointment?';
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">Marketing without a campaign builder</div>
        <div class="view-title">"Sunday is slow" is a complete brief</div>
        <div class="view-sub">Tell the AI what's going on. It finds the audience and drafts the message. You approve.</div>
      </div>
      <div class="camp-flow">
        <div class="camp-chat">
          <div class="bubble in">I have a slow Sunday 😕</div>
          <div class="bubble ai">I found <b>${audience} customers</b> who usually visit on weekends and haven't visited in 40+ days. Combined LTV ~${UI.inr(res.overdue.reduce((a, o) => a + o.lifetimeValue, 0))}.<br/><br/>Suggested message:</div>
          <div class="camp-draft">"${UI.esc(draft)}"</div>
          <div class="row"><button class="btn" id="c-preview">${I('eye', 14)} Preview</button><button class="btn primary" id="c-send">${I('send', 14)} Approve & send</button></div>
        </div>
        <div>
          <h3 style="font-size:15px;margin-bottom:10px">Past campaigns</h3>
          <div style="display:flex;flex-direction:column;gap:10px">${camps.map((c) => `
            <div class="card"><div class="spread"><b style="font-size:13.5px">${UI.esc(c.name)}</b><span class="pill green">${c.status}</span></div>
            <p class="small muted mt8">${UI.esc(c.message)}</p>
            <div class="small faint mt8">${UI.esc(c.audience)} · ${UI.esc(c.sentAt ? UI.day(c.sentAt) : 'draft')}</div></div>`).join('')}
          </div>
        </div>
      </div>`;
    document.getElementById('c-preview').addEventListener('click', () => {
      UI.modal(`<h3 style="margin-bottom:8px">WhatsApp preview</h3><div class="bubble ai" style="max-width:100%">${UI.esc(draft)}</div>`);
    });
    document.getElementById('c-send').addEventListener('click', async () => {
      const c = await API.post('/api/campaigns', { name: 'Sunday slots open (' + new Date().toDateString() + ')', message: draft, audience: audience + ' weekend-regular customers' });
      await API.post('/api/campaigns/' + c.id + '/send', {});
      UI.toast('Message queued to ' + audience + ' customers on WhatsApp', true);
      document.getElementById('c-send').textContent = 'Sent ✅';
      document.getElementById('c-send').disabled = true;
    });
  }

  async function insights(content) {
    content.innerHTML = UI.loading;
    const ins = await API.get('/api/owner/insights');
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">AI insights</div>
        <div class="view-title">What is happening under the surface</div>
        <div class="view-sub">Detect → Predict → Recommend. No charts to interpret.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">${ins.map((a) => `
        <div class="insight-card sev-${a.severity} anim-in">
          <div>${I(a.type === 'churn' ? 'heart' : a.type === 'staffing' ? 'users' : a.type === 'revenue' ? 'trend' : 'zap', 17)}</div>
          <div style="flex:1"><b>${UI.esc(a.title)}</b>
          <p>${UI.esc(a.detail)}</p>
          <div class="rec">${I('sparkle', 12)} ${UI.esc(a.recommendation)}</div></div>
        </div>`).join('')}
      </div>`;
  }

  async function appointments(content) {
    content.innerHTML = UI.loading;
    let dayOffset = 0;
    let data = await API.get('/api/appointments?day=0');
    async function load() { data = await API.get('/api/appointments?day=' + dayOffset); draw(); }
    async function draw() {
      content.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:16px">
          <div><div class="kicker">Appointments</div><div class="view-title">${new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div></div>
          <div class="cal-toolbar"><button class="btn sm" data-d="-1">${I('chevL', 14)}</button><button class="btn sm" data-d="0">Today</button><button class="btn sm" data-d="1">${I('chevR', 14)}</button></div>
        </div>
        <div id="appt-table"></div>`;
      document.querySelector('#appt-table').innerHTML = `
        <div class="card"><table class="tbl">
          <thead><tr><th>Time</th><th>Customer</th><th>Services</th><th>Stylist</th><th>Value</th><th>Status</th></tr></thead>
          <tbody>${data.list.map((a) => `<tr>
            <td class="mono">${UI.time(a.start)}</td>
            <td><div class="row">${UI.avatar(a.customerName, 26)}<b>${UI.esc(a.customerName)}</b></div></td>
            <td class="small">${a.services.join(' + ')}</td>
            <td>${UI.esc(a.staffName)}</td>
            <td class="mono">${UI.inr(a.price)}</td>
            <td>${UI.statusPill(a.status)}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No appointments</td></tr>'}</tbody>
        </table></div>`;
      content.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { dayOffset = Number(b.dataset.d); load(); }));
    }
    load();
  }

  async function staff(content) {
    content.innerHTML = UI.loading;
    const res = await API.get('/api/owner/overview');
    const top = res.staffUtil[0] || {};
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px">
        <div class="kicker">Not surveillance — better staffing</div>
        <div class="view-title">${UI.esc(top.name || 'Aman')}, at a glance</div>
        <div class="view-sub">Utilization, revenue and repeat-rate per stylist.</div>
      </div>
      <div class="grid3" style="grid-template-columns:repeat(5,1fr)">
        ${UI.kcard('', 'Utilization', `${top.utilization || '—'}%`, { delay: 0 })}
        ${UI.kcard('', 'Revenue', UI.inr(top.revenue || 0), { delay: 50 })}
        ${UI.kcard('', 'Avg bill', UI.inr(top.avgBill || 0), { delay: 100 })}
        ${UI.kcard('', 'Repeat customers', `${top.repeatPct || '—'}%`, { delay: 150 })}
        ${UI.kcard('', 'No-show rate', `${top.noShowRate || '—'}%`, { delay: 200, cls: 'danger' })}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px">${res.staffUtil.map((s) => `
        <div class="card"><div class="spread"><b>${UI.esc(s.name)}</b><span class="pill accent">${s.utilization}%</span></div>
        <div class="prog mt8"><i style="width:${s.utilization}%;background:${s.color}"></i></div>
        <div class="small faint mt8">${s.todayBooked} bookings · avg ${UI.inr(s.avgBill)} · ${s.noShowRate}% no-show</div></div>`).join('')}
      </div>
      <div class="card mt16" style="border-left:3px solid var(--accent);display:flex;gap:12px;align-items:flex-start">
        <span>${I('sparkle', 17)}</span>
        <div><b>AI insight:</b> <span class="muted">${top.name} is consistently overbooked between 6–8 PM. Consider assigning another stylist during this window.</span></div>
      </div>`;
  }

  return { pulse, actions, revenue, customers, campaigns, insights, appointments, staff };
})();