/* ============================================================
   InsightPulse — App State & Persistence
   ============================================================ */
const LS_KEY = 'insightpulse.v1';

const State = {
  theme: 'light',
  sfx: true,
  company: 'Acme Corporation',
  sessionTitle: 'Employee Insights Session',
  participants: 5,
  questions: [],       // {id, type, prompt, options?}
  responses: [],       // [{participant, sessionId?, answers: {qid:value}}]
  sessions: [],        // [{id, title, startedAt, endedAt?, company, questions:[], participants, responseIds:[], partial?:bool}]
  activeSessionId: null,     // id of the currently-running interview session
  selectedSessionId: '',     // id filter used in Results tab / AI synthesis ("" = all)
  currentTab: 'build',
  currentView: 'landing',    // 'landing' | 'admin' | 'interview'
  gemini: { key: '', model: 'gemini-2.5-flash' },
  interview: { active: false, participantIdx: 0, questionIdx: 0, draft: {} },
  chat: [],
  lang: 'en',
  partialSession: false,
};

function save() {
  if (window.IPS && window.IPS.mode === 'respondent') return; // respondents never persist
  try { localStorage.setItem(LS_KEY, JSON.stringify(State)); } catch(e){}
  try { if (window.IPS && window.IPS.sync) window.IPS.sync.scheduleSave(State); } catch(e){}
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) Object.assign(State, JSON.parse(raw));
  } catch(e){}
}

/* ============================================================
   SFX — Web Audio API
   ============================================================ */
let audioCtx = null;
function sfx(type='click'){
  if(!State.sfx) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    const map = {
      click:  { f: 660, d: 0.06, v: 0.05, w:'sine' },
      soft:   { f: 440, d: 0.08, v: 0.04, w:'triangle' },
      next:   { f: 880, d: 0.09, v: 0.06, w:'sine' },
      submit: { f: 520, d: 0.18, v: 0.07, w:'sine', slide: 780 },
      error:  { f: 220, d: 0.2,  v: 0.08, w:'sawtooth' },
      open:   { f: 700, d: 0.1,  v: 0.05, w:'triangle', slide: 1000 }
    };
    const c = map[type] || map.click;
    o.type = c.w;
    o.frequency.setValueAtTime(c.f, now);
    if (c.slide) o.frequency.exponentialRampToValueAtTime(c.slide, now + c.d);
    g.gain.setValueAtTime(c.v, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + c.d);
    o.start(now); o.stop(now + c.d + 0.02);
  } catch(e){}
}

/* ============================================================
   THEME ENGINE
   ============================================================ */
function applyTheme(t) {
  State.theme = t;
  document.body.setAttribute('data-theme', t);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.t === t);
  });
  save();
}

/* ============================================================
   TOASTS
   ============================================================ */
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if(type==='error') el.style.background = 'var(--danger)';
  if(type==='success') el.style.background = 'var(--success)';
  document.getElementById('toast-holder').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform='translateY(20px)'; }, 2400);
  setTimeout(() => el.remove(), 2800);
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalBack').classList.add('show');
  sfx('open');
}
function closeModal(){ document.getElementById('modalBack').classList.remove('show'); }

/* ============================================================
   QUESTION BUILDER
   ============================================================ */
function uid(){ return Math.random().toString(36).slice(2,10); }

function addQuestion(type) {
  const q = { id: uid(), type, prompt: '' };
  if (type === 'mc') q.options = ['Option A', 'Option B', 'Option C'];
  State.questions.push(q);
  renderQuestions();
  save();
  sfx('click');
}

function removeQuestion(id){
  State.questions = State.questions.filter(q => q.id !== id);
  renderQuestions();
  save();
  sfx('soft');
}

function renderQuestions() {
  const box = document.getElementById('qList');
  const empty = document.getElementById('qEmpty');
  box.innerHTML = '';
  empty.style.display = State.questions.length ? 'none' : 'block';
  State.questions.forEach((q, i) => {
    const el = document.createElement('div');
    el.className = 'q-item';
    const typeLabel = { mc:'Multiple Choice', likert:'Likert Scale', text:'Free Text' }[q.type];
    el.innerHTML = `
      <div class="q-item-head">
        <div class="inline-row">
          <div class="chip">#${i+1}</div>
          <span class="q-badge">${typeLabel}</span>
        </div>
        <div class="inline-row">
          <button class="btn sm" data-move-up="${q.id}">↑</button>
          <button class="btn sm" data-move-down="${q.id}">↓</button>
          <button class="btn sm danger" data-remove="${q.id}">Delete</button>
        </div>
      </div>
      <div class="field">
        <label>Question prompt</label>
        <input type="text" data-prompt="${q.id}" value="${escapeHtml(q.prompt)}" placeholder="Type your question…" />
      </div>
      ${q.type === 'mc' ? renderMCOptions(q) : ''}
      ${q.type === 'likert' ? `<div class="muted">Respondents will see: Strongly Disagree · Disagree · Neutral · Agree · Strongly Agree</div>` : ''}
      ${q.type === 'text' ? `<div class="muted">Respondents will get an open-ended text area.</div>` : ''}
    `;
    box.appendChild(el);
  });

  document.getElementById('qCount').textContent = State.questions.length;
  document.getElementById('stat-q').textContent = State.questions.length;
  document.getElementById('stat-p').textContent = State.participants;
  document.getElementById('stat-r').textContent = State.responses.length;

  // wire up
  box.querySelectorAll('[data-prompt]').forEach(inp => {
    inp.addEventListener('input', e => {
      const id = inp.getAttribute('data-prompt');
      const q = State.questions.find(x => x.id === id);
      if(q){ q.prompt = e.target.value; save(); }
    });
  });
  box.querySelectorAll('[data-remove]').forEach(b => {
    b.addEventListener('click', () => removeQuestion(b.getAttribute('data-remove')));
  });
  box.querySelectorAll('[data-move-up]').forEach(b => {
    b.addEventListener('click', () => moveQ(b.getAttribute('data-move-up'), -1));
  });
  box.querySelectorAll('[data-move-down]').forEach(b => {
    b.addEventListener('click', () => moveQ(b.getAttribute('data-move-down'), 1));
  });
  box.querySelectorAll('[data-opt]').forEach(inp => {
    inp.addEventListener('input', e => {
      const [qid, idx] = inp.getAttribute('data-opt').split(':');
      const q = State.questions.find(x => x.id === qid);
      if(q){ q.options[parseInt(idx)] = e.target.value; save(); }
    });
  });
  box.querySelectorAll('[data-add-opt]').forEach(b => {
    b.addEventListener('click', () => {
      const q = State.questions.find(x => x.id === b.getAttribute('data-add-opt'));
      if(q){ q.options.push('New option'); renderQuestions(); save(); sfx('click'); }
    });
  });
  box.querySelectorAll('[data-del-opt]').forEach(b => {
    b.addEventListener('click', () => {
      const [qid, idx] = b.getAttribute('data-del-opt').split(':');
      const q = State.questions.find(x => x.id === qid);
      if(q && q.options.length > 2){ q.options.splice(parseInt(idx),1); renderQuestions(); save(); sfx('soft'); }
    });
  });
}

