/* views/login.js — the salonOS.com login screen */
const LoginView = (function () {
  function form() {
    return `
      <div class="login-card anim-in">
        <div class="row" style="margin-bottom:16px">
          <span class="brand-mark" style="width:38px;height:38px">${I('sparkle', 20)}</span>
          <div><b style="font-size:18px;font-family:var(--font-display)">Salon OS</b><div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.12em">One system · Three experiences</div></div>
        </div>
        <h2>Sign in to salonOS.com</h2>
        <div class="sub">The backend picks your role. Owner, receptionist or customer.</div>
        <div class="field"><label>Email or phone</label><input id="login-id" type="text" placeholder="owner@lookssalon.com" /></div>
        <div class="field"><label>Password</label><input id="login-pass" type="password" placeholder="••••••••" /></div>
        <button id="login-btn" class="btn primary" style="width:100%">Login</button>
        <div id="login-err" class="small" style="color:var(--danger);margin-top:10px"></div>
        <div class="qlogins">
          <button class="qlogin" data-quick="owner"><span class="pill red" style="pointer-events:none"><span class="dot"></span>Owner</span> <b>Salon Pulse</b> <span class="arrow">→</span></button>
          <button class="qlogin" data-quick="reception"><span class="pill green" style="pointer-events:none"><span class="dot"></span>Reception</span> <b>Operations Center</b> <span class="arrow">→</span></button>
          <button class="qlogin" data-quick="customer"><span class="pill blue" style="pointer-events:none"><span class="dot"></span>Customer</span> <b>WhatsApp AI chat</b> <span class="arrow">→</span></button>
        </div>
      </div>`;
  }

  function render(root) {
    root.innerHTML = `
      <div class="login-wrap">
        <div class="login-left">
          <div class="row" style="margin-bottom:48px">
            <span class="brand-mark">${I('sparkle', 18)}</span>
            <div><b style="font-size:17px;font-family:var(--font-display)">Salon OS</b><div style="font-size:10.5px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.12em">The AI operating system for salons</div></div>
          </div>
          <h1 class="login-hero">One salon.<br />One system.<span class="accent-word">Three experiences.</span></h1>
          <p class="muted" style="margin-top:20px;font-size:15px;max-width:520px">WhatsApp becomes the front desk. The receptionist gets a copilot. The owner gets a business brain.</p>
          <div class="login-role-split">
            <div class="role-teaser"><i style="background:var(--role-customer)"></i><b>Customer</b><span>Personal AI receptionist</span></div>
            <div class="role-teaser"><i style="background:var(--role-receptionist)"></i><b>Salon team</b><span>AI operations copilot</span></div>
            <div class="role-teaser"><i style="background:var(--role-owner)"></i><b>Owner</b><span>AI business copilot</span></div>
          </div>
        </div>
        <div class="login-right">${form()}</div>
      </div>`;

    const err = root.querySelector('#login-err');
    const id = root.querySelector('#login-id');
    const pass = root.querySelector('#login-pass');

    const doLogin = async (email, password) => {
      err.textContent = '';
      try {
        const { token, user } = await API.login(email, password);
        API.setToken(token);
        App.setUser(user);
        location.hash = App.homeFor(user.role);
      } catch (e) { err.textContent = e.message; }
    };

            const openCustomerLogin = () => {
      let close = UI.modal(`
        <h3 style="margin-bottom:6px">Customer portal · via WhatsApp</h3>
        <p class="small muted" style="margin-bottom:16px">Enter the phone number we have on file to open your chat with the AI receptionist.</p>
        <div class="field"><label>Your phone (demo: 98111 00001)</label><input id="cust-phone" placeholder="98111 00001" /></div>
        <div class="field"><label>Name (if new)</label><input id="cust-name" placeholder="Your name" /></div>
        <div style="display:flex;gap:10px;margin-top:6px">
          <button id="cust-go" class="btn primary" style="flex:1">Open WhatsApp</button>
          <button class="btn ghost" data-close>Cancel</button>
        </div>`);
      const go = async () => {
        try {
          const phone = document.getElementById('cust-phone').value.trim();
          const name = document.getElementById('cust-name').value.trim();
          const { token, user } = await API.customerLogin(phone, name);
          API.setToken(token);
          App.setUser(user);
          location.hash = '#/customer/chat';
          close();
        } catch (e) { UI.toast(e.message); }
      };
      close = () => { document.getElementById('modal-root').innerHTML = ''; };
      document.getElementById('cust-go').addEventListener('click', go);
      document.getElementById('cust-phone').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      document.querySelector('[data-close]').addEventListener('click', close);
    };

    root.querySelector('#login-btn').addEventListener('click', () => doLogin(id.value, pass.value));
    [id, pass].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(id.value, pass.value); }));

    root.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
      const q = b.dataset.quick;
      if (q === 'owner') doLogin('owner@lookssalon.com', 'owner123');
      else if (q === 'reception') doLogin('reception@lookssalon.com', 'reception123');
      else openCustomerLogin();
    }));
  }

  return { render };
})();