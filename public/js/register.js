(() => {
  // API base URL: local = '', production = your deployed backend
  const API_BASE =
    window.API_BASE ||
    ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? ''
      : 'https://your-backend-url.onrender.com'); // TODO: replace with your real backend URL
  const registerForm = document.getElementById('registerForm');
  const errEl = document.getElementById('registerError');

  const otpModal = document.getElementById('otpModal');
  const otpCodeEl = document.getElementById('otpCode');
  const otpVerifyForm = document.getElementById('otpVerifyForm');
  const otpInput = document.getElementById('otpInputModal');
  const otpCloseBtn = document.getElementById('otpCloseBtn');
  const otpErrEl = document.getElementById('otpError');

  const showError = (msg) => {
    const target =
      otpModal && !otpModal.classList.contains('is-hidden') && otpErrEl ? otpErrEl : errEl;
    if (!target) return;
    target.textContent = msg;
    target.classList.add('show');
  };

  const hideError = () => {
    if (errEl) errEl.classList.remove('show');
    if (otpErrEl) otpErrEl.classList.remove('show');
  };

  const openModal = () => {
    if (!otpModal) return;
    otpModal.classList.remove('is-hidden');
    otpModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => otpInput?.focus(), 0);
  };

  const closeModal = () => {
    if (!otpModal) return;
    otpModal.classList.add('is-hidden');
    otpModal.setAttribute('aria-hidden', 'true');
    if (otpInput) otpInput.value = '';
    hideError();
  };

  let pendingPayload = null;
  let generatedOtp = null;

  const generateOtp = () => {
    // 6 digit OTP
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  otpCloseBtn?.addEventListener('click', closeModal);
  otpModal?.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('otp-modal__backdrop')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && otpModal && !otpModal.classList.contains('is-hidden')) closeModal();
  });

  if (!registerForm) return;

  registerForm.addEventListener('submit', (e) => {
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
    pendingPayload = {
      name: displayName || username,
      email,
      password
    };

    generatedOtp = generateOtp();
    if (otpCodeEl) otpCodeEl.textContent = generatedOtp;
    openModal();
  });

  otpVerifyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const entered = (otpInput?.value || '').trim();
    if (!entered) {
      showError('Please enter OTP.');
      return;
    }
    if (!generatedOtp || entered !== generatedOtp) {
      showError('Invalid OTP. Please try again.');
      return;
    }
    if (!pendingPayload) {
      showError('Something went wrong. Please try again.');
      return;
    }

    try {
      const submitBtn = otpVerifyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPayload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showError(data.message || 'Registration failed.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // store email for login prefill
      sessionStorage.setItem('lastRegisteredEmail', pendingPayload.email);

      closeModal();
      window.location.href = '/login.html';
    } catch (err) {
      showError('Network error. Please try again.');
      console.error(err);
      const submitBtn = otpVerifyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