function renderMCOptions(q) {
  return `
    <div style="margin-top:6px;">
      <label style="font-size:13px;font-weight:600;color:var(--text-muted);">Options</label>
      ${q.options.map((o,i) => `
        <div class="option-row">
          <div class="choice-letter" style="width:28px;height:28px;font-size:12px;">${String.fromCharCode(65+i)}</div>
          <input type="text" data-opt="${q.id}:${i}" value="${escapeHtml(o)}" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;"/>
          <button class="btn sm danger" data-del-opt="${q.id}:${i}">✕</button>
        </div>`).join('')}
      <button class="btn sm" data-add-opt="${q.id}">➕ Add option</button>
    </div>
  `;
}

function moveQ(id, dir) {
  const i = State.questions.findIndex(q => q.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= State.questions.length) return;
  [State.questions[i], State.questions[j]] = [State.questions[j], State.questions[i]];
  renderQuestions(); save(); sfx('soft');
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ============================================================
   TRANSLATION — MyMemory free API (keyless, no Gemini)
   Translates interview prompts + dynamic options in real time.

   Quota:
     - Anonymous:            ~5,000 chars/day per IP
     - With valid email:    ~50,000 chars/day per IP  (10x)

   The email is NEVER hardcoded here. It is read at runtime from
   (in priority order):
     1) window.INSIGHTPULSE_CONFIG.mymemoryEmail
     2) <meta name="mymemory-email" content="...">
     3) localStorage key 'insightpulse.mymemoryEmail'

   To enable the higher quota, set ONE of the above in your local
   deployment (e.g. a non-committed config.js, a server-injected
   meta tag, or a one-time browser setting). Keeping the email out
   of source protects it in open-source repos.
   ============================================================ */
function getMyMemoryEmail() {
  try {
    if (typeof window !== 'undefined') {
      const cfg = window.INSIGHTPULSE_CONFIG;
      if (cfg && typeof cfg.mymemoryEmail === 'string' && cfg.mymemoryEmail.indexOf('@') > 0) {
        return cfg.mymemoryEmail.trim();
      }
    }
    const meta = document.querySelector('meta[name="mymemory-email"]');
    if (meta && meta.content && meta.content.indexOf('@') > 0) {
      return meta.content.trim();
    }
    const ls = (typeof localStorage !== 'undefined') && localStorage.getItem('insightpulse.mymemoryEmail');
    if (ls && ls.indexOf('@') > 0) return ls.trim();
  } catch(e) {}
  return '';
}

const TR_CACHE = {};
try {
  // Persist the translation cache across page reloads to further
  // reduce repeat API calls and preserve daily quota.
  const raw = localStorage.getItem('insightpulse.trCache');
  if (raw) Object.assign(TR_CACHE, JSON.parse(raw));
} catch(e) {}
let _trCacheSaveTimer = null;
function _persistTrCache() {
  if (_trCacheSaveTimer) return;
  _trCacheSaveTimer = setTimeout(() => {
    _trCacheSaveTimer = null;
    try { localStorage.setItem('insightpulse.trCache', JSON.stringify(TR_CACHE)); } catch(e) {}
  }, 400);
}

async function trText(text, lang) {
  if (!text || !lang || lang === 'en') return text;
  const key = lang + '::' + text;
  if (TR_CACHE[key]) return TR_CACHE[key];
  try {
    let url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|' + encodeURIComponent(lang);
    const email = getMyMemoryEmail();
    if (email) url += '&de=' + encodeURIComponent(email); // raises quota from ~5k to ~50k chars/day
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data && data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      const t = data.responseData.translatedText;
      TR_CACHE[key] = t;
      _persistTrCache();
      return t;
    }
  } catch(e) {}
  return text; // graceful fallback: keep original English
}
function trBatch(arr, lang) { return Promise.all(arr.map(s => trText(s, lang))); }

/* ============================================================
   TRANSLATION SETTINGS UI (gear ⚙️ in topbar)
   Lets each user save THEIR OWN email for the higher MyMemory
   quota (~50k vs ~5k chars/day). The email is stored ONLY in
   this browser's localStorage — never hardcoded in source,
   never sent anywhere except as the '&de=' parameter on
   MyMemory translation requests.
   ============================================================ */
const MM_EMAIL_KEY = 'insightpulse.mymemoryEmail';
// Translation settings UI now lives inside the merged Settings modal (openSettingsModal, below).

/* ============================================================
   VIEW ROUTING (landing / admin / interview)
   ============================================================ */
function showView(view) {
  const landing = document.getElementById('landingView');
  const admin   = document.getElementById('adminView');
  const iv      = document.getElementById('interviewShell');
  landing.classList.toggle('hidden', view !== 'landing');
  admin.classList.toggle('hidden',   view !== 'admin');
  iv.classList.toggle('hidden',      view !== 'interview');
  State.currentView = view;
  // Only hide the primary CTA while the interview shell is up
  const launchBtn = document.getElementById('btnLaunch');
  if (launchBtn) launchBtn.style.display = (view === 'interview') ? 'none' : '';
  save();
}

function refreshLandingStats() {
  const qEl = document.getElementById('landStatQ');
  const sEl = document.getElementById('landStatS');
  const rEl = document.getElementById('landStatR');
  if (qEl) qEl.textContent = State.questions.length;
  if (sEl) sEl.textContent = (State.sessions||[]).length;
  if (rEl) rEl.textContent = State.responses.length;
}

