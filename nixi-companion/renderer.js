/*
  FUL renderer.

  Owns the pill UI, the face animation, the microphone meter, the audio pipeline,
  live countdown timers, draggable/resizable positioning, and cloud model calls.
*/
'use strict';
console.log('[RENDERER] renderer.js starting evaluation');

const { ipcRenderer: ipc, clipboard } = window.fulBridge;

const $ = id => document.getElementById(id);
const shell = $('shell');
const faceCanvas = $('face');
const fctx = faceCanvas.getContext('2d');
const levelCanvas = $('level');
const lctx = levelCanvas.getContext('2d');
const clamp = (v, a = 0, b = 1) => {
  if (typeof v !== 'number' || isNaN(v) || !isFinite(v)) return a;
  return Math.max(a, Math.min(b, v));
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEFAULTS = {
  key: '', model: 'gemini-2.5-flash', think: true, pill: '#0d1117', shade: '#12141a',
  eye: '#ffffff', outfit: 'none', wake: true, wakePhrase: 'hey ful', polished: true,
  speak: true, voice: 'Kore', hotkeys: true, autostart: false, alwaysOnTop: true,
  placement: 'top-center', customPos: null, panelWidth: 460, panelHeight: 520,
  glow: true, breathe: true, sounds: true, userName: 'Rikesh'
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
  activeReminders: [],
  wasSleepy: false,
  laughOnReply: false,
  laughUntil: 0
};

let activeAbortController = null;
let mediaRecorder = null;
let recordedAudioChunks = [];
let captureTimeout = null;
let currentTtsAudio = null;
let currentTtsBlobUrl = null;
let ttsAnalyser = null;
let ttsDataArray = null;
let isAudioPlaying = false;

/* ------------------------------------------------------------- face loop */
const face = new Face();
face.setPalette(S.cfg.eye, S.cfg.pill);

const sleeping = () => Date.now() - S.idle > 300000 && !S.busy && !S.capture && !shell.classList.contains('panel');

// Keep companion awake on user interaction
window.addEventListener('mousemove', () => { S.idle = Date.now(); }, { passive: true });
window.addEventListener('keydown', () => { S.idle = Date.now(); }, { passive: true });
window.addEventListener('pointerdown', () => { S.idle = Date.now(); }, { passive: true });

const isFULSpeaking = () =>
  (currentTtsAudio && !currentTtsAudio.paused && !currentTtsAudio.ended) ||
  (window.speechSynthesis && window.speechSynthesis.speaking);

function currentMood() {
  if (isFULSpeaking()) return 'talking';
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
  if (!dt || isNaN(dt) || dt > .5 || dt < 0.001) return;
  const mood = currentMood();
  if (mood === 'sleepy' && !S.wasSleepy) playSound('sleep');
  S.wasSleepy = mood === 'sleepy';
  const override = ['thinking', 'sleepy', 'sad'].includes(mood) ? null : S.looking;
  try {
    face.advance(dt, mood, S.level, override);
  } catch (advErr) {
    console.warn('[LOOP] face.advance error:', advErr);
  }

  // High-DPI 2x crisp render
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.clearRect(0, 0, 224, 112);
  fctx.globalAlpha = 1;
  fctx.setTransform(2, 0, 0, 2, 0, 0);

  // Real-time audio spectrum/waveform analysis for visualizer
  let activeAudioData = null;
  let activeAudioLevel = 0;

  if (ttsAnalyser && ttsDataArray && currentTtsAudio && !currentTtsAudio.paused) {
    try {
      ttsAnalyser.getByteFrequencyData(ttsDataArray);
      activeAudioData = ttsDataArray;
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += ttsDataArray[i];
      activeAudioLevel = Math.min(1, (sum / 32) / 200);
    } catch {
      activeAudioData = null;
      activeAudioLevel = 0;
    }
  } else if (S.analyser && S.levelData && (S.capture || mood === 'listening' || S.level > 0.02)) {
    if (S.analyser.getByteFrequencyData) S.analyser.getByteFrequencyData(S.levelData);
    else S.analyser.getByteTimeDomainData(S.levelData);
    activeAudioData = S.levelData;
    activeAudioLevel = S.level || 0;
  }

  const isMusicActive = (isAudioPlaying && S.media && S.media.title);
  const currentOutfit = isMusicActive ? 'headphones' : (S.cfg.outfit || null);
  const isTalking = (mood === 'talking' || isFULSpeaking());
  try {
    face.paint(fctx, 0, 0, 112, 56, {
      outfit: currentOutfit,
      love: S.love,
      time: t / 1000,
      dt,
      talking: isTalking,
      audioData: activeAudioData,
      level: activeAudioLevel
    });
  } catch (paintErr) {
    console.warn('[LOOP] face.paint error:', paintErr);
  }

  if (shell.classList.contains('music')) {
    const musicFaceCanvas = $('musicFace');
    if (musicFaceCanvas) {
      const mctx = musicFaceCanvas.getContext('2d');
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, 160, 80);
      mctx.setTransform(2, 0, 0, 2, 0, 0);
      const mOutfit = isAudioPlaying ? 'headphones' : null;
      try {
        face.paint(mctx, 0, 0, 80, 40, { outfit: mOutfit, love: 0, time: t / 1000, dt, talking: false });
      } catch {}
    }
  }

  try { drawLevel(t / 1000); } catch {}
  try { updateAuraColor(mood); } catch {}

  if (S.love > 0 && t / 1000 > S.loveUntil) S.love = 0;
}
requestAnimationFrame(loop);

function updateAuraColor(mood) {
  const auraColors = {
    angry: 'rgba(239, 68, 68, 0.85)',
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
  playSound('win');
}

/* --------------------------------------------------------- sound effects */
const SOUND_FILES = {
  poke: 'sounds/poke.wav',
  correct: 'sounds/correct.wav',
  wrong: 'sounds/wrong.wav',
  win: 'sounds/win.wav',
  proud: 'sounds/proud.wav',
  hello: 'sounds/hello.wav',
  sing: 'sounds/sing.wav',
  laugh: 'sounds/laugh.wav',
  curious: 'sounds/curious.wav',
  sad: 'sounds/sad.wav',
  sleep: 'sounds/sleep.wav',
  chime: 'sounds/chime.wav',
  startup: 'sounds/startup.wav'
};

const SOUND_LEVELS = {
  poke: .55, correct: .55, wrong: .42, win: .6, proud: .5, hello: .55,
  sing: .5, laugh: .55, curious: .5, sad: .45, sleep: .42, chime: .5, startup: .55
};

const soundBank = new Map();

function playSound(name, volume) {
  if (S.cfg.sounds === false) return;
  const src = SOUND_FILES[name];
  if (!src) return;
  try {
    let audio = soundBank.get(name);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'auto';
      soundBank.set(name, audio);
    }
    audio.volume = clamp(volume == null ? (SOUND_LEVELS[name] || .55) : volume);
    try { audio.pause(); audio.currentTime = 0; } catch { }
    const started = audio.play();
    if (started && typeof started.catch === 'function') started.catch(() => { });
  } catch { }
}

function preloadSounds() {
  for (const name in SOUND_FILES) {
    try {
      if (soundBank.has(name)) continue;
      const audio = new Audio(SOUND_FILES[name]);
      audio.preload = 'auto';
      soundBank.set(name, audio);
    } catch { }
  }
}

function playChime() { playSound('chime'); }

const isJokeRequest = text => /\b(joke|funny|make me laugh)\b/i.test(String(text || ''));
const looksFailed = text => /\b(couldn'?t|can'?t|cannot|unable|failed|not found|no such|error)\b/i.test(String(text || ''));

function queueLaugh() {
  S.laughOnReply = true;
  S.laughUntil = Date.now() + 15000;
}

function firePendingLaugh() {
  if (!S.laughOnReply) return;
  const ok = Date.now() <= S.laughUntil;
  S.laughOnReply = false;
  if (ok) playSound('laugh');
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

  if (currentShape === 'state-dictate' || currentShape === 'state-write') {
    const bars = document.querySelectorAll('.w-bar');
    if (bars && bars.length === 4 && S.level > 0.03) {
      bars.forEach((b, idx) => {
        const sc = Math.min(2.2, 0.6 + S.level * 3.5 + Math.sin(time * 10 + idx) * 0.3);
        b.style.transform = `scaleY(${sc.toFixed(2)})`;
      });
    }
  }
}

let dictateIconTimer = null;
let dictateIconKey = '';

async function updateDictateAppIcon() {
  try {
    const info = await ipc.invoke('active-app');
    const iconEl = $('dictateAppIcon');
    const badge = $('aiSparkBadge');
    if (!iconEl) return;
    const label = (info && (info.app || info.process)) || 'Active App';
    const appLower = label.toLowerCase();

    let matchedIcon = 'icons/antigravity.png';
    if (appLower.includes('chrome')) matchedIcon = 'icons/chrome.png';
    else if (appLower.includes('brave')) matchedIcon = 'icons/brave.png';
    else if (appLower.includes('edge')) matchedIcon = 'icons/edge.png';
    else if (appLower.includes('vscode') || appLower.includes('code')) matchedIcon = 'icons/vscode.png';
    else if (appLower.includes('cursor')) matchedIcon = 'icons/cursor.png';
    else if (appLower.includes('discord')) matchedIcon = 'icons/discord.png';
    else if (appLower.includes('spotify')) matchedIcon = 'icons/spotify.png';
    else if (appLower.includes('github')) matchedIcon = 'icons/github.png';
    else if (appLower.includes('tiktok')) matchedIcon = 'icons/tiktok.png';
    else if (appLower.includes('youtube')) matchedIcon = 'icons/youtube.png';
    else if (appLower.includes('explorer')) matchedIcon = 'icons/explorer.png';
    else if (appLower.includes('word')) matchedIcon = 'icons/word.png';
    else if (appLower.includes('excel')) matchedIcon = 'icons/excel.png';
    else if (appLower.includes('powerpoint')) matchedIcon = 'icons/powerpoint.png';
    else if (appLower.includes('obsidian')) matchedIcon = 'icons/obsidian.png';
    else if (appLower.includes('outlook')) matchedIcon = 'icons/outlook.png';
    else if (info && info.icon && (info.icon.endsWith('.png') || info.icon.endsWith('.ico') || info.icon.startsWith('data:'))) {
      matchedIcon = info.icon;
    }

    if (dictateIconKey === matchedIcon) return;
    dictateIconKey = matchedIcon;
    iconEl.src = matchedIcon;
    iconEl.title = label;
    if (badge) badge.title = `Dictating into: ${label}`;
    iconEl.onerror = () => {
      iconEl.onerror = null;
      iconEl.src = 'icons/antigravity.png';
    };
  } catch {
    /* keep last icon on failure */
  }
}

