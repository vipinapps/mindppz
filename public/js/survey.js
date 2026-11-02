(function () {
  'use strict';
  const { esc, api, avatar, topbar, adminButton, toast, fmtDate, ICONS } = window.RV;

  const app = document.getElementById('app');
  let survey, user, saved;            // server data
  let answers = {};                   // working copy
  let step = 0;                       // 0..n-1 questions, 'done', 'submitted'
  let draftKey = '';

  // ---------- helpers ----------
  const qs = () => survey.questions;
  const otherOpt = (q) => (q.options || []).find((o) => o.other);

  function emptyAnswers() {
    const a = {};
    for (const q of qs()) a[q.id] = q.type === 'text' ? { text: '' } : { selected: [], other: '' };
    return a;
  }

  function mergeAnswers(base, src) {
    if (!src) return base;
    for (const q of qs()) {
      const s = src[q.id];
      if (!s) continue;
      if (q.type === 'text') base[q.id].text = typeof s.text === 'string' ? s.text : '';
      else {
        base[q.id].selected = Array.isArray(s.selected) ? s.selected.slice() : [];
        base[q.id].other = typeof s.other === 'string' ? s.other : '';
      }
    }
    return base;
  }

  function saveDraft() {
    try { localStorage.setItem(draftKey, JSON.stringify({ answers, step })); } catch (_) { /* storage unavailable */ }
  }
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (_) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch (_) { /* ignore */ }
  }

  function validate(q) {
    const a = answers[q.id];
    if (q.type === 'text') {
      if (!a.text.trim()) return 'Please write a short answer before submitting.';
      if (a.text.length > q.maxLength) return `Please keep it under ${q.maxLength} characters.`;
      return '';
    }
    if (!a.selected.length) return q.type === 'single' ? 'Please choose one option to continue.' : 'Please choose at least one option to continue.';
    if (q.max && a.selected.length > q.max) return `Please choose at most ${q.max} options.`;
    const o = otherOpt(q);
    if (o && a.selected.includes(o.id) && !a.other.trim()) return 'Please specify your “Other” answer.';
    return '';
  }

  function colsClass(q) {
    const n = q.options.filter((o) => !o.wide).length;
    if (n === 4) return 'cols-2';
    if (n === 5) return 'cols-5';
    return 'cols-3';
  }

  // ---------- rendering ----------
  function renderTop() {
    const chip = `<div class="user-chip" title="${esc(user.email)}">${avatar(user)}<span>${esc(user.email)}</span></div>`;
    document.getElementById('top').innerHTML = topbar(
      `${chip}<button class="btn btn-admin" id="logout" type="button">Sign out</button>${adminButton}`
    );
    document.getElementById('logout').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  function progress(idx) {
    const n = qs().length;
    const dashes = qs()
      .map((q, i) => {
        const cls = i === idx ? 'current' : !validate(q) ? 'done' : '';
        return `<button type="button" class="${cls}" data-go="${i}" aria-label="Go to question ${i + 1}"${i === idx ? ' aria-current="step"' : ''}></button>`;
      })
      .join('');
    return `<div class="progress-wrap"><span class="q-counter">Question ${idx + 1} of ${n}</span><div class="dashes">${dashes}</div></div>`;
  }

  function optionCard(q, o) {
    const a = answers[q.id];
    const sel = a.selected.includes(o.id);
    const full = q.max && a.selected.length >= q.max && !sel;
    const type = q.type === 'single' ? 'radio' : 'checkbox';
    return `
<label class="opt${sel ? ' selected' : ''}${full ? ' disabled' : ''}${o.wide ? ' wide' : ''}" data-type="${q.type}">
  <input type="${type}" name="${q.id}" value="${esc(o.id)}"${sel ? ' checked' : ''}${full ? ' disabled' : ''}>
  <div class="art" style="background-image:url('${esc(o.img)}')" role="presentation"></div>
  <div class="label"><span class="mark">${ICONS.check}</span><span>${esc(o.label)}</span></div>
</label>`;
  }

  function renderQuestion(idx, animate) {
    const q = qs()[idx];
    const a = answers[q.id];
    const n = qs().length;
    const last = idx === n - 1;
    let body = '';

    if (q.type === 'text') {
      body = `
<div class="card text-answer">
  <div class="art-banner" style="background-image:url('/img/hero.webp')"><span>Share Your Vision for Better Academic Discovery &amp; Support</span></div>
  <div class="body">
    <label for="text-${q.id}" class="sr-only">${esc(q.question)}</label>
    <textarea id="text-${q.id}" maxlength="${q.maxLength}" placeholder="${esc(q.placeholder)}">${esc(a.text)}</textarea>
    <div class="char-count"><span id="cc">${a.text.length}</span> / ${q.maxLength}</div>
    <div class="chips" aria-label="Ideas to get you started">
      ${q.suggestions.map((s) => `<button type="button" class="chip" data-chip="${esc(s)}">+ ${esc(s)}</button>`).join('')}
    </div>
  </div>
</div>`;
    } else {
      const o = otherOpt(q);
      const showOther = o && a.selected.includes(o.id);
      const atMax = q.max && a.selected.length >= q.max;
      body = `
<fieldset style="border:0;padding:0;margin:0">
  <legend class="sr-only">${esc(q.question)}</legend>
  <div class="options ${colsClass(q)}">${q.options.map((opt) => optionCard(q, opt)).join('')}</div>
</fieldset>
${o ? `<div class="other-box"${showOther ? '' : ' hidden'}>
  <label class="sr-only" for="other-${q.id}">Please specify</label>
  <input class="input" id="other-${q.id}" maxlength="200" placeholder="Please specify…" value="${esc(a.other)}">
</div>` : ''}
${atMax ? `<p class="muted" style="margin:10px 0 0;font-size:13.5px">You’ve picked ${q.max}. Unselect one to choose a different option.</p>` : ''}`;
    }

    const editing = saved ? '<div class="banner">✏️ You are editing your submitted answers. Your changes are saved when you submit again.</div>' : '';

    app.innerHTML = `
<div class="${animate ? 'step' : ''}">
  ${idx === 0 ? editing : ''}
  ${progress(idx)}
  <div class="card" style="padding:24px">
    <div class="q-head">
      <h2><span class="n">${idx + 1}.</span><span>${esc(q.title)}</span></h2>
      <p>${esc(q.question)}</p>
      <span class="hint">${esc(q.hint)}</span>
    </div>
    ${body}
    <div class="nav-row">
      <button class="btn btn-ghost" type="button" id="back"${idx === 0 ? ' disabled' : ''}>← Back</button>
      <span class="error-text" id="err" role="alert"></span>
      <button class="btn ${last ? 'btn-teal' : 'btn-primary'}" type="button" id="next">${last ? (saved ? 'Update answers' : 'Submit survey') : 'Next →'}</button>
    </div>
  </div>
</div>`;

    bindQuestion(q, idx);
  }

  function bindQuestion(q, idx) {
    const a = answers[q.id];
    const err = document.getElementById('err');

    app.querySelectorAll('[data-go]').forEach((b) =>
      b.addEventListener('click', () => go(Number(b.dataset.go)))
    );
    document.getElementById('back').addEventListener('click', () => go(idx - 1));
    document.getElementById('next').addEventListener('click', () => {
      const e = validate(q);
      if (e) { err.textContent = e; return; }
      if (idx === qs().length - 1) submit();
      else go(idx + 1);
    });

    if (q.type === 'text') {
      const ta = document.getElementById(`text-${q.id}`);
      const cc = document.getElementById('cc');
      ta.addEventListener('input', () => { a.text = ta.value; cc.textContent = ta.value.length; err.textContent = ''; saveDraft(); });
      app.querySelectorAll('[data-chip]').forEach((c) =>
        c.addEventListener('click', () => {
          const t = c.dataset.chip;
          if (!ta.value.includes(t)) ta.value = ta.value.trim() ? `${ta.value.trim()}\n${t}: ` : `${t}: `;
          ta.dispatchEvent(new Event('input'));
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        })
      );
      return;
    }

    app.querySelectorAll(`input[name="${q.id}"]`).forEach((input) =>
      input.addEventListener('change', () => {
        const id = input.value;
        if (q.type === 'single') a.selected = [id];
        else if (input.checked) { if (!a.selected.includes(id)) a.selected.push(id); }
        else a.selected = a.selected.filter((x) => x !== id);
        saveDraft();
        renderQuestion(idx);
        const again = app.querySelector(`input[name="${q.id}"][value="${CSS.escape(id)}"]`);
        if (again) again.focus({ preventScroll: true });
        const o = otherOpt(q);
        if (o && id === o.id && input.checked) {
          const box = document.getElementById(`other-${q.id}`);
          if (box) box.focus();
        }
      })
    );
    const other = document.getElementById(`other-${q.id}`);
    if (other) other.addEventListener('input', () => { a.other = other.value; err.textContent = ''; saveDraft(); });
  }

  function go(idx) {
    if (idx < 0 || idx >= qs().length) return;
    step = idx;
    saveDraft();
    renderQuestion(idx, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    const btn = document.getElementById('next');
    const err = document.getElementById('err');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const payload = {};
      for (const q of qs()) {
        const a = answers[q.id];
        payload[q.id] = q.type === 'text' ? { text: a.text } : { selected: a.selected, other: a.other };
      }
      const res = await api('/api/responses', { method: 'POST', body: { answers: payload } });
      const wasEdit = Boolean(saved);
      saved = res.response;
      clearDraft();
      renderThanks(wasEdit);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = saved ? 'Update answers' : 'Submit survey';
      if (e.status === 401) { window.location.href = '/'; return; }
      if (e.data && e.data.errors) {
        const first = qs().findIndex((q) => e.data.errors[q.id]);
        if (first >= 0) {
          go(first);
          document.getElementById('err').textContent = e.data.errors[qs()[first].id];
          return;
        }
      }
      err.textContent = e.message;
    }
  }

  function reviewHtml(src) {
    return qs()
      .map((q, i) => {
        const a = src[q.id];
        let inner = '<p class="muted">No answer</p>';
        if (a && q.type === 'text') inner = `<blockquote>${esc(a.text)}</blockquote>`;
        else if (a) {
          inner = `<ul>${a.selected
            .map((id) => {
              const o = q.options.find((x) => x.id === id);
              const label = o ? o.label : id;
              return `<li>${ICONS.check}<span>${esc(o && o.other && a.other ? `${label.replace(/\.$/, '')}: ${a.other}` : label)}</span></li>`;
            })
            .join('')}</ul>`;
        }
        return `<div class="card ans"><h5>Question ${i + 1}</h5><div class="qq">${esc(q.question)}</div>${inner}</div>`;
      })
      .join('');
  }

  function renderThanks(wasEdit) {
    step = 'done';
    app.innerHTML = `
<div class="step">
  <div class="card thanks">
    <div class="tick">${ICONS.check}</div>
    <h2>${wasEdit ? 'Your answers were updated' : 'Thank you for your response!'}</h2>
    <p>Your answers have been saved. They help shape a better platform for PhD aspirants, doctoral students and researchers.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-ghost" type="button" id="edit">Edit my answers</button>
      <button class="btn btn-primary" type="button" id="toggle-review">Review my answers</button>
    </div>
    <div class="review" id="review" hidden>${reviewHtml(saved.answers)}</div>
  </div>
</div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('edit').addEventListener('click', () => { answers = mergeAnswers(emptyAnswers(), saved.answers); go(0); });
    document.getElementById('toggle-review').addEventListener('click', (e) => {
      const r = document.getElementById('review');
      r.hidden = !r.hidden;
      e.target.textContent = r.hidden ? 'Review my answers' : 'Hide my answers';
    });
    if (wasEdit) toast('Answers updated');
  }

  function renderAlreadySubmitted() {
    app.innerHTML = `
<div class="step">
  <div class="banner">✅ <div>You already completed this survey on <b>${esc(fmtDate(saved.submittedAt))}</b>${
    saved.edits ? ` (last updated ${esc(fmtDate(saved.updatedAt))})` : ''
  }. Thank you! You can review or update your answers below.</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
    <button class="btn btn-primary" type="button" id="edit">Edit my answers</button>
  </div>
  ${reviewHtml(saved.answers)}
</div>`;
    document.getElementById('edit').addEventListener('click', () => go(0));
  }

  // ---------- boot ----------
  async function init() {
    let me;
    try {
      [survey, me] = await Promise.all([api('/api/survey'), api('/api/me')]);
    } catch (e) {
      if (e.status === 401) { window.location.href = '/'; return; }
      throw e;
    }
    user = me.user;
    saved = me.response;
    draftKey = `rv-draft:${user.id}`;
    renderTop();

    answers = mergeAnswers(emptyAnswers(), saved && saved.answers);
    const draft = loadDraft();
    if (draft && draft.answers) answers = mergeAnswers(answers, draft.answers);

    if (saved && !draft) return renderAlreadySubmitted();
    const startAt = draft && Number.isInteger(draft.step) ? Math.min(Math.max(draft.step, 0), qs().length - 1) : 0;
    go(startAt);
    if (draft && !saved && startAt > 0) toast('Welcome back — your progress was restored');
  }

  init().catch((e) => {
    app.innerHTML = `<div class="card" style="padding:24px"><p class="error-text">Could not load the survey: ${esc(e.message)}</p></div>`;
  });
})();
