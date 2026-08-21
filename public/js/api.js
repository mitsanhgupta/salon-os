/* api.js — REST client with token auth */
const API = (function () {
  const KEY = 'salon_os_token';
  const getToken = () => localStorage.getItem(KEY);
  const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

  async function req(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const t = getToken();
    if (t) opts.headers.Authorization = 'Bearer ' + t;
    if (body !== undefined) opts.body = JSON.stringify(body);
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw new Error('Cannot reach server. Run: npm start'); }
    if (r.status === 401) { setToken(null); if (location.hash !== '#/login') location.hash = '#/login'; throw new Error('Session expired — log in again'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  return {
    getToken, setToken,
    login: (email, password) => req('POST', '/api/auth/login', { email, password }),
    customerLogin: (phone, name) => req('POST', '/api/auth/customer', { phone, name }),
    logout: () => req('POST', '/api/auth/logout'),
    meta: () => req('GET', '/api/meta'),
    get: (u) => req('GET', u),
    post: (u, b) => req('POST', u, b || {}),
    patch: (u, b) => req('PATCH', u, b || {})
  };
})();