/* ============================================================
   INTERVIEW MODE
   ============================================================ */
function sessionUid(){ return 's_' + Math.random().toString(36).slice(2,10); }

function launchInterview() {
  if (!State.questions.length) { toast('Add at least one question first.', 'error'); sfx('error'); return; }
  if (!State.company.trim()) { toast('Please enter a company name.', 'error'); sfx('error'); return; }
  State.interview = { active: true, participantIdx: 0, questionIdx: 0, draft: {} };
  State.partialSession = false;

  // ---- Start a new named session ----
  if (!Array.isArray(State.sessions)) State.sessions = [];
  const autoTitle = 'Interview ' + (State.sessions.length + 1);
  const sess = {
    id: sessionUid(),
    title: (State.sessionTitle && State.sessionTitle.trim()) ? State.sessionTitle.trim() : autoTitle,
    autoLabel: autoTitle,
    startedAt: new Date().toISOString(),
    endedAt: null,
    company: State.company,
    participants: State.participants,
    questions: JSON.parse(JSON.stringify(State.questions)), // snapshot for stable analytics
    responseIds: [],
    partial: false
  };
  State.sessions.push(sess);
  State.activeSessionId = sess.id;
  save();

  showView('interview');
  document.getElementById('ivCompany').textContent = State.company;
  document.getElementById('ivSubtitle').textContent = sess.title + ' · ' + sess.autoLabel;
  renderInterview();
  sfx('open');
}

function finalizeActiveSession(partial) {
  const sid = State.activeSessionId;
  if (!sid) return;
  const sess = (State.sessions||[]).find(s => s.id === sid);
  if (!sess) return;
  sess.endedAt = new Date().toISOString();
  sess.partial = !!partial;
  State.activeSessionId = null;
  State.selectedSessionId = sess.id; // auto-focus the just-finished session
  save();
}

function exitInterview() {
  const hadActive = !!State.activeSessionId;
  State.interview.active = false;
  if (hadActive) finalizeActiveSession(State.partialSession);
  showView('admin');
  populateSessionPicker();
  renderResults();
  refreshLandingStats();
  sfx('soft');
}

async function renderInterview() {
  const { participantIdx, questionIdx, draft } = State.interview;
  const total = State.questions.length;
  const q = State.questions[questionIdx];
  const pTotal = State.participants;
  const progress = ((questionIdx) / total) * 100;

  // ---------- real-time translation (interview language) ----------
  const lang = State.lang || 'en';
  let ui = { participant: 'Participant', question: 'Question', of: 'of', next: 'Next', prev: 'Previous', submit: 'Submit' };
  let promptText = q.prompt || '(untitled question)';
  let optionTexts = q.type === 'mc' ? q.options.slice() : null;
  let likertLabels = ['Strongly Disagree','Disagree','Neutral','Agree','Strongly Agree'];

  if (lang !== 'en') {
    const tChip = document.getElementById('ivTranslating');
    if (tChip) tChip.classList.remove('hidden');
    try {
      const jobs = [
        trText(ui.participant, lang), trText(ui.question, lang), trText(ui.of, lang),
        trText(ui.next, lang), trText(ui.prev, lang), trText(ui.submit, lang),
        trText(promptText, lang)
      ];
      if (optionTexts) optionTexts = await trBatch(optionTexts, lang);
      if (q.type === 'likert') likertLabels = await trBatch(likertLabels, lang);
      const r = await Promise.all(jobs);
      [ui.participant, ui.question, ui.of, ui.next, ui.prev, ui.submit, promptText] = r;
    } catch(e) { /* fall back to English on any failure */ }
    if (tChip) tChip.classList.add('hidden');
    if (!State.interview.active) return; // session was closed mid-translation
  }

  document.getElementById('ivProgress').textContent = `${ui.participant} ${participantIdx+1} / ${pTotal} · ${ui.question} ${questionIdx+1}/${total}`;
  document.getElementById('ivFill').style.width = progress + '%';

  const content = document.getElementById('ivContent');
  const isLast = questionIdx === total - 1;

  let inner = `
    <div class="muted" style="font-size:13px;margin-bottom:6px;">${ui.question} ${questionIdx+1} ${ui.of} ${total}</div>
    <h2 style="margin:0 0 20px;font-size:22px;line-height:1.35;">${escapeHtml(promptText)}</h2>
  `;

  if (q.type === 'mc') {
    inner += optionTexts.map((o,i) => `
      <div class="choice ${draft[q.id] === i ? 'selected' : ''}" data-pick="${i}">
        <div class="choice-letter">${String.fromCharCode(65+i)}</div>
        <div>${escapeHtml(o)}</div>
      </div>
    `).join('');
  } else if (q.type === 'likert') {
    inner += `<div class="likert">` + likertLabels.map((l,i) => `
      <button data-likert="${i+1}" class="${draft[q.id] === i+1 ? 'selected' : ''}">${escapeHtml(l)}</button>
    `).join('') + `</div>`;
  } else {
    inner += `<textarea data-text style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px;font-size:15px;min-height:140px;color:var(--text);outline:none;">${escapeHtml(draft[q.id] || '')}</textarea>`;
  }

  content.innerHTML = inner;

  // wire
  content.querySelectorAll('[data-pick]').forEach(el => {
    el.addEventListener('click', () => {
      State.interview.draft[q.id] = parseInt(el.getAttribute('data-pick'));
      renderInterview(); sfx('click');
    });
  });
  content.querySelectorAll('[data-likert]').forEach(el => {
    el.addEventListener('click', () => {
      State.interview.draft[q.id] = parseInt(el.getAttribute('data-likert'));
      renderInterview(); sfx('click');
    });
  });
  const ta = content.querySelector('[data-text]');
  if (ta) ta.addEventListener('input', e => { State.interview.draft[q.id] = e.target.value; save(); });

  document.getElementById('ivNext').textContent = isLast ? ui.submit + ' ✓' : ui.next + ' →';
  document.getElementById('ivPrev').textContent = '← ' + ui.prev;
  document.getElementById('ivPrev').disabled = questionIdx === 0;
  document.getElementById('ivPrev').style.opacity = questionIdx === 0 ? '.4' : '1';
}

