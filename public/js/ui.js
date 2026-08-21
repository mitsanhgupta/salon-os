/* ui.js — formatting, avatars, toasts, modals, shared render helpers */
const UI = (function () {
  const PANTS = ['#FF6B4A', '#5B9DFF', '#3ECF8E', '#F5B841', '#B57BFF', '#FF8FC7', '#5BC8FF', '#9CE05A'];
  const avatarColor = (s) => { let h = 0; for (const c of (s || '?').split('')) h = (h * 31 + c.charCodeAt(0)) % 997; return PANTS[h % PANTS.length]; };
  const initials = (name) => (name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (name, size) => `<span class="avatar" style="background:${avatarColor(name)};width:${size || 34}px;height:${size || 34}px;font-size:${(size || 34) / 2.6}px">${initials(name)}</span>`;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const day = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const dayFull = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const rel = (iso) => {
    const d = new Date(iso); const now = new Date(); const m = Math.max(0, Math.round((now - d) / 60000));
    if (m < 1) return 'now'; if (m < 60) return m + 'm'; const h = Math.round(m / 60); if (h < 24) return h + 'h'; return Math.round(h / 24) + 'd';
  };

  const STATUS = {
    confirmed: { label: 'Confirmed', cls: 'green' }, pending: { label: 'Pending', cls: 'yellow' },
    arrived: { label: 'Arrived', cls: 'blue' }, 'in-service': { label: 'In service', cls: 'accent' },
    completed: { label: 'Completed', cls: 'gray' }, cancelled: { label: 'Cancelled', cls: 'gray' },
    'no-show': { label: 'No-show', cls: 'red' }
  };
  const statusPill = (s) => { const x = STATUS[s] || { label: s, cls: 'gray' }; return `<span class="pill ${x.cls}"><span class="dot"></span>${x.label}</span>`; };
  const CONVSTATUS = {
    'needs-action': { label: 'Needs action', cls: 'red' }, waiting: { label: 'Waiting', cls: 'yellow' },
    booked: { label: 'Booked', cls: 'green' }, reschedule: { label: 'Reschedule', cls: 'blue' },
    payment: { label: 'Payment', cls: 'accent' }, feedback: { label: 'Feedback', cls: 'gray' }
  };
  const convPill = (s) => { const x = CONVSTATUS[s] || { label: s, cls: 'gray' }; return `<span class="pill ${x.cls}"><span class="dot"></span>${x.label}</span>`; };

  const toast = (msg, ok) => {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast' + (ok ? ' ok' : '');
    el.innerHTML = (ok ? I('check', 15) : I('x', 15)) + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3200);
  };

  const modal = (html, onMount) => {
    const root = document.getElementById('modal-root');
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal">${html}</div>`;
    const close = () => bd.remove();
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    root.appendChild(bd);
    if (onMount) onMount(bd);
    return close;
  };

  const kcard = (kicker, title, value, opts = {}) => `
    <div class="metric-card anim-in ${opts.cls || ''}" style="animation-delay:${opts.delay || 0}ms">
      ${kicker ? `<div class="kicker" style="margin-bottom:10px">${kicker}</div>` : ''}
      ${title ? `<div class="label">${title}</div>` : ''}
      <div class="value">${value}</div>
      ${opts.sub ? `<div class="small muted" style="margin-top:4px">${opts.sub}</div>` : ''}
    </div>`;

  const loading = `<div class="empty-state" style="padding:80px"><span class="faint">Loading…</span></div>`;

  return { avatar, initials, avatarColor, esc, inr, time, day, dayFull, rel, STATUS, statusPill, convPill, toast, modal, kcard, loading };
})();