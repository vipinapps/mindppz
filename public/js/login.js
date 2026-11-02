(function () {
  'use strict';
  const { esc, api, topbar, adminButton } = window.RV;

  document.getElementById('top').innerHTML = topbar(adminButton);
  const msg = document.getElementById('signin-msg');

  function showError(text) {
    msg.innerHTML = `<p class="error-text" role="alert">${esc(text)}</p>`;
  }

  async function onGoogleCredential(resp) {
    msg.innerHTML = '<p class="muted">Signing you in…</p>';
    try {
      await api('/api/auth/google', { method: 'POST', body: { credential: resp.credential } });
      window.location.href = '/survey';
    } catch (err) {
      showError(err.message);
    }
  }

  function loadGoogle(clientId) {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: clientId, callback: onGoogleCredential, ux_mode: 'popup' });
      const width = Math.min(320, document.getElementById('gbtn').clientWidth || 320);
      google.accounts.id.renderButton(document.getElementById('gbtn'), {
        theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width,
      });
    };
    s.onerror = () => showError('Could not load Google Sign-In. Check your connection and refresh.');
    document.head.appendChild(s);
  }

  async function init() {
    const [config, survey] = await Promise.all([api('/api/config'), api('/api/survey')]);

    document.getElementById('intro-text').textContent = survey.intro;
    document.getElementById('audiences').innerHTML = survey.audiences.map((a) => `<span class="pill">${esc(a)}</span>`).join('');
    document.getElementById('overview').innerHTML = survey.questions
      .map((q, i) => `<li><span class="num-badge">${String(i + 1).padStart(2, '0')}</span>${esc(q.short)}</li>`)
      .join('');

    if (config.googleClientId) {
      loadGoogle(config.googleClientId);
    } else {
      document.getElementById('gbtn').innerHTML =
        '<div class="notice"><b>Google sign-in is not configured yet.</b><br>Set <code>GOOGLE_CLIENT_ID</code> on the server (see README.md) to enable “Continue with Google”.</div>';
    }

    if (config.devLogin) {
      document.getElementById('dev-login').hidden = false;
      document.getElementById('dev-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api('/api/auth/dev', {
            method: 'POST',
            body: { email: document.getElementById('dev-email').value, name: document.getElementById('dev-name').value },
          });
          window.location.href = '/survey';
        } catch (err) {
          showError(err.message);
        }
      });
    }
  }

  init().catch((err) => showError(err.message));
})();
