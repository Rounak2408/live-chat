(() => {
  // Same-origin: '' (Express serves /public — works on localhost and your real deploy URL).
  // Split hosting (e.g. Netlify + Render): set before this script — <script>window.API_BASE='https://your-api.onrender.com'</script>
  const API_BASE = typeof window.API_BASE === 'string' ? window.API_BASE : '';
  const registerForm = document.getElementById('registerForm');
  const errEl = document.getElementById('registerError');

  // Store registration data for later use
  let pendingRegistration = null;

  const showError = (msg) => {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.classList.add('show');
  };

  const hideError = () => {
    if (errEl) errEl.classList.remove('show');
  };

  // Show OTP Modal
  const showOTPModal = (otp, email) => {
    // Create modal if it doesn't exist
    let otpModal = document.getElementById('otpModal');
    if (!otpModal) {
      otpModal = document.createElement('div');
      otpModal.id = 'otpModal';
      otpModal.className = 'otp-modal';
      otpModal.innerHTML = `
        <div class="otp-modal__backdrop"></div>
        <div class="otp-modal__panel">
          <div class="otp-modal__header">
            <h3>Verify Your Email</h3>
            <button type="button" class="otp-modal__close" id="otpModalClose">&times;</button>
          </div>
          <p class="otp-modal__sub">Enter the OTP displayed below to verify your email:</p>
          <div class="otp-modal__code" id="otpDisplay">${otp}</div>
          <form id="otpVerifyForm">
            <div class="form-group">
              <label for="otpInput">Enter OTP <span class="req">*</span></label>
              <input 
                type="text" 
                id="otpInput" 
                name="otp" 
                placeholder="Enter 6-digit OTP" 
                maxlength="6" 
                pattern="[0-9]{6}"
                autocomplete="off"
                required
                style="text-align: center; font-size: 18px; letter-spacing: 4px; font-family: monospace;"
              >
            </div>
            <button type="submit" class="btn-signin" id="otpVerifyBtn">Verify & Create Account</button>
            <div id="otpError" class="error-message" style="margin-top: 10px;"></div>
          </form>
        </div>
      `;
      document.body.appendChild(otpModal);

      // Close modal handlers
      document.getElementById('otpModalClose').addEventListener('click', () => {
        otpModal.style.display = 'none';
      });
      otpModal.querySelector('.otp-modal__backdrop').addEventListener('click', () => {
        otpModal.style.display = 'none';
      });

      // OTP verification form handler
      document.getElementById('otpVerifyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const otpInput = document.getElementById('otpInput').value.trim();
        const otpErrorEl = document.getElementById('otpError');
        const verifyBtn = document.getElementById('otpVerifyBtn');

        if (!otpInput || otpInput.length !== 6) {
          otpErrorEl.textContent = 'Please enter a valid 6-digit OTP';
          otpErrorEl.classList.add('show');
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        otpErrorEl.classList.remove('show');

        try {
          // Verify OTP
          const verifyRes = await fetch(`${API_BASE}/api/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: otpInput })
          });

          const verifyData = await verifyRes.json().catch(() => ({}));
          
          if (!verifyRes.ok || !verifyData.success) {
            otpErrorEl.textContent = verifyData.message || 'Invalid OTP. Please try again.';
            otpErrorEl.classList.add('show');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Create Account';
            return;
          }

          // OTP verified, now complete registration
          verifyBtn.textContent = 'Creating Account...';
          
          const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingRegistration)
          });

          let registerData = {};
          try {
            const t = await registerRes.text();
            registerData = t ? JSON.parse(t) : {};
          } catch {
            registerData = {};
          }
          
          if (!registerRes.ok || !registerData.success) {
            otpErrorEl.textContent =
              registerData.message ||
              (registerRes.status >= 500
                ? 'Server error. Try again.'
                : `Registration failed (${registerRes.status}).`);
            otpErrorEl.classList.add('show');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Create Account';
            return;
          }

          // Success! Store email and redirect to login
          sessionStorage.setItem('lastRegisteredEmail', pendingRegistration.email);
          window.location.href = '/login.html';
        } catch (err) {
          otpErrorEl.textContent = 'Network error. Please try again.';
          otpErrorEl.classList.add('show');
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify & Create Account';
          console.error(err);
        }
      });
    } else {
      // Update existing modal
      document.getElementById('otpDisplay').textContent = otp;
      document.getElementById('otpInput').value = '';
      document.getElementById('otpError').classList.remove('show');
      document.getElementById('otpVerifyBtn').disabled = false;
      document.getElementById('otpVerifyBtn').textContent = 'Verify & Create Account';
    }

    otpModal.style.display = 'flex';
    // Focus on OTP input
    setTimeout(() => {
      document.getElementById('otpInput')?.focus();
    }, 100);
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

    // Store registration data
    pendingRegistration = {
      name: displayName || username,
      email,
      password
    };

    try {
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingRegistration)
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        console.error('Register response not JSON:', res.status, rawText.slice(0, 200));
        showError(
          res.ok
            ? 'Server sent invalid response. Check that the API URL is correct.'
            : `Server error (${res.status}). Is the backend running?`
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        return;
      }

      const otpCode = data.data && (data.data.otp ?? data.data.code);

      // OTP step: server returns 200 with requiresOTP (success may be false)
      if (data.requiresOTP === true && otpCode) {
        showOTPModal(String(otpCode), email);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        return;
      }

      if (data.requiresOTP === true && !otpCode) {
        showError(data.message || 'Could not get verification code. Try again in a moment.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        return;
      }

      if (!res.ok || !data.success) {
        showError(
          data.message ||
            (res.status >= 500 ? 'Server error. Try again later.' : `Registration failed (${res.status}).`)
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        return;
      }

      // Registration successful (OTP was already verified)
      sessionStorage.setItem('lastRegisteredEmail', pendingRegistration.email);
      window.location.href = '/login.html';
    } catch (err) {
      showError('Network error. Please try again.');
      console.error(err);
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    }
  });
})();