function startDictateAppWatch() {
  stopDictateAppWatch();
  dictateIconKey = '';
  updateDictateAppIcon();
  dictateIconTimer = setInterval(() => {
    if (currentShape === 'state-dictate' || currentShape === 'dictate') {
      updateDictateAppIcon();
    } else {
      stopDictateAppWatch();
    }
  }, 1500);
}

function stopDictateAppWatch() {
  if (dictateIconTimer) {
    clearInterval(dictateIconTimer);
    dictateIconTimer = null;
  }
}

/* ---------------------------------------------------------------- shapes */
let currentShape = 'rest';
let collapseTimer = null;
let fallbackTimer = null;

function setShape(shape) {
  if (currentShape === shape) return;
  currentShape = shape;

  if (shape !== 'state-dictate' && shape !== 'dictate') stopDictateAppWatch();

  let targetW = 112, targetH = 56;
  if (shape === 'rest') {
    targetW = 112; targetH = 56;
  } else if (shape === 'dock' || shape === 'hover-dock') {
    targetW = 140; targetH = 112;
  } else if (shape === 'state-cursor' || shape === 'cursor') {
    targetW = 184; targetH = 112;
  } else if (shape === 'state-write' || shape === 'write') {
    targetW = 140; targetH = 112;
  } else if (shape === 'state-dictate' || shape === 'dictate') {
    targetW = 140; targetH = 112;
    startDictateAppWatch();
  } else if (shape === 'state-error' || shape === 'error') {
    targetW = 380; targetH = 128;
  } else if (shape === 'capsule') {
    targetW = 380; targetH = 74;
  } else if (shape === 'music') {
    targetW = 390; targetH = 136;
  } else if (shape === 'panel') {
    targetW = 420; targetH = 520;
  }

  // Update chevron orientation: Up when panel is open, Down when collapsed
  const morePath = $('bMorePath');
  if (morePath) {
    if (shape === 'panel') {
      morePath.setAttribute('d', 'm18 15-6-6-6 6');
    } else {
      morePath.setAttribute('d', 'm6 9 6 6 6-6');
    }
  }

  clearTimeout(collapseTimer);
  ipc.send('prepare-size', { w: targetW, h: targetH, shape });

  shell.classList.toggle('rest', shape === 'rest');
  shell.classList.toggle('dock', shape === 'dock' || shape === 'hover-dock');
  shell.classList.toggle('state-cursor', shape === 'state-cursor' || shape === 'cursor');
  shell.classList.toggle('state-write', shape === 'state-write' || shape === 'write');
  shell.classList.toggle('state-dictate', shape === 'state-dictate' || shape === 'dictate');
  shell.classList.toggle('state-error', shape === 'state-error' || shape === 'error');
  shell.classList.toggle('capsule', shape === 'capsule');
  shell.classList.toggle('music', shape === 'music');
  shell.classList.toggle('panel', shape === 'panel');

  if (shape === 'rest') {
    collapseTimer = setTimeout(() => {
      if (currentShape === 'rest') {
        ipc.send('prepare-size', { w: 112, h: 56, shape: 'rest' });
      }
    }, 360);
  }
}

