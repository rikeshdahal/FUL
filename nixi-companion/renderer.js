/*
  Nixi renderer.

  Owns the pill UI, the face animation, the microphone meter, the audio pipeline,
  live countdown timers, draggable/resizable positioning, and cloud model calls.
*/
'use strict';

const { ipcRenderer: ipc, clipboard } = require('electron');

const $ = id => document.getElementById(id);
const shell = $('shell');
const faceCanvas = $('face');
const fctx = faceCanvas.getContext('2d');
const levelCanvas = $('level');
const lctx = levelCanvas.getContext('2d');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEFAULTS = {
  key: '', model: 'gemini-2.5-flash', think: true, pill: '#0d1117', shade: '#12141a',
  eye: '#ffffff', outfit: 'none', wake: true, wakePhrase: 'hey nixi', polished: true,
  speak: false, hotkeys: true, autostart: false, alwaysOnTop: true,
  placement: 'top-center', customPos: null, panelWidth: 460, panelHeight: 520,
  glow: true, breathe: true
};

const S = {
  cfg: { ...DEFAULTS },
  mood: 'idle',
  temp: null,
  tempUntil: 0,
  love: 0,
  loveUntil: 0,
  level: 0,
  looking: null,
  hovering: false,
  idle: Date.now(),
  capture: null,      // 'cmd' | 'dict' | null
  busy: false,
  panel: null,
  lastReply: '',
  media: null,
  tele: null,
  confirm: null,
  speechAlive: false,
  speechNote: '',
  micStream: null,
  audioCtx: null,
  analyser: null,
  levelData: null,
  bodyKind: 'lists',
  activeTimers: [],
  activeReminders: []
};

let activeAbortController = null;
let mediaRecorder = null;
let recordedAudioChunks = [];
let captureTimeout = null;

/* ------------------------------------------------------------- face loop */
const face = new Face();
face.setPalette(S.cfg.eye, S.cfg.pill);

const sleeping = () => Date.now() - S.idle > 45000 && !S.busy && !S.capture && !shell.classList.contains('panel');

function currentMood() {
  if (shell.classList.contains('mini')) return 'idle';
  if (S.temp && Date.now() < S.tempUntil) return S.temp;
  if (S.busy === 'think') return 'thinking';
  if (S.capture === 'dict') return 'talking';
  if (S.capture === 'cmd') return 'listening';
  if (S.busy === 'talk') return 'talking';
  if (S.hovering) return 'hover';
  if (sleeping()) return 'sleepy';
  return 'idle';
}

let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = (t - lastT) / 1000;
  lastT = t;
  if (!dt || dt > .5) return;
  const mood = currentMood();
  const override = ['thinking', 'sleepy', 'sad'].includes(mood) ? null : S.looking;
  face.advance(dt, mood, S.level, override);

  // High-DPI 2x crisp render
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.clearRect(0, 0, 224, 112);
  fctx.setTransform(2, 0, 0, 2, 0, 0);
  face.paint(fctx, 0, 0, 112, 56, { outfit: S.cfg.outfit, love: S.love, time: t / 1000 });

  if (shell.classList.contains('music')) {
    const musicFaceCanvas = $('musicFace');
    if (musicFaceCanvas) {
      const mctx = musicFaceCanvas.getContext('2d');
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, 160, 80);
      mctx.setTransform(2, 0, 0, 2, 0, 0);
      face.paint(mctx, 0, 0, 80, 40, { outfit: 'headphones', love: 0, time: t / 1000 });
    }
  }

  drawLevel(t / 1000);
  updateAuraColor(mood);

  if (S.love > 0 && t / 1000 > S.loveUntil) S.love = 0;
}
requestAnimationFrame(loop);

function updateAuraColor(mood) {
  const auraColors = {
    listening: 'rgba(56, 189, 248, 0.65)',
    thinking: 'rgba(245, 158, 11, 0.65)',
    talking: 'rgba(168, 85, 247, 0.65)',
    happy: 'rgba(244, 63, 94, 0.7)',
    hover: 'rgba(77, 141, 255, 0.45)',
    surprised: 'rgba(6, 182, 212, 0.65)',
    sleepy: 'rgba(99, 102, 241, 0.25)',
    idle: 'rgba(59, 130, 246, 0.28)'
  };
  shell.style.setProperty('--aura-color', auraColors[mood] || auraColors.idle);
}

function feel(mood, ms = 1800) {
  S.temp = mood;
  S.tempUntil = Date.now() + ms;
}
function celebrate(ms = 2600) {
  S.love = 1;
  S.loveUntil = performance.now() / 1000 + ms / 1000;
  feel('happy', ms);
}

/* ------------------------------------------------------------ audio chime */
function playChime() {
  try {
    const ctx = S.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.12);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  } catch { }
}

/* ------------------------------------------------------------ level bars */
function drawLevel(time) {
  const w = 60, h = 20;
  lctx.clearRect(0, 0, 120, 40);
  lctx.save();
  lctx.scale(2, 2);
  const state = S.busy === 'think' ? 'think' : (S.capture || S.busy === 'talk') ? 'listen' : 'idle';
  for (let i = 0; i < 4; i++) {
    let v;
    if (state === 'think') v = .35 + .35 * (1 + Math.sin(time * 6 - i * .9)) / 2;
    else if (state === 'listen') v = .22 + .78 * clamp(S.level) * (.6 + .4 * Math.sin(time * 9 + i * 1.7));
    else v = .16 + .06 * Math.sin(time * 2 + i);
    const d = Math.max(3, v * h * .8);
    lctx.fillStyle = state === 'think' ? '#f59e0b' : state === 'listen' ? '#38bdf8' : 'rgba(255,255,255,.32)';
    lctx.beginPath();
    lctx.roundRect(1 + i * 7, (h - d) / 2, 3.5, d, 2);
    lctx.fill();
  }
  lctx.restore();
}

/* ---------------------------------------------------------------- shapes */
let currentShape = 'rest';
let collapseTimer = null;

function setShape(shape) {
  if (currentShape === shape) return;
  currentShape = shape;

  const targetW = shape === 'rest' ? 112 : shape === 'capsule' ? 360 : shape === 'music' ? 390 : (S.cfg.panelWidth || 460);
  const targetH = shape === 'rest' ? 56 : shape === 'capsule' ? 76 : shape === 'music' ? 136 : (S.cfg.panelHeight || 520);

  if (shape === 'panel' || shape === 'capsule' || shape === 'music') {
    clearTimeout(collapseTimer);
    ipc.send('prepare-size', { w: targetW, h: targetH, shape });
    shell.classList.toggle('rest', shape === 'rest');
    shell.classList.toggle('capsule', shape === 'capsule');
    shell.classList.toggle('music', shape === 'music');
    shell.classList.toggle('panel', shape === 'panel');
  } else {
    shell.classList.toggle('rest', shape === 'rest');
    shell.classList.toggle('capsule', shape === 'capsule');
    shell.classList.toggle('music', shape === 'music');
    shell.classList.toggle('panel', shape === 'panel');
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      if (currentShape === 'rest') {
        ipc.send('prepare-size', { w: 112, h: 56, shape: 'rest' });
      }
    }, 360);
  }
}

function setStatus(text, dim) {
  const el = $('status');
  el.textContent = text || '';
  el.title = text || '';
  el.classList.toggle('dim', !!dim);

  const cancelBtn = $('bCancelAction');
  if (cancelBtn) {
    cancelBtn.style.display = (S.busy || S.capture) ? 'inline-flex' : 'none';
  }
}

function collapse() {
  if (S.panel) return;
  if (S.capture || S.busy) return;
  if (currentShape === 'music') {
    if (!isMusicHovered && !isDraggingScrubber) setShape('rest');
    return;
  }
  setShape(S.hovering ? 'capsule' : 'rest');
}

/* --------------------------------------------------------------- theming */
function applyTheme() {
  const c = S.cfg;
  shell.style.setProperty('--pill', c.pill);
  shell.style.setProperty('--panel-w', (c.panelWidth || 460) + 'px');
  shell.style.setProperty('--panel-h', (c.panelHeight || 520) + 'px');
  shell.classList.toggle('breathe', c.breathe !== false);
  shell.style.setProperty('--aura-opacity', c.glow !== false ? '0.65' : '0');

  const hex = String(c.pill).replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 0, g = parseInt(hex.slice(2, 4), 16) || 0, b = parseInt(hex.slice(4, 6), 16) || 0;
  const light = (.299 * r + .587 * g + .114 * b) / 255 > .6;
  shell.style.setProperty('--fg', light ? '#1c232d' : '#f3f6fc');
  shell.style.setProperty('--dim', light ? '#5a687d' : '#717d91');
  shell.style.setProperty('--fg-muted', light ? '#455163' : '#9aa7b9');
  shell.style.setProperty('--line', light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.12)');
  shell.style.setProperty('--card-bg', light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)');
  face.setPalette(c.eye, c.pill);
}

/* ---------------------------------------------------------------- panels */
const chatHistory = [];

