// Firebase setup shared by all pages.
import * as F from './vendor/firebase.js';
import { firebaseConfig, ADMIN_EMAIL_DOMAIN } from './firebase-config.js';

export { F };

const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const DEMO_CONFIG = { apiKey: 'demo-api-key', authDomain: 'localhost', projectId: 'demo-research-voices' };

let configPromise;
function loadConfig() {
  configPromise ||= (async () => {
    if (firebaseConfig && firebaseConfig.apiKey) return firebaseConfig;
    try {
      const res = await fetch('/__/firebase/init.json');
      if (res.ok) return await res.json();
    } catch (_) { /* not on Firebase Hosting */ }
    if (LOCAL) return DEMO_CONFIG;
    throw new Error('Firebase is not configured. Deploy with Firebase Hosting or fill in public/js/firebase-config.js.');
  })();
  return configPromise;
}

const cache = {};
/**
 * Returns { auth, db } for a named Firebase app instance.
 * Respondents use the default instance and the admin panel uses a separate
 * "admin" instance, so the two sign-ins never replace each other.
 */
export async function services(name = '[DEFAULT]') {
  if (cache[name]) return cache[name];
  const config = await loadConfig();
  const app = name === '[DEFAULT]' ? F.initializeApp(config) : F.initializeApp(config, name);
  const auth = F.getAuth(app);
  const db = F.getFirestore(app);
  // Local testing against the Firebase emulators (demo-* projects only).
  if (LOCAL && String(config.projectId).startsWith('demo-')) {
    F.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  await auth.authStateReady();
  cache[name] = { app, auth, db };
  return cache[name];
}

export const isGoogleUser = (u) => Boolean(u && u.providerData.some((p) => p.providerId === 'google.com'));

export function adminEmail(username) {
  const u = String(username).trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${ADMIN_EMAIL_DOMAIN}`;
}

/** Firestore Timestamp (or null) → ISO string (or ''). */
export const iso = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : '');

/** Friendly text for Firebase errors. */
export function errorText(err) {
  const code = (err && err.code) || '';
  const map = {
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
    'auth/cancelled-popup-request': 'The Google sign-in window was closed before finishing.',
    'auth/internal-error': 'Google sign-in could not start. Check your connection, then try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/invalid-credential': 'Invalid username or password.',
    'auth/wrong-password': 'Invalid username or password.',
    'auth/user-not-found': 'Invalid username or password.',
    'auth/invalid-email': 'Invalid username or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/unauthorized-domain': 'This website address is not authorised for sign-in. Add it in Firebase console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'This sign-in method is turned off. Enable it in Firebase console → Authentication → Sign-in method.',
    'permission-denied': 'Permission denied by the database rules.',
    unavailable: 'Cannot reach the database right now. Check your connection and try again.',
  };
  return map[code] || (err && err.message) || 'Something went wrong. Please try again.';
}
