/* ============================================================
   NEW FEATURES — shareable links, respondent cap, end-early,
   auth UI helpers. Appended; touches nothing above.
   ============================================================ */

function ipSlug() { return Math.random().toString(36).slice(2, 10); }

/* ---------- Share dialog (creator) ---------- */
function openShareModal() {
  if (window.IPS && !window.IPS.user) {
    toast('Please sign in to create shareable links.', 'error'); sfx('error'); return;
  }
  if (!State.questions.length) { toast('Add at least one question first.', 'error'); sfx('error'); return; }
  if (!State.company.trim()) { toast('Please enter a company name first.', 'error'); sfx('error'); return; }

  openModal('🔗 Share Interview', `
    <div class="muted" style="margin-top:0;margin-bottom:14px;">
      Generate a unique link anyone can answer — no account needed on their end.
      The interview content below is a snapshot of your current builder.
    </div>
    <div class="field">
      <label>Interview title</label>
      <input type="text" id="shareTitle" value="${escapeHtml(State.sessionTitle || (State.company + ' Interview'))}" />
    </div>
    <div class="field">
      <label>Max respondents (cap)</label>
      <input type="number" id="shareCap" min="1" max="10000" value="${State.participants || 5}" />
      <div class="muted" style="font-size:12px;margin-top:4px;">The link closes automatically once this many people have submitted.</div>
    </div>
    <div class="inline-row">
      <button class="btn primary" id="btnCreateShare">🔗 Generate link</button>
    </div>
    <div id="shareNewLink" class="hidden" style="margin-top:14px;">
      <div class="field">
        <label>Your shareable link</label>
        <div class="inline-row" style="flex-wrap:nowrap;">
          <input type="text" id="shareLinkOut" readonly style="flex:1;" />
          <button class="btn sm" id="btnCopyShare">📋 Copy</button>
        </div>
      </div>
    </div>
    <hr class="sep"/>
    <h3 style="margin:0 0 8px;font-size:15px;">Your shared links</h3>
    <div id="shareList"><div class="muted">Loading…</div></div>
  `);
  document.getElementById('btnCreateShare').addEventListener('click', createShareLink);
  document.getElementById('btnCopyShare').addEventListener('click', function () {
    const inp = document.getElementById('shareLinkOut');
    inp.select();
    navigator.clipboard.writeText(inp.value).then(function () { toast('Link copied ✓', 'success'); });
  });
  loadShareList();
  sfx('open');
}

async function createShareLink() {
  const btn = document.getElementById('btnCreateShare');
  const title = document.getElementById('shareTitle').value.trim() || (State.company + ' Interview');
  const cap = Math.max(1, parseInt(document.getElementById('shareCap').value) || 1);
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    const res = await window.IPS.api('/api/shares', {
      method: 'POST',
      body: JSON.stringify({
        title: title,
        company: State.company,
        questions: State.questions,
        max_respondents: cap
      })
    });
    if (!res.ok) {
      const d = await res.json().catch(function () { return {}; });
      throw new Error(d.error || ('Error ' + res.status));
    }
    const row = await res.json();
    const url = window.location.origin + '/i/' + row.slug;
    document.getElementById('shareNewLink').classList.remove('hidden');
    document.getElementById('shareLinkOut').value = url;
    toast('Share link created ✓', 'success'); sfx('submit');
    loadShareList();
  } catch (e) {
    toast(e.message, 'error'); sfx('error');
  } finally {
    btn.disabled = false; btn.textContent = '🔗 Generate link';
  }
}