function ivNext() {
  const { questionIdx, draft } = State.interview;
  const q = State.questions[questionIdx];
  if (q.type !== 'text' && draft[q.id] === undefined) {
    toast('Please select an answer.', 'error'); sfx('error'); return;
  }
  if (q.type === 'text' && !(draft[q.id]||'').trim()) {
    toast('Please provide a response.', 'error'); sfx('error'); return;
  }

  if (questionIdx < State.questions.length - 1) {
    State.interview.questionIdx++;
    renderInterview(); sfx('next');
    return;
  }

  // submit participant
  const respRecord = {
    participant: State.interview.participantIdx + 1,
    submittedAt: new Date().toISOString(),
    sessionId: State.activeSessionId || null,
    answers: { ...State.interview.draft }
  };
  State.responses.push(respRecord);
  // Attach to active session
  if (State.activeSessionId) {
    const sess = (State.sessions||[]).find(s => s.id === State.activeSessionId);
    if (sess) {
      const respIndex = State.responses.length - 1;
      sess.responseIds.push(respIndex);
    }
  }
  save();
  sfx('submit');

  if (window.IPS && window.IPS.respondent) {
    State.interview.active = false;
    window.IPS.respondent.submitAnswers(respRecord.answers);
    return;
  }

  const isLastParticipant = State.interview.participantIdx + 1 >= State.participants;
  if (isLastParticipant) {
    toast('All participants completed!', 'success');
    exitInterview();
  } else {
    State.interview.participantIdx++;
    State.interview.questionIdx = 0;
    State.interview.draft = {};
    document.getElementById('ivFill').style.width = '100%';
    setTimeout(() => {
      toast(`Participant ${State.interview.participantIdx} submitted. Starting next…`, 'success');
      renderInterview();
    }, 400);
  }
}

function ivPrev() {
  if (State.interview.questionIdx > 0) {
    State.interview.questionIdx--;
    renderInterview(); sfx('soft');
  }
}

/* ---------- End Early: stop session & compile partial results ---------- */
function endEarly() {
  if (!State.interview.active) return;
  const activeSid = State.activeSessionId;
  const sess = (State.sessions||[]).find(s => s.id === activeSid);
  const n = sess ? sess.responseIds.length : 0;
  const target = State.participants;
  const msg = n > 0
    ? `End the session early?\n\n${n} of ${target} participant response(s) have been collected. The partial results will be compiled and displayed immediately.`
    : `End the session early?\n\nNo responses have been collected yet (0 of ${target} participants).`;
  if (!confirm(msg)) return;
  State.partialSession = true;
  save();
  State.interview.active = false;
  finalizeActiveSession(true);
  showView('admin');
  switchTab('results');
  populateSessionPicker();
  refreshLandingStats();
  toast(n > 0 ? `Session ended early — ${n} partial response(s) compiled ✓` : 'Session ended early — no responses collected', n > 0 ? 'success' : 'info');
  sfx('submit');
}

/* ---------- Reset All: complete factory reset ---------- */
function resetAll() {
  if (!confirm('⚠ FACTORY RESET\n\nThis will permanently erase EVERYTHING: questions, responses, API keys, chat history, settings, and all stored data — returning InsightPulse to an absolute fresh-install state.\n\nThis cannot be undone. Continue?')) return;
  try { localStorage.clear(); } catch(e){}
  try { sessionStorage.clear(); } catch(e){}
  try {
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
    });
  } catch(e){}
  try {
    if (window.indexedDB && indexedDB.databases) {
      indexedDB.databases().then(dbs => (dbs||[]).forEach(db => { try { indexedDB.deleteDatabase(db.name); } catch(e){} }));
    }
  } catch(e){}
  toast('All data erased — restarting…', 'success');
  setTimeout(() => location.reload(), 600);
}

/* ============================================================
   SESSION PICKER + RESULTS + AGGREGATION
   ============================================================ */
function populateSessionPicker() {
  const sel = document.getElementById('sessionPicker');
  if (!sel) return;
  const sessions = (State.sessions || []).slice();
  // Order oldest -> newest so "Interview 1" appears first
  const opts = ['<option value="">All sessions (' + State.responses.length + ' responses)</option>']
    .concat(sessions.map((s, i) => {
      const label = (s.title && s.title !== s.autoLabel) ? (s.autoLabel + ' — ' + s.title) : s.autoLabel;
      const count = (s.responseIds||[]).length;
      const partial = s.partial ? ' ⏹' : '';
      return `<option value="${s.id}">${escapeHtml(label)} (${count})${partial}</option>`;
    }));
  sel.innerHTML = opts.join('');
  if (State.selectedSessionId && sessions.some(s => s.id === State.selectedSessionId)) {
    sel.value = State.selectedSessionId;
  } else {
    sel.value = '';
    State.selectedSessionId = '';
  }
}

function getScopedContext() {
  // Returns { questions, responses, sessionLabel } scoped to the selected session
  const sid = State.selectedSessionId;
  if (sid) {
    const sess = (State.sessions||[]).find(s => s.id === sid);
    if (sess) {
      const responses = sess.responseIds.map(i => State.responses[i]).filter(Boolean);
      const questions = (sess.questions && sess.questions.length) ? sess.questions : State.questions;
      const label = (sess.title && sess.title !== sess.autoLabel) ? (sess.autoLabel + ' — ' + sess.title) : sess.autoLabel;
      return { questions, responses, sessionLabel: label, partial: !!sess.partial, participants: sess.participants };
    }
  }
  return { questions: State.questions, responses: State.responses, sessionLabel: 'All sessions', partial: State.partialSession, participants: State.participants };
}

