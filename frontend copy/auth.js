(() => {
  // IMPORTANT: frontend/script.js expects these exact keys.
  const LS_TOKEN_KEY = 'eventflow-session';
  const LS_USER_KEY = 'eventflow-user';
  const SS_TOKEN_KEY = 'eventflow-session';


  const readToken = () => {
    try {
      return sessionStorage.getItem(SS_TOKEN_KEY) || localStorage.getItem(LS_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  };

  const readUser = () => {
    try {
      const raw = localStorage.getItem(LS_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeAuth = ({ token, user, rememberMe }) => {
    try {
      // Keep UI compatible with existing frontend/script.js which expects:
      // localStorage: eventflow-user, eventflow-session
      if (rememberMe) {
        localStorage.setItem(LS_TOKEN_KEY, token);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(user || {}));
        sessionStorage.removeItem(SS_TOKEN_KEY);
      } else {
        // Still write user to localStorage so index.js navbar/modal logic works.
        // Token is written to sessionStorage to keep it non-persistent.
        sessionStorage.setItem(SS_TOKEN_KEY, token);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(user || {}));
        localStorage.removeItem(LS_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  };


  const clearAuth = () => {
    try {
      sessionStorage.removeItem(SS_TOKEN_KEY);
      localStorage.removeItem(LS_TOKEN_KEY);
      localStorage.removeItem(LS_USER_KEY);
    } catch {
      // ignore
    }
  };


  const api = async (url, method, { token, body } = {}) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: payload?.error || payload?.message || 'Request failed' };
    }
    return { ok: true, status: res.status, ...payload };
  };

  const login = async ({ email, password, role, rememberMe }) => {
    if (!email || !password || !role) return { ok: false, error: 'Email and password and role are required.' };

    const res = await api('/api/auth/login', 'POST', {
      body: { email, password, role }
    });

    console.log('LOGIN API RESPONSE:', res);
    console.log('LOGIN USER:', res.user);
    console.log('LOGIN USER ROLE:', res.user?.role);

    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    writeAuth({
      token: res.token,
      user: res.user,
      rememberMe: !!rememberMe
    });

    return {
      ok: true,
      token: res.token,
      user: res.user
    };
  };

  const logout = async () => {
    const token = readToken();
    try {
      if (token) {
        // best-effort server logout
        await api('/api/auth/logout', 'POST', { token });
      }
    } finally {
      clearAuth();
    }
  };

  const getMe = async () => {
    const token = readToken();
    if (!token) return { ok: false };
    const res = await api('/api/auth/me', 'GET', { token });
    return res;
  };

  const getSessionToken = readToken;
  const getCurrentUser = () => readUser();

  window.authApi = {
    login,
    logout,
    getMe,
    getSessionToken,
    getCurrentUser
  };
})();