async function loadShareList() {
  const box = document.getElementById('shareList');
  if (!box) return;
  try {
    const res = await window.IPS.api('/api/shares');
    const rows = await res.json();
    if (!rows.length) { box.innerHTML = '<div class="muted">No links yet.</div>'; return; }
    box.innerHTML = rows.map(function (r) {
      const url = window.location.origin + '/i/' + r.slug;
      const status = !r.is_active
        ? '<span class="chip" style="color:var(--danger);">closed</span>'
        : (r.responses_count >= r.max_respondents
          ? '<span class="chip" style="color:var(--warning);">cap reached</span>'
          : '<span class="chip" style="color:var(--success);">open</span>');
      return '<div class="card" style="padding:12px 14px;margin-bottom:10px;">' +
        '<div class="row-between" style="gap:10px;flex-wrap:wrap;">' +
          '<div style="min-width:0;">' +
            '<div style="font-weight:700;">' + escapeHtml(r.title) + ' ' + status + '</div>' +
            '<div class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px;">' + escapeHtml(url) + '</div>' +
            '<div class="muted" style="font-size:12px;">' + r.responses_count + ' / ' + r.max_respondents + ' responses</div>' +
          '</div>' +
          '<div class="inline-row">' +
            '<button class="btn sm" data-copy="' + r.slug + '">📋 Copy</button>' +
            '<button class="btn sm" data-results="' + r.id + '">📊 Results</button>' +
            (r.is_active ? '<button class="btn warn sm" data-end="' + r.id + '">⏹ End</button>'
                         : '<button class="btn sm" data-reopen="' + r.id + '">↻ Reopen</button>') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        navigator.clipboard.writeText(window.location.origin + '/i/' + b.getAttribute('data-copy'))
          .then(function () { toast('Link copied ✓', 'success'); });
      });
    });
    box.querySelectorAll('[data-end]').forEach(function (b) {
      b.addEventListener('click', function () { setShareActive(b.getAttribute('data-end'), false); });
    });
    box.querySelectorAll('[data-reopen]').forEach(function (b) {
      b.addEventListener('click', function () { setShareActive(b.getAttribute('data-reopen'), true); });
    });
    box.querySelectorAll('[data-results]').forEach(function (b) {
      b.addEventListener('click', function () { openShareResults(b.getAttribute('data-results')); });
    });
  } catch (e) {
    box.innerHTML = '<div class="muted">Could not load links: ' + escapeHtml(e.message) + '</div>';
  }
}

async function setShareActive(id, active) {
  if (!active && !confirm('End this interview early? The link will stop accepting new responses immediately.')) return;
  try {
    const res = await window.IPS.api('/api/shares/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: active })
    });
    if (!res.ok) throw new Error('Error ' + res.status);
    toast(active ? 'Link reopened ✓' : 'Interview ended — link is now closed', 'success');
    sfx('submit');
    loadShareList();
  } catch (e) { toast(e.message, 'error'); sfx('error'); }
}

/* ---------- Per-link results (creator) ---------- */
async function openShareResults(id) {
  openModal('📊 Link Results', '<div class="muted">Loading…</div>');
  try {
    const res = await window.IPS.api('/api/shares/' + id + '/responses');
    const rows = await res.json();
    if (!res.ok) throw new Error(rows.error || ('Error ' + res.status));
    if (!rows.length) {
      document.getElementById('modalBody').innerHTML =
        '<div class="muted" style="text-align:center;padding:24px;">No responses yet for this link.</div>';
      return;
    }
    const agg = aggregate(rows[0].share.questions, rows.map(function (r) { return { answers: r.answers }; }));
    document.getElementById('modalBody').innerHTML =
      '<div class="muted" style="margin-top:0;margin-bottom:12px;">' + rows.length + ' response(s) · ' +
      escapeHtml(rows[0].share.title) + '</div>' +
      agg.map(function (a) {
        return '<div class="response-item">' +
          '<div style="font-weight:700;margin-bottom:6px;">Q' + a.idx + '. ' + escapeHtml(a.prompt) +
          ' <span class="chip" style="float:right;">' + a.type + '</span></div>' +
          '<div>' + a.summary + '</div></div>';
      }).join('');
  } catch (e) {
    document.getElementById('modalBody').innerHTML =
      '<div class="muted" style="color:var(--danger);">' + escapeHtml(e.message) + '</div>';
  }
}