function renderResults() {
  const box = document.getElementById('resultsBox');
  const sum = document.getElementById('respSummary');
  document.getElementById('stat-r').textContent = State.responses.length;

  const ctx = getScopedContext();

  if (!ctx.responses.length) {
    if (!State.responses.length) {
      box.innerHTML = '<div class="muted" style="text-align:center;padding:30px;">No responses yet. Launch interviews to collect data.</div>';
      sum.textContent = 'No responses yet.';
    } else {
      box.innerHTML = '<div class="muted" style="text-align:center;padding:30px;">No responses in <strong>' + escapeHtml(ctx.sessionLabel) + '</strong> yet.</div>';
      sum.textContent = 'Viewing ' + ctx.sessionLabel + ' — 0 responses.';
    }
    return;
  }
  sum.textContent = `Viewing ${ctx.sessionLabel} — ${ctx.responses.length} submission(s) across ${ctx.questions.length} question(s).`;
  if (ctx.partial && ctx.responses.length < (ctx.participants || Infinity)) {
    sum.textContent += ' ⏹ Partial session — ended early before the full participant quota was met.';
  }

  const agg = aggregate(ctx.questions, ctx.responses);
  box.innerHTML = agg.map(a => `
    <div class="response-item">
      <div style="font-weight:700;margin-bottom:6px;">Q${a.idx}. ${escapeHtml(a.prompt)} <span class="chip" style="float:right;">${a.type}</span></div>
      <div>${a.summary}</div>
    </div>
  `).join('');
}

function aggregate(questions, responses) {
  questions = questions || State.questions;
  responses = responses || State.responses;
  return questions.map((q, i) => {
    const answers = responses.map(r => r.answers[q.id]).filter(v => v !== undefined);
    let summary = `<span class="muted">${answers.length} response(s)</span>`;
    if (q.type === 'mc') {
      const counts = {};
      answers.forEach(a => { counts[a] = (counts[a]||0) + 1; });
      summary = q.options.map((o, oi) => {
        const n = counts[oi] || 0;
        const pct = answers.length ? Math.round(n/answers.length*100) : 0;
        return `<div style="margin:4px 0;">
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span><strong>${String.fromCharCode(65+oi)}.</strong> ${escapeHtml(o)}</span>
            <span>${n} · ${pct}%</span>
          </div>
          <div style="height:6px;background:var(--surface);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--gradient);"></div>
          </div>
        </div>`;
      }).join('');
    } else if (q.type === 'likert') {
      const avg = answers.length ? (answers.reduce((a,b)=>a+b,0)/answers.length).toFixed(2) : 'N/A';
      const dist = [1,2,3,4,5].map(v => answers.filter(a=>a===v).length);
      summary = `<div><strong>Average:</strong> ${avg} / 5</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:8px;">
        ${dist.map((n,i) => `<div style="text-align:center;padding:8px;background:var(--surface);border-radius:8px;"><div style="font-weight:700;">${n}</div><div class="muted" style="font-size:11px;">${['SD','D','N','A','SA'][i]}</div></div>`).join('')}
        </div>`;
    } else {
      summary = answers.length ? answers.map((a, i) => `<div style="padding:8px 10px;background:var(--surface);border-radius:8px;margin:4px 0;font-size:13px;"><strong>P${i+1}:</strong> ${escapeHtml(a)}</div>`).join('') : '<span class="muted">No responses</span>';
    }
    return { idx: i+1, prompt: q.prompt || '(untitled)', type: q.type, summary };
  });
}

/* ============================================================
   GEMINI API
   ============================================================ */
async function callGemini(prompt, systemHint='') {
  const headers = { 'Content-Type': 'application/json' };
  if (window.IPS && window.IPS.getAccessToken) {
    const t = await window.IPS.getAccessToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
  }
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: prompt,
      systemHint: systemHint || '',
      key: (State.gemini && State.gemini.key) || '',
      model: (State.gemini && State.gemini.model) || ''
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Gemini error ' + res.status));
  return (data.text || '').trim();
}

async function aiGenerateQuestions() {
  const topic = document.getElementById('aiTopic').value.trim();
  const n = parseInt(document.getElementById('aiQCount').value) || 6;
  if (!topic) { toast('Enter a topic first.', 'error'); return; }
  toast('Generating questions…');
  try {
    const prompt = `You are an expert survey designer. Generate exactly ${n} interview questions on the topic: "${topic}".
Mix question types across: multiple_choice, likert, text.
Return STRICT JSON only, no markdown, no code fences. Schema:
{ "questions": [ { "type": "multiple_choice|likert|text", "prompt": "string", "options": ["opt1","opt2"] } ] }
Only include "options" for multiple_choice questions (3-5 options).`;
    const raw = await callGemini(prompt);
    const json = extractJSON(raw);
    if (!json || !Array.isArray(json.questions)) throw new Error('Malformed AI response');
    json.questions.forEach(q => {
      const type = q.type === 'multiple_choice' ? 'mc' : (q.type === 'likert' ? 'likert' : 'text');
      const nq = { id: uid(), type, prompt: q.prompt };
      if (type === 'mc') nq.options = (q.options && q.options.length ? q.options : ['Option A','Option B','Option C']);
      State.questions.push(nq);
    });
    renderQuestions(); save();
    toast(`Added ${json.questions.length} AI questions ✓`, 'success');
    sfx('submit');
  } catch(e) {
    toast(e.message, 'error'); sfx('error');
  }
}

function extractJSON(s) {
  if (!s) return null;
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch(e) { return null; }
}

async function aiSynthesize() {
  const ctx = getScopedContext();
  if (!ctx.responses.length) { toast('No responses in this session to synthesize.', 'error'); return; }
  const card = document.getElementById('aiSynthCard');
  const out = document.getElementById('aiSynthOutput');
  card.classList.remove('hidden');
  out.textContent = 'Analyzing responses for ' + ctx.sessionLabel + '…';
  try {
    const payload = {
      company: State.company,
      session: ctx.sessionLabel,
      questions: ctx.questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options })),
      responses: ctx.responses
    };
    const prompt = `You are an enterprise research analyst. Analyze the survey data below.
Focus ONLY on the session named "${ctx.sessionLabel}" — do NOT blend in data from other sessions.
Deliver a clean report with:
1) Executive summary (3-4 sentences)
2) Overall sentiment (positive / neutral / negative + reasoning)
3) Top 3-5 common themes
4) Key statistics per question (percentages/averages)
5) Recommended next actions
Be concise, structured, and use plain-text section headers.
Data:
${JSON.stringify(payload).slice(0, 12000)}`;
    const text = await callGemini(prompt);
    out.textContent = text;
    sfx('submit');
  } catch(e) {
    out.textContent = 'Error: ' + e.message;
    sfx('error');
  }
}