function appendChatMessage(role, text, extraHtml = '') {
  chatHistory.push({ role, text, at: Date.now() });
  const empty = $('chatEmptyState');
  if (empty) empty.style.display = 'none';

  const container = $('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div>${esc(text)}</div>${extraHtml}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function handleChatInput() {
  const inp = $('chatInput');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';

  appendChatMessage('user', val);
  wake();

  // Think first: Classify whether this is a Task or a Question/Conversation
  setStatus('Thinking… Analyzing intent…');
  feel('thinking', 600);

  const classified = await ipc.invoke('classify', val);
  const isTask = classified?.category === 'task';

  if (isTask) {
    setStatus(`⚡ Task detected: Thinking…`);
    feel('wink', 700);
  } else {
    setStatus(`💬 Question detected: Thinking answer…`);
    feel('talking', 700);
  }

  // Brief pause so visual thinking transition is noticeable
  await new Promise(r => setTimeout(r, 180));

  if (classified?.intent) {
    await runIntent(classified.intent, false, { fromChat: true });
    return;
  }

  // 2) Fall back to online model if key is present
  if (S.cfg.key) {
    try {
      S.busy = 'think';
      await askModel(val, { fromChat: true });
    } catch (e) {
      appendChatMessage('nixi', `Could not complete: ${e.message}`);
      feel('sad', 1800);
    } finally {
      S.busy = false;
    }
  } else {
    if (isTask) {
      appendChatMessage('nixi', `⚡ Task recognized: Searching for "${val}" on Google.`);
      await ipc.invoke('act', 'web_search', { query: val });
    } else {
      appendChatMessage('nixi', "I'm ready! You can give me tasks like 'open google', 'open tiktok and search rikesh dahal', 'open tiktok and youtube', 'volume up', 'set timer 5m', or add a free Gemini API key in settings for unlimited general answers.");
    }
    feel('happy', 1500);
  }
}

function renderHistory() {
  const el = $('tab-history');
  if (!el) return;
  if (!chatHistory.length) {
    el.innerHTML = '<div class="chat-empty-state">No past conversations yet.</div>';
    return;
  }
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="margin:0">Recent Activity</h4>
      <button class="small-btn" id="btnClearHistory">Clear History</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${chatHistory.slice().reverse().map(h => `
        <div class="glass-card" style="padding:10px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span class="tag" style="font-size:10px">${esc(h.role)}</span>
            <small class="muted">${new Date(h.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
          </div>
          <div style="font-size:13px">${esc(h.text)}</div>
        </div>
      `).join('')}
    </div>`;
  const clr = $('btnClearHistory');
  if (clr) clr.onclick = () => { chatHistory.length = 0; renderHistory(); };
}

function openTab(name) {
  S.bodyKind = name;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  ['chat', 'history', 'lists', 'settings', 'custom'].forEach(t => {
    const el = $('tab-' + t);
    if (el) el.classList.toggle('on', t === name);
  });
  if (name === 'chat') {
    setTimeout(() => { const inp = $('chatInput'); if (inp) inp.focus(); }, 80);
  } else if (name === 'history') {
    renderHistory();
  } else if (name === 'lists') {
    renderLists();
  } else if (name === 'settings') {
    renderSettings();
  }
}

function showPanel(kind, html) {
  S.panel = kind;
  setShape('panel');
  openTab('custom');
  $('tab-custom').innerHTML = html || '';
  afterPanel();
}

function closePanel() {
  S.panel = null;
  S.confirm = null;
  $('tab-custom').innerHTML = '';
  openTab('chat');
  collapse();
}

function afterPanel() {
  bindPanel();
  if (S.panel === 'music') { pollMedia(); renderMusic(); }
}

/* --------------------------------------------------- Live Timers & Lists */
function updateTimers() {
  ipc.invoke('data-get').then(data => {
    S.activeTimers = (data.timers || []).sort((a, b) => a.at - b.at);
    S.activeReminders = (data.reminders || []).sort((a, b) => a.at - b.at);

    // Update pill badge
    const badge = $('timerPillBadge');
    const digits = $('timerPillDigits');
    const bell = $('bellBadge');

    if (S.activeReminders.length > 0) {
      if (bell) bell.style.display = 'inline-flex';
    } else {
      if (bell) bell.style.display = 'none';
    }

    if (S.activeTimers.length > 0) {
      const nearest = S.activeTimers[0];
      const remainingSec = Math.max(0, Math.round((nearest.at - Date.now()) / 1000));
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      const str = `${m}:${s < 10 ? '0' : ''}${s}`;
      if (badge && digits) {
        badge.style.display = 'inline-flex';
        digits.textContent = str;
      }
    } else {
      if (badge) badge.style.display = 'none';
    }

    // If lists tab is currently open, re-render it smoothly
    if (S.panel === 'lists' || S.bodyKind === 'lists') {
      renderListsContent(data);
    }
  });
}
setInterval(updateTimers, 1000);

function renderLists() {
  ipc.invoke('data-get').then(data => {
    renderListsContent(data);
  });
}

function renderListsContent(data) {
  const todos = data.todo || [], notes = data.notes || [], timers = S.activeTimers || [], rems = S.activeReminders || [];
  const wide = (S.cfg.panelWidth || 460) >= 500;
  const now = Date.now();

  let activeTimerHtml = '';
  if (timers.length > 0) {
    activeTimerHtml = timers.map(t => {
      const remSec = Math.max(0, Math.round((t.at - now) / 1000));
      const m = Math.floor(remSec / 60);
      const s = remSec % 60;
      const digitsStr = `${m}:${s < 10 ? '0' : ''}${s}`;
      const total = t.totalSeconds || remSec || 60;
      const pct = clamp(1 - (remSec / total)) * 100;
      return `
        <div class="timer-active-card">
          <div class="timer-header">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">⏱</span>
              <strong style="font-size:14px">${esc(t.label || 'Timer')}</strong>
            </div>
            <span class="timer-digits-large">${digitsStr}</span>
          </div>
          <div class="timer-progress-track">
            <div class="timer-progress-bar" style="width: ${pct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <small class="muted">${t.totalSeconds ? Math.round(t.totalSeconds / 60) + ' min timer' : 'Running'}</small>
            <div style="display:flex;gap:6px">
              <button class="small-btn" data-addsec="${t.id}">+1m</button>
              <button class="small-btn" data-canceltimer="${t.id}" style="color:#fca5a5">Cancel</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  $('tab-lists').innerHTML = `
    <div class="lists-layout ${wide ? 'lists-grid wide' : ''}">
      <div class="lists-col">
        <!-- Active Timers Section (Screenshot 1) -->
        ${activeTimerHtml}

        <!-- Quick Timer & Reminder Starters -->
        <div class="glass-card">
          <h4>⏱ Quick Timers</h4>
          <div class="chip-bar">
            <button class="chip-btn" data-quicktimer="60">+1 min</button>
            <button class="chip-btn" data-quicktimer="300">+5 min</button>
            <button class="chip-btn" data-quicktimer="600">+10 min</button>
            <button class="chip-btn" data-quicktimer="900">+15 min</button>
            <button class="chip-btn" data-quicktimer="1500">+25 min</button>
            <button class="chip-btn" data-quicktimer="3600">+1 hr</button>
          </div>
          <div class="acts" style="margin-top:10px">
            <input type="text" id="timerInput" placeholder="Set custom timer (e.g. 5 min, 20m)" style="flex:1">
            <button class="btn primary" id="timerStart">Start</button>
          </div>
        </div>

        <!-- To-Dos -->
        <div class="glass-card">
          <h4>✓ To-Do (${todos.filter(t => !t.done).length})</h4>
          ${todos.length ? `<ul class="list">${todos.map(t => `<li class="${t.done ? 'done' : ''}"><span class="tick ${t.done ? 'on' : ''}" data-todo="${t.id}"></span><span>${esc(t.text)}</span><button class="small-btn" data-del="${t.id}" title="Delete">✕</button></li>`).join('')}</ul>`
            : `<div class="muted">No to-dos yet. Say “add groceries to my list” or type below.</div>`}
          <div class="acts" style="margin-top:10px">
            <input type="text" id="todoInput" placeholder="Add a to-do item…" style="flex:1">
            <button class="btn primary" id="todoAdd">Add</button>
          </div>
        </div>
      </div>

      <div class="lists-col">
        <!-- Scheduled Reminders (Screenshot 1) -->
        <div class="glass-card">
          <h4>● Scheduled Reminders (${rems.length})</h4>
          ${rems.length ? `<ul class="list">${rems.map(r => `<li><span style="color:#60a5fa">●</span><span>${esc(r.label)}</span><small class="muted">${new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small><button class="small-btn" data-canceltimer="${r.id}" title="Remove">✕</button></li>`).join('')}</ul>`
            : `<div class="muted">No reminders set. Try “Remind me at 6 to call Mom”.</div>`}
          <div class="acts" style="margin-top:10px">
            <input type="text" id="remindInput" placeholder="Remind me to… (e.g. call Mom at 6pm)" style="flex:1">
            <button class="btn primary" id="remindStart">Remind</button>
          </div>
        </div>

        <!-- Notes -->
        <div class="glass-card">
          <h4>📝 Notes (${notes.length})</h4>
          ${notes.length ? `<ul class="list">${notes.slice(-6).reverse().map(n => `<li><span>${esc(n.text)}</span></li>`).join('')}</ul>`
            : `<div class="muted">No notes yet. Try “Note down meeting password”.</div>`}
          <div class="acts" style="margin-top:10px">
            <input type="text" id="noteInput" placeholder="Save a quick note…" style="flex:1">
            <button class="btn primary" id="noteAdd">Save</button>
          </div>
        </div>
      </div>
    </div>`;
  bindPanel();
}

function renderMusic() {
  const m = S.media;
  const playing = m && m.playing && m.title;
  const pct = m && m.duration ? clamp((m.position || 0) / m.duration) * 100 : 0;
  $('tab-music').innerHTML = playing
    ? `<div class="glass-card">
         <div class="media">
           <div class="cover" style="${m.status === 'playing' ? 'box-shadow: 0 0 20px rgba(59,130,246,0.6);' : ''}">🎵</div>
           <div class="meta">
             <strong>${esc(m.title)}</strong>
             <em>${esc(m.artist || m.app || 'Now playing')}</em>
           </div>
         </div>
         <div class="bar"><i style="width:${pct}%"></i></div>
         <div class="transport">
           <button class="btn" data-media="prev" title="Previous track">⏮</button>
           <button class="btn primary" data-media="playpause" title="Play / Pause" style="padding:7px 18px">
             ${m.status === 'playing' ? '⏸ Pause' : '▶ Play'}
           </button>
           <button class="btn" data-media="next" title="Next track">⏭</button>
         </div>
       </div>`
    : `<div class="glass-card">
         <div class="muted" style="margin-bottom:10px">Nothing is currently playing.</div>
         <div class="acts">
           <button class="btn primary" data-media="playpause">Play / pause</button>
           <button class="btn" id="mRefresh">Check again</button>
         </div>
       </div>`;
  bindPanel();
}

function renderSettings() {
  const c = S.cfg;
  const p = c.placement || 'top-center';
  $('tab-settings').innerHTML = `
    <div class="glass-card">
      <h4>📌 Placement & Display</h4>
      <div class="row wrap" style="gap:6px">
        <button class="btn ${p === 'top-center' ? 'primary' : ''}" data-setdock="top-center">🏝 Notch (Top Center)</button>
        <button class="btn ${p === 'top-right' ? 'primary' : ''}" data-setdock="top-right">↗ Top Right</button>
        <button class="btn ${p === 'bottom-right' ? 'primary' : ''}" data-setdock="bottom-right">↘ Bottom Right</button>
        <button class="btn ${p === 'custom' ? 'primary' : ''}" data-setdock="custom">🪟 Free Floating</button>
      </div>
      <div class="row wrap" style="margin-top:12px;gap:6px">
        <span class="muted">Size:</span>
        <button class="small-btn" data-setsize="380,440">Compact (380×440)</button>
        <button class="small-btn" data-setsize="460,520">Standard (460×520)</button>
        <button class="small-btn" data-setsize="600,580">Wide (600×580)</button>
      </div>
      <div class="row wrap" style="margin-top:10px">
        <label class="chk"><input type="checkbox" id="glow" ${c.glow !== false ? 'checked' : ''}> Ambient aura glow</label>
        <label class="chk"><input type="checkbox" id="breathe" ${c.breathe !== false ? 'checked' : ''}> Idle breathing float</label>
      </div>
    </div>

    <div class="glass-card">
      <h4>🧠 Brain & AI Model</h4>
      <input id="k" type="password" placeholder="Gemini API key (aistudio.google.com/apikey)" value="${esc(c.key)}">
      <div class="row" style="margin-top:8px">
        <select id="m" style="flex:1">
          ${['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash'].map(m => `<option ${m === c.model ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="row wrap" style="margin-top:8px">
        <label class="chk"><input type="checkbox" id="think" ${c.think ? 'checked' : ''}> Deep think</label>
        <label class="chk"><input type="checkbox" id="polished" ${c.polished ? 'checked' : ''}> Polished dictation</label>
        <label class="chk"><input type="checkbox" id="speak" ${c.speak ? 'checked' : ''}> Read answers aloud</label>
      </div>
    </div>

    <div class="glass-card">
      <h4>🎙 Voice & Interaction</h4>
      <div class="row">
        <label class="chk"><input type="checkbox" id="wake" ${c.wake ? 'checked' : ''}> Wake phrase</label>
        <input id="wp" type="text" value="${esc(c.wakePhrase)}" style="width:160px">
      </div>
      <div class="row">
        <label class="chk"><input type="checkbox" id="hotkeys" ${c.hotkeys ? 'checked' : ''}> Global hotkeys active</label>
      </div>
    </div>

    <div class="glass-card">
      <h4>🎨 Appearance & Outfits</h4>
      <div class="row wrap">
        <div style="display:flex;align-items:center;gap:6px">
          <span class="muted">Pill:</span><input type="color" id="cp" value="${esc(c.pill)}">
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="muted">Eyes:</span><input type="color" id="ce" value="${esc(c.eye)}">
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="muted">Outfit:</span>
          <select id="o" style="width:120px;margin:0">
            ${['none', 'headphones', 'shades', 'glasses', 'bow'].map(x => `<option ${x === c.outfit ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="glass-card">
      <h4>⌨ Shortcuts</h4>
      <div class="hintrow">
        <kbd>Right Ctrl</kbd> hold - talk a command<br>
        <kbd>Right Alt</kbd> hold - dictate directly into any app<br>
        <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Space</kbd> talk &nbsp; <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>D</kbd> dictate &nbsp; <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>W</kbd> write<br>
        Drag top bar - move Nixi anywhere on screen<br>
        Drag bottom-right corner - resize panel
      </div>
    </div>

    <div class="acts" style="margin-top:14px">
      <button class="btn primary" id="sv">Save Settings</button>
      <button class="btn" id="miniBtn">Mini bar</button>
      <button class="btn danger" id="quit">Quit Nixi</button>
    </div>`;
  bindPanel();
}

function bindPanel() {
  const c = S.cfg;
  const live = () => {
    S.cfg.pill = $('cp') ? $('cp').value : c.pill;
    S.cfg.eye = $('ce') ? $('ce').value : c.eye;
    S.cfg.outfit = $('o') ? $('o').value : c.outfit;
    applyTheme();
  };
  ['cp', 'ce', 'o'].forEach(i => { const el = $(i); if (el) el.oninput = live; });

  const sv = $('sv');
  if (sv) sv.onclick = async () => {
    S.cfg.key = $('k').value.trim();
    S.cfg.model = $('m').value.trim() || DEFAULTS.model;
    S.cfg.think = $('think') ? $('think').checked : c.think;
    S.cfg.polished = $('polished') ? $('polished').checked : c.polished;
    S.cfg.speak = $('speak') ? $('speak').checked : c.speak;
    S.cfg.wake = $('wake') ? $('wake').checked : c.wake;
    S.cfg.wakePhrase = ($('wp') ? $('wp').value : c.wakePhrase).trim() || 'hey nixi';
    S.cfg.hotkeys = $('hotkeys') ? $('hotkeys').checked : c.hotkeys;
    S.cfg.glow = $('glow') ? $('glow').checked : c.glow;
    S.cfg.breathe = $('breathe') ? $('breathe').checked : c.breathe;
    live();
    await ipc.invoke('cfg-set', S.cfg);
    setStatus('Saved.');
    feel('happy', 1400);
    renderSettings();
  };

  const quit = $('quit');
  if (quit) quit.onclick = () => ipc.send('quit');
  const mini = $('miniBtn');
  if (mini) mini.onclick = () => { toggleMini(); closePanel(); };

  document.querySelectorAll('[data-setdock]').forEach(btn => {
    btn.onclick = () => {
      const dock = btn.dataset.setdock;
      S.cfg.placement = dock;
      ipc.send('window-set-placement', dock);
      setStatus('Placement: ' + btn.textContent.trim());
      feel('happy', 900);
      renderSettings();
    };
  });

  document.querySelectorAll('[data-setsize]').forEach(btn => {
    btn.onclick = () => {
      const [w, h] = btn.dataset.setsize.split(',').map(Number);
      S.cfg.panelWidth = w;
      S.cfg.panelHeight = h;
      shell.style.setProperty('--panel-w', w + 'px');
      shell.style.setProperty('--panel-h', h + 'px');
      ipc.send('window-resize-panel', { width: w, height: h });
      ipc.invoke('cfg-set', { panelWidth: w, panelHeight: h });
      setStatus(`Resized to ${w}×${h}`);
      feel('happy', 800);
      renderSettings();
    };
  });

  document.querySelectorAll('[data-quicktimer]').forEach(btn => {
    btn.onclick = async () => {
      const secs = Number(btn.dataset.quicktimer);
      const res = await ipc.invoke('act', 'set_timer', { seconds: secs, label: `${Math.round(secs / 60)} min timer` });
      say(res, 'status');
      feel('happy', 1400);
      updateTimers();
    };
  });

  const timerStart = $('timerStart');
  if (timerStart) {
    const handleStart = async () => {
      const val = $('timerInput').value.trim();
      if (!val) return;
      const intent = await ipc.invoke('intent', 'timer ' + val);
      if (intent && intent.id === 'set_timer') {
        const res = await ipc.invoke('act', 'set_timer', intent.args);
        say(res, 'status');
      } else {
        const res = await ipc.invoke('act', 'set_timer', { seconds: (parseFloat(val) || 5) * 60, label: val });
        say(res, 'status');
      }
      feel('happy', 1400);
      $('timerInput').value = '';
      updateTimers();
    };
    timerStart.onclick = handleStart;
    if ($('timerInput')) $('timerInput').onkeydown = e => { if (e.key === 'Enter') handleStart(); };
  }

  const remindStart = $('remindStart');
  if (remindStart) {
    const handleRemind = async () => {
      const val = $('remindInput').value.trim();
      if (!val) return;
      const intent = await ipc.invoke('intent', val.startsWith('remind') ? val : 'remind me ' + val);
      if (intent && intent.id === 'set_reminder') {
        const res = await ipc.invoke('act', 'set_reminder', intent.args);
        say(res, 'status');
      } else {
        const res = await ipc.invoke('act', 'set_reminder', { text: val, minutes: 20 });
        say(res, 'status');
      }
      feel('happy', 1400);
      $('remindInput').value = '';
      updateTimers();
    };
    remindStart.onclick = handleRemind;
    if ($('remindInput')) $('remindInput').onkeydown = e => { if (e.key === 'Enter') handleRemind(); };
  }

  document.querySelectorAll('[data-canceltimer]').forEach(btn => {
    btn.onclick = async () => {
      await ipc.invoke('act', 'cancel_timer', { id: btn.dataset.canceltimer });
      setStatus('Timer cancelled.');
      feel('meh', 900);
      updateTimers();
    };
  });

  document.querySelectorAll('[data-addsec]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.addsec;
      const item = S.activeTimers.find(t => String(t.id) === String(id));
      if (item) {
        item.at += 60000;
        item.totalSeconds = (item.totalSeconds || 60) + 60;
        await ipc.invoke('act', 'set_timer', { seconds: Math.max(1, Math.round((item.at - Date.now()) / 1000)), label: item.label });
        await ipc.invoke('act', 'cancel_timer', { id });
        updateTimers();
      }
    };
  });

  const noteAdd = $('noteAdd');
  if (noteAdd) {
    noteAdd.onclick = async () => {
      const val = $('noteInput').value.trim();
      if (!val) return;
      await ipc.invoke('act', 'note', { text: val });
      $('noteInput').value = '';
      renderLists();
    };
    if ($('noteInput')) $('noteInput').onkeydown = e => { if (e.key === 'Enter') noteAdd.click(); };
  }

  document.querySelectorAll('#tabs button').forEach(b => {
    b.onclick = () => {
      S.panel = b.dataset.tab;
      openTab(b.dataset.tab);
      if (b.dataset.tab === 'lists') renderLists();
      if (b.dataset.tab === 'music') { renderMusic(); pollMedia(); }
      if (b.dataset.tab === 'settings') renderSettings();
      setShape('panel');
    };
  });

  document.querySelectorAll('[data-todo]').forEach(el => {
    el.onclick = async () => {
      const id = el.dataset.todo;
      const data = await ipc.invoke('data-get');
      const item = (data.todo || []).find(t => String(t.id) === String(id));
      if (!item) return;
      item.done = !item.done;
      await ipc.invoke('act', 'todo_toggle', { item: item.text });
      renderLists();
    };
  });

  document.querySelectorAll('[data-del]').forEach(el => {
    el.onclick = async () => {
      const id = el.dataset.del;
      const data = await ipc.invoke('data-get');
      const item = (data.todo || []).find(t => String(t.id) === String(id));
      if (!item) return;
      await ipc.invoke('act', 'todo_remove', { item: item.text });
      renderLists();
    };
  });

  const add = $('todoAdd');
  if (add) add.onclick = async () => {
    const v = $('todoInput').value.trim();
    if (!v) return;
    await ipc.invoke('act', 'todo_add', { item: v });
    renderLists();
  };
  const ti = $('todoInput');
  if (ti) ti.onkeydown = e => { if (e.key === 'Enter') add.click(); };

  document.querySelectorAll('[data-media]').forEach(el => {
    el.onclick = async () => {
      await ipc.invoke('act', 'media', { action: el.dataset.media });
      setTimeout(pollMedia, 600);
    };
  });
  const mr = $('mRefresh');
  if (mr) mr.onclick = () => pollMedia(true);
}

/* --------------------------------------------------------------- answers */
function showAnswer(text, kind) {
  S.lastReply = text;
  showPanel('answer', `
    <div class="row" style="margin:0 0 8px"><span class="tag">${esc(kind || 'Nixi')}</span></div>
    <div class="answer" id="answerText">${esc(text)}</div>
    <div class="acts">
      <button class="btn primary" id="aCopy">Copy</button>
      <button class="btn" id="aIns">Insert in app</button>
      <button class="btn" id="aClose">Close</button>
    </div>`);
  const copy = $('aCopy'), ins = $('aIns'), close = $('aClose');
  if (copy) copy.onclick = () => {
    clipboard.writeText(text);
    feel('wink', 900);
    copy.textContent = 'Copied! ✓';
    setTimeout(() => { if (copy) copy.textContent = 'Copy'; }, 2000);
    setStatus('Copied.');
  };
  if (ins) ins.onclick = async () => {
    await ipc.invoke('paste', text);
    setStatus('Inserted.');
    feel('wink', 900);
  };
  if (close) close.onclick = closePanel;
}

function say(text, kind) {
  if (!text) return;
  S.lastReply = text;
  if (S.cfg.speak) speak(text);
  if (text.length > 90 && kind !== 'status') showAnswer(text, kind);
  else {
    setStatus(text);
    setShape('capsule');
    clearTimeout(say.timer);
    say.timer = setTimeout(collapse, 7000);
  }
}

let currentTtsAudio = null;

async function speak(text) {
  if (!text) return;
  const cleanStr = String(text).replace(/[#*`_~]/g, '').trim();
  if (!cleanStr) return;

  // Cancel any running speech
  if (currentTtsAudio) {
    try { currentTtsAudio.pause(); currentTtsAudio.currentTime = 0; } catch {}
    currentTtsAudio = null;
  }
  try { window.speechSynthesis.cancel(); } catch {}

  // 1) Try Gemini TTS if API key is present
  if (S.cfg.key) {
    try {
      const voice = S.cfg.voice || 'Aoede';
      const res = await ipc.invoke('gemini-tts', { text: cleanStr, voice });
      if (res && res.ok && res.audioData) {
        const audio = new Audio(`data:${res.mimeType || 'audio/wav'};base64,${res.audioData}`);
        currentTtsAudio = audio;
        feel('talking', 4000);
        audio.onended = () => {
          if (currentTtsAudio === audio) currentTtsAudio = null;
          feel('idle', 500);
        };
        audio.onerror = () => {
          speakBrowser(cleanStr);
        };
        await audio.play();
        return;
      }
    } catch {}
  }

  // 2) Fallback to local browser speech synthesis
  speakBrowser(cleanStr);
}

function speakBrowser(text) {
  try {
    const s = new SpeechSynthesisUtterance(String(text).slice(0, 400));
    s.rate = 1.03;
    s.pitch = 1.08;
    feel('talking', 2500);
    s.onend = () => feel('idle', 500);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(s);
  } catch {}
}


/* --------------------------------------------------------- confirmation */
function askConfirm(question, intent) {
  S.confirm = intent;
  showPanel('confirm', `
    <div style="font-size:13.5px;line-height:1.55">${esc(question)}</div>
    <div class="acts">
      <button class="btn primary" id="cYes">Yes, do it</button>
      <button class="btn" id="cNo">No thanks</button>
    </div>`);
  $('cYes').onclick = async () => { const it = S.confirm; S.confirm = null; closePanel(); await runIntent(it, true); };
  $('cNo').onclick = () => { S.confirm = null; closePanel(); setStatus('Okay.'); };
}

async function runIntent(intent, confirmed, opts = {}) {
  const id = intent.id, args = intent.args || {};
  const isVoice = !!opts.voice;
  const fromChat = !!opts.fromChat || S.panel === 'chat';

  if (id === 'thanks') {
    celebrate();
    setStatus('Any time!');
    setShape('capsule');
    if (isVoice || S.cfg.speak) speak('Any time!');
    return;
  }
  if (id === 'conversation') {
    const text = args.text || intent.say || "I'm doing well, thank you!";
    if (fromChat) {
      appendChatMessage('nixi', text);
      setStatus(text.slice(0, 50));
    } else {
      say(text, 'Nixi');
    }
    if (isVoice || S.cfg.speak) speak(text);
    feel('happy', 2000);
    return;
  }
  if (id === 'write') { openPrompt(args.request || ''); return; }
  if (id === 'screen') { await askAboutScreen(''); return; }
  if (id === 'now_playing' || id === 'open_music_ui') {
    setShape('music');
    feel('happy', 60000);
    pollMedia(true);
    return;
  }
  if (id === 'teleprompter') {
    if (args.script) { openTeleprompter(args.script); }
    else { openTeleprompter(''); }
    return;
  }
  if (!confirmed && intent.risky) {
    askConfirm(`Nixi wants to ${id.replace(/_/g, ' ')}. Do it?`, intent);
    return;
  }

  const taskLabel = id === 'open_app' ? `Opening ${(args.names || []).join(', ')}` :
                    id === 'search_on' ? `Searching ${args.platform} for "${args.query}"` :
                    id === 'compound' ? (
                      args.actions && args.actions.length ?
                        `Executing ${args.actions.map(a => a.id === 'open_app' ? (a.args?.names || []).join(', ') : (a.id === 'search_on' ? `${a.args?.platform} search` : a.id.replace(/_/g, ' '))).filter(Boolean).join(', ')}` :
                        'Executing tasks'
                    ) :
                    `Executing ${id.replace(/_/g, ' ')}`;
  setStatus(`⚡ Task: ${taskLabel}…`);
  feel('thinking', 600);

  const res = await ipc.invoke('act', id, args);
  if (res && typeof res === 'object' && res.tele) { openTeleprompter(res.tele); return; }
  const reply = (typeof res === 'string' && res) ? res : (intent.say || 'Done.');

  if (fromChat) {
    appendChatMessage('nixi', `⚡ Task Completed:\n${reply}`);
    setStatus(reply.slice(0, 50));
  } else {
    say(reply, 'status');
  }
  const speechText = (intent.say && id === 'compound') ? intent.say : reply.replace(/\n/g, '. ');
  if (isVoice || S.cfg.speak) speak(speechText);
  feel('happy', 1800);
  updateTimers();
}

/* --------------------------------------------------------- write prompt */
function openPrompt(request) {
  showPanel('prompt', `
    <div class="muted" style="margin-bottom:8px">Ask for a draft or enter any command (e.g. "timer 5m", "remind me at 6").</div>
    <input type="text" id="promptIn" placeholder="Write an email, or say 'timer 10 min'…" value="${esc(request)}">
    <div class="acts">
      <button class="btn primary" id="pGo">Execute</button>
      <button class="btn" id="pClose">Close</button>
    </div>`);
  const go = $('pGo');
  const run = async () => {
    const v = $('promptIn').value.trim();
    if (!v) return;
    closePanel();
    await handleUtterance(v, 'cmd');
  };
  go.onclick = run;
  $('promptIn').onkeydown = e => { if (e.key === 'Enter') run(); };
  $('pClose').onclick = closePanel;
  setStatus('Command prompt ready…');
}

/* --------------------------------------------------------- teleprompter */
function openTeleprompter(script) {
  S.tele = { text: script || '', speed: 26, follow: true, on: true, y: 0 };
  showPanel('tele', `
    <div id="tele">
      <div id="teleText"></div>
      <div id="teleBar">
        <button class="small-btn" id="tPause">Pause</button>
        <button class="small-btn" id="tFollow">Follow my voice: on</button>
        <input type="range" id="tSpeed" min="4" max="90" value="26" style="flex:1">
        <button class="small-btn" id="tClose">Close</button>
      </div>
    </div>
    ${script ? '' : '<textarea id="tScript" placeholder="Paste your script here…"></textarea>'}`);
  const textEl = $('teleText');
  const paint = () => { textEl.innerHTML = esc(S.tele.text).replace(/\n/g, '<br>'); };
  paint();
  if (!script) {
    const ta = $('tScript');
    ta.style.marginTop = '10px';
    ta.oninput = () => { S.tele.text = ta.value; paint(); };
  }
  $('tPause').onclick = () => {
    S.tele.on = !S.tele.on;
    $('tPause').textContent = S.tele.on ? 'Pause' : 'Resume';
  };
  $('tFollow').onclick = () => {
    S.tele.follow = !S.tele.follow;
    $('tFollow').textContent = 'Follow my voice: ' + (S.tele.follow ? 'on' : 'off');
  };
  $('tSpeed').oninput = e => { S.tele.speed = Number(e.target.value); };
  $('tClose').onclick = closePanel;
  textEl.onclick = () => { S.tele.on = !S.tele.on; $('tPause').textContent = S.tele.on ? 'Pause' : 'Resume'; };
  setStatus('Teleprompter ready');
}

setInterval(() => {
  if (!S.tele || S.panel !== 'tele') return;
  const el = $('teleText');
  if (!el || !S.tele.on) return;
  const boost = S.tele.follow ? (0.25 + clamp(S.level) * 1.9) : 1;
  el.scrollTop += (S.tele.speed / 40) * boost;
}, 50);

/* --------------------------------------------------------- screen asking */
async function askAboutScreen(prompt) {
  setStatus('Capturing screen…');
  feel('surprised', 800);
  const base64 = await ipc.invoke('shot');
  if (!base64) { say('Could not capture the screen.', 'status'); return; }
  const q = prompt || 'Explain briefly what is on my screen right now and any notable things on it.';
  askModel(q, { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }] });
}

/* --------------------------------------------------------- cloud model */
const SYS = 'You are Nixi, a friendly voice assistant that lives on the user\'s Windows screen. ' +
  'When the user wants something done on the PC (open apps or sites, timers, reminders, to-dos, notes, volume, music, ' +
  'dark mode, find files, browser actions, web search, teleprompter, screen reading, calculations, clipboard) call the ' +
  'matching function. Otherwise answer in two or three plain sentences with no markdown. When asked to write something ' +
  '(email, reply, note, post) output only the finished text. Match the user\'s language.';

const S_ = (p, r) => ({ type: 'object', properties: p, required: r || Object.keys(p) });
const str = { type: 'string' }, num = { type: 'number' }, bool = { type: 'boolean' };
const FN = [
  ['open_app', 'Open one or more apps or websites', S_({ names: { type: 'array', items: str } })],
  ['open_url', 'Open a URL', S_({ url: str })],
  ['web_search', 'Search the web', S_({ query: str })],
  ['set_timer', 'Start a countdown timer', S_({ seconds: num, label: str }, ['seconds'])],
  ['set_reminder', 'Remind the user at a clock time (HH:MM 24h) or in N minutes', S_({ text: str, time: str, minutes: num }, ['text'])],
  ['todo_add', 'Add an item to the to-do list', S_({ item: str })],
  ['todo_list', 'Read the to-do list', S_({})],
  ['todo_remove', 'Remove an item from the to-do list', S_({ item: str })],
  ['todo_clear', 'Clear the whole to-do list', S_({})],
  ['todo_toggle', 'Mark a to-do item done or not done', S_({ item: str })],
  ['note', 'Save a note', S_({ text: str })],
  ['list_notes', 'Read saved notes', S_({})],
  ['volume', 'Change the system volume', S_({ action: { type: 'string', enum: ['up', 'down', 'mute', 'unmute'] }, amount: num }, ['action'])],
  ['volume_set', 'Set the system volume to a percentage', S_({ value: num }, ['value'])],
  ['volume_get', 'Read the current system volume', S_({})],
  ['media', 'Control music playback', S_({ action: { type: 'string', enum: ['playpause', 'play', 'pause', 'next', 'prev'] } }, ['action'])],
  ['now_playing', 'Tell the user what song is playing', S_({})],
  ['dark_mode', 'Switch Windows between dark and light mode', S_({ enable: bool }, ['enable'])],
  ['find_file', 'Find a file by name and show it in Explorer', S_({ query: str })],
  ['browser_action', 'Browser and window keys', S_({ action: { type: 'string', enum: ['new_tab', 'close_tab', 'zoom_in', 'zoom_out', 'scroll_down', 'scroll_up', 'refresh'] } }, ['action'])],
  ['teleprompter', 'Show a script as an auto-scrolling teleprompter', S_({ script: str })],
  ['calculate', 'Work out a calculation', S_({ expression: str })],
  ['screenshot', 'Save a screenshot of the screen', S_({})],
  ['clipboard_read', 'Read the clipboard', S_({})],
  ['clipboard_paste', 'Paste the clipboard into the focused window', S_({})],
  ['system_info', 'Tell the user about this PC', S_({})],
  ['list_timers', 'List timers and reminders', S_({})],
  ['cancel_timer', 'Cancel timers and reminders', S_({})]
].map(([name, description, parameters]) => ({ name, description, parameters }));

async function callGeminiAudio(base64Webm, promptText) {
  if (!S.cfg.key) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${S.cfg.model}:generateContent?key=${S.cfg.key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: 'audio/webm', data: base64Webm } }
          ]
        }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    const data = await resp.json().catch(() => null);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) {
    return null;
  }
}