/* ---------- Respondent mode: submit + thank-you screen ---------- */
async function ipRespondentSubmit(answers) {
  try {
    const res = await fetch('/api/shares/slug/' + window.IPS.share.slug + '/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    });
    const d = await res.json().catch(function () { return {}; });
    if (res.status === 410 || d.closed) {
      ipShowClosed(window.IPS.share, 'This interview was just closed. Thanks for your interest!');
      return;
    }
    if (!res.ok) throw new Error(d.error || ('Error ' + res.status));
    ipShowThankYou(window.IPS.share.company || '');
  } catch (e) {
    toast(e.message, 'error'); sfx('error');
    State.interview.active = true; // let them retry
  }
}

function ipShowThankYou(company) {
  document.getElementById('interviewShell').classList.add('hidden');
  const ty = document.getElementById('ipThankYou');
  ty.classList.remove('hidden');
  document.getElementById('ipTyText').textContent =
    'Thanks for finishing this interview — ' + company + ', powered by InsightPulse';
  sfx('submit');
}

function ipShowClosed(share, msg) {
  document.getElementById('interviewShell').classList.add('hidden');
  const el = document.getElementById('ipClosed');
  el.classList.remove('hidden');
  document.getElementById('ipClosedMsg').textContent =
    msg || ('This interview is closed' + (share && share.company ? ' — ' + share.company : '') + '.');
}

/* ---------- Respondent boot: configure interview shell, hide creator UI ---------- */
function ipRespondentInit(share) {
  document.getElementById('ipClosed').classList.add('hidden');
  document.getElementById('ipThankYou').classList.add('hidden');
  document.getElementById('interviewShell').classList.remove('hidden');
  document.getElementById('landingView').classList.add('hidden');
  document.getElementById('adminView').classList.add('hidden');

  State.company = share.company;
  State.questions = share.questions || [];
  State.participants = 1;
  State.lang = 'en';
  State.interview = { active: true, participantIdx: 0, questionIdx: 0, draft: {} };

  document.getElementById('ivCompany').textContent = share.company;
  document.getElementById('ivSubtitle').textContent = share.title || (share.company + ' Interview');
  document.getElementById('btnEndEarly').classList.add('hidden');
  document.getElementById('btnExitIV').classList.add('hidden');
  document.getElementById('fabAI').classList.add('hidden');
  const ov = document.getElementById('ivLang');
  if (ov) ov.value = 'en';

  renderInterview();
}

/* ---------- Creator auth UI + share button ---------- */
function ipRenderAuthArea() {
  const holder = document.getElementById('ipAuthArea');
  if (!holder) return;
  if (window.IPS && window.IPS.user) {
    const u = window.IPS.user;
    holder.innerHTML =
      '<span class="chip" title="' + escapeHtml(u.email || '') + '" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">👤 ' +
      escapeHtml((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email || 'Account') + '</span>' +
      '<button class="btn" id="btnShareInterview" title="Create a shareable link">🔗 Share</button>' +
      '<button class="btn icon" id="ipSignOut" title="Sign out">⎋</button>';
    document.getElementById('ipSignOut').addEventListener('click', function () { window.IPS.signOut(); });
    document.getElementById('btnShareInterview').addEventListener('click', openShareModal);
  } else {
    holder.innerHTML = '<button class="btn" id="ipSignIn">🔐 Sign in</button>';
    document.getElementById('ipSignIn').addEventListener('click', function () { window.location.href = '/login'; });
  }
}

/* ---------- Wire up after original bootstrap ---------- */
if (window.IPS && window.IPS.mode === 'respondent') {
  if (window.IPS.share && window.IPS.share.closed) {
    ipShowClosed(window.IPS.share);
  } else if (window.IPS.share) {
    ipRespondentInit(window.IPS.share);
  } else {
    ipShowClosed(null, 'This interview link is invalid or has been removed.');
  }
} else {
  ipRenderAuthArea();
  if (window.IPS && window.IPS.onAuthChange) {
    window.IPS.onAuthChange(function () { ipRenderAuthArea(); });
  }
}