/* ============================================================
   AI DRAWER — Chat + Smart App Control
   ============================================================ */
function openAI(){ document.getElementById('aiDrawer').classList.add('open'); sfx('open'); }
function closeAI(){ document.getElementById('aiDrawer').classList.remove('open'); sfx('soft'); }

function pushChat(role, text) {
  State.chat.push({ role, text });
  const box = document.getElementById('aiBody');
  const el = document.createElement('div');
  el.className = 'ai-msg ' + role;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

async function aiChatSend() {
  const inp = document.getElementById('aiInput');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  pushChat('user', q);
  sfx('click');

  // Local intent detection first (fast path)
  const local = handleLocalIntent(q);
  if (local) { pushChat('bot', local); return; }

  // Otherwise use Gemini with app-control tools
  if (!State.gemini.key) {
    pushChat('bot', "I don't have a Gemini API key yet. Add one in the AI Config tab and I'll be much smarter. Meanwhile, try commands like: 'switch to neon theme', 'set participants to 10', 'add question about leadership', 'summarize responses'.");
    return;
  }

  try {
    const ctx = getScopedContext();
    const systemHint = `You are InsightPulse's embedded assistant. You may respond conversationally, OR issue app commands.
If the user wants to take action, output STRICT JSON ONLY (no markdown), schema:
{ "action": "set_theme|set_participants|set_company|add_question|summarize|generate_questions|reply",
  "params": { ... },
  "message": "short natural language reply" }
Themes: light, dark, neon, bright, nature, relaxing, tech.
For add_question params: { "type":"mc|likert|text", "prompt":"...", "options":[...] }
For generate_questions params: { "topic":"...", "count": N }
Current company: "${State.company}". Current theme: "${State.theme}". Participants: ${State.participants}. Total questions: ${State.questions.length}. Total responses: ${State.responses.length}.
Currently focused session: "${ctx.sessionLabel}" — it contains ${ctx.responses.length} responses across ${ctx.questions.length} questions. When the user asks about "responses", "trends", "the interview", or "summary", refer ONLY to this focused session (never mix in data from other sessions).
Focused session data (may be truncated):
${JSON.stringify({ questions: ctx.questions, responses: ctx.responses }).slice(0, 6000)}
If it's just a chat question, use action "reply".`;
    const text = await callGemini(q, systemHint);
    const json = extractJSON(text);
    if (json && json.action) {
      await executeAIAction(json);
      pushChat('bot', json.message || 'Done ✓');
    } else {
      pushChat('bot', text);
    }
  } catch(e) {
    pushChat('bot', 'Error: ' + e.message);
    sfx('error');
  }
}

function handleLocalIntent(q) {
  const s = q.toLowerCase();
  // theme switch
  const themes = ['light','dark','neon','bright','nature','relaxing','tech'];
  for (const t of themes) {
    if (s.includes(t + ' theme') || s.includes('switch to ' + t) || s.includes('theme to ' + t)) {
      applyTheme(t);
      return `Switched to ${t} theme ✓`;
    }
  }
  // sound toggle
  if (s.includes('mute') || s.includes('turn off sound')) { State.sfx = false; save(); updateSfxIcon(); return 'Sound effects muted 🔇'; }
  if (s.includes('unmute') || s.includes('turn on sound')) { State.sfx = true; save(); updateSfxIcon(); return 'Sound effects enabled 🔊'; }
  // participants
  const pm = s.match(/(?:participants|interviewees|people)\s*(?:to|=|:)?\s*(\d+)/) || s.match(/set\s+(\d+)\s+participants/);
  if (pm) {
    State.participants = Math.max(1, parseInt(pm[1]));
    document.getElementById('participantCount').value = State.participants;
    document.getElementById('stat-p').textContent = State.participants;
    save();
    return `Participants set to ${State.participants} ✓`;
  }
  // company
  const cm = q.match(/company\s+(?:name\s+)?(?:to|is|:)\s+["']?([^"']+)["']?/i);
  if (cm) {
    State.company = cm[1].trim();
    document.getElementById('companyName').value = State.company;
    save();
    return `Company set to "${State.company}" ✓`;
  }
  return null;
}

async function executeAIAction(a) {
  const p = a.params || {};
  switch(a.action) {
    case 'set_theme':
      if (p.theme) applyTheme(p.theme);
      break;
    case 'set_participants':
      if (p.count) {
        State.participants = parseInt(p.count);
        document.getElementById('participantCount').value = State.participants;
        document.getElementById('stat-p').textContent = State.participants;
        save();
      }
      break;
    case 'set_company':
      if (p.name) {
        State.company = p.name;
        document.getElementById('companyName').value = p.name;
        save();
      }
      break;
    case 'add_question': {
      const type = p.type === 'multiple_choice' ? 'mc' : (p.type === 'likert' ? 'likert' : (p.type === 'mc' ? 'mc' : 'text'));
      const q = { id: uid(), type, prompt: p.prompt || 'New question' };
      if (type === 'mc') q.options = p.options && p.options.length ? p.options : ['Option A','Option B','Option C'];
      State.questions.push(q);
      renderQuestions(); save();
      break;
    }
    case 'generate_questions':
      document.getElementById('aiTopic').value = p.topic || '';
      document.getElementById('aiQCount').value = p.count || 5;
      await aiGenerateQuestions();
      break;
    case 'summarize':
      switchTab('results');
      await aiSynthesize();
      break;
  }
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(name) {
  if (name === 'ai') name = 'build'; // AI tab retired — always redirect to build
  State.currentTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  ['build','ai','results'].forEach(x => {
    const el = document.getElementById('tab-'+x);
    if (el) el.classList.toggle('hidden', x !== name);
  });
  if (name === 'results') { populateSessionPicker(); renderResults(); }
  save(); sfx('soft');
}

/* ============================================================
   SETTINGS MODAL — AI Config + Reset All (consolidated)
   ============================================================ */
function openSettingsModal() {
  const currentKey = State.gemini.key || '';
  const currentModel = State.gemini.model || 'gemini-2.5-flash';
  let currentMMEmail = '';
  try { currentMMEmail = localStorage.getItem(MM_EMAIL_KEY) || ''; } catch(e) {}
  const models = [
    'gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro',
    'gemini-2.0-flash','gemini-2.0-flash-lite',
    'gemini-3.5-flash-lite','gemini-3.6-flash'
  ];
  openModal('⚙ Settings', `
    <div class="muted" style="margin-top:0;margin-bottom:8px;">AI configuration &amp; workspace controls. Everything is stored locally in your browser.</div>
    <hr class="sep" style="margin:10px 0 18px;"/>
    <h3 style="margin:0 0 4px;font-size:15px;">🤖 Gemini API</h3>
    <div class="muted" style="font-size:12px;margin-bottom:12px;">Bring your own key — used for AI question generation, chat, and synthesis.</div>
    <div class="field">
      <label>API Key</label>
      <input type="password" id="setGeminiKey" placeholder="AIza…" value="${escapeHtml(currentKey)}" autocomplete="off" />
    </div>
    <div class="field">
      <label>Model</label>
      <select id="setGeminiModel">
        ${models.map(m => `<option value="${m}"${m===currentModel?' selected':''}>${m}</option>`).join('')}
      </select>
    </div>
    <div class="inline-row">
      <button class="btn primary" id="setSaveAI">💾 Save</button>
      <button class="btn" id="setTestAI">🔌 Test connection</button>
    </div>
    <hr class="sep"/>
    <h3 style="margin:0 0 4px;font-size:15px;">🌐 Translation</h3>
    <div class="muted" style="font-size:12px;margin-bottom:12px;">
      Translations use the free <strong>MyMemory</strong> API. Anonymous mode allows
      ~5,000 chars/day — adding your email raises it to ~50,000 chars/day (10× boost).
    </div>
    <div class="field">
      <label for="mmEmailInput">Your email (optional)</label>
      <input type="email" id="mmEmailInput" placeholder="you@example.com" value="${escapeHtml(currentMMEmail)}" autocomplete="off" />
    </div>
    <div id="mmStatus" style="font-size:13px;font-weight:600;color:${currentMMEmail ? 'var(--success)' : 'var(--text-muted)'};">
      ${currentMMEmail ? '✅ Boosted mode active — ~50,000 chars/day' : 'Anonymous mode — ~5,000 chars/day'}
    </div>
    <div class="inline-row" style="margin-top:12px;">
      <button class="btn primary" id="mmSave">💾 Save email</button>
      <button class="btn ghost" id="mmClear">Clear</button>
    </div>
    <p class="muted" style="font-size:12px;margin:12px 0 0;">
      🔒 Privacy: saved only in <strong>this browser's localStorage</strong>.
      Nothing is hardcoded in the source code and nothing is sent to any server —
      the email is only attached as a parameter to MyMemory translation requests.
    </p>
    <hr class="sep"/>
    <h3 style="margin:0 0 4px;font-size:15px;color:var(--danger);">⚠ Danger Zone</h3>
    <div class="muted" style="font-size:12px;margin-bottom:12px;">Factory reset erases every question, response, session, API key and setting — restoring InsightPulse to a fresh-install state. This cannot be undone.</div>
    <button class="btn danger" id="setResetAll">⟲ Reset all data</button>
  `);
  const $key = document.getElementById('setGeminiKey');
  const $model = document.getElementById('setGeminiModel');
  document.getElementById('setSaveAI').addEventListener('click', () => {
    State.gemini.key = $key.value.trim();
    State.gemini.model = $model.value;
    // Keep hidden legacy inputs in sync in case anything reads them
    const legacyKey = document.getElementById('geminiKey'); if (legacyKey) legacyKey.value = State.gemini.key;
    const legacyModel = document.getElementById('geminiModel'); if (legacyModel) legacyModel.value = State.gemini.model;
    save();
    toast('AI settings saved ✓', 'success');
    sfx('click');
  });
  document.getElementById('setTestAI').addEventListener('click', async () => {
    State.gemini.key = $key.value.trim();
    State.gemini.model = $model.value;
    save();
    try {
      toast('Testing…');
      const r = await callGemini('Reply with exactly the word: OK');
      toast('Gemini reachable: ' + r.slice(0,40), 'success');
    } catch(e) { toast(e.message, 'error'); sfx('error'); }
  });
  document.getElementById('setResetAll').addEventListener('click', () => {
    closeModal();
    resetAll();
  });
  // Translation (MyMemory quota boost)
  const $mmInput = document.getElementById('mmEmailInput');
  const $mmStatus = document.getElementById('mmStatus');
  $mmInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('mmSave').click(); });
  document.getElementById('mmSave').addEventListener('click', () => {
    const v = $mmInput.value.trim();
    if (v && v.indexOf('@') < 1) { toast('Please enter a valid email address.', 'error'); sfx('error'); $mmInput.focus(); return; }
    try {
      if (v) localStorage.setItem(MM_EMAIL_KEY, v);
      else localStorage.removeItem(MM_EMAIL_KEY);
    } catch(e) {}
    $mmStatus.textContent = v ? '✅ Boosted mode active — ~50,000 chars/day' : 'Anonymous mode — ~5,000 chars/day';
    $mmStatus.style.color = v ? 'var(--success)' : 'var(--text-muted)';
    toast(v ? 'Email saved — quota boosted! 🚀' : 'Cleared — anonymous mode');
    sfx('click');
  });
  document.getElementById('mmClear').addEventListener('click', () => {
    try { localStorage.removeItem(MM_EMAIL_KEY); } catch(e) {}
    $mmInput.value = '';
    $mmStatus.textContent = 'Anonymous mode — ~5,000 chars/day';
    $mmStatus.style.color = 'var(--text-muted)';
    toast('Email cleared — back to anonymous mode');
    sfx('soft');
  });
}

