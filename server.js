'use strict';

require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const { OAuth2Client } = require('google-auth-library');

const { survey, validateAnswers, describeAnswer } = require('./src/survey');
const { Store } = require('./src/store');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'chinnu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chinnu12345';
// Local testing only: lets you "sign in" by typing an email when no Google
// Client ID is configured. Never enable this on a public deployment.
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === 'true' && !IS_PROD;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[warn] SESSION_SECRET is not set; using a random one (everyone is signed out on restart).');
}
if (!GOOGLE_CLIENT_ID) {
  console.warn('[warn] GOOGLE_CLIENT_ID is not set; "Sign in with Google" is disabled. See README.md.');
}

const store = new Store(DATA_DIR);
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // correct `secure` cookies behind Render/Railway/Heroku proxies

app.use(express.json({ limit: '64kb' }));
app.use(
  cookieSession({
    name: 'rv_session',
    keys: [SESSION_SECRET],
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Google Sign-In's popup needs to talk back to this window.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

const PUBLIC = path.join(__dirname, 'public');
const page = (name) => path.join(PUBLIC, name);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function currentUser(req) {
  const id = req.session && req.session.uid;
  return id ? store.getUser(id) : null;
}

function isAdmin(req) {
  return Boolean(req.session && req.session.admin === true);
}

function requireUserApi(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in with Google first.' });
  req.user = user;
  next();
}

function requireAdminApi(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin login required.' });
  next();
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Basic brute-force protection for the admin login: 10 attempts / 15 min / IP.
const loginAttempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const rec = loginAttempts.get(ip) || { count: 0, start: now };
  if (now - rec.start > windowMs) {
    rec.count = 0;
    rec.start = now;
  }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count > 10;
}

function publicUser(u) {
  return u && { id: u.id, email: u.email, name: u.name, picture: u.picture };
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  if (currentUser(req)) return res.redirect('/survey');
  res.sendFile(page('index.html'));
});

app.get('/survey', (req, res) => {
  if (!currentUser(req)) return res.redirect('/');
  res.sendFile(page('survey.html'));
});

app.get('/admin/login', (req, res) => {
  if (isAdmin(req)) return res.redirect('/admin');
  res.sendFile(page('admin-login.html'));
});

app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return res.redirect('/admin/login');
  res.sendFile(page('admin.html'));
});

// Do not expose the HTML files directly (they are served by the guarded routes above).
app.use((req, res, next) => (/\.html?$/i.test(req.path) ? res.redirect('/') : next()));
app.use(express.static(PUBLIC, { index: false, extensions: [], maxAge: IS_PROD ? '1h' : 0 }));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID, devLogin: ALLOW_DEV_LOGIN });
});

app.get('/api/survey', (req, res) => {
  res.json(survey);
});

// ---------------------------------------------------------------------------
// Respondent auth (Google)
// ---------------------------------------------------------------------------
app.post('/api/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
  const credential = req.body && req.body.credential;
  if (typeof credential !== 'string' || !credential) return res.status(400).json({ error: 'Missing Google credential.' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p || !p.email || !p.email_verified) {
      return res.status(403).json({ error: 'Your Google account email is not verified.' });
    }
    const user = await store.upsertLogin({ id: `g:${p.sub}`, email: p.email.toLowerCase(), name: p.name, picture: p.picture });
    req.session.uid = user.id;
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('Google token verification failed:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

app.post('/api/auth/dev', async (req, res) => {
  if (!ALLOW_DEV_LOGIN) return res.status(404).json({ error: 'Not found' });
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  const name = String((req.body && req.body.name) || '').trim().slice(0, 80) || email.split('@')[0];
  const user = await store.upsertLogin({ id: `dev:${email}`, email, name, picture: '' });
  req.session.uid = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) delete req.session.uid;
  res.json({ ok: true });
});

app.get('/api/me', requireUserApi, (req, res) => {
  res.json({ user: publicUser(req.user), response: req.user.response });
});

app.post('/api/responses', requireUserApi, async (req, res) => {
  const result = validateAnswers(req.body && req.body.answers);
  if (!result.ok) return res.status(400).json({ error: 'Some answers need attention.', errors: result.errors });
  const response = await store.saveResponse(req.user.id, result.answers);
  res.json({ ok: true, response });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const { username = '', password = '' } = req.body || {};
  const ok = safeEqual(username, ADMIN_USERNAME) & safeEqual(password, ADMIN_PASSWORD);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password.' });
  loginAttempts.delete(req.ip);
  req.session.admin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  if (req.session) delete req.session.admin;
  res.json({ ok: true });
});

app.get('/api/admin/responses', requireAdminApi, (req, res) => {
  const users = store
    .allUsers()
    .map((u) => ({ ...publicUser(u), firstLoginAt: u.firstLoginAt, lastLoginAt: u.lastLoginAt, response: u.response }))
    .sort((a, b) => {
      const ta = (a.response && a.response.updatedAt) || a.lastLoginAt || '';
      const tb = (b.response && b.response.updatedAt) || b.lastLoginAt || '';
      return tb.localeCompare(ta);
    });
  res.json({ survey, users });
});

app.delete('/api/admin/responses/:id', requireAdminApi, async (req, res) => {
  const ok = await store.deleteResponse(req.params.id);
  if (!ok) return res.status(404).json({ error: 'User not found.' });
  res.json({ ok: true });
});

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // avoid spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

app.get('/api/admin/export.csv', requireAdminApi, (req, res) => {
  const header = ['Name', 'Email', 'Submitted at', 'Last updated', ...survey.questions.map((q, i) => `Q${i + 1}. ${q.short}`)];
  const rows = store
    .allUsers()
    .filter((u) => u.response)
    .map((u) => [
      u.name,
      u.email,
      u.response.submittedAt,
      u.response.updatedAt,
      ...survey.questions.map((q) => describeAnswer(q, u.response.answers[q.id])),
    ]);
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="survey-responses-${stamp}.csv"`);
  res.send(csv);
});

// ---------------------------------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((req, res) => res.redirect('/'));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Research Voices survey running at http://localhost:${PORT}`);
    console.log(`Data file: ${store.file}`);
    if (ALLOW_DEV_LOGIN) console.log('[dev] Email "dev login" is enabled. Do not use this in production.');
  });
}

module.exports = app;