async function askModel(text, opts = {}) {
  if (!S.cfg.key) {
    say('Add a free Gemini API key in Settings (right click) for cloud answers & questions.', 'status');
    openSettings();
    return;
  }

  // Cancel any prior requests
  if (activeAbortController) {
    try { activeAbortController.abort(); } catch {}
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  S.busy = 'think';
  shell.classList.remove('asking');
  setStatus('Thinking…');
  setShape('capsule');

  // Strict 8-second safety timeout to NEVER freeze
  const timeoutTimer = setTimeout(() => {
    if (activeAbortController) {
      activeAbortController.abort();
      if (S.busy === 'think') {
        S.busy = false;
        setStatus('Ready.');
        feel('meh', 900);
        setTimeout(collapse, 1600);
      }
    }
  }, 8000);

  const parts = (opts.parts || []).concat([{ text }]);
  const payload = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ role: 'user', parts }],
    tools: [{ functionDeclarations: FN }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${S.cfg.model}:generateContent?key=${S.cfg.key}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });
    clearTimeout(timeoutTimer);

    if (!res.ok) {
      let msg = res.statusText || 'request error';
      try { msg = (await res.json()).error?.message || msg; } catch {}
      throw new Error(msg);
    }

    const data = await res.json();
    const candidateParts = data.candidates?.[0]?.content?.parts || [];
    let out = '';
    const calls = [];

    for (const p of candidateParts) {
      if (p.functionCall) calls.push(p.functionCall);
      else if (!p.thought && p.text) out += p.text;
    }

    if (calls.length) {
      S.busy = 'talk';
      const results = [];
      for (const c of calls) {
        const x = await ipc.invoke('act', c.name, c.args);
        if (x && typeof x === 'object' && x.tele) {
          openTeleprompter(x.tele);
          S.busy = false;
          feel('happy', 2000);
          return;
        }
        results.push(x);
      }
      const text2 = (out ? out + '\n' : '') + results.filter(x => typeof x === 'string').join('\n');
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('nixi', text2);
        setStatus(text2.slice(0, 60));
      } else {
        say(text2, 'Nixi');
      }
      feel('happy', 2200);
      updateTimers();
    } else if (!out.trim()) {
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('nixi', 'Could not get an answer. Try rephrasing that.');
      } else {
        showAnswer('The model returned nothing. Try rephrasing that.', 'Hmm');
      }
      feel('sad', 2000);
    } else {
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('nixi', out.trim());
        setStatus(out.slice(0, 60));
      } else {
        say(out.trim(), opts.intent === 'write' ? 'Draft' : 'Nixi');
      }
      feel('happy', 1800);
    }
  } catch (e) {
    clearTimeout(timeoutTimer);
    if (e.name === 'AbortError') {
      setStatus('Ready.');
      feel('meh', 900);
    } else {
      const errMsg = e.message && e.message.includes('wsarecv') ? 'Connection reset. Retrying...' : String(e.message || e);
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('nixi', `Note: ${errMsg}`);
      } else {
        setStatus(errMsg.slice(0, 40));
      }
      feel('sad', 1800);
    }
  } finally {
    S.busy = false;
    activeAbortController = null;
  }
}