/* ============================================================
   EXPORT
   ============================================================ */
function exportJSON() {
  const data = {
    company: State.company,
    session: State.sessionTitle,
    exportedAt: new Date().toISOString(),
    questions: State.questions,
    responses: State.responses
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `insightpulse_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  sfx('submit');
  toast('Export ready ✓', 'success');
}

/* ============================================================
   BINDINGS + INIT
   ============================================================ */
function updateSfxIcon() {
  document.getElementById('sfxToggle').textContent = State.sfx ? '🔊' : '🔇';
}

function bind() {
  // theme swatches (admin + interview)
  document.querySelectorAll('#themePicker .swatch, #themePickerIV .swatch').forEach(s => {
    s.addEventListener('click', () => { applyTheme(s.dataset.t); sfx('click'); });
  });
  // sfx
  document.getElementById('sfxToggle').addEventListener('click', () => {
    State.sfx = !State.sfx; save(); updateSfxIcon();
    if (State.sfx) sfx('click');
    toast(State.sfx ? 'Sound on' : 'Sound off');
  });
  // tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
  // company / session / participants
  document.getElementById('companyName').addEventListener('input', e => { State.company = e.target.value; save(); });
  document.getElementById('sessionTitle').addEventListener('input', e => { State.sessionTitle = e.target.value; save(); });
  document.getElementById('participantCount').addEventListener('input', e => {
    State.participants = Math.max(1, parseInt(e.target.value)||1);
    document.getElementById('stat-p').textContent = State.participants;
    save();
  });
  document.querySelectorAll('.participant-preset').forEach(b => {
    b.addEventListener('click', () => {
      const n = parseInt(b.dataset.n);
      State.participants = n;
      document.getElementById('participantCount').value = n;
      document.getElementById('stat-p').textContent = n;
      save(); sfx('click');
    });
  });
  // add question
  document.querySelectorAll('[data-add]').forEach(b => {
    b.addEventListener('click', () => addQuestion(b.dataset.add));
  });
  document.getElementById('btnClearQs').addEventListener('click', () => {
    if (!State.questions.length) return;
    if (confirm('Delete all questions?')) { State.questions = []; renderQuestions(); save(); sfx('soft'); }
  });
  // Gemini config now lives entirely in the settings modal (setSaveAI/setTestAI above)
  // launch + interview nav
  document.getElementById('btnLaunch').addEventListener('click', launchInterview);
  // Landing screen navigation
  document.getElementById('btnGoEdit').addEventListener('click', () => { showView('admin'); switchTab('build'); sfx('click'); });
  document.getElementById('btnGoInterview').addEventListener('click', () => { launchInterview(); });
  ['btnGoEdit','btnGoInterview'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });
  document.getElementById('brandHome').addEventListener('click', () => {
    if (State.interview.active) return; // don't accidentally leave live interview
    showView('landing'); refreshLandingStats(); sfx('soft');
  });
  // Settings modal (consolidated AI config + reset)
  document.getElementById('btnOpenSettings').addEventListener('click', openSettingsModal);
  // Session picker in results tab
  const sessionPicker = document.getElementById('sessionPicker');
  if (sessionPicker) sessionPicker.addEventListener('change', e => {
    State.selectedSessionId = e.target.value || '';
    save();
    renderResults();
    sfx('soft');
  });
  document.getElementById('btnExitIV').addEventListener('click', () => {
    if (confirm('Exit interview session? Progress for the current participant will be lost.')) exitInterview();
  });
  document.getElementById('btnEndEarly').addEventListener('click', endEarly);
  document.getElementById('ivLang').addEventListener('change', e => {
    State.lang = e.target.value;
    save();
    sfx('click');
    toast(State.lang === 'en' ? 'Language: English' : 'Translating interview…');
    if (State.interview.active) renderInterview();
  });
  document.getElementById('ivNext').addEventListener('click', ivNext);
  document.getElementById('ivPrev').addEventListener('click', ivPrev);
  // results
  document.getElementById('btnExport').addEventListener('click', exportJSON);
  document.getElementById('btnSynthesize').addEventListener('click', aiSynthesize);
  // AI drawer
  document.getElementById('fabAI').addEventListener('click', openAI);
  document.getElementById('btnOpenAI').addEventListener('click', openAI);
  document.getElementById('btnCloseAI').addEventListener('click', closeAI);
  document.getElementById('aiSend').addEventListener('click', aiChatSend);
  document.getElementById('aiInput').addEventListener('keydown', e => { if (e.key === 'Enter') aiChatSend(); });
  // modal
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBack').addEventListener('click', e => { if (e.target.id === 'modalBack') closeModal(); });
}

function hydrate() {
  document.getElementById('companyName').value = State.company;
  document.getElementById('sessionTitle').value = State.sessionTitle;
  document.getElementById('participantCount').value = State.participants;
  document.getElementById('ivLang').value = State.lang || 'en';
  applyTheme(State.theme || 'light');
  updateSfxIcon();
  if (!Array.isArray(State.sessions)) State.sessions = [];
  renderQuestions();
  populateSessionPicker();
  renderResults();
  refreshLandingStats();
  // Default landing view (unless a live interview is somehow still active from a prior tab)
  if (State.interview && State.interview.active) {
    showView('interview');
  } else {
    showView('landing');
  }
  // restore chat
  const box = document.getElementById('aiBody');
  (State.chat || []).forEach(c => {
    const el = document.createElement('div');
    el.className = 'ai-msg ' + c.role;
    el.textContent = c.text;
    box.appendChild(el);
  });
}

// Bootstrap
load();
bind();
hydrate();
// Account sync: pull server-side state and re-hydrate if found (cross-device sync)
if (window.IPS && window.IPS.sync) {
  window.IPS.sync.loadRemote().then(function(remote){
    if (remote) {
      try { Object.assign(State, remote); } catch(e){}
      var _box = document.getElementById('aiBody'); if (_box) _box.innerHTML = '';
      hydrate();
    }
    if (window.IPS.sync) window.IPS.sync.ready = true;
  }).catch(function(){ if (window.IPS.sync) window.IPS.sync.ready = true; });
}

// Seed a friendly starter question if brand-new
if (!State.questions.length && !State.responses.length) {
  State.questions = [
    { id: uid(), type: 'likert', prompt: 'I feel valued and supported at work.' },
    { id: uid(), type: 'mc', prompt: 'Which area needs the most improvement?', options: ['Communication','Leadership','Tools & processes','Work-life balance'] },
    { id: uid(), type: 'text', prompt: 'What one change would make the biggest positive impact for you?' }
  ];
  renderQuestions(); save();
  refreshLandingStats();
}

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
