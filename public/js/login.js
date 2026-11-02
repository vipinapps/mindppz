import { esc, topbar, adminButton } from './common.js';
import { F, services, isGoogleUser, errorText } from './fb.js';
import { survey } from './survey-data.js';

document.getElementById('top').innerHTML = topbar(adminButton);
const msg = document.getElementById('signin-msg');
const btn = document.getElementById('gbtn');

const showError = (text) => { msg.innerHTML = `<p class="error-text" role="alert">${esc(text)}</p>`; };

// Static content from the survey definition.
document.getElementById('intro-text').textContent = survey.intro;
document.getElementById('audiences').innerHTML = survey.audiences.map((a) => `<span class="pill">${esc(a)}</span>`).join('');
document.getElementById('overview').innerHTML = survey.questions
  .map((q, i) => `<li><span class="num-badge">${String(i + 1).padStart(2, '0')}</span>${esc(q.short)}</li>`)
  .join('');

async function init() {
  const { auth } = await services();

  // Already signed in with Google (or just returned from a redirect sign-in).
  if (isGoogleUser(auth.currentUser)) {
    window.location.replace('/survey');
    return;
  }

  btn.disabled = false;
  btn.addEventListener('click', async () => {
    msg.innerHTML = '';
    btn.disabled = true;
    const provider = new F.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await F.signInWithPopup(auth, provider);
      window.location.href = '/survey';
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        await F.signInWithRedirect(auth, provider); // comes back to this page signed in
        return;
      }
      btn.disabled = false;
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') showError(errorText(err));
    }
  });
}

init().catch((err) => showError(errorText(err)));