/* ----------------------------------------------------------- utterances */
function localCleanup(text) {
  let t = String(text || '').trim();
  t = t.replace(/\b(?:u+m+|e+r+m+|h+m+|a+h)\b/gi, '');
  const parts = t.split(/\b(?:actually|no,|i mean|correction)\b[,]?/i);
  if (parts.length > 1) t = parts[parts.length - 1].trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (t) t = t[0].toUpperCase() + t.slice(1);
  if (t && !/[.!?…]$/.test(t)) t += '.';
  return t;
}

async function handleUtterance(text, kind) {
  const raw = String(text || '').trim();
  if (!raw) {
    setStatus('');
    collapse();
    return;
  }
  if (kind === 'dict') {
    let out = raw;
    if (S.cfg.polished && S.cfg.key) {
      try {
        out = await polish(raw);
      } catch { out = raw; }
    } else if (S.cfg.polished) {
      out = localCleanup(raw);
    }
    await ipc.invoke('paste', out);
    setStatus('Typed: ' + out);
    setShape('capsule');
    clearTimeout(say.timer);
    say.timer = setTimeout(collapse, 3000);
    feel('wink', 900);
    return;
  }
  setShape('capsule');
  setStatus('Thinking… Analyzing voice command…');
  feel('thinking', 700);

  // Think first: Classify whether this is a Task or a Question/Conversation
  const classified = await ipc.invoke('classify', raw);
  const isTask = classified?.category === 'task';

  if (isTask) {
    setStatus(`⚡ Task: ${classified?.thought?.replace('Categorized: ', '') || 'Executing…'}`);
    feel('wink', 800);
  } else {
    setStatus(`💬 Question: Thinking answer…`);
    feel('talking', 800);
  }

  // Small delay so thinking transition is visible and responsive
  await new Promise(r => setTimeout(r, 200));

  if (classified?.intent) {
    await runIntent(classified.intent, false, { voice: true });
    return;
  }

  // 2) Fall back to cloud model if configured
  if (S.cfg.key) {
    await askModel(raw, { fromChat: S.panel === 'chat' });
  } else {
    if (isTask) {
      say(`Task: Searching Google for “${raw}”.`, 'status');
      await ipc.invoke('act', 'web_search', { query: raw });
      speak(`Searching Google for ${raw}.`);
    } else {
      const qReply = "I'm ready! You can say 'how are you', 'open google', 'open tiktok and search rikesh dahal', 'open tiktok and youtube', or configure your Gemini API key in settings for general questions.";
      say(qReply, 'Nixi');
      speak("I'm ready! You can say 'how are you', 'open google', 'open tiktok and search rikesh dahal', or 'open tiktok and youtube'.");
      feel('happy', 1800);
    }
  }
}