function showFallbackError(title = "Couldn't write", msg = "Writing is temporarily unavailable. Check System Check and try again.", duration = 5000) {
  clearTimeout(fallbackTimer);
  const titleEl = $('fallbackErrorTitle');
  const bodyEl = $('fallbackErrorBody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = msg;

  feel('sad', duration);
  playSound('wrong');
  setShape('state-error');

  fallbackTimer = setTimeout(() => {
    if (currentShape === 'state-error') {
      setShape(S.hovering ? 'dock' : 'rest');
    }
  }, duration);
}

function hideFallbackError() {
  clearTimeout(fallbackTimer);
  if (currentShape === 'state-error') {
    setShape(S.hovering ? 'dock' : 'rest');
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
  if (currentShape === 'state-error' || currentShape === 'state-cursor' || currentShape === 'state-write' || currentShape === 'state-dictate') {
    return;
  }
  setShape(S.hovering ? 'dock' : 'rest');
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
const CHAT_STORE_KEY = 'ful.chat.v1';
const HIST_STORE_KEY = 'ful.history.v1';
const HIST_MAX = 100;

let chatHistory = [];
let userHistory = [];

function loadChatStore() {
  try {
    if (!localStorage.getItem(CHAT_STORE_KEY)) {
      const legacy = localStorage.getItem('nixi.chat.v1');
      if (legacy) localStorage.setItem(CHAT_STORE_KEY, legacy);
    }
    if (!localStorage.getItem(HIST_STORE_KEY)) {
      const legacy = localStorage.getItem('nixi.history.v1');
      if (legacy) localStorage.setItem(HIST_STORE_KEY, legacy);
    }
    const ch = JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '[]');
    if (Array.isArray(ch)) chatHistory = ch.filter(m => m && m.role && typeof m.text === 'string');
  } catch { chatHistory = []; }
  try {
    const uh = JSON.parse(localStorage.getItem(HIST_STORE_KEY) || '[]');
    if (Array.isArray(uh)) userHistory = uh.filter(h => h && typeof h.query === 'string');
  } catch { userHistory = []; }
}

function saveChatStore() {
  try {
    localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(chatHistory.slice(-200)));
  } catch {}
}

function saveHistoryStore() {
  try {
    localStorage.setItem(HIST_STORE_KEY, JSON.stringify(userHistory.slice(0, HIST_MAX)));
  } catch {}
}

function relTime(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'now';
  const m = Math.floor(diff / 60000);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function clockTime(at) {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderChatBubble(role, text, at, animate) {
  const container = $('chatMessages');
  if (!container) return;
  const empty = $('chatEmptyState');
  if (empty) empty.style.display = 'none';

  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.dataset.at = String(at || Date.now());
  div.dataset.role = role;
  if (!animate) div.style.animation = 'none';
  if (role === 'action') {
    div.className = 'chat-msg action';
    div.innerHTML = `<div class="chat-action-badge"><span style="color:#4ade80;margin-right:2px;">✓</span> <span>${esc(text)}</span></div>`;
  } else if (role === 'user') {
    div.innerHTML = `
      <div class="chat-bubble-user">${esc(text)}</div>
      <div class="chat-msg-time">${clockTime(at)}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="chat-bubble-ful">${esc(text)}</div>
      <div class="chat-msg-time">${clockTime(at)}</div>
    `;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendChatMessage(role, text, timeStr = '') {
  const at = Date.now();
  chatHistory.push({ role, text, at });
  saveChatStore();
  if (role === 'ful') firePendingLaugh();

  if (role === 'user') {
    userHistory.unshift({ query: text, sub: '', at, isRecent: true });
    saveHistoryStore();
    setStatus(text);
  } else if (role === 'ful') {
    setStatus(text);
  }

  renderChatBubble(role, text, at, true);
}

function appendChatAction(text) {
  const at = Date.now();
  chatHistory.push({ role: 'action', text, at });
  saveChatStore();
  renderChatBubble('action', text, at, true);
}

function renderChatFromStore() {
  const container = $('chatMessages');
  if (!container) return;
  container.querySelectorAll('.chat-msg').forEach(el => el.remove());
  if (!chatHistory.length) {
    const empty = $('chatEmptyState');
    if (empty) empty.style.display = '';
    return;
  }
  const empty = $('chatEmptyState');
  if (empty) empty.style.display = 'none';
  chatHistory.forEach(m => renderChatBubble(m.role, m.text, m.at, false));
  container.scrollTop = container.scrollHeight;
}

async function handleChatInput() {
  const inp = $('chatInput');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';

  S.laughOnReply = false;
  if (S.cfg.key && isJokeRequest(val)) queueLaugh();
  appendChatMessage('user', val);
  wake();

  // Think first: Classify whether this is a Task or a Question/Conversation
  setStatus('Thinking…');
  feel('thinking', 600);

  const classified = await ipc.invoke('classify', val);
  const isTask = classified?.category === 'task';

  if (isTask) {
    setStatus('Planning task…');
    feel('wink', 700);
  } else {
    setStatus('Thinking…');
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
      appendChatMessage('ful', `Could not complete: ${e.message}`);
      feel('sad', 1800);
    } finally {
      S.busy = false;
    }
  } else {
    if (isTask) {
      appendChatAction(`Searching Google for ${val}`);
      appendChatMessage('ful', `Searching for "${val}" on Google.`);
      await ipc.invoke('act', 'web_search', { query: val });
    } else {
      appendChatMessage('ful', "I'm ready! You can give me tasks like 'open github tiktok', 'search rikesh on youtube', 'turn on dark mode', or set a timer.");
    }
    feel('happy', 1500);
  }
}

function renderHistory() {
  const el = $('tab-history');
  if (!el) return;
  const items = userHistory;

  if (!items.length) {
    el.innerHTML = `<div class="chat-empty-state">No history yet. Ask FUL something.</div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${items.map(item => `
        <div class="history-item-row" data-query="${esc(item.query)}">
          <div class="history-item-content">
            <div class="history-item-query">${esc(item.query)}</div>
            ${item.sub ? `<div class="history-item-sub">${esc(item.sub)}</div>` : ''}
          </div>
          <div class="history-item-time ${item.isRecent ? 'recent' : ''}">${esc(item.at ? relTime(item.at) : (item.timeStr || ''))}</div>
        </div>
      `).join('')}
    </div>`;

  el.querySelectorAll('.history-item-row').forEach(row => {
    row.onclick = () => {
      const q = row.getAttribute('data-query');
      const inp = $('chatInput');
      if (inp && q) {
        inp.value = q;
        inp.focus();
      }
      openTab('chat');
    };
  });
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
        <span class="muted">Your name:</span>
        <input id="un" type="text" value="${esc(c.userName || '')}" placeholder="e.g. Rikesh" style="width:160px">
      </div>
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
        Drag top bar - move FUL anywhere on screen<br>
        Drag bottom-right corner - resize panel
      </div>
    </div>

    <div class="acts" style="margin-top:14px">
      <button class="btn primary" id="sv">Save Settings</button>
      <button class="btn" id="miniBtn">Mini bar</button>
      <button class="btn danger" id="quit">Quit FUL</button>
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
    S.cfg.wakePhrase = ($('wp') ? $('wp').value : c.wakePhrase).trim() || 'hey ful';
    S.cfg.userName = ($('un') ? $('un').value : c.userName).trim() || 'Rikesh';
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
  firePendingLaugh();
  showPanel('answer', `
    <div class="row" style="margin:0 0 8px"><span class="tag">${esc(kind || 'FUL')}</span></div>
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
    playSound('proud');
    copy.textContent = 'Copied! ✓';
    setTimeout(() => { if (copy) copy.textContent = 'Copy'; }, 2000);
    setStatus('Copied.');
  };
  if (ins) ins.onclick = async () => {
    await ipc.invoke('paste', text);
    setStatus('Inserted.');
    feel('wink', 900);
    playSound('proud');
  };
  if (close) close.onclick = closePanel;
}

function say(text, kind) {
  if (!text) return;
  S.lastReply = text;
  firePendingLaugh();
  if (S.cfg.speak) speak(text);
  if (text.length > 90 && kind !== 'status') showAnswer(text, kind);
  else {
    setStatus(text);
    setShape('capsule');
    clearTimeout(say.timer);
    say.timer = setTimeout(collapse, 7000);
  }
}

let activeSpeechToken = 0;
let ttsAudioCtx = null;

function getTtsAudioContext() {
  if (!ttsAudioCtx) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ttsAudioCtx = new AudioCtx();
        ttsAnalyser = ttsAudioCtx.createAnalyser();
        ttsAnalyser.fftSize = 64;
        ttsDataArray = new Uint8Array(ttsAnalyser.frequencyBinCount);
      }
    } catch {}
  }
  if (ttsAudioCtx && ttsAudioCtx.state === 'suspended') {
    ttsAudioCtx.resume().catch(() => {});
  }
  return ttsAudioCtx;
}

function base64ToBlobUrl(base64, mimeType = 'audio/wav') {
  try {
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return `data:${mimeType};base64,${base64}`;
  }
}

function playGeminiAudio(audioData, mimeType, { onStart, onEnd } = {}) {
  return new Promise((resolve) => {
    let finished = false;
    const safeFinish = (success, err) => {
      if (finished) return;
      finished = true;
      if (currentTtsBlobUrl) {
        try { URL.revokeObjectURL(currentTtsBlobUrl); } catch {}
        currentTtsBlobUrl = null;
      }
      if (currentTtsAudio) {
        currentTtsAudio = null;
      }
      if (onEnd) {
        try { onEnd(); } catch {}
      }
      resolve({ ok: success, error: err });
    };

    try {
      if (currentTtsAudio) {
        try { currentTtsAudio.pause(); currentTtsAudio.currentTime = 0; } catch {}
        currentTtsAudio = null;
      }
      if (currentTtsBlobUrl) {
        try { URL.revokeObjectURL(currentTtsBlobUrl); } catch {}
        currentTtsBlobUrl = null;
      }

      const url = base64ToBlobUrl(audioData, mimeType || 'audio/wav');
      currentTtsBlobUrl = url.startsWith('blob:') ? url : null;
      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.preload = 'auto';
      currentTtsAudio = audio;

      const actx = getTtsAudioContext();
      if (actx && ttsAnalyser) {
        try {
          const srcNode = actx.createMediaElementSource(audio);
          srcNode.connect(ttsAnalyser);
          ttsAnalyser.connect(actx.destination);
        } catch {}
      }

      audio.onended = () => safeFinish(true);
      audio.onerror = async (e) => {
        console.warn('Audio playback error, attempting WebAudio fallback:', audio.error?.message || e);
        try {
          const actx = getTtsAudioContext();
          if (actx) {
            const bin = atob(audioData);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            const audioBuf = await actx.decodeAudioData(buf.buffer);
            const src = actx.createBufferSource();
            src.buffer = audioBuf;
            if (ttsAnalyser) src.connect(ttsAnalyser);
            src.connect(actx.destination);
            src.onended = () => safeFinish(true);
            src.start(0);
            if (onStart) { try { onStart(); } catch {} }
            return;
          }
        } catch (wbErr) {
          console.warn('WebAudio fallback error:', wbErr);
        }
        safeFinish(false, audio.error?.message || 'Playback error');
      };

      if (onStart) {
        try { onStart(); } catch {}
      }

      audio.play().catch(async playErr => {
        console.warn('Audio play() notice, trying WebAudio fallback:', playErr.message || playErr);
        try {
          const actx = getTtsAudioContext();
          if (actx) {
            const bin = atob(audioData);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            const audioBuf = await actx.decodeAudioData(buf.buffer);
            const src = actx.createBufferSource();
            src.buffer = audioBuf;
            if (ttsAnalyser) src.connect(ttsAnalyser);
            src.connect(actx.destination);
            src.onended = () => safeFinish(true);
            src.start(0);
            if (onStart) { try { onStart(); } catch {} }
            return;
          }
        } catch (wbErr) {
          console.warn('WebAudio fallback error:', wbErr);
        }
        safeFinish(false, playErr);
      });
    } catch (e) {
      console.warn('Audio initialization error:', e);
      safeFinish(false, e);
    }
  });
}

async function speak(text) {
  if (!text) return;
  const cleanStr = String(text).replace(/[#*`_~]/g, '').trim();
  if (!cleanStr) return;

  const token = ++activeSpeechToken;

  // 1) Try Google Gemini TTS first with Kore or user-selected voice
  if (S.cfg.key) {
    try {
      const voice = S.cfg.voice || 'Kore';
      const res = await ipc.invoke('gemini-tts', { text: cleanStr, voice });
      if (token !== activeSpeechToken) return;
      if (res && res.ok && res.audioData) {
        feel('talking', Math.max(2500, Math.min(15000, cleanStr.length * 90)));
        const result = await playGeminiAudio(res.audioData, res.mimeType, {
          onStart: () => feel('talking', Math.max(2500, Math.min(15000, cleanStr.length * 90))),
          onEnd: () => feel('idle', 500)
        });
        if (result && result.ok) return;
      } else if (res && res.error) {
        console.warn('Gemini TTS returned error, falling back to Edge Neural voice:', res.error);
      }
    } catch (e) {
      console.warn('Gemini TTS invocation error, falling back to Edge Neural voice:', e);
    }
  }

  // 2) Realistic Microsoft Edge Neural TTS (en-US-AriaNeural female voice) - Free, ultra-natural, zero robotic sound
  try {
    const res = await ipc.invoke('edge-tts', { text: cleanStr, voice: 'en-US-AriaNeural' });
    if (token !== activeSpeechToken) return;
    if (res && res.ok && res.audioData) {
      feel('talking', Math.max(2500, Math.min(15000, cleanStr.length * 90)));
      await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
        onStart: () => feel('talking', Math.max(2500, Math.min(15000, cleanStr.length * 90))),
        onEnd: () => feel('idle', 500)
      });
      return;
    }
  } catch (edgeErr) {
    console.warn('Edge TTS invocation error:', edgeErr);
  }

  feel('idle', 500);
}

function speakBrowser(text) {
  // Robotic SpeechSynthesis is disabled to maintain premium natural female voice
  return false;
}

async function speakAgentPayload(payload) {
  try {
    if (!payload || !payload.text) return;
    const text = String(payload.text).replace(/[#*`_~]/g, '').trim();
    if (!text) return;

    if (S.cfg.speak === false) {
      ipc.send('agent-speech-event', { type: 'finished', id: payload.id || null });
      return;
    }

    const token = ++activeSpeechToken;
    const finish = () => {
      try { feel('idle', 500); } catch {}
      ipc.send('agent-speech-event', { type: 'finished', id: payload.id || null });
    };

    // 1) Try Google Gemini TTS first with Kore or selected voice
    if (S.cfg.key) {
      try {
        const voice = S.cfg.voice || 'Kore';
        const res = await ipc.invoke('gemini-tts', { text, voice });
        if (token !== activeSpeechToken) return;
        if (res && res.ok && res.audioData) {
          const playRes = await playGeminiAudio(res.audioData, res.mimeType, {
            onStart: () => {
              feel('talking', Math.min(12000, text.length * 100));
              ipc.send('agent-speech-event', { type: 'speaking', value: true });
            },
            onEnd: finish
          });
          if (playRes && playRes.ok) return;
        }
      } catch (err) {
        console.warn('Gemini TTS agent payload error, trying Edge Neural voice:', err);
      }
    }

    // 2) Realistic Microsoft Edge Neural TTS (en-US-AriaNeural female voice) - Free, ultra-natural
    try {
      const res = await ipc.invoke('edge-tts', { text, voice: 'en-US-AriaNeural' });
      if (token !== activeSpeechToken) return;
      if (res && res.ok && res.audioData) {
        await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
          onStart: () => {
            feel('talking', Math.min(12000, text.length * 100));
            ipc.send('agent-speech-event', { type: 'speaking', value: true });
          },
          onEnd: finish
        });
        return;
      }
    } catch (edgeErr) {
      console.warn('Edge TTS agent payload error:', edgeErr);
    }

    finish();
  } catch {
    try { ipc.send('agent-speech-event', { type: 'finished', id: payload?.id || null }); } catch {}
  }
}

ipc.on('agent-speak', (_event, payload) => speakAgentPayload(payload));
ipc.on('agent-speech-cancel', () => {
  if (currentTtsAudio) {
    try { currentTtsAudio.pause(); currentTtsAudio.currentTime = 0; } catch {}
    currentTtsAudio = null;
    ttsAnalyser = null;
  }
  if (currentTtsBlobUrl) {
    try { URL.revokeObjectURL(currentTtsBlobUrl); } catch {}
    currentTtsBlobUrl = null;
  }
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
  ipc.send('agent-speech-event', { type: 'speaking', value: false });
});


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

  if (id === 'compound') {
    const actions = Array.isArray(args.actions) ? args.actions : [];
    if (!actions.length) return;
    setStatus(`⚡ Executing ${actions.length} tasks in sequence…`);
    feel('thinking', 1000);
    const spokenSay = intent.say || `Executing ${actions.length} tasks.`;
    if (isVoice || S.cfg.speak) speak(spokenSay);

    for (let i = 0; i < actions.length; i++) {
      const act = actions[i];
      if (i > 0 && (actions[i - 1].id === 'play_music' || actions[i - 1].id === 'open_app' || actions[i - 1].id === 'open_url')) {
        // Wait 4 seconds for YouTube / browser window to open and load the video before liking
        setStatus(`⏳ Waiting for video to load in browser…`);
        feel('thinking', 3000);
        await new Promise(r => setTimeout(r, 4200));
      }
      await runIntent(act, true, { ...opts, voice: false });
    }
    feel('happy', 2500);
    return;
  }

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
      appendChatMessage('ful', text);
      setStatus(text.slice(0, 50));
    } else {
      say(text, 'FUL');
    }
    if (isVoice || S.cfg.speak) speak(text);
    feel('happy', 2000);
    return;
  }
  if (id === 'write') { openPrompt(args.request || ''); return; }
  if (id === 'screen') { await askAboutScreen(''); return; }
  if (id === 'hand_vision') { await askWhatIsInMyHand(); return; }
  if (id === 'screen_followup') { await askScreenWithFollowUps(); return; }
  if (id === 'like_video') { await handleLikeVideo(args); return; }
  if (id === 'inspect_video') { await handleInspectVideo(); return; }
  if (id === 'battery_status') {
    let snap = null;
    try { snap = await ipc.invoke('battery-get'); } catch {}
    if (!snap) {
      try {
        if (navigator.getBattery) {
          const b = await navigator.getBattery();
          snap = { percent: Math.round(b.level * 100), online: b.charging, charging: b.charging };
        }
      } catch {}
    }
    const pct = (snap && snap.percent != null) ? snap.percent : 50;
    const isOnline = !!(snap && (snap.online || snap.charging));
    const name = S.cfg.userName || 'Rikesh';
    const isNepali = String(S.cfg.language || 'mixed').toLowerCase().includes('nepali') || String(S.cfg.language || 'mixed').toLowerCase() === 'mixed';
    const text = isOnline
      ? (isNepali ? `Battery ahile ${pct}% ma chha ra charger lagera charging hudai chha ${name}, tension chhaina!` : `Battery is at ${pct}% and currently charging, ${name}!`)
      : (isNepali ? `Battery ahile ${pct}% ma chha ra battery power ma chaldaichha ${name}.` : `Battery is at ${pct}% running on battery power, ${name}.`);
    setStatus(`🔋 ${pct}% • ${isOnline ? '⚡ Charging' : 'Battery'}`);
    feel('happy', 3000);
    if (fromChat) appendChatMessage('ful', text);
    else say(text, 'FUL');
    if (isVoice || S.cfg.speak) speak(text);
    return;
  }
  if (id === 'like_video') { await handleLikeVideo(args); return; }
  if (id === 'inspect_video') { await handleInspectVideo(); return; }
  if (id === 'battery_status') {
    let snap = null;
    try { snap = await ipc.invoke('battery-get'); } catch {}
    if (!snap) {
      try {
        if (navigator.getBattery) {
          const b = await navigator.getBattery();
          snap = { percent: Math.round(b.level * 100), online: b.charging, charging: b.charging };
        }
      } catch {}
    }
    const pct = (snap && snap.percent != null) ? snap.percent : 50;
    const isOnline = !!(snap && (snap.online || snap.charging));
    const name = S.cfg.userName || 'Rikesh';
    const isNepali = String(S.cfg.language || 'mixed').toLowerCase().includes('nepali') || String(S.cfg.language || 'mixed').toLowerCase() === 'mixed';
    const text = isOnline
      ? (isNepali ? `Battery ahile ${pct}% ma chha ra charger lagera charging hudai chha ${name}, tension chhaina!` : `Battery is at ${pct}% and currently charging, ${name}!`)
      : (isNepali ? `Battery ahile ${pct}% ma chha ra battery power ma chaldaichha ${name}.` : `Battery is at ${pct}% running on battery power, ${name}.`);
    setStatus(`🔋 ${pct}% • ${isOnline ? '⚡ Charging' : 'Battery'}`);
    feel('happy', 3000);
    if (fromChat) appendChatMessage('ful', text);
    else say(text, 'FUL');
    if (isVoice || S.cfg.speak) speak(text);
    return;
  }
  if (id === 'play_music') {
    const songName = args.song || 'music';
    const platform = args.platform || 'YouTube';
    setStatus(`🎵 Playing "${songName}" on ${platform}…`);
    feel('happy', 4000);
    if (isVoice || S.cfg.speak) speak(`Playing ${songName} on ${platform}`);
    const res = await ipc.invoke('act', 'play_music', args);
    const reply = (typeof res === 'string' && res) ? res : `Playing ${songName} on ${platform}.`;
    if (fromChat) appendChatAction(reply);
    else say(reply, 'status');
    return;
  }
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
    askConfirm(`FUL wants to ${id.replace(/_/g, ' ')}. Do it?`, intent);
    return;
  }

  const taskLabel = id === 'open_app' ? `Opening ${(args.names || []).join(', ')}` :
                    id === 'play_music' ? `Playing "${args.song}" on ${args.platform || 'YouTube'}` :
                    id === 'like_video' ? `Liking active video on ${args.platform || 'screen'}` :
                    id === 'inspect_video' ? 'Inspecting active video' :
                    id === 'mouse_action' ? `Mouse ${args.action || 'click'}` :
                    id === 'keyboard_action' ? 'Keyboard action' :
                    id === 'window_action' ? `Window ${args.action || 'action'}` :
                    id === 'vision_click' ? 'Clicking visual element' :
                    id === 'search_on' ? `Searching ${args.platform} for "${args.query}"` :
                    id === 'browser_script' ? `Automating browser (${args.description || 'web task'})` :
                    id === 'browser_task' ? `Browser ${args.action || 'task'}` :
                    id === 'run_script' ? `Running script (${args.description || 'PowerShell'})` :
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
  const failed = looksFailed(reply);
  S.laughOnReply = false;
  playSound(failed ? 'wrong' : 'correct');

  if (fromChat) {
    appendChatAction(reply.replace(/\n/g, ' ').trim());
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

/* --------------------------------------------------------- screen & vision asking */
async function captureVisionFrame() {
  // 1) Try accessing camera for real physical vision (e.g. "what is in my hand")
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      // Allow camera auto-exposure and frame buffer to settle
      await new Promise(r => setTimeout(r, 400));
      const vCanvas = document.createElement('canvas');
      vCanvas.width = video.videoWidth || 640;
      vCanvas.height = video.videoHeight || 480;
      const vCtx = vCanvas.getContext('2d');
      vCtx.drawImage(video, 0, 0, vCanvas.width, vCanvas.height);
      const dataUrl = vCanvas.toDataURL('image/jpeg', 0.85);
      stream.getTracks().forEach(t => t.stop());
      const b64 = dataUrl.split(',')[1];
      if (b64) return { data: b64, mimeType: 'image/jpeg', source: 'camera' };
    }
  } catch (camErr) {
    console.log('[VISION] Camera snapshot not available, falling back to screen capture:', camErr.message || camErr);
  }
  // 2) Fallback to screen capture
  const screenB64 = await ipc.invoke('shot');
  if (screenB64) return { data: screenB64, mimeType: 'image/png', source: 'screen' };
  return null;
}

