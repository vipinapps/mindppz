(function () {
  'use strict';
  const { esc, api, avatar, topbar, toast, fmtDate, ICONS } = window.RV;

  const app = document.getElementById('app');
  const drawerRoot = document.getElementById('drawer-root');
  let survey, users = [];
  let tab = 'responses';
  let filter = '';
  let lastFocus = null;

  document.getElementById('top').innerHTML = topbar(
    '<a class="btn btn-admin" href="/">View survey</a><button class="btn btn-admin" id="logout" type="button">Log out</button>'
  );
  document.getElementById('logout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });

  const done = () => users.filter((u) => u.response);

  function labelFor(q, a, id) {
    const o = q.options.find((x) => x.id === id);
    if (!o) return id;
    return o.other && a.other ? `${o.label.replace(/\.$/, '')}: ${a.other}` : o.label;
  }

  // ---------- page ----------
  function render() {
    const completed = done();
    const latest = completed.reduce((m, u) => (u.response.updatedAt > m ? u.response.updatedAt : m), '');
    const rate = users.length ? Math.round((completed.length / users.length) * 100) : 0;

    app.innerHTML = `
<div class="stats">
  <div class="card stat"><div class="k">Responses</div><div class="v">${completed.length}</div></div>
  <div class="card stat"><div class="k">Signed-in users</div><div class="v">${users.length}</div></div>
  <div class="card stat"><div class="k">Completion rate</div><div class="v">${rate}%</div></div>
  <div class="card stat"><div class="k">Latest response</div><div class="v small">${esc(latest ? fmtDate(latest) : '—')}</div></div>
</div>
<div class="toolbar">
  <div class="tabs" role="tablist">
    <button role="tab" type="button" data-tab="responses" aria-selected="${tab === 'responses'}">Each user</button>
    <button role="tab" type="button" data-tab="summary" aria-selected="${tab === 'summary'}">Summary</button>
  </div>
  <div class="right">
    ${tab === 'responses' ? `<input class="input search" id="search" type="search" placeholder="Search name or email…" value="${esc(filter)}" aria-label="Search users">` : ''}
    <button class="btn btn-ghost" type="button" id="refresh">Refresh</button>
    <a class="btn btn-primary" href="/api/admin/export.csv">${ICONS.download}<span>Export CSV</span></a>
  </div>
</div>
<div id="panel"></div>`;

    app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    document.getElementById('refresh').addEventListener('click', () => load().then(() => toast('Results refreshed')));
    const search = document.getElementById('search');
    if (search) search.addEventListener('input', () => { filter = search.value; renderTable(); });

    if (tab === 'responses') renderTable();
    else renderSummary();
  }

  function renderTable() {
    const panel = document.getElementById('panel');
    const f = filter.trim().toLowerCase();
    const rows = users.filter((u) => !f || (u.name || '').toLowerCase().includes(f) || (u.email || '').toLowerCase().includes(f));

    if (!users.length) {
      panel.innerHTML = '<div class="card empty">No one has signed in yet. Share the survey link to start collecting responses.</div>';
      return;
    }
    if (!rows.length) {
      panel.innerHTML = '<div class="card empty">No users match your search.</div>';
      return;
    }

    panel.innerHTML = `
<div class="card table-card"><div class="table-scroll"><table>
  <thead><tr><th>User</th><th>Status</th><th class="hide-sm">Submitted</th><th class="hide-sm">Last updated</th><th></th></tr></thead>
  <tbody>
  ${rows
    .map(
      (u) => `
    <tr data-id="${esc(u.id)}" tabindex="0" aria-label="View answers from ${esc(u.name)}">
      <td><div class="who">${avatar(u)}<div style="min-width:0"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td>
      <td>${u.response ? '<span class="status done">Completed</span>' : '<span class="status pending">Not submitted</span>'}</td>
      <td class="hide-sm">${esc(u.response ? fmtDate(u.response.submittedAt) : '—')}</td>
      <td class="hide-sm">${esc(u.response ? fmtDate(u.response.updatedAt) : fmtDate(u.lastLoginAt))}</td>
      <td style="text-align:right"><span class="btn btn-ghost btn-sm">View</span></td>
    </tr>`
    )
    .join('')}
  </tbody>
</table></div></div>`;

    panel.querySelectorAll('tr[data-id]').forEach((tr) => {
      const open = () => openDrawer(tr.dataset.id);
      tr.addEventListener('click', open);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function renderSummary() {
    const panel = document.getElementById('panel');
    const completed = done();
    if (!completed.length) {
      panel.innerHTML = '<div class="card empty">No responses yet. Charts appear here once people submit the survey.</div>';
      return;
    }
    const total = completed.length;

    panel.innerHTML = `<div class="summary-grid">${survey.questions
      .map((q, i) => {
        const answered = completed.filter((u) => u.response.answers[q.id]);
        if (q.type === 'text') {
          return `<div class="card sum-card full"><h4><span class="num-badge">${String(i + 1).padStart(2, '0')}</span>${esc(q.title)}</h4>
            <div class="sub">${esc(q.question)} · ${answered.length} answers</div>
            <ul class="text-list">${answered
              .map((u) => `<li>${esc(u.response.answers[q.id].text)}<small>${esc(u.name)} · ${esc(u.email)}</small></li>`)
              .join('')}</ul></div>`;
        }
        const counts = Object.fromEntries(q.options.map((o) => [o.id, 0]));
        const others = [];
        for (const u of answered) {
          const a = u.response.answers[q.id];
          a.selected.forEach((id) => { if (id in counts) counts[id] += 1; });
          if (a.other) others.push(a.other);
        }
        const bars = q.options
          .map((o) => {
            const c = counts[o.id];
            const pct = total ? Math.round((c / total) * 100) : 0;
            return `<div class="bar-row"><div><div class="lbl">${esc(o.label)}</div><div class="bar"><i style="width:${pct}%"></i></div></div>
              <div class="val">${c} <small>(${pct}%)</small></div></div>`;
          })
          .join('');
        const otherList = others.length
          ? `<div class="sub" style="margin:12px 0 4px"><b>“Other” answers:</b> ${others.map(esc).join(' · ')}</div>`
          : '';
        const kind = q.type === 'single' ? 'single choice' : q.max ? `up to ${q.max}` : 'select all';
        return `<div class="card sum-card"><h4><span class="num-badge">${String(i + 1).padStart(2, '0')}</span>${esc(q.title)}</h4>
          <div class="sub">${esc(q.question)} <br>${kind} · % of ${total} respondents</div>${bars}${otherList}</div>`;
      })
      .join('')}</div>`;
  }

  // ---------- drawer ----------
  function closeDrawer() {
    drawerRoot.innerHTML = '';
    document.removeEventListener('keydown', escClose);
    if (lastFocus) lastFocus.focus();
  }
  function escClose(e) { if (e.key === 'Escape') closeDrawer(); }

  function openDrawer(id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    lastFocus = document.activeElement;
    const r = u.response;

    const body = r
      ? survey.questions
          .map((q, i) => {
            const a = r.answers[q.id];
            let inner = '<p class="muted" style="margin:0">No answer</p>';
            if (a && q.type === 'text') inner = `<blockquote>${esc(a.text)}</blockquote>`;
            else if (a) inner = `<ul>${a.selected.map((sid) => `<li>${ICONS.check}<span>${esc(labelFor(q, a, sid))}</span></li>`).join('')}</ul>`;
            return `<div class="card ans"><h5>Question ${i + 1} · ${esc(q.short)}</h5><div class="qq">${esc(q.question)}</div>${inner}</div>`;
          })
          .join('')
      : '<div class="card empty">This user signed in but has not submitted the survey yet.</div>';

    drawerRoot.innerHTML = `
<div class="drawer-backdrop" data-close></div>
<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
  <header>
    <div class="who">${avatar(u)}<div style="min-width:0"><b id="drawer-title">${esc(u.name)}</b><small>${esc(u.email)}</small></div></div>
    <button class="icon-btn" type="button" data-close aria-label="Close">${ICONS.close}</button>
  </header>
  <div class="content">
    <div class="meta-line">${
      r
        ? `Submitted ${esc(fmtDate(r.submittedAt))}${r.edits ? ` · Updated ${esc(fmtDate(r.updatedAt))} (${r.edits} edit${r.edits > 1 ? 's' : ''})` : ''}`
        : `First sign-in ${esc(fmtDate(u.firstLoginAt))} · Last sign-in ${esc(fmtDate(u.lastLoginAt))}`
    }</div>
    ${body}
  </div>
  <footer>
    ${r ? '<button class="btn btn-danger btn-sm" type="button" id="del">Delete this response</button>' : '<span></span>'}
    <button class="btn btn-primary btn-sm" type="button" data-close>Close</button>
  </footer>
</aside>`;

    drawerRoot.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', escClose);
    drawerRoot.querySelector('.icon-btn').focus();

    const del = document.getElementById('del');
    if (del)
      del.addEventListener('click', async () => {
        if (!confirm(`Delete the survey response from ${u.email}? This cannot be undone.`)) return;
        try {
          await api(`/api/admin/responses/${encodeURIComponent(u.id)}`, { method: 'DELETE' });
          closeDrawer();
          await load();
          toast('Response deleted');
        } catch (e) {
          toast(e.message);
        }
      });
  }

  // ---------- data ----------
  async function load() {
    try {
      const data = await api('/api/admin/responses');
      survey = data.survey;
      users = data.users;
      render();
    } catch (e) {
      if (e.status === 401) { window.location.href = '/admin/login'; return; }
      app.innerHTML = `<div class="card" style="padding:24px"><p class="error-text">Could not load results: ${esc(e.message)}</p></div>`;
    }
  }

  load();
})();
