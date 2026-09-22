/* =========================================================================
   A300-600 CBT Prep — app logic (vanilla JS, no build, no dependencies)
   Data is inlined via data.js (window.CBT_DATA) so it runs from file://,
   any static host, and Vercel with no server or fetch.
   ========================================================================= */
'use strict';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const el = (id) => document.getElementById(id);

/* Study sets = the CBT groups from the course (block == a new CBT that
   restarts its question numbering at 1 in the source PDF). */
const GROUPS = [
  { key: 'a1', label: 'CBT A-1', sub: 'Aircraft General · Equipment', block: 1 },
  { key: 'a2', label: 'CBT A-2', sub: 'Flight Instruments · ECAM · Communications · APU', block: 2 },
  { key: 'a3', label: 'CBT A-3', sub: 'Electrical', block: 3 },
  { key: 'a4', label: 'CBT A-4', sub: 'Power Plant', block: 4 },
  { key: 'a5', label: 'CBT A-5', sub: 'Pneumatics · Air Conditioning', block: 5 },
  { key: 'a6', label: 'CBT A-6', sub: 'Hydraulics · Landing Gear · Flight Controls', block: 6 },
  { key: 'a7', label: 'CBT A-7', sub: 'Fuel', block: 7 },
  { key: 'a8', label: 'CBT A-8', sub: 'Ice & Rain · Fire Protection', block: 8 },
  { key: 'a9', label: 'CBT A-9', sub: 'Navigation · Autoflight · Flight Management', block: 9 },
];

/* block number -> short CBT label, for the in-quiz question header */
const BLOCK_LABEL = GROUPS.reduce((m, g) => { m[g.block] = g.label; return m; }, {});

let ALL = [];
/* Multi-select: allMode = every group; otherwise the chosen blocks. */
let allMode = true;
const selectedBlocks = new Set();

const session = {
  mode: 'learn',
  review: false,
  questions: [],
  index: 0,
  answers: {},       // qid -> chosen original option index
  revealed: {},      // qid -> bool (learn mode)
  optionOrder: {},   // qid -> [display order of original indices]
  shuffleOptions: false,
};

/* ---------- helpers ---------- */
function showView(id) {
  ['viewHome', 'viewQuiz', 'viewResult'].forEach((v) => { el(v).hidden = (v !== id); });
  el('btnHome').hidden = (id === 'viewHome');
  window.scrollTo(0, 0);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(raw, i) {
  const q = raw || {};
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  let ci = q.correct_index;
  if (typeof ci !== 'number' || ci < 0 || ci >= options.length) ci = null;
  return {
    id: typeof q.id === 'number' ? q.id : i + 1,
    block: typeof q.block === 'number' ? q.block : null,
    source_q_num: typeof q.source_q_num === 'number' ? q.source_q_num : null,
    question: String(q.question || ''),
    options,
    correct_index: ci,
    confidence: q.confidence || 'high',
    flag: q.flag || null,
    page: q.page,
  };
}

function needsWarning(q) {
  return q.flag != null || q.confidence !== 'high' || q.correct_index == null;
}
function isScorable(q) {
  return typeof q.correct_index === 'number';
}
function selectedPool() {
  if (allMode) return ALL.slice();
  return ALL.filter((q) => selectedBlocks.has(q.block));
}
function countForBlock(block) {
  return ALL.reduce((n, q) => n + (q.block === block ? 1 : 0), 0);
}
function isGroupActive(block) {
  return allMode || selectedBlocks.has(block);
}

/* ---------- home ---------- */
function toggleGroup(block) {
  if (allMode) {
    /* leaving "All" narrows the selection to just this group */
    allMode = false;
    selectedBlocks.clear();
    selectedBlocks.add(block);
  } else if (selectedBlocks.has(block)) {
    selectedBlocks.delete(block);
    if (selectedBlocks.size === 0) allMode = true; // never leave an empty pool
  } else {
    selectedBlocks.add(block);
    if (selectedBlocks.size === GROUPS.length) { allMode = true; selectedBlocks.clear(); }
  }
  buildHome();
}

function buildHome() {
  el('loadedNote').textContent =
    `${ALL.length} questions · ${GROUPS.length} CBT groups`;

  const box = el('ranges');
  box.innerHTML = '';

  /* "All" toggle chip */
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'chip chip-all' + (allMode ? ' active' : '');
  allBtn.innerHTML =
    `<span class="chip-head"><span class="chip-title">All questions</span>` +
    `<span class="chip-count">${ALL.length}</span></span>` +
    `<small class="chip-sub">Every CBT group</small>`;
  allBtn.addEventListener('click', () => {
    allMode = true;
    selectedBlocks.clear();
    buildHome();
  });
  box.appendChild(allBtn);

  /* one chip per CBT group (multi-select) */
  GROUPS.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (isGroupActive(g.block) ? ' active' : '');
    b.setAttribute('aria-pressed', String(isGroupActive(g.block)));
    b.innerHTML =
      `<span class="chip-head"><span class="chip-title">${esc(g.label)}</span>` +
      `<span class="chip-count">${countForBlock(g.block)}</span></span>` +
      `<small class="chip-sub">${esc(g.sub)}</small>`;
    b.addEventListener('click', () => toggleGroup(g.block));
    box.appendChild(b);
  });

  /* selection summary + start-button state */
  const pool = selectedPool();
  const sel = el('selInfo');
  if (sel) {
    sel.textContent = allMode
      ? `All groups selected · ${pool.length} questions`
      : `${selectedBlocks.size} group${selectedBlocks.size === 1 ? '' : 's'} selected · ${pool.length} questions`;
  }
  const disabled = pool.length === 0;
  el('btnLearn').disabled = disabled;
  el('btnExam').disabled = disabled;
}

