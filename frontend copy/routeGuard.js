(() => {
  const protectPage = async (opts = {}) => {
    const { redirectTo = '/login.html' } = opts;

    const me = await window.authApi?.getMe?.();
    if (!me || !me.ok || !me.user) {
      // clear possibly-stale client token
      try { await window.authApi.logout(); } catch {}
      window.location.href = redirectTo;
      return false;
    }

    return true;
  };

  window.routeGuard = { protectPage };
})();

