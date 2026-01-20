(() => {
  // API base URL: local = '', production = your deployed backend
  const API_BASE =
    window.API_BASE ||
    ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? ''
      : 'https://live-chat-1-1ku0.onrender.com');
  const registerForm = document.getElementById('registerForm');
  const errEl = document.getElementById('registerError');

  const showError = (msg) => {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.classList.add('show');
  };

  const hideError = () => {
    if (errEl) errEl.classList.remove('show');
  };

  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
    const displayName = (document.getElementById('regDisplay')?.value || '').trim();
    const username = (document.getElementById('regUsername')?.value || '').trim();
    const password = document.getElementById('regPassword')?.value || '';
    const terms = document.getElementById('terms')?.checked;

    if (!email || !username || !password) {
      showError('Please fill required fields.');
      return;
    }
    if (!terms) {
      showError('Please accept Terms of Service.');
      return;
    }

    // backend expects: name, email, password
    const payload = {
      name: displayName || username,
      email,
      password
    };
    try {
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showError(data.message || 'Registration failed.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // store email for login prefill
      sessionStorage.setItem('lastRegisteredEmail', payload.email);
      window.location.href = '/login.html';
    } catch (err) {
      showError('Network error. Please try again.');
      console.error(err);
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