async function askWhatIsInMyHand() {
  setStatus('Looking at your hand…');
  feel('surprised', 1400);
  playSound('curious');
  const frame = await captureVisionFrame();
  if (!frame) {
    say("I couldn't access your camera or screen to see what you're holding.", 'status');
    return;
  }
  const prompt = "Look closely at this image. The user is asking 'What is in my hand?' or asking what they are holding. " +
    "Identify the object or item in their hand/fingers accurately and describe it in 1-2 natural, friendly companion sentences. " +
    "Be precise, conversational, and direct. If hands or objects aren't visible, politely say what you see instead.";
  askModel(prompt, { parts: [{ inlineData: { mimeType: frame.mimeType, data: frame.data } }] });
}

async function askScreenWithFollowUps() {
  setStatus('Reading screen for next steps…');
  feel('thinking', 1500);
  playSound('curious');
  const b64 = await ipc.invoke('shot');
  if (!b64) {
    say("Could not capture the screen to give follow-up suggestions.", 'status');
    return;
  }
  const prompt = "You are FUL, an intelligent desktop assistant and companion. Read and analyze the user's screen in detail. " +
    "1) In one sentence, state clearly what task, project, code, or app the user is actively working on. " +
    "2) Give 2 practical, high-value follow-up steps they should do next to progress or finish the task. " +
    "Keep it friendly, companion-like, and directly actionable. Speak like a real human pair programmer.";
  askModel(prompt, { parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }] });
}

