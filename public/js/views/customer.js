/* views/customer.js — Customer portal, WhatsApp-first */
const CustomerView = (function () {
  const CHIPS = ['Hi 👋', 'Book my usual', 'Haircut tomorrow evening', 'How much is keratin?', 'Can I move my appointment?', 'Cancel my appointment'];

  function bubble(m) {
    if (m.from === 'customer') return `<div class="bubble out">${UI.esc(m.text)}</div>`;
    return `<div style="display:flex;flex-direction:column;align-items:flex-start;max-width:82%"><div class="bubble ai">${UI.esc(m.text)}</div><div class="wa-meta"><span>AI receptionist</span></div></div>`;
  }

  async function chat(content) {
    content.innerHTML = UI.loading;
    const [hist, appts] = await Promise.all([API.get('/api/whatsapp/history'), API.get('/api/customer/appointments')]);
    const msgs = (hist.messages || []).filter((m) => m.from !== 'staff');
    const upcoming = appts.filter((a) => new Date(a.start) > new Date() && a.status !== 'cancelled');
    const past = appts.filter((a) => new Date(a.start) < new Date() || a.status === 'cancelled');

    content.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:16px">
        <div>
          <div class="kicker" style="color:var(--role-customer)">Customer · WhatsApp</div>
          <div class="view-title">Your AI receptionist</div>
          <div class="view-sub">You never install an app. You just talk to the salon — in natural language.</div>
        </div>
        <button class="btn" data-refresh>${I('refresh', 14)} Refresh</button>
      </div>
      <div class="cust-chat-wrap">
        <div class="wa-window">
          <div class="chat-head" style="background:var(--bg-tertiary)">
            ${UI.avatar('Looks Salon', 36)}
            <div class="who"><b>Looks Salon · AI Receptionist</b><span style="color:var(--success)">online · replies instantly</span></div>
          </div>
          <div class="wa-msgs" id="wa-msgs">
            ${msgs.map(bubble).join('') || `<div class="bubble ai">Hey 👋 Welcome to Looks Salon! I'm the AI receptionist. Try:<br/>• "Haircut tomorrow evening"<br/>• "Book my usual"<br/>• "How much is keratin?"</div>`}
          </div>
          <div class="suggest-chips">${CHIPS.map((c) => `<button data-chip="${UI.esc(c)}">${UI.esc(c)}</button>`).join('')}</div>
          <div class="wa-input"><input id="wa-in" placeholder="Type a message…" /><button class="btn primary" id="wa-send">${I('send', 16)}</button></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;overflow-y:auto">
          <div class="card"><div class="spread mb8"><h3 style="font-size:15px">Your visits</h3><span class="pill blue">${upcoming.length} upcoming</span></div>
          ${upcoming.length ? upcoming.map((a) => `
            <div class="stat-line"><div><b>${a.services.join(' + ')}</b><div class="small faint">${UI.day(a.start)} · ${UI.time(a.start)} · ${UI.esc(a.staffName)}</div></div><span class="mono">${UI.inr(a.price)}</span></div>`).join('') : '<p class="small muted">No upcoming appointments. Try booking in the chat →</p>'}
          </div>
          <div class="card"><div class="spread mb16"><h3 style="font-size:15px">Past visits</h3></div>
          ${past.slice(0, 5).map((a) => `<div class="stat-line"><span>${UI.day(a.start)} · ${a.services.join(' + ')}</span><span class="small muted">${a.status === 'cancelled' ? 'Cancelled' : UI.inr(a.price)}</span></div>`).join('')}
          </div>
        </div>
      </div>`;

    const send = async (text) => {
      if (!text.trim()) return;
      const inp = content.querySelector('#wa-in');
      const msgBox = content.querySelector('#wa-msgs');
      msgBox.insertAdjacentHTML('beforeend', `<div class="bubble out">${UI.esc(text)}</div>`);
      if (inp) inp.value = '';
      msgBox.scrollTop = msgBox.scrollHeight;
      const typing = document.createElement('div');
      typing.className = 'bubble ai';
      typing.style.opacity = '.7';
      typing.innerHTML = `${I('sparkle', 13)} thinking…`;
      msgBox.appendChild(typing);
      try {
        const res = await API.post('/api/whatsapp', { message: text });
        typing.remove();
        msgBox.insertAdjacentHTML('beforeend', `<div style="display:flex;flex-direction:column;align-items:flex-start;max-width:82%"><div class="bubble ai">${UI.esc(res.reply)}</div><div class="wa-meta"><span>AI receptionist · just now</span></div></div>`);
        msgBox.scrollTop = msgBox.scrollHeight;
      } catch (e) { typing.remove(); UI.toast(e.message); }
    };

    content.querySelector('#wa-send').addEventListener('click', () => send(content.querySelector('#wa-in').value));
    content.querySelector('#wa-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(content.querySelector('#wa-in').value); });
    content.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => send(b.dataset.chip)));
    content.querySelector('[data-refresh]').addEventListener('click', () => chat(content));
    const mbx = content.querySelector('#wa-msgs'); mbx.scrollTop = mbx.scrollHeight;
  }

  async function appointments(content) {
    content.innerHTML = UI.loading;
    const appts = await API.get('/api/customer/appointments');
    const upcoming = appts.filter((a) => new Date(a.start) > new Date() && a.status !== 'cancelled');
    const past = appts.filter((a) => new Date(a.start) <= new Date() || a.status === 'cancelled');
    content.innerHTML = `
      <div class="view-brief" style="margin-bottom:18px"><div class="kicker" style="color:var(--role-customer)">My appointments</div><div class="view-title">Everything on the books</div></div>
      <h3 style="font-size:15px;margin-bottom:10px">Upcoming</h3>
      <div class="grid3" style="margin-bottom:24px">${upcoming.map((a) => `
        <div class="card"><div class="spread"><span class="pill green">Confirmed</span><span class="mono">${UI.inr(a.price)}</span></div>
        <h3 style="font-size:17px;margin-top:10px">${a.services.join(' + ')}</h3>
        <div class="muted small">${UI.day(a.start)} · ${UI.time(a.start)}</div>
        <div class="small" style="margin-top:8px">with ${UI.esc(a.staffName)}</div>
        <button class="btn sm danger" style="margin-top:12px;width:100%" data-cancel="${a.id}">Cancel</button></div>`).join('') || '<p class="small muted">No upcoming — use the chat to book →</p>'}</div>
      <h3 style="font-size:15px;margin-bottom:10px">Past</h3>
      <div class="card">${past.length ? past.map((a) => `<div class="stat-line"><span>${UI.day(a.start)} · ${a.services.join(' + ')}</span><span class="small muted">${a.status === 'cancelled' ? 'Cancelled' : UI.inr(a.price)}</span></div>`).join('') : '<p class="small muted">No history yet</p>'}</div>`;
    content.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
      await API.post('/api/customer/appointments/' + b.dataset.cancel + '/cancel', {});
      UI.toast('Appointment cancelled', true); appointments(content);
    }));
  }

  return { chat, appointments };
})();