/* ---------- session ---------- */
function startSession(mode) {
  const pool = selectedPool();
  if (pool.length === 0) return;
  session.mode = mode;
  session.review = false;
  session.index = 0;
  session.answers = {};
  session.revealed = {};
  session.optionOrder = {};
  session.shuffleOptions = el('tglShuffleO').checked;

  let list = pool.slice();
  if (el('tglShuffleQ').checked) list = shuffle(list);
  session.questions = list;

  list.forEach((q) => {
    const order = q.options.map((_, i) => i);
    session.optionOrder[q.id] = session.shuffleOptions ? shuffle(order) : order;
  });

  el('modeTag').textContent = mode === 'learn' ? 'Learn' : 'Exam';
  el('btnNext').textContent = 'Next';
  showView('viewQuiz');
  renderQuestion();
}

function renderQuestion() {
  const q = session.questions[session.index];
  const total = session.questions.length;

  el('progressText').textContent = `${session.index + 1} / ${total}`;
  el('progressFill').style.width = `${((session.index + 1) / total) * 100}%`;

  const grpLabel = q.block != null ? BLOCK_LABEL[q.block] : null;
  const qNum = q.source_q_num != null ? q.source_q_num : q.id;
  el('qref').textContent =
    (grpLabel ? grpLabel + ' · ' : '') + `Q${qNum}` + (q.page ? ` · p.${q.page}` : '');
  el('qtext').textContent = q.question;

  const warn = needsWarning(q);
  el('qbadge').hidden = !warn;
  const note = el('qnote');
  if (warn && q.flag) { note.textContent = '⚠ ' + q.flag; note.hidden = false; }
  else { note.hidden = true; }

  renderOptions(q);

  el('btnPrev').disabled = session.index === 0;
  const last = session.index === total - 1;
  if (session.mode === 'exam') {
    el('btnNext').textContent = last ? 'Finish exam' : 'Next';
  } else {
    el('btnNext').textContent = last ? 'Finish' : 'Next';
  }
}