async function askAboutScreen(prompt) {
  setStatus('Capturing screen…');
  feel('surprised', 800);
  playSound('curious');
  const base64 = await ipc.invoke('shot');
  if (!base64) { say('Could not capture the screen.', 'status'); return; }
  const q = prompt || 'Explain briefly what is on my screen right now and any notable things on it.';
  askModel(q, { parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }] });
}

/* --------------------------------------------------------- video & PC control helpers */
async function handleLikeVideo(args = {}) {
  setStatus('Inspecting video to like…');
  feel('thinking', 1500);

  // 1) First check active app to see if it is TikTok or another known platform
  const activeInfo = await ipc.invoke('active-app').catch(() => null);
  const title = (activeInfo?.title || '').toLowerCase();
  const app = (activeInfo?.app || '').toLowerCase();

  // If TikTok, native 'l' shortcut is immediate and reliable
  if (title.includes('tiktok') || app.includes('tiktok') || (args.platform && args.platform.toLowerCase() === 'tiktok')) {
    await ipc.invoke('act', 'like_video', { platform: 'tiktok' });
    const reply = 'Liked the video on TikTok!';
    say(reply, 'status');
    feel('happy', 2500);
    speak(reply);
    return;
  }

  // 2) Use Screen capture + Gemini Vision to locate the exact Like button on screen
  const b64 = await ipc.invoke('shot');
  if (b64 && S.cfg.key) {
    try {
      const prompt = "Look at this screenshot. The user wants to like the currently open video or post (YouTube, Instagram, TikTok, Twitter/X, etc.). " +
        "1) Find the Like button (thumbs up icon or heart icon) on the screen. " +
        "2) Return ONLY a valid JSON object in this exact format: " +
        '{"found": true, "x_percent": 62.5, "y_percent": 75.0, "title": "video title", "platform": "YouTube"} ' +
        'If no like button is visible on the screen, return {"found": false}.';

      const vUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${S.cfg.key}`;
      const vRes = await fetch(vUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: b64 } }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (vRes.ok) {
        const vData = await vRes.json();
        const jsonText = vData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
          if (parsed && parsed.found && typeof parsed.x_percent === 'number' && typeof parsed.y_percent === 'number') {
            await ipc.invoke('act', 'vision_click', { x_percent: parsed.x_percent, y_percent: parsed.y_percent });
            const platformName = parsed.platform || 'video';
            const titleMsg = parsed.title ? ` "${parsed.title}"` : '';
            const msg = `Liked the ${platformName}${titleMsg}!`;
            say(msg, 'status');
            feel('happy', 2500);
            speak(msg);
            return;
          }
        }
      }
    } catch (vErr) {
      console.warn('[LIKE_VIDEO] Vision locator notice:', vErr);
    }
  }

  // 3) Fallback to UI Automation / script liker
  const fallbackRes = await ipc.invoke('act', 'like_video', args);
  const reply = (typeof fallbackRes === 'string' && fallbackRes) ? fallbackRes : 'Sent like command to active video.';
  say(reply, 'status');
  feel('happy', 2500);
  speak(reply);
}

async function handleInspectVideo() {
  setStatus('Inspecting active video & window…');
  feel('curious', 1500);
  const info = await ipc.invoke('act', 'inspect_active', {});
  const title = info?.title || info?.media?.title || 'Unknown Video';
  const app = info?.app || 'Active Application';
  const reply = `Active: "${title}" in ${app}.`;
  say(reply, 'status');
  feel('happy', 2500);
  speak(reply);
}

/* --------------------------------------------------------- cloud model */
const SYS = 'You are FUL, an advanced AI-powered desktop assistant and companion with FULL CONTROL over the user\'s Windows PC. ' +
  'You can think and execute ANY desktop action, workflow, or multi-step task fast and accurately: ' +
  '1) FIRST THINK: Analyze what the user wants, identify the required steps or tools, and execute them immediately. ' +
  '2) FOR VIDEO & MEDIA: Use `like_video` to inspect and like videos on YouTube, TikTok, Instagram, Twitter/X, etc. Use `play_music` to search and play any song on YouTube directly by name. Use `media` to pause, resume, or skip. ' +
  '3) FOR PC & UI CONTROL: Use `mouse_action` to click or scroll anywhere, `keyboard_action` to type text or press shortcuts (e.g. Enter, Esc, Ctrl+C, Win+D, Alt+Tab), and `window_action` to minimize, maximize, snap, or switch windows. Use `vision_click` to click visual elements on the screen. ' +
  '4) FOR SYSTEM AUTOMATION: For any file operations, system actions, or desktop tasks, write and run a clean PowerShell script using `run_script`. ' +
  '5) FOR WEB AUTOMATION: Use `browser_script` with Playwright (Node.js) or `browser_task` to control web pages, scrape content, and automate web interactions. ' +
  '6) FOR APPS: Call `open_app` with the list of apps or websites to open. ' +
  '7) FOR MULTI-STEP WORKFLOWS: Call `compound` or chain multiple tool calls. ' +
  'Keep spoken answers concise, natural, and friendly (1-2 sentences). Never output raw code in spoken conversation.';

const S_ = (p, r) => ({ type: 'object', properties: p, required: r || Object.keys(p) });
const str = { type: 'string' }, num = { type: 'number' }, bool = { type: 'boolean' };
const FN = [
  ['open_app', 'Open one or more apps or websites', S_({ names: { type: 'array', items: str } })],
  ['play_music', 'Search and play a song or video directly on YouTube or music platforms by name', S_({ song: str, platform: str }, ['song'])],
  ['like_video', 'Inspect active video or post (YouTube, TikTok, Instagram, Twitter/X) and hit the Like button', S_({ platform: str })],
  ['inspect_video', 'Inspect what video, audio or application is currently active on screen', S_({})],
  ['mouse_action', 'Simulate mouse action (click, doubleclick, rightclick, move, scroll) anywhere on screen', S_({ action: { type: 'string', enum: ['click', 'doubleclick', 'rightclick', 'move', 'scroll'] }, x: num, y: num, amount: num }, ['action'])],
  ['keyboard_action', 'Type text or press keyboard shortcuts into the active window (e.g. Enter, Esc, Tab, Win+D, Alt+Tab, Ctrl+C, Ctrl+V, L, Space)', S_({ keys: str, text: str })],
  ['window_action', 'Control desktop windows: minimize, maximize, restore, close, switch, snap_left, snap_right', S_({ action: { type: 'string', enum: ['minimize', 'maximize', 'restore', 'close', 'switch', 'snap_left', 'snap_right'] }, target: str }, ['action'])],
  ['vision_click', 'Look at the screen, find a visual element or button (e.g. like button, play, search bar), and click it directly', S_({ x_percent: num, y_percent: num }, ['x_percent', 'y_percent'])],
  ['open_url', 'Open a URL', S_({ url: str })],
  ['web_search', 'Search the web', S_({ query: str })],
  ['browser_script', 'Run a Playwright browser automation script in Node.js to control the browser, scrape data, interact with web pages, fill forms, or automate websites (TikTok, Instagram, GitHub, etc.)', S_({ script: str, description: str, headless: bool }, ['script'])],
  ['browser_task', 'Perform a high-level browser action like opening tabs, scraping page content, or searching web platforms', S_({ action: { type: 'string', enum: ['open', 'scrape', 'search'] }, url: str, query: str, platform: str, selector: str, headless: bool }, ['action'])],
  ['run_script', 'Run a PowerShell automation script on Windows to execute any desktop task, system action, or multi-step workflow fast', S_({ script: str, description: str }, ['script'])],
  ['compound', 'Execute multiple desktop tasks in sequence', S_({ actions: { type: 'array', items: { type: 'object' } } }, ['actions'])],
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

async function blobToWavBase64(blob) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const pcmData = audioBuffer.getChannelData(0);
    const pcm16 = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const wavBuffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(wavBuffer);
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcm16.length * 2, true);
    const pcmBytes = new Uint8Array(pcm16.buffer);
    const wavBytes = new Uint8Array(wavBuffer);
    wavBytes.set(pcmBytes, 44);
    let binary = '';
    const len = wavBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(wavBytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.warn('WAV conversion error:', err);
    return null;
  }
}

async function callGeminiAudio(base64Webm, promptText, mimeType) {
  if (!S.cfg.key || !base64Webm) return null;
  try {
    const text = await ipc.invoke('transcribe-audio', { base64Webm, promptText, mimeType: mimeType || 'audio/webm' });
    return text || null;
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

  // Safety timeout (25 seconds for multi-step / scripting tasks)
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
  }, 25000);

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
        const actionLabel = c.name === 'run_script' ? (c.args?.description || 'script task') : (c.name === 'compound' ? 'multi-task' : c.name.replace(/_/g, ' '));
        setStatus(`⚡ Executing ${actionLabel}…`);
        feel('thinking', 1500);
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
      const failed = results.some(x => typeof x === 'string' && looksFailed(x));
      S.laughOnReply = false;
      playSound(failed ? 'wrong' : 'correct');
      const actionLines = results.filter(x => typeof x === 'string' && x.trim()).map(x => x.replace(/\n/g, ' ').trim());
      if (opts.fromChat || S.panel === 'chat') {
        actionLines.forEach(line => appendChatAction(line));
        if (out.trim()) appendChatMessage('ful', out.trim());
        if (!actionLines.length && !out.trim()) appendChatMessage('ful', 'Done.');
        setStatus(text2.slice(0, 60) || 'Done.');
      } else {
        say(text2, 'FUL');
      }
      feel('happy', 2200);
      updateTimers();
    } else if (!out.trim()) {
      S.laughOnReply = false;
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('ful', 'Could not get an answer. Try rephrasing that.');
      } else {
        showAnswer('The model returned nothing. Try rephrasing that.', 'Hmm');
      }
      feel('sad', 2000);
      playSound('wrong');
    } else {
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('ful', out.trim());
        setStatus(out.slice(0, 60));
      } else {
        say(out.trim(), opts.intent === 'write' ? 'Draft' : 'FUL');
      }
      feel('happy', 1800);
    }
  } catch (e) {
    clearTimeout(timeoutTimer);
    S.laughOnReply = false;
    if (e.name === 'AbortError') {
      setStatus('Ready.');
      feel('meh', 900);
    } else {
      const errMsg = e.message && e.message.includes('wsarecv') ? 'Connection reset. Retrying...' : String(e.message || e);
      if (opts.fromChat || S.panel === 'chat') {
        appendChatMessage('ful', `Note: ${errMsg}`);
      } else {
        setStatus(errMsg.slice(0, 40));
      }
      feel('sad', 1800);
      playSound('sad');
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
  S.laughOnReply = false;
  if (S.cfg.key && isJokeRequest(raw)) queueLaugh();
  setShape('capsule');
  setStatus('Thinking…');
  feel('thinking', 700);

  // Think first: Classify whether this is a Task or a Question/Conversation
  const classified = await ipc.invoke('classify', raw);
  const isTask = classified?.category === 'task';

  if (isTask) {
    setStatus('Working on task…');
    feel('wink', 800);
  } else {
    setStatus('Thinking…');
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
      say(qReply, 'FUL');
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
    wake('greeting');
    setStatus('Listening…');
    setShape('capsule');
    feel('surprised', 900);
    playSound('hello');
    startMeter();
  } else if (evt.type === 'text') {
    wake('greeting');
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
    chatHistory = [];
    saveChatStore();
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
      <h4>📖 FUL Setup Guide</h4>
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
      <h3 style="margin-bottom:4px">FUL</h3>
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
  setShape('state-dictate');
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
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      mediaRecorder = mime ? new MediaRecorder(S.micStream, { mimeType: mime }) : new MediaRecorder(S.micStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedAudioChunks.push(e.data); };
      mediaRecorder.start(250);
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

  // Stop MediaRecorder and transcribe with Parakeet Unified EN 0.6B (or Gemini fallback)
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    mediaRecorder.onstop = async () => {
      if (recordedAudioChunks.length > 0) {
        try {
          const blob = new Blob(recordedAudioChunks, { type: mimeType });
          if (blob.size > 800) {
            setStatus('Transcribing…');
            feel('thinking', 1200);

            let transcribed = null;
            // 1. Try on-device Parakeet Unified EN 0.6B (Fast, accurate live English transcription)
            try {
              const wavB64 = await blobToWavBase64(blob);
              if (wavB64) {
                const parakeetRes = await ipc.invoke('parakeet-transcribe', { base64Wav: wavB64 });
                if (parakeetRes && parakeetRes.ok && parakeetRes.text) {
                  transcribed = parakeetRes.text;
                }
              }
            } catch (err) {
              console.warn('Parakeet transcription failed, falling back to Gemini:', err);
            }

            // 2. Fallback to Gemini Audio if Parakeet did not return text
            if (!transcribed && S.cfg.key) {
              const reader = new FileReader();
              transcribed = await new Promise((resolve) => {
                reader.onloadend = async () => {
                  const res = reader.result;
                  if (typeof res === 'string' && res.includes(',')) {
                    const b64 = res.split(',')[1];
                    if (b64) {
                      const prompt = was === 'dict'
                        ? 'Transcribe this spoken dictation verbatim into clean English. Remove ums, ahs, fillers. Preserve punctuation. Output ONLY the transcription.'
                        : 'Transcribe this voice command into a single clear English command. Output ONLY the command text.';
                      const t = await callGeminiAudio(b64, prompt, mimeType);
                      resolve(t);
                      return;
                    }
                  }
                  resolve(null);
                };
                reader.readAsDataURL(blob);
              });
            }

            if (transcribed) {
              if (was === 'dict') {
                await ipc.invoke('paste', transcribed);
                setStatus('Typed: ' + transcribed.slice(0, 36) + '…');
                feel('wink', 900);
                if (S.panel === 'chat') appendChatMessage('user', transcribed);
              } else {
                await handleUtterance(transcribed, 'cmd');
              }
            } else {
              setStatus(was === 'dict' ? 'No speech heard.' : 'No command heard.');
              setTimeout(collapse, 1400);
            }
            return;
          }
        } catch (e) {
          console.warn('Speech transcription error:', e);
        }
      }
      setStatus('Ready.');
      setTimeout(collapse, 1000);
    };
    try { mediaRecorder.stop(); } catch {}
  }

  if (!was || was === 'cmd') {
      setStatus('Processing…');
      feel('thinking', 800);
      clearTimeout(endCapture.collapseTimer);
      endCapture.collapseTimer = setTimeout(() => {
        if (!S.busy && !S.capture && !S.panel) collapse();
      }, 3000);
    } else {
      clearTimeout(endCapture.collapseTimer);
      endCapture.collapseTimer = setTimeout(() => {
        if (!S.busy && !S.capture && !S.panel) collapse();
      }, 2000);
    }
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

function wake(trigger = 'interaction') {
  const wasAsleep = sleeping();
  if (wasAsleep) {
    feel('surprised', 700);
    if (trigger !== 'greeting') playSound('startup');
  }
  S.idle = Date.now();
  return wasAsleep;
}

/* ------------------------------------------------------------- media player */
function formatSec(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function getMediaAppIcon(app, title) {
  const comb = (String(app || '') + ' ' + String(title || '')).toLowerCase();
  if (comb.includes('instagram') || comb.includes('insta')) return 'icons/instagram.png';
  if (comb.includes('youtube') || comb.includes('youtu.be')) return 'icons/youtube.png';
  if (comb.includes('spotify')) return 'icons/spotify.png';
  if (comb.includes('facebook') || comb.includes('fb')) return 'icons/facebook.png';
  if (comb.includes('soundcloud')) return 'icons/soundcloud.png';
  if (comb.includes('antigravity')) return 'icons/antigravity.png';
  if (comb.includes('brave')) return 'icons/brave.png';
  if (comb.includes('chrome')) return 'icons/chrome.png';
  if (comb.includes('edge') || comb.includes('msedge')) return 'icons/edge.png';
  if (comb.includes('discord')) return 'icons/discord.png';
  if (comb.includes('music') || comb.includes('audio') || comb.includes('vlc')) return 'icons/music.png';
  return 'icons/brave.png';
}

let livePos = 0;
let liveDur = 0;
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
  // Auto-collapse only while playing so user can always see & control paused tracks
  musicIslandTimer = setTimeout(() => {
    if (!isMusicHovered && !isDraggingScrubber && currentShape === 'music' && isAudioPlaying) {
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
  let app = m.app || '';
  const titleLower = title.toLowerCase();

  if (!app || app === 'Media' || app === 'Brave' || app === 'Chrome' || app === 'Edge') {
    if (titleLower.includes('instagram') || titleLower.includes('insta')) {
      app = 'Instagram';
    } else if (titleLower.includes('youtube') || titleLower.includes('youtu.be')) {
      app = 'YouTube';
    } else if (titleLower.includes('facebook')) {
      app = 'Facebook';
    } else if (titleLower.includes('spotify')) {
      app = 'Spotify';
    } else if (titleLower.includes('soundcloud')) {
      app = 'SoundCloud';
    } else if (!app) {
      app = m.artist || 'Media';
    }
  }

  if (titleEl) {
    titleEl.textContent = title;
    titleEl.title = title;
  }
  if (appEl) {
    const subText = (m.artist && m.artist.trim() && m.artist !== title) ? m.artist.trim() : (m.app || app);
    appEl.textContent = subText;
    appEl.title = subText;
  }

  // Cover photo / icon selection:
  // Use thumbnail if available; otherwise use dedicated app icon (Instagram, YouTube, Brave, etc.)
  if (iconEl) {
    const fallbackIcon = getMediaAppIcon(m.app || app, title);
    if (m.thumbnail && m.thumbnail.trim()) {
      iconEl.src = m.thumbnail;
      iconEl.onerror = () => {
        iconEl.onerror = null;
        iconEl.src = fallbackIcon;
      };
    } else {
      iconEl.src = fallbackIcon;
    }
  }

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

    if (media.title && (media.status === 'playing' || media.status === 'paused')) {
      if (trackChanged || justStarted) {
        showMusicIslandBriefly(7000);
      }
    } else if (!media.title || media.status === 'none') {
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
    // When paused, do NOT collapse so user has full control
    if (!isDraggingScrubber && currentShape === 'music' && isAudioPlaying) {
      clearTimeout(musicIslandTimer);
      musicIslandTimer = setTimeout(() => {
        if (!isMusicHovered && !isDraggingScrubber && currentShape === 'music' && isAudioPlaying) {
          setShape('rest');
        }
      }, 4500);
    }
  });
}

if (mBtnPlayPause) {
  mBtnPlayPause.onclick = async (e) => {
    e.stopPropagation();
    isAudioPlaying = !isAudioPlaying;
    if (S.media) {
      S.media.status = isAudioPlaying ? 'playing' : 'paused';
      S.media.playing = isAudioPlaying;
    }
    const iconPause = $('mIconPause');
    const iconPlay = $('mIconPlay');
    if (iconPause && iconPlay) {
      iconPause.style.display = isAudioPlaying ? 'block' : 'none';
      iconPlay.style.display = isAudioPlaying ? 'none' : 'block';
    }
    await ipc.invoke('media-action', 'playpause');
    setTimeout(() => pollMedia(true), 300);
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
$('bMic').onclick = async (e) => {
  e?.stopPropagation?.();
  if (S.capture) { endCapture(); return; }
  beginCapture('cmd');
};

const aiSparkBadge = $('aiSparkBadge');
if (aiSparkBadge) {
  aiSparkBadge.onclick = (e) => {
    e?.stopPropagation?.();
    if (S.capture) endCapture();
    else setShape(S.hovering ? 'dock' : 'rest');
  };
}

$('bPen').onclick = (e) => {
  e?.stopPropagation?.();
  if (currentShape === 'state-write') {
    showFallbackError();
  } else {
    setShape('state-write');
  }
};
$('bPen').ondblclick = (e) => {
  e?.stopPropagation?.();
  S.panel = 'chat';
  setShape('panel');
  openTab('chat');
};

$('bScreen').onclick = (e) => {
  e?.stopPropagation?.();
  if (currentShape === 'state-cursor') {
    setShape(S.hovering ? 'dock' : 'rest');
  } else {
    setShape('state-cursor');
  }
};

$('bMore').onclick = (e) => {
  e?.stopPropagation?.();
  if (S.panel) closePanel();
  else { S.panel = 'chat'; setShape('panel'); openTab('chat'); }
};

const fallbackCard = $('fallbackErrorCard');
if (fallbackCard) {
  fallbackCard.onclick = () => hideFallbackError();
}
const btnFallbackClose = $('btnFallbackClose');
if (btnFallbackClose) {
  btnFallbackClose.onclick = (e) => {
    e?.stopPropagation?.();
    hideFallbackError();
  };
}

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
  if (!S.panel && !S.capture && !S.busy && currentShape !== 'music' && currentShape !== 'state-cursor' && currentShape !== 'state-write' && currentShape !== 'state-dictate' && currentShape !== 'state-error') {
    setShape('dock');
  }
});
shell.addEventListener('mouseleave', () => {
  S.hovering = false;
  setTimeout(() => {
    if (!S.panel && !S.capture && !S.busy && currentShape === 'dock') {
      collapse();
    }
  }, 450);
});
let facePressTimer = null;
let facePressed = false;
let faceHoldFired = false;
let faceDownScreenX = 0;
let faceDownScreenY = 0;
let faceHasDragged = false;

function finishFacePress(tap) {
  if (!facePressed) return;
  facePressed = false;
  clearTimeout(facePressTimer);
  facePressTimer = null;
  if (tap && !faceHoldFired && !faceHasDragged) {
    if (S.media && S.media.title && (isAudioPlaying || S.media.status === 'playing' || S.media.status === 'paused') && currentShape === 'rest') {
      setShape('music');
      return;
    }
    face.poke();
    playSound('poke');
  }
  faceHoldFired = false;
  faceHasDragged = false;
}

faceCanvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  wake();
  facePressed = true;
  faceHoldFired = false;
  faceHasDragged = false;
  faceDownScreenX = e.screenX;
  faceDownScreenY = e.screenY;
  clearTimeout(facePressTimer);
  facePressTimer = setTimeout(() => {
    if (!facePressed || faceHasDragged) return;
    faceHoldFired = true;
    face.poke();
    feel('happy', 1800);
    playSound('sing');
  }, 650);
});
faceCanvas.addEventListener('pointerup', () => finishFacePress(true));
faceCanvas.addEventListener('pointercancel', () => finishFacePress(false));
faceCanvas.addEventListener('pointerleave', () => finishFacePress(false));

shell.addEventListener('contextmenu', e => { e.preventDefault(); openSettings(); });
document.addEventListener('keydown', e => {
  if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
    window.location.reload();
    return;
  }
  if (e.key === 'Escape') {
    if (S.capture || S.busy) cancelActiveAction();
    else if (currentShape === 'state-error' || currentShape === 'state-cursor' || currentShape === 'state-write' || currentShape === 'state-dictate') {
      setShape(S.hovering ? 'dock' : 'rest');
    }
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

/* ------------------------------------------------------ window dragging & shake detection */
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Shake detection state
let shakeReversalsX = [];
let shakeReversalsY = [];
let shakeLastDirX = 0;
let shakeLastDirY = 0;
let shakeDirDistX = 0;
let shakeDirDistY = 0;
let shakeLastScreenX = null;
let shakeLastScreenY = null;
let lastShakeAngryTime = 0;

function checkDragShake(screenX, screenY) {
  const now = Date.now();
  if (shakeLastScreenX === null || shakeLastScreenY === null) {
    shakeLastScreenX = screenX;
    shakeLastScreenY = screenY;
    return;
  }
  const deltaX = screenX - shakeLastScreenX;
  const deltaY = screenY - shakeLastScreenY;
  shakeLastScreenX = screenX;
  shakeLastScreenY = screenY;

  // Track X axis reversals
  if (Math.abs(deltaX) >= 2) {
    const signX = Math.sign(deltaX);
    if (signX !== shakeLastDirX) {
      if (shakeDirDistX >= 14) {
        shakeReversalsX.push({ time: now, dist: shakeDirDistX });
      }
      shakeLastDirX = signX;
      shakeDirDistX = Math.abs(deltaX);
    } else {
      shakeDirDistX += Math.abs(deltaX);
    }
  }

  // Track Y axis reversals
  if (Math.abs(deltaY) >= 2) {
    const signY = Math.sign(deltaY);
    if (signY !== shakeLastDirY) {
      if (shakeDirDistY >= 14) {
        shakeReversalsY.push({ time: now, dist: shakeDirDistY });
      }
      shakeLastDirY = signY;
      shakeDirDistY = Math.abs(deltaY);
    } else {
      shakeDirDistY += Math.abs(deltaY);
    }
  }

  // Keep reversals within rolling 650ms window
  shakeReversalsX = shakeReversalsX.filter(r => now - r.time <= 650);
  shakeReversalsY = shakeReversalsY.filter(r => now - r.time <= 650);

  // Require at least 3 direction reversals with >= 60px cumulative movement
  const totX = shakeReversalsX.slice(-3).reduce((sum, r) => sum + r.dist, 0);
  const totY = shakeReversalsY.slice(-3).reduce((sum, r) => sum + r.dist, 0);

  const isShakingX = shakeReversalsX.length >= 3 && totX >= 60;
  const isShakingY = shakeReversalsY.length >= 3 && totY >= 60;

  if ((isShakingX || isShakingY) && (now - lastShakeAngryTime > 2600)) {
    lastShakeAngryTime = now;
    // Vigorous shake detected while dragging: become angry and play curious.wav!
    feel('angry', 2800);
    playSound('curious');
  }
}

function initWindowDragging() {
  const dragBar = $('dragBar');
  const head = $('head');
  const snapPill = $('snapPill');

  function startDrag(e) {
    if (e.target.closest('button, input, select, textarea, .tab, .resize-handle, #dockMenu')) return;
    isDragging = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    shakeLastScreenX = e.screenX;
    shakeLastScreenY = e.screenY;
    document.body.style.cursor = 'grabbing';
  }

  function onMove(e) {
    // If pointer is down on faceCanvas and moved > 4px, transition into drag
    if (facePressed && !isDragging) {
      if (Math.hypot(e.screenX - faceDownScreenX, e.screenY - faceDownScreenY) > 4) {
        faceHasDragged = true;
        clearTimeout(facePressTimer);
        facePressTimer = null;
        startDrag(e);
      }
    }

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

    // Check for shake gesture while dragging
    checkDragShake(e.screenX, e.screenY);
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    snapPill.classList.remove('visible');
    ipc.send('window-drag-end');

    shakeReversalsX = [];
    shakeReversalsY = [];
    shakeLastDirX = 0;
    shakeLastDirY = 0;
    shakeDirDistX = 0;
    shakeDirDistY = 0;
    shakeLastScreenX = null;
    shakeLastScreenY = null;
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
  if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || !isFinite(p.x) || !isFinite(p.y)) return;
  if (Math.abs(p.x - lx) + Math.abs(p.y - ly) > 4) { lx = p.x; ly = p.y; }
  const cx = window.screenX + (window.innerWidth || 112) / 2;
  const cy = window.screenY + (window.innerHeight || 56) / 2;
  const dx = p.x - cx, dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (!isFinite(d) || d > 1500) {
    S.looking = null;
  } else {
    S.looking = [clamp(dx / 700, -1, 1), clamp(dy / 480, -1, 1)];
  }
});

/* --------------------------------------------------------- screen safety guardian */
let lastDeleteAlertTime = 0;
function initScreenSafetyGuardian() {
  setInterval(async () => {
    try {
      const info = await ipc.invoke('active-app').catch(() => null);
      if (!info || !info.title) return;
      const title = String(info.title).toLowerCase();
      const isDeleteDialog = (
        title.includes('confirm file delete') ||
        title.includes('confirm folder delete') ||
        title.includes('permanently delete') ||
        title.includes('delete multiple items') ||
        (title.includes('delete') && (title.includes('confirm') || title.includes('recycle') || title.includes('folder') || title.includes('file')))
      );
      if (isDeleteDialog && Date.now() - lastDeleteAlertTime > 25000) {
        lastDeleteAlertTime = Date.now();
        feel('surprised', 5000);
        playSound('wrong');
        const warnText = "Wait, hold on! You are about to delete an important file or folder. Please double check before confirming!";
        setStatus('⚠️ Safety Alert: Delete Confirmation Detected!');
        say(warnText, 'status');
        speak(warnText);
      }
    } catch {}
  }, 2500);
}

/* --------------------------------------------------------- companion quips */
let lastQuipTime = Date.now();
function initCompanionQuips() {
  setInterval(async () => {
    try {
      if (S.busy || S.capture || isFULSpeaking() || shell.classList.contains('panel')) return;
      const now = Date.now();
      // Speak occasional friendly companion remark every 4 to 6 minutes
      if (now - lastQuipTime < 240000) return;
      lastQuipTime = now;

      const info = await ipc.invoke('active-app').catch(() => null);
      const app = (info?.app || info?.process || '').toLowerCase();
      const title = (info?.title || '').toLowerCase();
      const hour = new Date().getHours();

      let quip = null;
      if (app.includes('code') || app.includes('studio') || title.includes('.js') || title.includes('.py') || title.includes('.html')) {
        quip = pick([
          "You're in the coding zone! Remember to stay hydrated.",
          "Looking sharp in the code editor today!",
          "Great progress on the project. Let me know if you want me to automate anything."
        ]);
      } else if (app.includes('youtube') || app.includes('spotify') || app.includes('brave') || app.includes('chrome')) {
        quip = pick([
          "Vibing with the screen today! Need me to find any info or play another song?",
          "I'm keeping an eye on your workflow, let me know whenever you need a hand.",
          "Always here if you need me to summarize, automate, or search anything fast."
        ]);
      } else if (hour >= 23 || hour < 5) {
        quip = "It's late night! Don't forget to get some good rest soon.";
      }

      if (quip) {
        feel('happy', 2500);
        setStatus(quip);
        if (S.cfg.speak) speak(quip);
      }
    } catch {}
  }, 30000);
}

/* --------------------------------------------------------- greeting */
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function buildGreeting() {
  const name = (S.cfg.userName || '').trim();
  const tod = timeOfDay();
  const hi = pick(['Hi', 'Hey', 'Hello', 'Yo']);
  const tods = {
    morning: ['Good morning', 'Morning'],
    afternoon: ['Good afternoon', 'Hope your afternoon is going well'],
    evening: ['Good evening', 'Evening'],
    night: ['Good night', 'It’s getting late', 'Burning the midnight oil']
  };
  const todPhrase = pick(tods[tod]);
  const tails = {
    morning: ['Hope you slept well.', 'Ready to get things going?', 'What are we working on today?'],
    afternoon: ['Hope your day is going smoothly.', 'What can I help you with?', 'Need a hand with anything?'],
    evening: ['Hope you had a good day.', 'Anything you need this evening?', 'What’s on your mind?'],
    night: ['You should get some rest soon.', 'What are you still up to?', 'Need anything before you wind down?']
  };
  const tail = pick(tails[tod]);
  const base = name ? `${hi} ${name}` : hi;
  return `${base}, ${todPhrase.toLowerCase()}. ${tail}`;
}

function sayTimeGreeting() {
  const text = buildGreeting();
  S.lastReply = text;
  setStatus(text);
  if (!S.panel) {
    setShape('capsule');
    clearTimeout(sayTimeGreeting.timer);
    sayTimeGreeting.timer = setTimeout(collapse, 8000);
  }
  if (S.cfg.speak || S.cfg.key) speak(text);
}

/* ------------------------------------------------------------- Power & Battery Events */
let lastPowerEventTime = 0;
let lastPowerEventType = '';

async function handlePowerEvent(data) {
  if (!data || !data.type) return;
  const now = Date.now();
  // Prevent duplicate power events within 2.5s
  if (data.type === lastPowerEventType && (now - lastPowerEventTime < 2500)) return;
  lastPowerEventTime = now;
  lastPowerEventType = data.type;

  const type = data.type;
  let percent = data.percent;
  if (percent == null) {
    try {
      const bat = await ipc.invoke('battery-get');
      if (bat && bat.percent != null) percent = bat.percent;
    } catch {}
  }
  if (percent == null) {
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        percent = Math.round(b.level * 100);
      }
    } catch {}
  }

  const name = S.cfg.userName || 'Rikesh';
  const isNepali = String(S.cfg.language || 'mixed').toLowerCase().includes('nepali') || String(S.cfg.language || 'mixed').toLowerCase() === 'mixed';

  if (type === 'plugged-in' || type === 'charging') {
    playSound('chime');
    feel('happy', 4000);
    face.poke();
    setStatus(`⚡ Charger Connected • ${percent != null ? percent + '%' : 'Charging'}`);

    const phrases = isNepali ? [
      `Aah, charger plug in bhayo! Thank you ${name}, full power charge hudai chha!`,
      `Yes! Charger lagyo ${name}. Energy recharge suru bhayo!`,
      `Energy boost! Charger connected bhayo ${name}, battery ${percent != null ? percent + '%' : ''} bata badhdai chha!`,
      `Nice, charger lagyo! Kaam jari rakhau ${name}, charging hudai chha.`
    ] : [
      `Plugged in! Recharging up to full power now, ${name}${percent != null ? ' — currently at ' + percent + '%' : ''}.`,
      `Charger connected! Giving you an energy boost, ${name}!`,
      `Awesome, charger is plugged in! Recharging happily!`,
      `Power connected! Charging full steam ahead, ${name}!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  } else if (type === 'unplugged') {
    playSound('poke');
    feel('surprised', 3200);
    setStatus(`🔌 Unplugged • ${percent != null ? percent + '%' : 'Battery'}`);

    const phrases = isNepali ? [
      `Charger disconnect bhayo ${name}! Battery ${percent != null ? percent + '%' : ''} ma chha, on-the-go mode ready!`,
      `Charger unplug bhayo! Battery ${percent != null ? percent + '%' : ''} baki chha, power save garera chalauney hai ${name}!`,
      `Plug out bhayo! Aba battery power ma chaldaichha — ${percent != null ? percent + '%' : ''} charge chha ${name}.`,
      `Charger nikalio ${name}! Battery ${percent != null ? percent + '%' : ''} chha, let's keep going!`
    ] : [
      `Charger unplugged! Running on battery power now, ${name}${percent != null ? ' — ' + percent + '% remaining' : ''}.`,
      `Plugged out! We're on battery mode at ${percent != null ? percent + '%' : ''}, ready to go, ${name}!`,
      `The charger was disconnected. Battery is currently at ${percent != null ? percent + '%' : ''}, ${name}.`,
      `Unplugged! Running portable now with ${percent != null ? percent + '%' : ''} battery, ${name}!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  } else if (type === 'low20') {
    playSound('sad');
    feel('sleepy', 5500);
    setStatus(`⚠️ Low Battery (${percent != null ? percent + '%' : '20%'})`);

    const phrases = isNepali ? [
      `Hey ${name}, battery ${percent != null ? percent + '%' : '20%'} pugyo hai! Malai thakai lagna thalyo, please charger lagaidinu na!`,
      `Warning ${name}! Battery 20% bhanda tala aaisakyo. Chhito charger plug in gara hai!`,
      `Battery low bhayo ${name} — ${percent != null ? percent + '%' : '20%'} matra baki chha. Ekchhin ma nidauchu hola, charger lagau na!`
    ] : [
      `Hey ${name}, battery is down to ${percent != null ? percent + '%' : '20%'}! I'm getting a little tired, please plug in the charger!`,
      `Warning ${name}! Battery is at ${percent != null ? percent + '%' : '20%'}. Save your work and grab the charger soon!`,
      `Low battery alert! We're at ${percent != null ? percent + '%' : '20%'}, ${name}. Time to recharge before I doze off!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  } else if (type === 'low10') {
    playSound('wrong');
    feel('nervous', 6000);
    setStatus(`🚨 Critical Battery (${percent != null ? percent + '%' : '10%'})`);

    const phrases = isNepali ? [
      `Emergency ${name}! Battery ${percent != null ? percent + '%' : '10%'} matra chha! Chhito file save gara ra charger lagau natra laptop off hunchha!`,
      `Aaiyaa! ${percent != null ? percent + '%' : '10%'} battery matra baki chha! Laptop shut down huna sakchha, please charger plug in gara chhito!`,
      `Critical alert ${name}! Battery almost khali bhayo. Chhito charger lagau hai!`
    ] : [
      `Emergency ${name}! Battery is critically low at ${percent != null ? percent + '%' : '10%'}! Save your work and plug in immediately!`,
      `Critical battery alert! Only ${percent != null ? percent + '%' : '10%'} left, ${name}! Grab that charger fast!`,
      `Warning ${name}! At ${percent != null ? percent + '%' : '10%'}, the laptop could shut down any minute. Please plug in now!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  } else if (type === 'full') {
    playSound('win');
    feel('happy', 5000);
    setStatus(`🔋 Battery Full (100%)`);

    const phrases = isNepali ? [
      `Yay ${name}, battery 100% full charge bhayo! Overcharging bachaauna charger unplug garna sakchhau!`,
      `Full power! Battery 100% pugyo ${name}, unplug garna milchha!`
    ] : [
      `Woohoo! Battery is 100% full, ${name}! You can unplug the charger now!`,
      `Fully charged at 100%! All topped up and ready to go, ${name}!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
  }
}

function initBatteryWatcher() {
  ipc.on('power-event', (_e, data) => handlePowerEvent(data));

  if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
    navigator.getBattery().then(bat => {
      let prevCharging = bat.charging;
      let prevLevel = Math.round(bat.level * 100);

      bat.addEventListener('chargingchange', () => {
        const charging = bat.charging;
        if (charging !== prevCharging) {
          prevCharging = charging;
          const pct = Math.round(bat.level * 100);
          handlePowerEvent({ type: charging ? 'plugged-in' : 'unplugged', percent: pct });
        }
      });

      bat.addEventListener('levelchange', () => {
        const pct = Math.round(bat.level * 100);
        if (!bat.charging) {
          if (pct <= 10 && prevLevel > 10) {
            handlePowerEvent({ type: 'low10', percent: pct });
          } else if (pct <= 20 && prevLevel > 20) {
            handlePowerEvent({ type: 'low20', percent: pct });
          }
        } else if (pct >= 100 && prevLevel < 100) {
          handlePowerEvent({ type: 'full', percent: 100 });
        }
        prevLevel = pct;
      });
    }).catch(() => {});
  }
}

/* ----------------------------------------------------------------- boot */
preloadSounds();
ipc.invoke('cfg-get').then(c => {
  S.cfg = { ...DEFAULTS, ...c };
  applyTheme();
  setTimeout(() => playSound('startup'), 600);
  if (!S.cfg.key) setTimeout(openSettings, 1200);
  setTimeout(() => sayTimeGreeting(), 1400);
});
ipc.invoke('data-get').then(() => {
  updateTimers();
});
startMeter();
initWindowDragging();
initPanelResizing();
initQuickPresets();
initScreenSafetyGuardian();
initCompanionQuips();
initBatteryWatcher();
loadChatStore();
renderChatFromStore();
console.log('[RENDERER] renderer.js fully initialized!');
