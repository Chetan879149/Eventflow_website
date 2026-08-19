(() => {
    const protectPage = async (opts = {}) => {
        const {
            redirectTo = '/login.html',
            requireRole = null
        } = opts;

        try {
            const me = await window.authApi?.getMe?.();

            if (!me || !me.ok || !me.user) {
                window.location.replace(redirectTo);
                return false;
            }

            if (requireRole && me.user.role !== requireRole) {
                window.location.replace('/index.html');
                return false;
            }

            return true;

        } catch (error) {
            console.error('Page authentication error:', error);
            window.location.replace(redirectTo);
            return false;
        }
    };

    window.authGuard = {
        protectPage
    };

    // Keep compatibility with existing code.
    window.routeGuard = {
        protectPage
    };
})();