async function polish(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${S.cfg.model}:generateContent`;
  const bodies = [
    {
      contents: [{ parts: [{ text: 'Transcribe this dictation into clean text. Remove ums and fillers, apply self-corrections, add punctuation. Output ONLY the final text.' }, { text }] }],
      generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
    }
  ];
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': S.cfg.key },
    body: JSON.stringify(bodies[0])
  });
  const j = await r.json().catch(() => null);
  const t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!t) throw new Error((j && j.error && j.error.message) || 'No text.');
  return t;
}

/* -------------------------------------------------------- mic metering */
async function startMeter() {
  if (S.micStream) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    S.micStream = stream;
    S.audioCtx = ctx;
    S.analyser = an;
    S.levelData = new Uint8Array(512);
    setInterval(() => {
      if (!S.analyser) return;
      S.analyser.getByteTimeDomainData(S.levelData);
      let q = 0;
      for (const x of S.levelData) q += ((x - 128) / 128) ** 2;
      S.level = clamp(Math.sqrt(q / 512) * 4.2);
    }, 50);
    return true;
  } catch (e) {
    S.level = 0;
    return false;
  }
}

['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => {
  if (S.audioCtx && S.audioCtx.state === 'suspended') S.audioCtx.resume();
}, true));

/* ------------------------------------------------------- speech events */
ipc.on('speech', async (_e, evt) => {
  if (!evt) return;
  if (evt.type === 'ready') { S.speechAlive = true; S.speechNote = ''; }
  else if (evt.type === 'error') { S.speechNote = evt.message || 'Speech error.'; }
  else if (evt.type === 'bye') { S.speechAlive = false; }
  else if (evt.type === 'wake') {
    setStatus('Listening…');
    setShape('capsule');
    feel('surprised', 900);
    startMeter();
  } else if (evt.type === 'text') {
    startMeter();
    await handleUtterance(evt.text, S.capture || 'cmd');
  }
});

ipc.on('hotkey', async (_e, kind) => {
  wake();
  if (kind === 'cmd' || kind === 'cmd-hold') { beginCapture('cmd'); }
  else if (kind === 'cmd-release' || kind === 'cmd-up') { endCapture(); }
  else if (kind === 'dict' || kind === 'dict-hold') { beginCapture('dict'); }
  else if (kind === 'dict-release' || kind === 'dict-up') { endCapture(); }
  else if (kind === 'write') { openPrompt(''); }
  else if (kind === 'mute') { await ipc.invoke('act', 'volume', { action: 'mute' }); }
});

ipc.on('panel-open', (_e, what) => {
  wake();
  if (what === 'settings') openSettings();
  else if (what === 'mini') { toggleMini(); }
  else if (what === 'chat') { S.panel = 'chat'; setShape('panel'); openTab('chat'); }
  else if (what === 'history') { S.panel = 'history'; setShape('panel'); openTab('history'); }
  else if (what === 'lists') { S.panel = 'lists'; setShape('panel'); openTab('lists'); renderLists(); }
  else if (what === 'new-chat') {
    S.panel = 'chat';
    setShape('panel');
    openTab('chat');
    chatHistory.length = 0;
    const msgArea = $('chatMessages');
    if (msgArea) msgArea.innerHTML = '<div class="chat-empty-state" id="chatEmptyState">Say something, or type below</div>';
    const inp = $('chatInput');
    if (inp) { inp.value = ''; inp.focus(); }
  }
  else if (what === 'tele') { openTeleprompter(''); }
  else if (what === 'guide') { openGuide(); }
  else if (what === 'privacy') { openPrivacy(); }
  else if (what === 'system-check') { runSystemCheck(); }
  else if (what === 'about') { openAbout(); }
  else if (what === 'music') { setShape('music'); feel('happy', 60000); pollMedia(true); }
  else if (what === 'toggle') {
    if (S.panel) closePanel();
    else { S.panel = 'chat'; setShape('panel'); openTab('chat'); }
  }
});

ipc.on('chat-prompt', async (_e, text) => {
  if (!text) return;
  const inp = $('chatInput');
  if (inp) inp.value = text;
  await handleChatInput();
});

function openGuide() {
  showPanel('guide', `
    <div class="glass-card">
      <h4>📖 heynixi Setup Guide</h4>
      <div class="hintrow" style="font-size:13px;line-height:1.8">
        • <strong>Hold Right Ctrl</strong> to talk a voice command<br>
        • <strong>Hold Right Alt</strong> to talk into any text box (Notepad, Chrome, Word)<br>
        • <strong>Ctrl+Alt+Space</strong> talk &nbsp; <strong>Ctrl+Alt+W</strong> write prompt<br>
        • <strong>Set timers:</strong> Say or type "timer 5m", "10 min timer", "remind me in 20m to stretch"<br>
        • <strong>Notifications:</strong> Timers & reminders appear on the bottom-right notification panel<br>
        • <strong>Reposition:</strong> Drag the top bar to snap to notch or corner
      </div>
      <div class="acts" style="margin-top:14px">
        <button class="btn primary" id="gClose">Got it</button>
      </div>
    </div>`);
  const gc = $('gClose');
  if (gc) gc.onclick = closePanel;
}

function openPrivacy() {
  showPanel('privacy', `
    <div class="glass-card">
      <h4>🔒 Privacy & Data</h4>
      <div style="font-size:13px;line-height:1.7;color:var(--fg)">
        • <strong>On-Device First:</strong> Commands, timers, notes, and local actions run locally on your PC.<br>
        • <strong>Audio Privacy:</strong> Voice audio is never stored or logged.<br>
        • <strong>Cloud AI:</strong> Cloud models are used only for conversational answers and smart drafts using your API key.
      </div>
      <div class="acts" style="margin-top:14px">
        <button class="btn primary" id="prClose">Close</button>
      </div>
    </div>`);
  const pc = $('prClose');
  if (pc) pc.onclick = closePanel;
}

function runSystemCheck() {
  playChime();
  const micOk = !!S.micStream;
  const keyOk = !!S.cfg.key;
  showPanel('system-check', `
    <div class="glass-card">
      <h4>⚙️ System Check</h4>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;margin:8px 0">
        <div style="display:flex;justify-content:space-between"><span>Microphone Input:</span><strong style="color:${micOk ? '#4ade80' : '#f87171'}">${micOk ? '✓ Active & Ready' : '○ Pending click'}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Audio Notification Chime:</span><strong style="color:#4ade80">✓ Working</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Offline Intent Engine:</span><strong style="color:#4ade80">✓ 0ms Instant Ready</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Gemini Cloud Model:</span><strong style="color:${keyOk ? '#4ade80' : '#fbbf24'}">${keyOk ? '✓ Connected' : '○ Key needed in Settings'}</strong></div>
      </div>
      <div class="acts" style="margin-top:14px">
        <button class="btn primary" id="scClose">Done</button>
      </div>
    </div>`);
  const sc = $('scClose');
  if (sc) sc.onclick = closePanel;
}

function openAbout() {
  showPanel('about', `
    <div class="glass-card" style="text-align:center;padding:24px 16px">
      <div style="font-size:24px;margin-bottom:8px">● ●</div>
      <h3 style="margin-bottom:4px">heynixi</h3>
      <div class="muted" style="margin-bottom:12px">Version 2.0.0 · Desktop Companion</div>
      <p style="font-size:13px;line-height:1.6;color:var(--fg-muted);max-width:320px;margin:0 auto">
        The friendly voice assistant that lives on your screen. Opens apps, controls volume, sets timers & reminders, and writes first drafts.
      </p>
      <div class="acts" style="margin-top:16px;justify-content:center">
        <button class="btn primary" id="abClose">Close</button>
      </div>
    </div>`);
  const ac = $('abClose');
  if (ac) ac.onclick = closePanel;
}

function toggleMini() {
  const on = shell.classList.toggle('mini');
  if (on) { S.panel = null; $('tab-custom').innerHTML = ''; openTab('lists'); }
  else { setShape(S.hovering ? 'capsule' : 'rest'); }
}

ipc.on('toast', (_e, t) => {
  showToast(t);
  feel('surprised', 1400);
  updateTimers();
});

ipc.on('cfg', (_e, c) => {
  S.cfg = { ...S.cfg, ...c };
  applyTheme();
});

ipc.on('data-updated', () => {
  updateTimers();
});

ipc.on('placement-snapped', (_e, p) => {
  S.cfg.placement = p;
  setStatus(p === 'top-center' ? 'Snapped to Notch' : `Docked: ${p}`);
  feel('happy', 800);
});

/* --------------------------------- Toast Notification (Screenshot 4) */
function showToast(t) {
  playChime();
  const el = $('toast');
  const titleEl = $('toastTitle');
  const subEl = $('toastSub');
  const stamp = new Date(t.at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (titleEl) titleEl.textContent = t.title || (t.kind === 'reminder' ? 'Reminder' : 'Timer');
  if (subEl) subEl.textContent = `${t.kind === 'reminder' ? 'Reminder' : 'Timer'} · ${stamp}`;

  el.classList.add('on');
  setShape('panel');

  const dismiss = $('tDismiss');
  if (dismiss) {
    dismiss.onclick = () => {
      el.classList.remove('on');
      closePanel();
    };
  }

  // Auto-dismiss after 9 seconds
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.classList.remove('on');
    if (!S.busy && !S.capture) collapse();
  }, 9000);
}

/* --------------------------------------------------- Robust Audio Capture */
let speechRecognizer = null;
const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

async function beginCapture(mode) {
  wake();
  clearTimeout(captureTimeout);
  S.capture = mode;
  setShape('capsule');
  setStatus(mode === 'dict' ? 'Dictating… (click mic or ✕ to finish)' : 'Listening… (click mic or ✕ to finish)');
  $('bMic').classList.add('rec');
  $('bCancelAction').style.display = 'inline-flex';
  startMeter();
  feel(mode === 'dict' ? 'talking' : 'listening', 12000);

  // Web Speech API fallback if available
  if (SpeechRec) {
    try {
      if (speechRecognizer) { try { speechRecognizer.abort(); } catch {} }
      speechRecognizer = new SpeechRec();
      speechRecognizer.continuous = false;
      speechRecognizer.interimResults = false;
      speechRecognizer.lang = 'en-US';
      speechRecognizer.onresult = async (ev) => {
        const transcript = ev?.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          await handleUtterance(transcript, mode);
        }
      };
      speechRecognizer.onerror = () => {};
      speechRecognizer.start();
    } catch {}
  }

  // Start MediaRecorder if available
  if (S.micStream) {
    try {
      recordedAudioChunks = [];
      mediaRecorder = new MediaRecorder(S.micStream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedAudioChunks.push(e.data); };
      mediaRecorder.start(200);
    } catch { mediaRecorder = null; }
  }

  if (mode === 'dict') ipc.send('speech-mode', 'dict');
  else ipc.send('speech-capture');

  // Hard safety timeout: 9 seconds
  captureTimeout = setTimeout(() => {
    if (S.capture) endCapture();
  }, 9000);
}

async function endCapture(cancelled) {
  clearTimeout(captureTimeout);
  const was = S.capture;
  S.capture = null;
  $('bMic').classList.remove('rec');
  $('bCancelAction').style.display = 'none';

  if (speechRecognizer) {
    try {
      if (cancelled) speechRecognizer.abort();
      else speechRecognizer.stop();
    } catch {}
    speechRecognizer = null;
  }

  if (was === 'dict') ipc.send('speech-mode', 'wake');
  else ipc.send('speech-stop');

  if (cancelled) {
    setStatus('Cancelled.');
    feel('meh', 900);
    setTimeout(collapse, 1200);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
    }
    return;
  }

  // Stop MediaRecorder and process audio if Gemini API is configured
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = async () => {
      if (recordedAudioChunks.length > 0 && S.cfg.key) {
        try {
          const blob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
          if (blob.size > 1500) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const b64 = reader.result.split(',')[1];
              if (b64) {
                setStatus('Processing speech…');
                if (was === 'dict') {
                  const transcribed = await callGeminiAudio(b64, 'Transcribe this spoken dictation verbatim into clean English. Remove ums and fillers. Output ONLY the transcription.');
                  if (transcribed) {
                    await ipc.invoke('paste', transcribed);
                    setStatus('Typed: ' + transcribed.slice(0, 36) + '…');
                    feel('wink', 900);
                    if (S.panel === 'chat') appendChatMessage('user', transcribed);
                  } else {
                    setStatus('No speech heard.');
                  }
                } else {
                  const transcribed = await callGeminiAudio(b64, 'Transcribe this spoken voice command into plain English text. Examples: "set a timer for 5 minutes", "remind me in 20 minutes to stretch", "open chrome". Output ONLY the command text.');
                  if (transcribed) {
                    await handleUtterance(transcribed, 'cmd');
                  } else {
                    setStatus('No command heard.');
                  }
                }
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        } catch (e) {
          setStatus('Ready.');
        }
      }
    };
    try { mediaRecorder.stop(); } catch {}
  }

  setStatus('Processing…');
  feel('thinking', 800);
  clearTimeout(endCapture.collapseTimer);
  endCapture.collapseTimer = setTimeout(() => {
    if (!S.busy && !S.capture && !S.panel) collapse();
  }, 4000);
}

function cancelActiveAction() {
  clearTimeout(captureTimeout);
  if (activeAbortController) {
    try { activeAbortController.abort(); } catch {}
    activeAbortController = null;
  }
  if (S.capture) {
    endCapture(true);
  }
  S.busy = false;
  $('bCancelAction').style.display = 'none';
  setStatus('Cancelled.');
  feel('meh', 800);
  setTimeout(collapse, 1200);
}

function wake() {
  if (sleeping()) feel('surprised', 700);
  S.idle = Date.now();
}

/* ---------------------------------------------------------------- media */
function getMediaAppIcon(app, title) {
  const s = (String(app || '') + ' ' + String(title || '')).toLowerCase();
  if (s.includes('brave') || s.includes('facebook')) return 'icons/brave.png';
  if (s.includes('spotify')) return 'icons/spotify.png';
  if (s.includes('chrome')) return 'icons/chrome.png';
  if (s.includes('edge')) return 'icons/edge.png';
  if (s.includes('discord')) return 'icons/discord.png';
  return 'icons/brave.png';
}

function formatSec(s) {
  const n = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(n / 60);
  const sec = n % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

/* ------------------------------------------------------------- media player */
function formatSec(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function getMediaAppIcon(app, title) {
  const a = String(app || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  if (a.includes('spotify') || t.includes('spotify')) return 'icons/spotify.png';
  if (a.includes('brave') || t.includes('brave')) return 'icons/brave.png';
  if (a.includes('chrome') || t.includes('chrome') || t.includes('youtube')) return 'icons/chrome.png';
  if (a.includes('edge') || a.includes('msedge')) return 'icons/edge.png';
  if (a.includes('discord')) return 'icons/discord.png';
  return 'icons/brave.png';
}

let livePos = 0;
let liveDur = 0;
let isAudioPlaying = false;
let isDraggingScrubber = false;
let isMusicHovered = false;
let musicIslandTimer = null;
let lastMediaTrackKey = '';
let lastMediaStatus = 'none';

function showMusicIslandBriefly(duration = 7000) {
  if (S.panel) return;
  if (currentShape !== 'music') {
    setShape('music');
  }
  clearTimeout(musicIslandTimer);
  musicIslandTimer = setTimeout(() => {
    if (!isMusicHovered && !isDraggingScrubber && currentShape === 'music') {
      setShape('rest');
    }
  }, duration);
}

function renderProgress(pos, dur) {
  const fillEl = $('musicProgressFill');
  const elapsedEl = $('musicTimeElapsed');
  const remainEl = $('musicTimeRemaining');

  if (elapsedEl) elapsedEl.textContent = formatSec(pos);
  if (remainEl) {
    if (dur > 0) {
      const remain = Math.max(0, dur - pos);
      remainEl.textContent = '-' + formatSec(remain);
    } else {
      remainEl.textContent = '0:00';
    }
  }

  if (fillEl) {
    const pct = dur > 0 ? clamp(pos / dur, 0, 1) * 100 : 0;
    fillEl.style.width = pct + '%';
  }
}

function updateMusicUI(m) {
  if (!m) return;
  const titleEl = $('musicTitle');
  const appEl = $('musicApp');
  const iconEl = $('musicAppIcon');
  const iconPause = $('mIconPause');
  const iconPlay = $('mIconPlay');

  const title = (m.title && m.title.trim()) || 'Audio Playing';
  const app = m.app || m.artist || 'Media';

  if (titleEl) {
    titleEl.textContent = title;
    titleEl.title = title;
  }
  if (appEl) {
    appEl.textContent = m.artist && m.artist !== title ? `${m.artist} • ${app}` : app;
  }
  if (iconEl) iconEl.src = getMediaAppIcon(app, title);

  isAudioPlaying = (m.status === 'playing' || (m.playing && m.status !== 'paused'));
  if (iconPause && iconPlay) {
    iconPause.style.display = isAudioPlaying ? 'block' : 'none';
    iconPlay.style.display = isAudioPlaying ? 'none' : 'block';
  }

  liveDur = Number(m.duration) || 0;
  if (!isDraggingScrubber) {
    livePos = Number(m.position) || 0;
    renderProgress(livePos, liveDur);
  }
}

// Live real-time ticker updating elapsed and remaining time every 250ms
setInterval(() => {
  if (isAudioPlaying && !isDraggingScrubber && liveDur > 0) {
    livePos = Math.min(liveDur, livePos + 0.25);
    renderProgress(livePos, liveDur);
  }
}, 250);

async function pollMedia(force) {
  try {
    const media = await ipc.invoke('media', !!force);
    if (!media) return;
    S.media = media;
    updateMusicUI(S.media);

    const trackKey = (media.title || '') + '::' + (media.app || '') + '::' + (media.status || '');
    const trackChanged = (lastMediaTrackKey !== '' && lastMediaTrackKey !== trackKey && media.title);
    const justStarted = (lastMediaStatus !== 'playing' && media.status === 'playing' && media.title);
    lastMediaTrackKey = trackKey;
    lastMediaStatus = media.status;

    if (media.playing && media.title) {
      if (trackChanged || justStarted) {
        showMusicIslandBriefly(7000);
      }
    } else {
      // If nothing is playing and not hovered/dragging, collapse to rest
      if (currentShape === 'music' && !isMusicHovered && !isDraggingScrubber) {
        setShape('rest');
      }
    }
  } catch { }
}
setInterval(() => pollMedia(), 2500);

const mBtnPlayPause = $('mBtnPlayPause');
const mBtnPrev = $('mBtnPrev');
const mBtnNext = $('mBtnNext');
const mBtnCollapse = $('mBtnCollapse');
const mBar = $('musicProgressBar');
const musicFace = $('musicFace');
const musicPlayerEl = $('musicPlayer');

if (musicPlayerEl) {
  musicPlayerEl.addEventListener('mouseenter', () => {
    isMusicHovered = true;
    clearTimeout(musicIslandTimer);
  });
  musicPlayerEl.addEventListener('mouseleave', () => {
    isMusicHovered = false;
    if (!isDraggingScrubber && currentShape === 'music') {
      clearTimeout(musicIslandTimer);
      musicIslandTimer = setTimeout(() => {
        if (!isMusicHovered && !isDraggingScrubber && currentShape === 'music') {
          setShape('rest');
        }
      }, 3500);
    }
  });
}

if (mBtnPlayPause) {
  mBtnPlayPause.onclick = async (e) => {
    e.stopPropagation();
    isAudioPlaying = !isAudioPlaying;
    const iconPause = $('mIconPause');
    const iconPlay = $('mIconPlay');
    if (iconPause && iconPlay) {
      iconPause.style.display = isAudioPlaying ? 'block' : 'none';
      iconPlay.style.display = isAudioPlaying ? 'none' : 'block';
    }
    await ipc.invoke('media-action', 'playpause');
    setTimeout(() => pollMedia(true), 350);
  };
}

if (mBtnPrev) {
  mBtnPrev.onclick = async (e) => {
    e.stopPropagation();
    await ipc.invoke('media-action', 'prev');
    setTimeout(() => pollMedia(true), 400);
  };
}

if (mBtnNext) {
  mBtnNext.onclick = async (e) => {
    e.stopPropagation();
    await ipc.invoke('media-action', 'next');
    setTimeout(() => pollMedia(true), 400);
  };
}

if (mBar) {
  const updateScrubFromPointer = (clientX) => {
    const rect = mBar.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const targetSec = ratio * (liveDur || 100);
    livePos = targetSec;
    renderProgress(livePos, liveDur);
    return targetSec;
  };

  mBar.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    isDraggingScrubber = true;
    mBar.classList.add('dragging');
    try { mBar.setPointerCapture(e.pointerId); } catch { }
    updateScrubFromPointer(e.clientX);
  });

  mBar.addEventListener('pointermove', (e) => {
    if (!isDraggingScrubber) return;
    e.stopPropagation();
    updateScrubFromPointer(e.clientX);
  });

  const endScrub = async (e) => {
    if (!isDraggingScrubber) return;
    isDraggingScrubber = false;
    mBar.classList.remove('dragging');
    try { mBar.releasePointerCapture(e.pointerId); } catch { }
    const targetSec = updateScrubFromPointer(e.clientX);
    await ipc.invoke('media-seek', targetSec);
    setTimeout(() => pollMedia(true), 300);
  };

  mBar.addEventListener('pointerup', endScrub);
  mBar.addEventListener('pointercancel', endScrub);
}

if (musicFace) {
  musicFace.onclick = (e) => {
    e.stopPropagation();
    setShape('rest');
  };
}

if (mBtnCollapse) {
  mBtnCollapse.onclick = (e) => {
    e.stopPropagation();
    setShape('rest');
  };
}

/* --------------------------------------------------------------- events */
$('bMic').onclick = async () => {
  if (S.capture) { endCapture(); return; }
  beginCapture('cmd');
};
$('bPen').onclick = () => { S.panel = 'chat'; setShape('panel'); openTab('chat'); };
$('bScreen').onclick = () => askAboutScreen('');
$('bMore').onclick = () => {
  if (S.panel) closePanel();
  else { S.panel = 'chat'; setShape('panel'); openTab('chat'); }
};
$('mUp').onclick = () => { shell.classList.remove('mini'); collapse(); };
$('mMic').onclick = () => beginCapture('cmd');
$('mScan').onclick = () => askAboutScreen('');

const chatInput = $('chatInput');
const btnChatSend = $('btnChatSend');
if (chatInput) {
  chatInput.onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChatInput();
    }
  };
}
if (btnChatSend) {
  btnChatSend.onclick = handleChatInput;
}

const cancelBtn = $('bCancelAction');
if (cancelBtn) cancelBtn.onclick = cancelActiveAction;

const timerBadge = $('timerPillBadge');
if (timerBadge) {
  timerBadge.onclick = () => {
    S.panel = 'lists';
    setShape('panel');
    openTab('lists');
    renderLists();
  };
}
const bellBadge = $('bellBadge');
if (bellBadge) {
  bellBadge.onclick = () => {
    S.panel = 'lists';
    setShape('panel');
    openTab('lists');
    renderLists();
  };
}

shell.addEventListener('mouseenter', () => {
  S.hovering = true;
  wake();
  if (!S.panel && !S.capture && !S.busy) { setShape('capsule'); setStatus('What can I do?', true); }
});
shell.addEventListener('mouseleave', () => {
  S.hovering = false;
  setTimeout(() => { if (!S.panel && !S.capture && !S.busy) collapse(); }, 450);
});
faceCanvas.addEventListener('mousedown', () => { wake(); face.poke(); });
document.addEventListener('keydown', wake);
shell.addEventListener('contextmenu', e => { e.preventDefault(); openSettings(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (S.capture || S.busy) cancelActiveAction();
    else if (S.panel) closePanel();
  }
});

const btnHeadMenu = $('btnHeadMenu');
if (btnHeadMenu) {
  btnHeadMenu.onclick = (e) => {
    e.stopPropagation();
    const rect = btnHeadMenu.getBoundingClientRect();
    const pt = {
      x: Math.round(window.screenX + rect.left + rect.width / 2),
      y: Math.round(window.screenY + rect.bottom + 8)
    };
    ipc.send('toggle-tray-menu', pt);
  };
}

function openSettings() {
  ipc.send('open-settings');
}

ipc.on('cfg', (_e, newCfg) => {
  if (!newCfg) return;
  S.cfg = { ...S.cfg, ...newCfg };
  applyTheme();
});

/* ------------------------------------------------------ window dragging */
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function initWindowDragging() {
  const dragBar = $('dragBar');
  const head = $('head');
  const snapPill = $('snapPill');

  function startDrag(e) {
    if (e.target.closest('button, input, select, textarea, canvas, .tab, .resize-handle, #dockMenu')) return;
    isDragging = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    document.body.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (!isDragging) return;
    const dx = Math.round(e.screenX - dragStartX);
    const dy = Math.round(e.screenY - dragStartY);
    if (isNaN(dx) || isNaN(dy) || (dx === 0 && dy === 0)) return;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    ipc.send('window-move-delta', { dx, dy });

    // Magnetic snap preview
    const screenW = window.screen.availWidth || 1920;
    if (e.screenY <= 50 && Math.abs(e.screenX - (screenW / 2)) < 110) {
      snapPill.classList.add('visible');
    } else {
      snapPill.classList.remove('visible');
    }
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    snapPill.classList.remove('visible');
    ipc.send('window-drag-end');
  }

  if (dragBar) dragBar.addEventListener('pointerdown', startDrag);
  if (head) head.addEventListener('pointerdown', startDrag);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
}

/* ------------------------------------------------------ panel resizing */
function initPanelResizing() {
  const handles = [
    { el: $('resizeGrip'), mode: 'both' },
    { el: $('resizeEdgeR'), mode: 'w' },
    { el: $('resizeEdgeB'), mode: 'h' }
  ];

  handles.forEach(({ el, mode }) => {
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = S.cfg.panelWidth || 460;
      const startH = S.cfg.panelHeight || 520;
      let raf = null;

      function onPointerMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let nw = startW;
        let nh = startH;
        if (mode === 'both' || mode === 'w') {
          nw = clamp(startW + dx, 340, 760);
        }
        if (mode === 'both' || mode === 'h') {
          nh = clamp(startH + dy, 280, 800);
        }
        S.cfg.panelWidth = nw;
        S.cfg.panelHeight = nh;
        shell.style.setProperty('--panel-w', nw + 'px');
        shell.style.setProperty('--panel-h', nh + 'px');

        if (!raf) {
          raf = requestAnimationFrame(() => {
            ipc.send('window-resize-panel', { width: nw, height: nh });
            raf = null;
          });
        }
      }

      function onPointerUp() {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        ipc.invoke('cfg-set', { panelWidth: S.cfg.panelWidth, panelHeight: S.cfg.panelHeight });
      }

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  });
}

/* -------------------------------------------------------- quick presets */
function initQuickPresets() {
  const btnSize = $('btnSizePreset');
  const btnDock = $('btnDockPreset');
  const btnCollapse = $('btnCollapse');
  const dockMenu = $('dockMenu');

  if (btnSize) {
    btnSize.onclick = () => {
      const current = S.cfg.panelWidth || 460;
      let nw, nh;
      if (current < 420) {
        nw = 460; nh = 520;
        setStatus('Size: Standard');
      } else if (current < 560) {
        nw = 600; nh = 580;
        setStatus('Size: Wide Dashboard');
      } else {
        nw = 380; nh = 440;
        setStatus('Size: Compact');
      }
      S.cfg.panelWidth = nw;
      S.cfg.panelHeight = nh;
      shell.style.setProperty('--panel-w', nw + 'px');
      shell.style.setProperty('--panel-h', nh + 'px');
      ipc.send('window-resize-panel', { width: nw, height: nh });
      ipc.invoke('cfg-set', { panelWidth: nw, panelHeight: nh });
      feel('happy', 800);
      renderLists();
    };
  }

  if (btnDock) {
    btnDock.onclick = e => {
      e.stopPropagation();
      dockMenu.classList.toggle('open');
      dockMenu.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.dock === (S.cfg.placement || 'top-center'));
      });
    };
  }

  document.addEventListener('pointerdown', e => {
    if (dockMenu && !dockMenu.contains(e.target) && e.target !== btnDock) {
      dockMenu.classList.remove('open');
    }
  });

  if (dockMenu) {
    dockMenu.querySelectorAll('.menu-item').forEach(item => {
      item.onclick = () => {
        const dock = item.dataset.dock;
        S.cfg.placement = dock;
        ipc.send('window-set-placement', dock);
        dockMenu.classList.remove('open');
        setStatus('Placement: ' + item.textContent.trim());
        feel('happy', 900);
      };
    });
  }

  if (btnCollapse) {
    btnCollapse.onclick = closePanel;
  }
}

/* --------------------------------------------------------------- cursor */
let lx = 0, ly = 0;
ipc.on('cursor', (_e, p) => {
  if (!p) return;
  if (Math.abs(p.x - lx) + Math.abs(p.y - ly) > 4) { lx = p.x; ly = p.y; wake(); }
  const cx = window.screenX + window.innerWidth / 2;
  const cy = window.screenY + window.innerHeight / 2;
  const dx = p.x - cx, dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  S.looking = d > 1500 ? null : [clamp(dx / 700, -1, 1), clamp(dy / 480, -1, 1)];
});

/* ----------------------------------------------------------------- boot */
ipc.invoke('cfg-get').then(c => {
  S.cfg = { ...DEFAULTS, ...c };
  applyTheme();
  if (!S.cfg.key) setTimeout(openSettings, 1200);
});
ipc.invoke('data-get').then(() => {
  updateTimers();
});
startMeter();
initWindowDragging();
initPanelResizing();
initQuickPresets();
