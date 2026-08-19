document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const ok = window.confirm('Are you sure you want to log out?');
    if (!ok) return;

    try {
      await window.authApi?.logout?.();
    } catch {}
    window.location.href = '/login.html';
  });
});

