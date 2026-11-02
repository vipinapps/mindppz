/* Shared UI helpers for all pages. */

const LOGO = `
<svg viewBox="0 0 48 48" aria-hidden="true">
<ellipse cx="24" cy="24" rx="21" ry="8.5" fill="none" stroke="#19e3cf" stroke-width="2.4"/>
<ellipse cx="24" cy="24" rx="21" ry="8.5" fill="none" stroke="#f2a51a" stroke-width="2.4" transform="rotate(60 24 24)"/>
<ellipse cx="24" cy="24" rx="21" ry="8.5" fill="none" stroke="#19e3cf" stroke-width="2.4" transform="rotate(120 24 24)"/>
<circle cx="24" cy="24" r="5" fill="#19e3cf"/><circle cx="24" cy="24" r="2.2" fill="#0b1f3a"/>
</svg>`;

const ICONS = {
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function avatar(user, cls = 'avatar') {
  if (user && user.picture) return `<img class="${cls}" src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">`;
  const initial = ((user && (user.name || user.email)) || '?').trim().charAt(0).toUpperCase();
  return `<span class="${cls}" aria-hidden="true">${esc(initial)}</span>`;
}

function topbar(actionsHtml) {
  return `
<header class="topbar">
<div class="topbar-inner">
  <a class="brand" href="/" aria-label="Research Voices home">
    ${LOGO}
    <div><div class="brand-name">RESEARCH <span>VOICES</span></div><div class="brand-tag">Connect. Collaborate. Discover</div></div>
  </a>
  <div class="topbar-actions">${actionsHtml || ''}</div>
</div>
</header>`;
}

const adminButton = `<a class="btn btn-admin" href="/admin-login">${ICONS.shield}<span>Admin</span></a>`;

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export { esc, avatar, topbar, adminButton, toast, fmtDate, ICONS, LOGO };