function renderOptions(q) {
  const ul = el('optionsList');
  ul.innerHTML = '';
  const order = session.optionOrder[q.id] || q.options.map((_, i) => i);
  const chosen = session.answers[q.id];
  const revealed = session.mode === 'learn' && session.revealed[q.id];

  order.forEach((origIdx, pos) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.innerHTML =
      `<span class="key">${LETTERS[pos] || pos + 1}</span>` +
      `<span class="txt">${esc(q.options[origIdx])}</span>` +
      `<span class="mark"></span>`;

    if (revealed) {
      btn.disabled = true;
      if (isScorable(q) && origIdx === q.correct_index) {
        btn.classList.add('correct');
        btn.querySelector('.mark').textContent = '✓';
      }
      if (chosen === origIdx && origIdx !== q.correct_index) {
        btn.classList.add('wrong');
        btn.querySelector('.mark').textContent = '✗';
      }
    } else if (chosen === origIdx) {
      btn.classList.add('selected'); // exam mode: show selection only
    }

    btn.addEventListener('click', () => onOptionClick(q, origIdx));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function onOptionClick(q, origIdx) {
  if (session.mode === 'learn') {
    if (session.revealed[q.id]) return;
    session.answers[q.id] = origIdx;
    session.revealed[q.id] = true;
    renderQuestion();
  } else {
    session.answers[q.id] = origIdx;
    renderOptions(q);
  }
}

/* ---------- navigation ---------- */
function goNext() {
  const last = session.index === session.questions.length - 1;
  if (last) {
    /* Reviewing a wrong-answer subset just returns to the menu; a real
       Learn or Exam run shows the score summary (correct / wrong). */
    if (session.review) { buildHome(); showView('viewHome'); }
    else finishSession();
    return;
  }
  session.index++;
  renderQuestion();
}
function goPrev() {
  if (session.index === 0) return;
  session.index--;
  renderQuestion();
}

/* ---------- result (Learn + Exam) ---------- */
function finishSession() {
  const scorable = session.questions.filter(isScorable);
  let correct = 0;
  const wrong = [];
  scorable.forEach((q) => {
    const chosen = session.answers[q.id];
    if (chosen === q.correct_index) correct++;
    else wrong.push(q);
  });
  const total = scorable.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  el('resultTitle').textContent = session.mode === 'learn' ? 'Learn set complete' : 'Exam result';
  el('scoreBig').textContent = `${correct} / ${total}`;
  const skipped = session.questions.length - total;
  el('scoreLine').textContent =
    `${correct} correct · ${wrong.length} wrong · ${pct}%` +
    (skipped ? ` · ${skipped} unscored (source unverified)` : '');

  const wrongWrap = el('wrongWrap');
  const btnReview = el('btnReviewWrong');
  if (wrong.length) {
    const list = el('wrongList');
    list.innerHTML = '';
    wrong.forEach((q) => {
      const d = document.createElement('div');
      d.className = 'wrong-item';
      const ci = q.correct_index;
      d.innerHTML = `<strong>Q${q.id}.</strong> ${esc(q.question)}<br>` +
        `<span class="muted small">Correct: ${LETTERS[displayPosOf(q, ci)] || '?'}) ${esc(q.options[ci])}</span>`;
      d.addEventListener('click', () => reviewSingle(q));
      list.appendChild(d);
    });
    wrongWrap.hidden = false;
    btnReview.hidden = false;
    btnReview.onclick = () => reviewWrong(wrong);
  } else {
    wrongWrap.hidden = true;
    btnReview.hidden = true;
  }
  showView('viewResult');
}

function displayPosOf(q, origIdx) {
  const order = session.optionOrder[q.id] || q.options.map((_, i) => i);
  return order.indexOf(origIdx);
}

function reviewSingle(q) {
  session.mode = 'learn';
  session.review = true;
  session.questions = [q];
  session.index = 0;
  session.revealed = { [q.id]: true };
  el('modeTag').textContent = 'Review';
  showView('viewQuiz');
  renderQuestion();
}

function reviewWrong(wrong) {
  session.mode = 'learn';
  session.review = true;
  session.questions = wrong.slice();
  session.index = 0;
  session.revealed = {};
  wrong.forEach((q) => { session.revealed[q.id] = true; });
  el('modeTag').textContent = 'Review';
  showView('viewQuiz');
  renderQuestion();
}

/* ---------- keyboard ---------- */
function onKeydown(e) {
  if (el('viewQuiz').hidden) return;
  if (e.key === 'Enter') { goNext(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 6) {
    const btns = el('optionsList').querySelectorAll('.option');
    if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
  }
}

/* ---------- wire up ---------- */
function init() {
  const data = window.CBT_DATA || {};
  ALL = (Array.isArray(data.questions) ? data.questions : []).map(normalize);

  el('btnLearn').addEventListener('click', () => startSession('learn'));
  el('btnExam').addEventListener('click', () => startSession('exam'));
  el('btnNext').addEventListener('click', goNext);
  el('btnPrev').addEventListener('click', goPrev);
  el('btnHome').addEventListener('click', () => { buildHome(); showView('viewHome'); });
  el('btnResultHome').addEventListener('click', () => { buildHome(); showView('viewHome'); });
  document.addEventListener('keydown', onKeydown);

  buildHome();
  showView('viewHome');
}

init();
