(() => {
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  const errorEl = document.getElementById('errorMessage');

  const showError = (msg) => {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('show');
  };

  const hideError = () => {
    if (!errorEl) return;
    errorEl.classList.remove('show');
  };

  // prefill email from register
  const lastEmail = sessionStorage.getItem('lastRegisteredEmail');
  if (lastEmail && emailEl) {
    emailEl.value = lastEmail;
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = (emailEl?.value || '').trim().toLowerCase();
    const password = passwordEl?.value || '';

    if (!email || !password) {
      showError('Please enter email and password.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        showError(data.message || 'Login failed.');
        return;
      }

      // store auth for rest of app
      sessionStorage.setItem('token', data.data.token);
      sessionStorage.setItem('userId', data.data.user.id);
      sessionStorage.setItem('username', data.data.user.name);
      sessionStorage.setItem('email', data.data.user.email);

      // go to app
      window.location.href = '/options.html';
    } catch (err) {
      showError('Network error. Please try again.');
      console.error(err);
    }
  });
})();

