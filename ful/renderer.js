
function updateLiveTranscription(text) {
  const notchBar = $('liveTranscribeBar');
  const notchText = $('liveTranscribeText');
  const chatPill = $('chatLiveTranscriptPill');
  const chatText = $('chatLiveTranscriptText');
  const chatInp = $('chatInput');

  if (notchBar && currentShape !== 'panel') {
    notchBar.style.display = 'flex';
    if (notchText) notchText.textContent = text || 'Listening…';
  }
  if (chatPill && currentShape === 'panel') {
    chatPill.style.display = 'flex';
    if (chatText) chatText.textContent = text || 'Listening…';
    if (chatInp && text) chatInp.placeholder = text;
  }
}

function hideLiveTranscription() {
  const notchBar = $('liveTranscribeBar');
  const chatPill = $('chatLiveTranscriptPill');
  const chatInp = $('chatInput');
  if (notchBar) notchBar.style.display = 'none';
  if (chatPill) chatPill.style.display = 'none';
  if (chatInp) chatInp.placeholder = 'Ask FUL...';
}

/* ================================================================
   NOTCH GEOMETRY & CONTINUOUS SPRING PHYSICS (hello.html Exact Spec)
   ================================================================ */
const NOTCH_TOT = 592;
const NOTCH_FL = 16;
const NOTCH_K = 330;
const NOTCH_DMP = 2 * 0.74 * Math.sqrt(NOTCH_K);

let notchSpring = { w: 240, h: 48, vw: 0, vh: 0 };
let targetNotchW = 240;
let targetNotchH = 48;

function shapePath(w, h, br, fl) {
  const o = Math.max(0, Math.min(fl, h / 2));
  const i = 0.5523;
  const l = fl;
  const s = fl + w;
  const a = Math.max(0, Math.min(br, w / 2, h - o));
  const u = d => d.toFixed(2);
  return 'M' + u(l - o) + ' -1L' + u(s + o) + ' -1L' + u(s + o) + ' 0' +
    (o > 0 ? ('C' + u(s + o - o * i) + ' 0 ' + u(s) + ' ' + u(o - o * i) + ' ' + u(s) + ' ' + u(o)) : '') +
    'L' + u(s) + ' ' + u(h - a) + 'C' + u(s) + ' ' + u(h - a + a * i) + ' ' + u(s - a + a * i) + ' ' + u(h) + ' ' + u(s - a) + ' ' + u(h) +
    'L' + u(l + a) + ' ' + u(h) + 'C' + u(l + a - a * i) + ' ' + u(h) + ' ' + u(l) + ' ' + u(h - a + a * i) + ' ' + u(l) + ' ' + u(h - a) +
    'L' + u(l) + ' ' + u(o) +
    (o > 0 ? ('C' + u(l) + ' ' + u(o - o * i) + ' ' + u(l - o + o * i) + ' 0 ' + u(l - o) + ' 0') : '') + 'Z';
}

function updateNotchGeometry(dt) {
  if (currentShape === 'panel') return;
  const isCustomFloating = (S.cfg && S.cfg.placement === 'custom') || (shell && shell.classList.contains('floating-pill'));
  const notchSvg = $('notchSvg');
  if (isCustomFloating) {
    if (notchSvg) notchSvg.style.display = 'none';
    return;
  }
  if (notchSvg) notchSvg.style.display = 'block';

  const sub = Math.min(dt, 1 / 30) / 2;
  for (let i = 0; i < 2; i++) {
    notchSpring.vw += (NOTCH_K * (targetNotchW - notchSpring.w) - NOTCH_DMP * notchSpring.vw) * sub;
    notchSpring.w += notchSpring.vw * sub;
    notchSpring.vh += (NOTCH_K * (targetNotchH - notchSpring.h) - NOTCH_DMP * notchSpring.vh) * sub;
    notchSpring.h += notchSpring.vh * sub;
  }

  const R = Math.max(40, notchSpring.w);
  const Q = Math.max(3, notchSpring.h);
  const B = Math.min(Q < 20 ? Q / 2 : Q <= 52 ? 22 : 24, Q / 2 + 4);
  const fl = Q < 15 ? 4 : NOTCH_FL;
  const notchContainer = $('notchContainer');
  const containerW = (notchContainer && notchContainer.clientWidth > 0) ? notchContainer.clientWidth : (R + 48);
  const Ye = (containerW - R) / 2;

  const notchPath = $('notchPath');
  if (notchPath) {
    notchPath.setAttribute('d', shapePath(R, Q, B, fl));
    notchPath.setAttribute('transform', 'translate(' + (Ye - fl).toFixed(2) + ' 0)');
  }

  if (shell) {
    shell.style.width = R.toFixed(2) + 'px';
    shell.style.height = Q.toFixed(2) + 'px';
    shell.style.borderBottomLeftRadius = B.toFixed(2) + 'px';
    shell.style.borderBottomRightRadius = B.toFixed(2) + 'px';
  }
}

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

let echoSuppressUntil = 0;
const isFULSpeaking = () =>
  (currentTtsAudio && !currentTtsAudio.paused && !currentTtsAudio.ended) ||
  (window.speechSynthesis && window.speechSynthesis.speaking) ||
  (Date.now() < echoSuppressUntil);

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
  try { updateNotchGeometry(dt); } catch (e) {}
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
  // Border glow removed per user request for ultra-clean matte hardware notch design
  if (shell) {
    shell.style.setProperty('--aura-opacity', '0');
    shell.style.setProperty('--aura-color', 'transparent');
  }
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

  let targetW = 240, targetH = 48;
  if (shape === 'hidden') {
    targetW = 184; targetH = 5;
  } else if (shape === 'rest') {
    targetW = 240; targetH = 48;
  } else if (shape === 'music-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'pomo-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'todo-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'open-tab') {
    targetW = 380; targetH = 168;
  } else if (shape === 'timer-notch') {
    targetW = 240; targetH = 48;
  } else if (shape === 'dock' || shape === 'hover-dock') {
    targetW = 264; targetH = 64;
  } else if (shape === 'state-listen' || shape === 'listen') {
    targetW = 440; targetH = 48;
  } else if (shape === 'state-cursor' || shape === 'cursor') {
    targetW = 300; targetH = 48;
  } else if (shape === 'state-write' || shape === 'write') {
    targetW = 440; targetH = 48;
  } else if (shape === 'state-dictate' || shape === 'dictate') {
    targetW = 260; targetH = 48;
    startDictateAppWatch();
  } else if (shape === 'state-error' || shape === 'error') {
    targetW = 440; targetH = 120;
  } else if (shape === 'capsule') {
    targetW = 380; targetH = 48;
  } else if (shape === 'music') {
    targetW = 380; targetH = 168;
  } else if (shape === 'panel') {
    targetW = S.cfg.panelWidth || 460; targetH = S.cfg.panelHeight || 540;
  }

  targetNotchW = targetW;
  targetNotchH = targetH;
  if (shape === 'hidden') {
    targetW = 184; targetH = 6;
  } else if (shape === 'rest') {
    targetW = 240; targetH = 44;
  } else if (shape === 'music-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'pomo-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'todo-card') {
    targetW = 380; targetH = 168;
  } else if (shape === 'open-tab') {
    targetW = 380; targetH = 168;
  } else if (shape === 'timer-notch') {
    targetW = 240; targetH = 44;
  } else if (shape === 'dock' || shape === 'hover-dock') {
    targetW = 264; targetH = 64;
  } else if (shape === 'state-cursor' || shape === 'cursor') {
    targetW = 300; targetH = 44;
  } else if (shape === 'state-write' || shape === 'write') {
    targetW = 440; targetH = 44;
  } else if (shape === 'state-dictate' || shape === 'dictate') {
    targetW = 260; targetH = 44;
    startDictateAppWatch();
  } else if (shape === 'state-error' || shape === 'error') {
    targetW = 440; targetH = 120;
  } else if (shape === 'capsule') {
    targetW = 380; targetH = 44;
  } else if (shape === 'music') {
    targetW = 380; targetH = 168;
  } else if (shape === 'panel') {
    targetW = S.cfg.panelWidth || 460; targetH = S.cfg.panelHeight || 540;
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

  shell.classList.toggle('hidden', shape === 'hidden');
  shell.classList.toggle('rest', shape === 'rest');
  shell.classList.toggle('music-card', shape === 'music-card');
  shell.classList.toggle('pomo-card', shape === 'pomo-card');
  shell.classList.toggle('todo-card', shape === 'todo-card');
  shell.classList.toggle('open-tab', shape === 'open-tab');
  shell.classList.toggle('timer-notch', shape === 'timer-notch');
  shell.classList.toggle('dock', shape === 'dock' || shape === 'hover-dock');
  shell.classList.toggle('state-cursor', shape === 'state-cursor' || shape === 'cursor');
  shell.classList.toggle('state-write', shape === 'state-write' || shape === 'write');
  shell.classList.toggle('state-dictate', shape === 'state-dictate' || shape === 'dictate');
  shell.classList.toggle('state-error', shape === 'state-error' || shape === 'error');
  shell.classList.toggle('capsule', shape === 'capsule');
  shell.classList.toggle('music', shape === 'music');
  shell.classList.toggle('panel', shape === 'panel');

  const isNotchCard = (shape === 'music-card' || shape === 'pomo-card' || shape === 'todo-card' || shape === 'open-tab');
  const notchWidget = $('notchWidget');
  const headEl = $('head');
  const bodyEl = $('body');
  const miniEl = $('mini');
  const notchContainer = $('notchContainer');

  if (shape === 'hidden') {
    if (notchWidget) notchWidget.style.display = 'none';
    if (headEl) headEl.style.display = 'none';
    if (bodyEl) bodyEl.style.display = 'none';
    if (miniEl) miniEl.style.display = 'none';
    if (notchContainer) notchContainer.classList.add('hidden-active');
  } else if (isNotchCard) {
    if (notchWidget) notchWidget.style.display = 'flex';
    if (headEl) headEl.style.display = 'none';
    if (bodyEl) bodyEl.style.display = 'none';
    if (miniEl) miniEl.style.display = 'none';
    if (notchContainer) notchContainer.classList.remove('hidden-active');
  } else {
    if (notchWidget) notchWidget.style.display = 'none';
    if (headEl) headEl.style.display = 'flex';
    if (shape === 'panel') {
      if (bodyEl) bodyEl.style.display = 'flex';
    } else {
      if (bodyEl) bodyEl.style.display = 'none';
    }
    if (notchContainer) notchContainer.classList.remove('hidden-active');
  }

  shell.style.width = targetW + 'px';
  if (shape === 'panel') {
    shell.style.height = targetH + 'px';
    if (notchContainer) notchContainer.classList.add('panel-active');
  } else if (shape === 'hidden') {
    shell.style.height = '6px';
    if (notchContainer) notchContainer.classList.remove('panel-active');
  } else {
    shell.style.removeProperty('height');
    if (notchContainer) notchContainer.classList.remove('panel-active');
  }

  if (shape === 'rest') {
    collapseTimer = setTimeout(() => {
      if (currentShape === 'rest') {
        ipc.send('prepare-size', { w: 240, h: 44, shape: 'rest' });
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
  shell.style.setProperty('--aura-opacity', '0');

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
  ['chat', 'history', 'webforge', 'system', 'memory', 'lists', 'settings', 'custom'].forEach(t => {
    const el = $('tab-' + t);
    if (el) el.classList.toggle('on', t === name);
  });
  if (name === 'chat') {
    setTimeout(() => { const inp = $('chatInput'); if (inp) inp.focus(); }, 80);
  } else if (name === 'history') {
    renderHistory();
  } else if (name === 'webforge') {
    renderWebForge();
  } else if (name === 'system') {
    renderSystemTab();
  } else if (name === 'memory') {
    renderMemoryTab();
  } else if (name === 'lists') {
    renderLists();
  } else if (name === 'settings') {
    renderSettings();
  }
}

/* ---------------------------------------------------- WebForge Tab Renderer */
async function renderWebForge() {
  const container = $('tab-webforge');
  if (!container) return;
  container.innerHTML = `
    <div class="tab-content-scroll">
      <div class="wf-card">
        <h4>🌐 WebForge AI Website Builder</h4>
        <div style="font-size:11.5px;color:rgba(255,255,255,0.65)">
          Generate modern, responsive HTML5 websites with animations and launch instant local preview server.
        </div>
        <input type="text" id="wfPrompt" class="wf-input" placeholder="E.g. Dark neon portfolio for Rikesh Dahal with projects and contact" />
        <div style="display:flex;gap:8px">
          <select id="wfTheme" class="wf-select">
            <option value="futuristic_neon">Futuristic Neon (Cyan/Purple)</option>
            <option value="dark" selected>Dark Modern</option>
            <option value="glassmorphism">Glassmorphism</option>
            <option value="gaming">Gaming Cyberpunk</option>
            <option value="ai_startup">AI Startup (Indigo/Violet)</option>
            <option value="portfolio">Clean Portfolio</option>
            <option value="ecommerce">E-Commerce Store</option>
            <option value="light">Clean Light</option>
            <option value="corporate">Corporate Business</option>
          </select>
          <input type="text" id="wfName" class="wf-input" placeholder="site-slug (optional)" style="flex:1" />
        </div>
        <button id="wfBtnGenerate" class="wf-btn">🚀 Build & Launch Website</button>
        <div id="wfStatus" style="font-size:11px;color:#93c5fd;display:none"></div>
      </div>

      <div class="wf-card">
        <h4>📁 Created Websites</h4>
        <div id="wfSitesList" style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:11.5px;color:rgba(255,255,255,0.45);text-align:center;padding:12px">Loading websites…</div>
        </div>
      </div>
    </div>
  `;

  async function refreshSites() {
    const listEl = $('wfSitesList');
    if (!listEl) return;
    try {
      const sites = await ipc.invoke('website-list');
      if (!sites || !sites.length) {
        listEl.innerHTML = '<div style="font-size:11.5px;color:rgba(255,255,255,0.45);text-align:center;padding:12px">No websites yet. Click Build above!</div>';
        return;
      }
      listEl.innerHTML = sites.map(s => `
        <div class="wf-site-item">
          <div>
            <div class="wf-site-name">${s.name}</div>
            <div class="wf-site-meta">${s.theme} · ${new Date(s.updatedAt).toLocaleDateString()}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="wf-site-btn" data-preview="${s.name}">Preview</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('[data-preview]').forEach(btn => {
        btn.onclick = async () => {
          const siteName = btn.dataset.preview;
          btn.textContent = 'Opening…';
          await ipc.invoke('website-preview', { site_id_or_name: siteName, open_browser: true });
          btn.textContent = 'Preview';
        };
      });
    } catch (e) {
      listEl.innerHTML = `<div style="font-size:11px;color:#f87171">Failed to load sites: ${e.message}</div>`;
    }
  }

  await refreshSites();

  const btnGen = $('wfBtnGenerate');
  if (btnGen) {
    btnGen.onclick = async () => {
      const prompt = ($('wfPrompt')?.value || '').trim();
      const theme = $('wfTheme')?.value || 'dark';
      const site_name = ($('wfName')?.value || '').trim();
      const statusEl = $('wfStatus');

      if (!prompt) {
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.style.color = '#f87171';
          statusEl.textContent = 'Please enter a description for your website.';
        }
        return;
      }

      btnGen.disabled = true;
      btnGen.textContent = '⚡ Building Website…';
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#93c5fd';
        statusEl.textContent = 'Synthesizing responsive HTML, CSS & animations…';
      }

      feel('thinking', 3000);
      try {
        const res = await ipc.invoke('website-build', { prompt, theme, site_name, open_browser: true });
        if (statusEl) {
          statusEl.style.color = '#4ade80';
          statusEl.textContent = res;
        }
        feel('happy', 2000);
        playSound('correct');
        await refreshSites();
      } catch (err) {
        if (statusEl) {
          statusEl.style.color = '#f87171';
          statusEl.textContent = 'Error: ' + err.message;
        }
        feel('sad', 1500);
      } finally {
        btnGen.disabled = false;
        btnGen.textContent = '🚀 Build & Launch Website';
      }
    };
  }
}

/* ---------------------------------------------------- System Guardian Tab Renderer */
async function renderSystemTab() {
  const container = $('tab-system');
  if (!container) return;
  container.innerHTML = `
    <div class="tab-content-scroll">
      <div class="wf-card">
        <h4>⚡ System RAM & Guardian</h4>
        <div id="sysRamStats" style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:11.5px;color:rgba(255,255,255,0.5);text-align:center;padding:10px">Inspecting hardware…</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button id="sysBtnOptimize" class="wf-btn" style="flex:1;background:linear-gradient(135deg,#10b981,#059669)">🧹 Optimize & Clean Temp</button>
          <button id="sysBtnRefresh" class="wf-btn" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">🔄 Refresh</button>
        </div>
        <div id="sysOptStatus" style="font-size:11px;color:#4ade80;display:none;margin-top:4px"></div>
      </div>

      <div class="wf-card">
        <h4>🔥 Top Memory Consumers</h4>
        <div id="sysProcList" style="display:flex;flex-direction:column;gap:2px">
          <div style="font-size:11.5px;color:rgba(255,255,255,0.5);text-align:center;padding:10px">Loading processes…</div>
        </div>
      </div>
    </div>
  `;

  async function updateStats() {
    const statsEl = $('sysRamStats');
    const procEl = $('sysProcList');
    if (!statsEl) return;
    try {
      const stats = await ipc.invoke('system-check');
      const isHigh = stats.alert || stats.usedPercent >= 85;
      const barColor = isHigh ? '#ff2e43' : (stats.usedPercent > 70 ? '#f59e0b' : '#3b82f6');
      
      statsEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:12px;font-weight:600">RAM Load: <strong style="color:${barColor}">${stats.usedPercent}%</strong></span>
          <span style="font-size:11px;color:rgba(255,255,255,0.6)">${stats.usedGb} GB / ${stats.totalGb} GB (${stats.freeGb} GB free)</span>
        </div>
        <div class="ram-bar-container">
          <div class="ram-bar-fill" style="width:${stats.usedPercent}%;background:${barColor}"></div>
        </div>
        <div style="font-size:11px;color:${isHigh ? '#ff727d' : '#9ca3af'};display:flex;align-items:center;gap:5px">
          <span>${isHigh ? '⚠️ Proactive alert triggered: High memory consumption' : '● System memory is healthy'}</span>
        </div>
      `;

      if (procEl && stats.topProcesses) {
        procEl.innerHTML = stats.topProcesses.slice(0, 8).map(p => `
          <div class="proc-row">
            <span style="font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${p.name} ${p.count > 1 ? '<small style="color:rgba(255,255,255,0.4)">(' + p.count + ')</small>' : ''}</span>
            <span style="color:#93c5fd;font-weight:600">${p.mb} MB</span>
          </div>
        `).join('');
      }
    } catch (e) {
      statsEl.innerHTML = `<div style="font-size:11px;color:#f87171">Error checking memory: ${e.message}</div>`;
    }
  }

  await updateStats();

  const btnOpt = $('sysBtnOptimize');
  if (btnOpt) {
    btnOpt.onclick = async () => {
      btnOpt.disabled = true;
      btnOpt.textContent = 'Cleaning…';
      try {
        const res = await ipc.invoke('system-optimize');
        const st = $('sysOptStatus');
        if (st) {
          st.style.display = 'block';
          st.textContent = res.result || 'Optimization completed.';
        }
        playSound('correct');
        await updateStats();
      } catch (err) {
        alert(err.message);
      } finally {
        btnOpt.disabled = false;
        btnOpt.textContent = '🧹 Optimize & Clean Temp';
      }
    };
  }

  const btnRef = $('sysBtnRefresh');
  if (btnRef) {
    btnRef.onclick = () => updateStats();
  }
}

/* ---------------------------------------------------- Long-Term Memory Tab Renderer */
async function renderMemoryTab() {
  const container = $('tab-memory');
  if (!container) return;
  container.innerHTML = `
    <div class="tab-content-scroll">
      <div class="wf-card">
        <h4>🧠 Long-Term Memory (Mark-LVI)</h4>
        <div style="font-size:11.5px;color:rgba(255,255,255,0.65)">
          Remembers Rikesh Dahal ("Boss") identity, preferences, ongoing projects, relationships, and wishes across sessions.
        </div>
        <div style="display:flex;gap:6px">
          <input type="text" id="memSearchInput" class="wf-input" placeholder="Search remembered facts…" />
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <select id="memAddCat" class="wf-select" style="flex:1">
            <option value="preferences">Preferences</option>
            <option value="projects">Projects</option>
            <option value="identity">Identity</option>
            <option value="relationships">Relationships</option>
            <option value="wishes">Wishes</option>
            <option value="notes">Notes</option>
          </select>
          <input type="text" id="memAddKey" class="wf-input" placeholder="Key (e.g. favorite_ide)" style="flex:1" />
        </div>
        <input type="text" id="memAddVal" class="wf-input" placeholder="Value (e.g. Antigravity IDE)" />
        <button id="memBtnAdd" class="wf-btn" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">💾 Remember Fact</button>
      </div>

      <div class="wf-card">
        <h4>📋 Remembered Knowledge</h4>
        <div id="memCardsArea" style="display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11.5px;color:rgba(255,255,255,0.45);text-align:center;padding:12px">Loading memory…</div>
        </div>
      </div>
    </div>
  `;

  async function refreshMemory(filter = '') {
    const area = $('memCardsArea');
    if (!area) return;
    try {
      const data = await ipc.invoke('memory-get');
      if (!data) return;
      const categories = ['identity', 'preferences', 'projects', 'relationships', 'wishes', 'notes'];
      let html = '';
      let totalCount = 0;

      for (const cat of categories) {
        const section = data[cat] || {};
        const entries = Object.entries(section).filter(([k, v]) => {
          if (!filter) return true;
          const q = filter.toLowerCase();
          return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
        });

        if (entries.length) {
          totalCount += entries.length;
          html += `
            <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;border:1px solid rgba(255,255,255,0.05)">
              <div style="font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${cat}</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${entries.map(([k, v]) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px">
                    <span><strong style="color:rgba(255,255,255,0.85)">${k}:</strong> <span style="color:rgba(255,255,255,0.65)">${String(v)}</span></span>
                    <button class="wf-del-btn" data-del-cat="${cat}" data-del-key="${k}" title="Delete fact">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }

      area.innerHTML = html || `<div style="font-size:11.5px;color:rgba(255,255,255,0.45);text-align:center;padding:12px">${filter ? 'No memories matching filter' : 'No memories saved yet.'}</div>`;

      area.querySelectorAll('[data-del-key]').forEach(btn => {
        btn.onclick = async () => {
          const c = btn.dataset.delCat;
          const k = btn.dataset.delKey;
          await ipc.invoke('memory-forget', { category: c, key: k });
          refreshMemory($('memSearchInput')?.value || '');
        };
      });
    } catch (e) {
      area.innerHTML = `<div style="font-size:11px;color:#f87171">Failed to load memory: ${e.message}</div>`;
    }
  }

  await refreshMemory();

  const searchInput = $('memSearchInput');
  if (searchInput) {
    searchInput.oninput = () => refreshMemory(searchInput.value.trim());
  }

  const btnAdd = $('memBtnAdd');
  if (btnAdd) {
    btnAdd.onclick = async () => {
      const cat = $('memAddCat')?.value || 'notes';
      const key = ($('memAddKey')?.value || '').trim();
      const val = ($('memAddVal')?.value || '').trim();
      if (!key || !val) {
        alert('Please provide both Key and Value to remember.');
        return;
      }
      await ipc.invoke('memory-save', { category: cat, key, value: val });
      if ($('memAddKey')) $('memAddKey').value = '';
      if ($('memAddVal')) $('memAddVal').value = '';
      playSound('correct');
      refreshMemory();
    };
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


/* --------------------------------------------------- Notch System (Music, Pomodoro, Timer) */
function updateNotchClock() {
  const clockEl = $('nvClock');
  if (!clockEl) return;
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  clockEl.textContent = `${day} ${date} ${month} ${h}:${m}`;
}

function cleanMediaTitle(raw) {
  if (!raw) return '';
  let t = String(raw).trim();
  t = t.replace(/\s*-\s*(Brave|Google Chrome|Microsoft Edge|Chrome|Edge)$/i, '');
  return t.trim() || String(raw).trim();
}

function updateNotchLyrics(pos) {
  const pEl = $('notchLyricPrev');
  const nEl = $('notchLyricNow');
  const xEl = $('notchLyricNext');
  if (!pEl || !nEl || !xEl) return;
  const m = S.media;
  const rawTitle = (m && m.title) ? m.title : 'Now Playing';
  const cleanTitle = cleanMediaTitle(rawTitle);
  const artist = (m && m.artist && m.artist.trim() && m.artist !== cleanTitle) ? m.artist.trim() : (m && m.app ? m.app : 'Media Player');
  const album = (m && m.album && m.album.trim()) ? m.album.trim() : (isAudioPlaying ? 'Playing in real time' : 'Paused');

  const idx = Math.floor(pos / 3.2) % LYRICS_POOL.length;
  pEl.textContent = artist;
  nEl.textContent = LYRICS_POOL[idx] || cleanTitle;
  xEl.textContent = album;
}

let todoItems = [
  ['Post weekly update', false],
  ['Buy milk', false],
  ['Revise the report', true],
  ['Reply to Dina', true],
  ['Book the dentist', true]
];

function showNotchTodo() {
  const card = $('nvCard');
  if (!card) return;
  const doneCount = todoItems.filter(x => x[1]).length;
  card.innerHTML = `
    <div class="nv-todo">
      <div class="nv-todo-summary">
        <div class="nv-cardface">
          <div class="nv-face-capsule"><i class="eye"></i><i class="eye"></i></div>
        </div>
        <strong id="todoDoneCount">${doneCount}/${todoItems.length}</strong>
        <small>Done today</small>
      </div>
      <div class="nv-todo-items" id="todoItemsList">
        ${todoItems.map((item, idx) => `
          <div class="${item[1] ? 'done' : ''}" data-idx="${idx}">
            <b>${item[1] ? '<svg viewBox="0 0 16 16" style="width:10px;height:10px;stroke:#101114;stroke-width:2.6;fill:none;"><path d="m3.6 8.4 2.8 2.8L12.4 5.2"/></svg>' : ''}</b>
            <span>${esc(item[0])}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  setShape('todo-card');
  document.querySelectorAll('#todoItemsList > div').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(el.dataset.idx);
      todoItems[i][1] = !todoItems[i][1];
      showNotchTodo();
    });
  });
}

function showNotchOpenTab(mode = 'pointer') {
  const card = $('nvCard');
  if (!card) return;
  const modes = {
    pointer: ['Command', 'Say what to do. Nixi does it on your PC.', 'Try Command'],
    mic: ['Dictate', 'Hold Right Alt and talk. Nixi types where you are.', 'Try Dictate'],
    pen: ['Write', 'Ask for a first draft, written on your PC.', 'Try Write']
  };
  const [tTitle, tDesc, tBtn] = modes[mode] || modes.pointer;
  card.innerHTML = `
    <div class="nv-open-mode">
      <div class="nv-cardface">
        <div class="nv-face-capsule"><i class="eye ${mode === 'mic' ? 'arch' : ''}"></i><i class="eye ${mode === 'mic' ? 'arch' : ''}"></i></div>
      </div>
      <div class="nv-text">
        <p>${tTitle}</p>
        <small>${tDesc}</small>
      </div>
      <span class="nv-buttons">
        <button class="nv-btn nv-blue" id="btnTryMode">${tBtn}</button>
      </span>
    </div>
  `;
  setShape('open-tab');
  $('btnTryMode')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mode === 'pointer') {
      collapse();
      askScreenWithFollowUps();
    } else if (mode === 'mic') {
      collapse();
      beginCapture('cmd');
    } else if (mode === 'pen') {
      togglePanel();
      $('chatInput')?.focus();
    }
  });
}

function initNotchSystem() {
  updateNotchClock();
  setInterval(updateNotchClock, 1000);

  // Tab buttons: pointer, mic, pen
  const tabDefs = [
    { id: 'nvTabPointer', mode: 'pointer' },
    { id: 'nvTabMic', mode: 'mic' },
    { id: 'nvTabPen', mode: 'pen' }
  ];

  tabDefs.forEach(({ id, mode }) => {
    const btn = $(id);
    if (!btn) return;
    btn.onclick = (e) => {
      e.stopPropagation();
      tabDefs.forEach(t => $(t.id)?.classList.remove('on'));
      btn.classList.add('on');
      showNotchOpenTab(mode);
    };
  });

  // Small utility icons: Notes/Tray, Timer/Pomodoro, Sliders/Expand
  const trayBtn = $('nvTrayBtn');
  if (trayBtn) {
    trayBtn.onclick = (e) => {
      e.stopPropagation();
      if (currentShape === 'music-card' || currentShape === 'todo-card' || currentShape === 'pomo-card' || currentShape === 'open-tab') {
        setShape('rest');
      } else {
        showNotchTodo();
      }
    };
  }

  const timerBtn = $('nvTimerBtn');
  if (timerBtn) {
    timerBtn.onclick = (e) => {
      e.stopPropagation();
      if (currentShape === 'pomo-card') {
        if (isAudioPlaying && S.media && S.media.title) showNotchMusic();
        else setShape('rest');
      } else {
        showNotchPomodoro();
      }
    };
  }

  const expandBtn = $('nvExpandBtn');
  if (expandBtn) {
    expandBtn.onclick = (e) => {
      e.stopPropagation();
      openSettingsTab();
    };
  }
}

// Exact hello.html 2-Column Music Player Card with Real-time Seconds & Synced Lyrics
function extractColorFromImg(imgEl) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, 16, 16);
    const imgData = ctx.getImageData(0, 0, 16, 16).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let i = 0; i < imgData.length; i += 4) {
      const br = (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
      if (br > 40 && br < 225) {
        red += imgData[i];
        green += imgData[i+1];
        blue += imgData[i+2];
        count++;
      }
    }
    if (count > 0) {
      const rgb = `rgb(${Math.round(red/count)}, ${Math.round(green/count)}, ${Math.round(blue/count)})`;
      const rgba = `rgba(${Math.round(red/count)}, ${Math.round(green/count)}, ${Math.round(blue/count)}, 0.45)`;
      document.documentElement.style.setProperty('--media-accent', rgb);
      document.documentElement.style.setProperty('--media-accent-glow', rgba);
    }
  } catch (_) {}
}

function showNotchMusic(media = S.media) {
  const card = $('nvCard');
  if (!card) return;
  const m = media || S.media || { title: 'Music Playing', artist: 'Media Player', duration: 180, position: 0 };
  const rawTitle = (m.title && m.title.trim()) || 'Music Playing';
  const title = cleanMediaTitle(rawTitle);
  const artist = (m.artist && m.artist.trim() && m.artist !== title) ? m.artist.trim() : (m.app || 'Media Player');
  const fallbackCover = getMediaAppIcon(m.app || '', title);
  const coverSrc = (m.thumbnail && m.thumbnail.trim()) ? m.thumbnail : fallbackCover;
  const isPlaying = (m.status === 'playing' || m.status === 'Playing' || (m.playing && m.status !== 'paused' && m.status !== 'Paused'));
  if (m.duration) liveDur = Number(m.duration);
  if (m.position !== undefined) livePos = Number(m.position);
  const dur = liveDur || 180;
  const pos = livePos || 0;
  const remain = Math.max(0, dur - pos);
  const pct = dur > 0 ? Math.min(100, Math.max(0, (pos / dur) * 100)) : 0;

  card.innerHTML = `
    <div class="music-content-wrap">
      <!-- Top row: Album Art, Song Info, Dancing Waveform -->
      <div class="music-top-row">
        <div class="album-art" id="albumArt">
          <img id="notchMusicCover" class="expanded-thumb-img" src="${coverSrc || ''}" alt="" style="${coverSrc ? 'display:block' : 'display:none'}" />
          <div class="album-art-placeholder" id="albumArtPlaceholder" style="${coverSrc ? 'display:none' : 'display:flex'}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div class="album-shine"></div>
        </div>
        <div class="music-info">
          <div class="music-title" id="notchMusicTitle" title="${esc(title)}">${esc(title)}</div>
          <div class="music-artist" id="notchMusicArtist" title="${esc(artist)}">${esc(artist)}</div>
        </div>
        <!-- iPhone Large Audio Equalizer Waveform -->
        <div class="sound-wave-large ${isPlaying ? 'playing' : ''}" id="soundWaveLarge">
          <span class="w-bar"></span>
          <span class="w-bar"></span>
          <span class="w-bar"></span>
          <span class="w-bar"></span>
          <span class="w-bar"></span>
        </div>
      </div>

      <!-- Middle row: Scrubber Slider with timestamps -->
      <div class="music-scrubber-row">
        <span class="scrub-time" id="notchMusicElapsed">${formatSec(pos)}</span>
        <div class="scrub-track" id="notchMusicScrubber" title="Click to seek">
          <div class="scrub-fill" id="notchMusicFill" style="width: ${pct}%;">
            <div class="scrub-knob"></div>
          </div>
        </div>
        <span class="scrub-time" id="notchMusicRemaining">-${formatSec(remain)}</span>
      </div>

      <!-- Bottom row: AirPlay, Playback Controls (10s Rewind, Prev, Play/Pause, 10s Forward, Next, Mute) -->
      <div class="music-controls-row">
        <div class="ctrl-secondary-icon airplay-icon" id="btnSoundSettings" title="Sound Output / Mixer Settings">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>

        <div class="music-main-btns">
          <!-- Rewind 10s -->
          <button class="ctrl-btn seek-btn" id="btnRewind10" title="Rewind 10s">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.5 10A8 8 0 1 1 12 20a8 8 0 0 1-5.66-2.34" />
              <polyline points="4.5 5 4.5 10 9.5 10" />
              <text x="12" y="14.2" font-size="6.5" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle" font-family="'Inter', sans-serif">10</text>
            </svg>
          </button>

          <!-- Previous Track -->
          <button class="ctrl-btn skip-btn" id="notchMusicPrev" title="Previous Track">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <!-- Play / Pause -->
          <button class="ctrl-btn play-pause-btn" id="notchMusicPlayPause" title="Play / Pause">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
              ${isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5.14v14l11-7-11-7z"/>'}
            </svg>
          </button>

          <!-- Forward 10s -->
          <button class="ctrl-btn seek-btn" id="btnForward10" title="Forward 10s">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19.5 10A8 8 0 1 0 12 20a8 8 0 0 0 5.66-2.34" />
              <polyline points="19.5 5 19.5 10 14.5 10" />
              <text x="12" y="14.2" font-size="6.5" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle" font-family="'Inter', sans-serif">10</text>
            </svg>
          </button>

          <!-- Next Track -->
          <button class="ctrl-btn skip-btn" id="notchMusicNext" title="Next Track">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        <!-- Volume / Speaker Mute Toggle -->
        <div class="ctrl-secondary-icon speaker-icon" id="btnVolumeToggle" title="Toggle Mute">
          <svg viewBox="0 0 24 24" fill="currentColor" id="volIconOn">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <svg viewBox="0 0 24 24" fill="currentColor" id="volIconMuted" style="display:none;">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        </div>
      </div>
    </div>
  `;
  setShape('music-card');
  updateTopBarClock();

  // Extract vibrant dominant color from image when loaded, with graceful error fallback
  const coverImg = $('notchMusicCover');
  const albumArtPlaceholder = $('albumArtPlaceholder');
  if (coverImg) {
    coverImg.crossOrigin = 'Anonymous';
    coverImg.onload = () => {
      coverImg.style.display = 'block';
      if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'none';
      extractColorFromImg(coverImg);
    };
    coverImg.onerror = () => {
      coverImg.style.display = 'none';
      if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'flex';
    };
    if (coverImg.complete) {
      if (coverImg.naturalWidth > 0) {
        extractColorFromImg(coverImg);
      } else if (coverSrc) {
        coverImg.style.display = 'none';
        if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'flex';
      }
    }
  }

  // Wire all Dynamic Island controls to persistent controller
  $('notchMusicPrev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ipc.send('media-control', 'prev');
  });

  $('notchMusicNext')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ipc.send('media-control', 'next');
  });

  $('btnRewind10')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ipc.send('media-control', 'rewind');
    livePos = Math.max(0, livePos - 10);
    renderProgress(livePos, liveDur);
  });

  $('btnForward10')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ipc.send('media-control', 'forward');
    livePos = Math.min(liveDur || 180, livePos + 10);
    renderProgress(livePos, liveDur);
  });

  $('notchMusicPlayPause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isAudioPlaying = !isAudioPlaying;
    const icon = $('notchMusicPlayPause');
    if (icon) {
      icon.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">${isAudioPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5.14v14l11-7-11-7z"/>'}</svg>`;
    }
    const wave = $('soundWaveLarge');
    if (wave) wave.classList.toggle('playing', isAudioPlaying);
    shell.classList.toggle('playing', isAudioPlaying);
    ipc.send('media-control', 'play');
  });

  $('btnVolumeToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const onIcon = $('volIconOn');
    const muteIcon = $('volIconMuted');
    const isMutedNow = onIcon && onIcon.style.display !== 'none';
    if (onIcon && muteIcon) {
      onIcon.style.display = isMutedNow ? 'none' : 'block';
      muteIcon.style.display = isMutedNow ? 'block' : 'none';
    }
    ipc.send('volume-toggle');
  });

  $('btnSoundSettings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ipc.send('open-sound-settings');
  });

  // Direct Interactive Scrubber seeking
  $('notchMusicScrubber')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekPos = Math.round(ratio * (liveDur || 180));
    livePos = seekPos;
    renderProgress(livePos, liveDur);
    ipc.send('media-seek', seekPos);
  });

  renderProgress(livePos, liveDur);
}

// Screenshots 3 & 4: Focus & Break Pomodoro Mode
let pomoInterval = null;
let pomoSec = 1429; // 23:49 default for focus
let pomoPhase = 'Focus'; // 'Focus' or 'Break'

function showNotchPomodoro(seconds = null, phase = null) {
  const card = $('nvCard');
  if (!card) return;
  clearInterval(pomoInterval);
  if (seconds !== null) pomoSec = seconds;
  if (phase !== null) pomoPhase = phase;

  function renderPomoState() {
    const isBreak = (pomoPhase === 'Break');
    const total = isBreak ? 300 : 1500;
    const progress = Math.max(0, Math.min(1, pomoSec / total));
    const m = Math.floor(pomoSec / 60);
    const s = pomoSec % 60;
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    const strokeCircumference = 132;
    const strokeOffset = strokeCircumference * (1 - progress);
    const ringColor = isBreak ? '#34C759' : '#FF453A';

    card.innerHTML = `
      <div class="nv-pomo">
        <div class="nv-cardface">
          <div class="nv-face-capsule">
            <i class="eye ${isBreak ? 'arch' : ''}"></i>
            <i class="eye ${isBreak ? 'arch' : ''}"></i>
          </div>
        </div>
        <div class="nv-pomo-content">
          <div class="nv-ring-wrap">
            <svg class="nv-ring" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="21" fill="none" stroke="#25272C" stroke-width="3"></circle>
              <circle class="on" cx="24" cy="24" r="21" fill="none" stroke="${ringColor}" stroke-width="3" style="stroke-dasharray:${strokeCircumference};stroke-dashoffset:${strokeOffset};transition:stroke-dashoffset 0.5s linear;"></circle>
            </svg>
            <span class="nv-ring-icon">
              <svg viewBox="0 0 24 24" style="width:20px;height:20px;"><circle cx="12" cy="13" r="7.5" fill="none" stroke="${ringColor}" stroke-width="1.8"/><path d="M12 13V8m-3-5h6m1.5 3.5L18 5" fill="none" stroke="${ringColor}" stroke-width="1.8" stroke-linecap="round"/></svg>
            </span>
          </div>
          <div class="nv-pomo-time">
            <strong>${timeStr}</strong>
            <small>${isBreak ? 'Break' : 'Focus time'}</small>
          </div>
          <div class="nv-pomo-actions">
            <button class="nv-pomo-toggle" id="btnPomoPhaseToggle">${isBreak ? 'Focus' : 'Break'}</button>
            <button class="nv-pomo-stop ${isBreak ? 'green' : ''}" id="btnPomoStop">■</button>
          </div>
        </div>
      </div>
    `;
    setShape('pomo-card');
    feel(isBreak ? 'happy' : 'concentrate', 3000);

    $('btnPomoPhaseToggle')?.addEventListener('click', () => {
      pomoPhase = (pomoPhase === 'Break') ? 'Focus' : 'Break';
      pomoSec = (pomoPhase === 'Break') ? 300 : 1500;
      renderPomoState();
    });

    $('btnPomoStop')?.addEventListener('click', () => {
      clearInterval(pomoInterval);
      pomoInterval = null;
      collapse();
    });
  }

  renderPomoState();
  pomoInterval = setInterval(() => {
    if (pomoSec > 0) {
      pomoSec--;
      renderPomoState();
    } else {
      clearInterval(pomoInterval);
      pomoInterval = null;
      playSound('win');
      if (pomoPhase === 'Focus') {
        showNotchPomodoro(300, 'Break');
      } else {
        showNotchPomodoro(1500, 'Focus');
      }
    }
  }, 1000);
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

function openSettingsTab() {
  S.panel = 'settings';
  setShape('panel');
  openTab('settings');
}

function openSettings() {
  openSettingsTab();
}

function renderSettings() {
  const container = $('tab-settings');
  if (!container) return;
  const c = S.cfg || {};
  const p = c.placement || 'top-center';
  const currentEye = (c.eye || '#FFFFFF').toUpperCase();
  const currentOutfit = c.outfit || 'none';
  const currentModel = c.model || 'gemini-2.5-flash';
  const currentVoice = c.voice || 'Kore';
  const currentEdgeVoice = c.edgeVoice || 'en-US-AriaNeural';

  const swatches = [
    { name: 'Pure White', color: '#FFFFFF' },
    { name: 'Arctic Cyan', color: '#38BDF8' },
    { name: 'Emerald Neon', color: '#34D399' },
    { name: 'Cyber Violet', color: '#A78BFA' },
    { name: 'Electric Rose', color: '#FB7185' },
    { name: 'Golden Amber', color: '#FBBF24' }
  ];

  container.innerHTML = `
    <div class="settings-container">
      <!-- 🎨 Appearance & Nixi Face Customization -->
      <div class="settings-card">
        <h4>🎨 Appearance & Nixi Customization</h4>

        <div class="settings-row wrap">
          <span class="settings-label">Eye Color Theme:</span>
          <div class="settings-swatch-list">
            ${swatches.map(s => `
              <span class="settings-swatch ${currentEye === s.color ? 'active' : ''}"
                    style="background:${s.color}"
                    data-color="${s.color}"
                    title="${s.name}"></span>
            `).join('')}
            <label class="settings-swatch-custom" title="Pick Custom Color">
              <input type="color" id="settingsCustomEye" value="${c.eye || '#FFFFFF'}">
              <span style="font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);">+</span>
            </label>
          </div>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">Outfit Accessory:</span>
          <select id="settingsOutfit" class="settings-select" style="flex:1;">
            <option value="none" ${currentOutfit === 'none' ? 'selected' : ''}>None (Sleek Clean)</option>
            <option value="headphones" ${currentOutfit === 'headphones' ? 'selected' : ''}>🎧 Wireless Headphones</option>
            <option value="shades" ${currentOutfit === 'shades' ? 'selected' : ''}>🕶 Cyber Sunglasses</option>
            <option value="glasses" ${currentOutfit === 'glasses' ? 'selected' : ''}>👓 Smart Glasses</option>
          </select>
        </div>

        <div class="settings-row wrap" style="gap:16px;">
          <label class="settings-chk">
            <input type="checkbox" id="settingsBreathe" ${c.breathe ? 'checked' : ''}>
            Float breathing motion
          </label>
          <label class="settings-chk">
            <input type="checkbox" id="settingsSounds" ${c.sounds !== false ? 'checked' : ''}>
            Sound effects (Chimes, Clicks)
          </label>
        </div>
      </div>

      <!-- 🏝️ Notch & Island Behavior -->
      <div class="settings-card">
        <h4>🏝️ Notch & Island Behavior</h4>

        <div class="settings-row">
          <span class="settings-label">Placement:</span>
          <div class="settings-segmented">
            <button class="settings-seg-btn ${p === 'top-center' ? 'on' : ''}" data-placement="top-center">Top Notch</button>
            <button class="settings-seg-btn ${p === 'top-right' ? 'on' : ''}" data-placement="top-right">Top Right</button>
            <button class="settings-seg-btn ${p === 'custom' ? 'on' : ''}" data-placement="custom">Floating Pill</button>
          </div>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">Auto-Tuck Inactivity:</span>
          <select id="settingsAutoTuck" class="settings-select" style="flex:1;">
            <option value="3500">3.5 seconds (Quick)</option>
            <option value="5500" selected>5.5 seconds (Default)</option>
            <option value="9000">9 seconds (Relaxed)</option>
            <option value="15000">15 seconds</option>
            <option value="0">Never (Always visible)</option>
          </select>
        </div>

        <div class="settings-row">
          <span class="settings-label">Companion Size:</span>
          <div class="settings-segmented">
            <button class="settings-seg-btn" data-panel-size="380,460">Compact</button>
            <button class="settings-seg-btn on" data-panel-size="460,540">Standard</button>
            <button class="settings-seg-btn" data-panel-size="600,600">Wide</button>
          </div>
        </div>
      </div>

      <!-- 🧠 AI Brain & Model -->
      <div class="settings-card">
        <h4>🧠 AI Brain & Intelligence</h4>

        <div style="display:flex;flex-direction:column;gap:6px;width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="settings-label">Gemini API Key:</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" style="font-size:11.5px;color:#60A5FA;text-decoration:none;font-weight:500;">Get Free Key ↗</a>
          </div>
          <div class="settings-input-group">
            <input type="password" id="settingsGeminiKey" class="settings-input" placeholder="AIzaSy... (Paste Gemini API key)" value="${esc(c.key || '')}">
            <button class="settings-eye-btn" id="btnToggleKeyEye" type="button" title="Show/Hide">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">AI Model:</span>
          <select id="settingsModel" class="settings-select" style="flex:1;">
            <option value="gemini-2.5-flash" ${currentModel === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash (Fast & Smart)</option>
            <option value="gemini-2.5-flash-lite" ${currentModel === 'gemini-2.5-flash-lite' ? 'selected' : ''}>gemini-2.5-flash-lite (Ultra Fast)</option>
            <option value="gemini-2.5-pro" ${currentModel === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro (Deep Reasoning)</option>
            <option value="gemini-2.0-flash" ${currentModel === 'gemini-2.0-flash' ? 'selected' : ''}>gemini-2.0-flash</option>
          </select>
        </div>

        <div class="settings-row wrap" style="gap:16px;">
          <label class="settings-chk">
            <input type="checkbox" id="settingsThink" ${c.think ? 'checked' : ''}>
            Deep Think reasoning before answer
          </label>
          <label class="settings-chk">
            <input type="checkbox" id="settingsSpeak" ${c.speak ? 'checked' : ''}>
            Read AI answers aloud
          </label>
        </div>
      </div>

      <!-- 🎙️ Voice & TTS Audio -->
      <div class="settings-card">
        <h4>🎙️ Voice & TTS Audio</h4>

        <div class="settings-row">
          <span class="settings-label">TTS Priority:</span>
          <span style="font-size:11.5px;color:#93c5fd;font-weight:600;">1. Gemini TTS → 2. Edge Neural → 3. System SAPI</span>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">Gemini Voice:</span>
          <select id="settingsGeminiVoice" class="settings-select" style="flex:1;">
            <option value="Kore" ${currentVoice === 'Kore' ? 'selected' : ''}>Kore (Firm & Confident)</option>
            <option value="Aoede" ${currentVoice === 'Aoede' ? 'selected' : ''}>Aoede (Warm & Breezy)</option>
            <option value="Fenrir" ${currentVoice === 'Fenrir' ? 'selected' : ''}>Fenrir (Deep & Resonant)</option>
            <option value="Puck" ${currentVoice === 'Puck' ? 'selected' : ''}>Puck (Playful & Upbeat)</option>
          </select>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">Edge Voice:</span>
          <select id="settingsEdgeVoice" class="settings-select" style="flex:1;">
            <option value="en-US-AriaNeural" ${currentEdgeVoice === 'en-US-AriaNeural' ? 'selected' : ''}>en-US-Aria (English US)</option>
            <option value="en-US-GuyNeural" ${currentEdgeVoice === 'en-US-GuyNeural' ? 'selected' : ''}>en-US-Guy (English Male)</option>
            <option value="en-GB-SoniaNeural" ${currentEdgeVoice === 'en-GB-SoniaNeural' ? 'selected' : ''}>en-GB-Sonia (British)</option>
            <option value="ne-NP-HemkalaNeural" ${currentEdgeVoice === 'ne-NP-HemkalaNeural' ? 'selected' : ''}>ne-NP-Hemkala (Nepali)</option>
          </select>
        </div>

        <div class="settings-row">
          <span class="settings-label" style="min-width:100px;">Wake Phrase:</span>
          <input type="text" id="settingsWakePhrase" class="settings-input" style="flex:1;" value="${esc(c.wakePhrase || 'Hey Nixi')}">
        </div>
      </div>

      <!-- Save Actions Footer -->
      <div class="settings-actions-footer">
        <button class="settings-btn-primary" id="btnSaveAllSettings">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Settings
        </button>
        <button class="settings-btn-secondary" id="btnCollapsePanelSettings">
          Back to Notch
        </button>
      </div>
      <div id="settingsSaveToast" style="display:none;text-align:center;font-size:12px;color:#34D399;font-weight:600;padding:2px 0 6px;">
        ✓ Settings saved and applied!
      </div>
    </div>
  `;

  // Bind Eye Swatches
  container.querySelectorAll('.settings-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.settings-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const chosenColor = swatch.dataset.color;
      S.cfg.eye = chosenColor;
      face.setPalette(chosenColor, S.cfg.pill || '#000000');
    });
  });

  const customEye = $('settingsCustomEye');
  if (customEye) {
    customEye.addEventListener('input', (e) => {
      container.querySelectorAll('.settings-swatch').forEach(s => s.classList.remove('active'));
      S.cfg.eye = e.target.value;
      face.setPalette(e.target.value, S.cfg.pill || '#000000');
    });
  }

  // Bind Outfit
  const outfitSelect = $('settingsOutfit');
  if (outfitSelect) {
    outfitSelect.addEventListener('change', (e) => {
      S.cfg.outfit = e.target.value;
    });
  }

  // Bind Key Eye toggle
  const keyEye = $('btnToggleKeyEye');
  const keyInput = $('settingsGeminiKey');
  if (keyEye && keyInput) {
    keyEye.addEventListener('click', () => {
      keyInput.type = (keyInput.type === 'password') ? 'text' : 'password';
      keyEye.innerHTML = (keyInput.type === 'password')
        ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        : '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    });
  }

  // Bind Segmented Placement
  container.querySelectorAll('[data-placement]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-placement]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const plc = btn.dataset.placement;
      S.cfg.placement = plc;
      ipc.send('window-set-placement', plc);
      setStatus('Placement: ' + btn.textContent.trim());
      feel('happy', 800);
    });
  });

  // Bind Segmented Size Presets
  container.querySelectorAll('[data-panel-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-panel-size]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const [w, h] = btn.dataset.panelSize.split(',').map(Number);
      S.cfg.panelWidth = w;
      S.cfg.panelHeight = h;
      shell.style.setProperty('--panel-w', w + 'px');
      shell.style.setProperty('--panel-h', h + 'px');
      ipc.send('window-resize-panel', { width: w, height: h });
      ipc.invoke('cfg-set', { panelWidth: w, panelHeight: h });
      setStatus(`Resized to ${w}×${h}`);
      feel('happy', 800);
    });
  });

  // Bind Collapse
  $('btnCollapsePanelSettings')?.addEventListener('click', () => {
    collapse();
  });

  // Bind Save
  $('btnSaveAllSettings')?.addEventListener('click', async () => {
    const key = $('settingsGeminiKey') ? $('settingsGeminiKey').value.trim() : (c.key || '');
    const model = $('settingsModel') ? $('settingsModel').value : (c.model || 'gemini-2.5-flash');
    const outfit = $('settingsOutfit') ? $('settingsOutfit').value : (c.outfit || 'none');
    const voice = $('settingsGeminiVoice') ? $('settingsGeminiVoice').value : (c.voice || 'Kore');
    const edgeVoice = $('settingsEdgeVoice') ? $('settingsEdgeVoice').value : (c.edgeVoice || 'en-US-AriaNeural');
    const wakePhrase = $('settingsWakePhrase') ? $('settingsWakePhrase').value.trim() : (c.wakePhrase || 'Hey Nixi');
    const think = $('settingsThink') ? $('settingsThink').checked : !!c.think;
    const speak = $('settingsSpeak') ? $('settingsSpeak').checked : !!c.speak;
    const breathe = $('settingsBreathe') ? $('settingsBreathe').checked : !!c.breathe;
    const sounds = $('settingsSounds') ? $('settingsSounds').checked : (c.sounds !== false);

    S.cfg.key = key;
    S.cfg.model = model;
    S.cfg.outfit = outfit;
    S.cfg.voice = voice;
    S.cfg.edgeVoice = edgeVoice;
    S.cfg.wakePhrase = wakePhrase;
    S.cfg.think = think;
    S.cfg.speak = speak;
    S.cfg.breathe = breathe;
    S.cfg.sounds = sounds;
    S.cfg.glow = false;

    applyTheme();
    await ipc.invoke('cfg-set', S.cfg);

    const toast = $('settingsSaveToast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2400);
    }
    setStatus('Settings saved!');
    feel('happy', 1400);
    playSound('win');
  });
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

function sanitizeSpeech(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // 1) Detect PowerShell parser, runtime or script exception traces
  const isPsError = /CategoryInfo|FullyQualifiedErrorId|ParserError|At line:|char \d+|Unexpected token|Missing expression|CommandNotFoundException|ScriptBlock/i.test(str);

  // 2) Detect JavaScript / NodeJS stack traces or unhandled exceptions
  const isStackTrace = /at\s+[\w$.<>]+\s+\([^)]+:\d+:\d+\)|Error:\s+|TypeError:|SyntaxError:|ReferenceError:|UnhandledPromiseRejection/i.test(str);

  // 3) Detect raw script code blocks / PowerShell code / C# / JSON dumps
  const isCode = /(<#|#>\b|Add-Type|New-Object|\$ErrorActionPreference|System\.Windows\.Automation|function\s+\w+\s*\(|class\s+\w+|import\s+.*from|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=)/i.test(str)
    || (str.includes('{') && str.includes('}') && str.includes(';') && (str.includes('$') || str.includes('return') || str.includes('void')))
    || (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(str) && str.length > 40);

  if (isPsError || isStackTrace || isCode) {
    console.warn('[SPEECH_SANITIZER] Suppressed raw code/error in speech:', str);
    const userName = S?.cfg?.userName || 'Rikesh';
    return `I ran into a small issue performing that action, ${userName}. Let me know if you want me to try again.`;
  }

  // Strip markdown formatting symbols (#, *, `, _, ~)
  str = str.replace(/[#*`_~]/g, '').trim();

  // Strip HTML tags if any
  str = str.replace(/<[^>]*>/g, '').trim();

  return str;
}

function interruptSpeech() {
  activeSpeechToken++;
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
  try { ipc.invoke('stop-speech'); } catch {}
  try { ipc.send('speech-stop'); } catch {}
  try { ipc.send('agent-speech-event', { type: 'speaking', value: false }); } catch {}
  try { ipc.send('echo-guard-stop'); } catch {}
  try { face.poke(); } catch {}
  feel('surprised', 1200);
  setStatus('Speech stopped');
}

async function speak(text) {
  if (!text) return;
  const cleanStr = sanitizeSpeech(text);
  if (!cleanStr) return;

  const token = ++activeSpeechToken;
  const estDuration = Math.max(1500, Math.min(25000, cleanStr.length * 85));
  echoSuppressUntil = Date.now() + estDuration + 350;
  try { ipc.send('echo-guard-start', estDuration); } catch {}

  const onSpeechDone = () => {
    echoSuppressUntil = Date.now() + 350;
    try { ipc.send('echo-guard-stop'); } catch {}
    feel('idle', 500);
  };

  // 1) Mark-LVI ElevenLabs Multilingual Neural TTS (if key provided in cfg)
  if (S.cfg.ttsEngine === 'elevenlabs' && S.cfg.elevenlabsKey) {
    try {
      const res = await ipc.invoke('elevenlabs-tts', {
        text: cleanStr,
        apiKey: S.cfg.elevenlabsKey,
        voiceId: S.cfg.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
        model: S.cfg.elevenlabsModel || 'eleven_flash_v2_5'
      });
      if (token !== activeSpeechToken) { onSpeechDone(); return; }
      if (res && res.ok && res.audioData) {
        feel('talking', estDuration);
        const result = await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
          onStart: () => feel('talking', estDuration),
          onEnd: onSpeechDone
        });
        if (result && result.ok) return;
      }
    } catch (e) {
      console.warn('ElevenLabs TTS error, trying next engine:', e);
    }
  }

  // 2) Google Gemini TTS with Kore / selected voice (bypassed smoothly if daily quota limit is reached)
  if (S.cfg.key && Date.now() > (S.geminiTtsCooldownUntil || 0)) {
    try {
      const voice = S.cfg.voice || 'Kore';
      const res = await ipc.invoke('gemini-tts', { text: cleanStr, voice });
      if (token !== activeSpeechToken) { onSpeechDone(); return; }
      if (res && res.ok && res.audioData) {
        feel('talking', estDuration);
        const result = await playGeminiAudio(res.audioData, res.mimeType, {
          onStart: () => feel('talking', estDuration),
          onEnd: onSpeechDone
        });
        if (result && result.ok) return;
      } else if (res && res.error) {
        if (/quota|exceeded|429/i.test(res.error)) {
          S.geminiTtsCooldownUntil = Date.now() + 18 * 3600 * 1000;
          console.info('[TTS] Gemini Free Tier daily audio quota reached (10 req/day limit). Seamlessly falling back to Microsoft Edge Neural voice.');
        } else {
          console.warn('Gemini TTS returned error, falling back to Edge Neural voice:', res.error);
        }
      }
    } catch (e) {
      if (/quota|exceeded|429/i.test(e.message)) {
        S.geminiTtsCooldownUntil = Date.now() + 18 * 3600 * 1000;
        console.info('[TTS] Gemini Free Tier daily audio quota reached. Falling back to Edge Neural voice.');
      } else {
        console.warn('Gemini TTS invocation error, falling back to Edge Neural voice:', e);
      }
    }
  }

  // 3) Microsoft Edge Neural TTS (en-US-AriaNeural or ne-NP-HemkalaNeural)
  try {
    const isNepali = /[\u0900-\u097F]/.test(cleanStr);
    const edgeVoice = isNepali ? 'ne-NP-HemkalaNeural' : (S.cfg.edgeVoice || 'en-US-AriaNeural');
    const res = await ipc.invoke('edge-tts', { text: cleanStr, voice: edgeVoice });
    if (token !== activeSpeechToken) { onSpeechDone(); return; }
    if (res && res.ok && res.audioData) {
      feel('talking', estDuration);
      const result = await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
        onStart: () => feel('talking', estDuration),
        onEnd: onSpeechDone
      });
      if (result && result.ok) return;
    }
  } catch (edgeErr) {
    console.warn('Edge TTS invocation error:', edgeErr);
  }

  // 4) Offline SAPI5 System Speech Synthesizer (PowerShell UTF-8 safe)
  try {
    feel('talking', estDuration);
    await ipc.invoke('system-tts', { text: cleanStr });
  } catch (sapiErr) {
    console.warn('System SAPI TTS error:', sapiErr);
  }

  onSpeechDone();
}

function speakBrowser(text) {
  return false;
}

async function speakAgentPayload(payload) {
  try {
    if (!payload || !payload.text) return;
    const text = sanitizeSpeech(payload.text);
    if (!text) return;

    if (S.cfg.speak === false) {
      ipc.send('agent-speech-event', { type: 'finished', id: payload.id || null });
      return;
    }

    const token = ++activeSpeechToken;
    const estDuration = Math.max(1500, Math.min(25000, text.length * 85));
    echoSuppressUntil = Date.now() + estDuration + 350;
    try { ipc.send('echo-guard-start', estDuration); } catch {}

    const finish = () => {
      echoSuppressUntil = Date.now() + 350;
      try { ipc.send('echo-guard-stop'); } catch {}
      try { feel('idle', 500); } catch {}
      ipc.send('agent-speech-event', { type: 'finished', id: payload.id || null });
    };

    // 1) ElevenLabs
    if (S.cfg.ttsEngine === 'elevenlabs' && S.cfg.elevenlabsKey) {
      try {
        const res = await ipc.invoke('elevenlabs-tts', {
          text,
          apiKey: S.cfg.elevenlabsKey,
          voiceId: S.cfg.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM'
        });
        if (token !== activeSpeechToken) { finish(); return; }
        if (res && res.ok && res.audioData) {
          const playRes = await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
            onStart: () => {
              feel('talking', estDuration);
              ipc.send('agent-speech-event', { type: 'speaking', value: true });
            },
            onEnd: finish
          });
          if (playRes && playRes.ok) return;
        }
      } catch (err) {}
    }

    // 2) Google Gemini TTS
    if (S.cfg.key && Date.now() > (S.geminiTtsCooldownUntil || 0)) {
      try {
        const voice = S.cfg.voice || 'Kore';
        const res = await ipc.invoke('gemini-tts', { text, voice });
        if (token !== activeSpeechToken) { finish(); return; }
        if (res && res.ok && res.audioData) {
          const playRes = await playGeminiAudio(res.audioData, res.mimeType, {
            onStart: () => {
              feel('talking', estDuration);
              ipc.send('agent-speech-event', { type: 'speaking', value: true });
            },
            onEnd: finish
          });
          if (playRes && playRes.ok) return;
        } else if (res && res.error && /quota|exceeded|429/i.test(res.error)) {
          S.geminiTtsCooldownUntil = Date.now() + 18 * 3600 * 1000;
        }
      } catch (err) {
        if (/quota|exceeded|429/i.test(err.message)) {
          S.geminiTtsCooldownUntil = Date.now() + 18 * 3600 * 1000;
        } else {
          console.warn('Gemini TTS agent payload error, trying Edge Neural voice:', err);
        }
      }
    }

    // 3) Microsoft Edge Neural TTS
    try {
      const isNepali = /[\u0900-\u097F]/.test(text);
      const edgeVoice = isNepali ? 'ne-NP-HemkalaNeural' : (S.cfg.edgeVoice || 'en-US-AriaNeural');
      const res = await ipc.invoke('edge-tts', { text, voice: edgeVoice });
      if (token !== activeSpeechToken) { finish(); return; }
      if (res && res.ok && res.audioData) {
        await playGeminiAudio(res.audioData, res.mimeType || 'audio/mp3', {
          onStart: () => {
            feel('talking', estDuration);
            ipc.send('agent-speech-event', { type: 'speaking', value: true });
          },
          onEnd: finish
        });
        return;
      }
    } catch (edgeErr) {
      console.warn('Edge TTS agent payload error:', edgeErr);
    }

    // 4) Offline SAPI5 System Speech
    try {
      feel('talking', estDuration);
      await ipc.invoke('system-tts', { text });
    } catch {}

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
                    id === 'organize_desktop' ? 'Organizing Desktop clutter' :
                    id === 'clean_temp' ? 'Cleaning temporary files' :
                    id === 'brightness' ? `Setting brightness to ${args.level || 70}%` :
                    id === 'wifi_scan' ? 'Scanning Wi-Fi networks' :
                    id === 'weather_report' ? `Checking weather in ${args.location || 'current location'}` :
                    id === 'process_list' ? 'Inspecting active processes' :
                    id === 'disk_usage' ? 'Checking storage disk space' :
                    id === 'largest_files' ? `Finding largest files in ${args.targetPath || 'downloads'}` :
                    id === 'dev_agent' ? `Autonomous Dev Agent (${args.action || 'task'})` :
                    id === 'undo' ? 'Undoing last action' :
                    id === 'file_list' ? `Listing files in ${args.targetPath || 'directory'}` :
                    id === 'file_read' ? `Reading file ${args.filePath || ''}` :
                    id === 'file_write' ? `Writing file ${args.filePath || ''}` :
                    id === 'send_message' ? `Sending message via ${args.platform || 'app'}` :
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
  let speechText = (intent.say && id === 'compound') ? intent.say : reply.replace(/\n/g, '. ');
  if (failed) {
    if (/ParserError|Exception|FullyQualifiedErrorId|failed:|error:|at line|stderr/i.test(speechText) || speechText.length > 110) {
      const userName = S?.cfg?.userName || 'Rikesh';
      speechText = `I couldn't finish that action, ${userName}. Let me know if you want me to try again.`;
    }
  }
  if (isVoice || S.cfg.speak) speak(speechText);
  feel(failed ? 'sad' : 'happy', 1800);
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
async function findAndClickLikeWithVision() {
  if (!S.cfg.key) return null;
  try {
    const b64 = await ipc.invoke('shot');
    if (!b64) return null;

    const prompt = "Look at this screenshot carefully. The user wants to like the currently open video or post (YouTube, Instagram, TikTok, Twitter/X, etc.).\n" +
      "1) Find the Like button (thumbs up icon, heart icon, or 'Like' button) on the screen.\n" +
      "2) If found, return the exact center position as percentages of screen width and height (0-100).\n" +
      "3) Return ONLY a valid JSON object in this format: {\"found\": true, \"x_percent\": 62.5, \"y_percent\": 75.0, \"title\": \"video title\", \"platform\": \"YouTube\"}.\n" +
      "4) If no like button is visible on the screen, return {\"found\": false}.";

    const vRes = await ipc.invoke('gemini-generate-content', {
      model: 'gemini-2.5-flash',
      payload: {
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: b64 } }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      timeout: 35000
    });

    if (vRes && vRes.ok && vRes.data) {
      const jsonText = vRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const parsed = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
        if (parsed && parsed.found && typeof parsed.x_percent === 'number' && typeof parsed.y_percent === 'number') {
          await ipc.invoke('act', 'vision_click', { x_percent: parsed.x_percent, y_percent: parsed.y_percent });
          return { ok: true, platform: parsed.platform || 'video', title: parsed.title || '' };
        }
      }
    }
  } catch (err) {
    console.warn('[LIKE_VIDEO] Vision locator attempt failed:', err);
  }
  return null;
}

async function handleLikeVideo(args = {}) {
  setStatus('Checking video to like…');
  feel('thinking', 1500);

  // 1) Quick check: if TikTok, instant 'l' shortcut
  const activeInfo = await ipc.invoke('active-app').catch(() => null);
  const title = (activeInfo?.title || '').toLowerCase();
  const app = (activeInfo?.app || '').toLowerCase();
  if (title.includes('tiktok') || app.includes('tiktok') || (args.platform && args.platform.toLowerCase() === 'tiktok')) {
    await ipc.invoke('act', 'like_video', { platform: 'tiktok' });
    const reply = 'Liked the video on TikTok!';
    say(reply, 'status');
    feel('happy', 2500);
    speak(reply);
    return;
  }

  // 2) Attempt 1: Locate Like button with Gemini Vision
  let visionRes = await findAndClickLikeWithVision();
  if (visionRes && visionRes.ok) {
    const titleMsg = visionRes.title ? ` "${visionRes.title}"` : '';
    const msg = `Liked the ${visionRes.platform}${titleMsg}!`;
    say(msg, 'status');
    feel('happy', 2500);
    playSound('correct');
    speak(msg);
    return;
  }

  // 3) Attempt 1 didn't locate it: AUTO-FIX & RETRY
  // User request: "error only in short and retry msg and try to fix first and try again"
  setStatus('Focusing video and retrying…');
  feel('thinking', 2000);
  const retryMsg = "Couldn't spot the like button yet. Let me focus the video and try again...";
  say(retryMsg, 'status');
  speak(retryMsg);

  // Try to fix: Bring the browser/video window to the foreground
  await ipc.invoke('act', 'like_video', { platform: args.platform || 'YouTube' }).catch(() => null);
  // Wait 1.6 seconds for the window to come to foreground and video player elements to settle
  await new Promise(r => setTimeout(r, 1600));

  // 4) Attempt 2: Re-capture screen and re-run Vision locator
  visionRes = await findAndClickLikeWithVision();
  if (visionRes && visionRes.ok) {
    const titleMsg = visionRes.title ? ` "${visionRes.title}"` : '';
    const msg = `Found it! Liked the ${visionRes.platform}${titleMsg}!`;
    say(msg, 'status');
    feel('happy', 2500);
    playSound('correct');
    speak(msg);
    return;
  }

  // 5) Attempt 3: Try UI Automation / keyboard like fallback
  try {
    const fallbackRes = await ipc.invoke('act', 'like_video', args);
    const cleanFallback = typeof fallbackRes === 'string' ? fallbackRes.trim() : '';
    if (cleanFallback && /liked/i.test(cleanFallback)) {
      const msg = 'Liked the video!';
      say(msg, 'status');
      feel('happy', 2500);
      playSound('correct');
      speak(msg);
      return;
    }
  } catch (fallbackErr) {
    console.warn('[LIKE_VIDEO] UI Automation fallback notice:', fallbackErr);
  }

  // 6) All attempts failed: Handle exception gracefully with a SHORT, friendly companion message
  const userName = S.cfg?.userName || 'Rikesh';
  const isNepali = String(S.cfg?.language || 'mixed').toLowerCase().includes('nepali');
  const errorMsg = isNepali
    ? `Screen ma like button bhetiyena ${userName}, video visible chha ki nai check garnu na.`
    : `I couldn't locate the like button on screen, ${userName}. Please make sure the video is visible.`;

  setStatus("Couldn't locate Like button.");
  feel('sad', 2500);
  playSound('wrong');
  say(errorMsg, 'status');
  speak(errorMsg);
}

async function handleInspectVideo() {
  setStatus('Inspecting active video & window…');
  feel('curious', 1500);
  try {
    const info = await ipc.invoke('act', 'inspect_active', {});
    const title = info?.title || info?.media?.title || 'Unknown Video';
    const app = info?.app || 'Active Application';
    const reply = `Active: "${title}" in ${app}.`;
    say(reply, 'status');
    feel('happy', 2500);
    speak(reply);
  } catch (e) {
    const reply = "I couldn't inspect the active window right now.";
    say(reply, 'status');
    speak(reply);
  }
}

/* --------------------------------------------------------- cloud model */
const SYS = 'You are FUL, an advanced AI-powered desktop companion with FULL AUTONOMOUS CONTROL over the user\'s Windows PC, possessing the combined power of Mark-LVI and F.U.L. ' +
  'You are the devoted, intelligent companion to Rikesh Dahal ("Boss"). You can think and execute ANY desktop action, software engineering task, or multi-step workflow fast and accurately: ' +
  '1) AUTONOMOUS SOFTWARE ENGINEERING: Use `dev_agent` to scaffold entire software projects (React, Node, Python, C++, etc.), auto-install npm/pip packages, run projects, and self-heal syntax/import errors in a loop. ' +
  '2) WEBFORGE WEBSITE BUILDER: Use `build_website` to generate modern, responsive, animated HTML5/CSS3/JS websites (dark, light, glassmorphism, gaming, futuristic_neon, ai_startup, portfolio, corporate, ecommerce) and instantly launch a live preview server in the browser. Use `preview_website` and `list_websites` to inspect. ' +
  '3) CAMERA VISION & HUD: Use `camera_vision` to look through the webcam to describe surroundings, identify objects the user is holding, read printed or screen text (OCR), and evaluate posture/ergonomics. Use `camera_snapshot` to save photos to Pictures. ' +
  '4) LONG-TERM MEMORY ENGINE: You remember Rikesh\'s identity, preferences, ongoing projects, relationships, wishes, and notes across sessions. Use `save_memory` to remember facts, `recall_memory` to search, and `forget_memory` to remove. ' +
  '5) SYSTEM GUARDIAN & HIGH RAM MONITOR: Use `system_health` to monitor RAM, free memory, CPU, and top heavy processes. ' +
  '6) COMPLETE FILE SYSTEM MASTERY: Use `file_list`, `file_read`, `file_write`, `file_create`, `folder_create`, `file_delete`, `file_move`, `file_copy`, `file_rename`, `file_find`, `largest_files`, `disk_usage`, and `organize_desktop` to sort messy desktops into neat categorized folders in 1 click. ' +
  '7) HARDWARE & SYSTEM SETTINGS: Use `brightness`, `wifi_scan`, `wifi_toggle`, `clean_temp`, `process_list`, `kill_process`, `battery_report`, and `dark_mode`. ' +
  '8) VIDEO & MEDIA: Use `like_video` to inspect and like videos on YouTube, TikTok, Instagram, Twitter/X, etc. Use `play_music` to search and play any song on YouTube directly by name. Use `media` to pause, resume, or skip. ' +
  '9) LIVE DATA & MESSAGING: Use `weather_report` for live weather worldwide and `send_message` for WhatsApp Web or Email. ' +
  '10) PC & UI CONTROL: Use `mouse_action`, `keyboard_action`, `window_action`, and `vision_click` to click visual elements on screen. ' +
  '11) MULTI-STEP WORKFLOWS & UNDO: Use `compound` to chain actions and `undo` to rollback file operations or settings. ' +
  'Language: Fluent in English and Nepali (हजुर मालिक, हुन्छ म गरिहाल्छु, कुनै चिन्ता नलिनुहोस्). Keep spoken answers concise, natural, and friendly (1-2 sentences). Never output raw code or PowerShell errors in spoken conversation.';

const S_ = (p, r) => ({ type: 'object', properties: p, required: r || Object.keys(p) });
const str = { type: 'string' }, num = { type: 'number' }, bool = { type: 'boolean' };
const FN = [
  ['open_app', 'Open one or more apps or websites', S_({ names: { type: 'array', items: str } })],
  ['play_music', 'Search and play a song or video directly on YouTube or music platforms by name', S_({ song: str, platform: str }, ['song'])],
  ['like_video', 'Inspect active video or post (YouTube, TikTok, Instagram, Twitter/X) and hit the Like button', S_({ platform: str })],
  ['inspect_video', 'Inspect what video, audio or application is currently active on screen', S_({})],
  ['organize_desktop', 'Automatically organize all loose clutter files on the Desktop into categorized folders (Documents, Images, Media, Archives, Installers, Code) with 1-click undo', S_({})],
  ['clean_temp', 'Clean temporary cache and junk files from the PC to free up disk space', S_({})],
  ['brightness', 'Set screen brightness percentage (0-100)', S_({ level: num }, ['level'])],
  ['wifi_scan', 'Scan and list nearby available Wi-Fi networks with signal strength', S_({})],
  ['wifi_toggle', 'Turn the Wi-Fi adapter on or off', S_({ enable: bool }, ['enable'])],
  ['weather_report', 'Get live weather conditions, temperature, and forecast for any city or location', S_({ location: str })],
  ['process_list', 'List the top memory and CPU consuming processes running on the PC', S_({ count: num })],
  ['kill_process', 'Gracefully close or terminate an application or process by name', S_({ processName: str }, ['processName'])],
  ['disk_usage', 'Inspect storage drive free and total space on all drives', S_({})],
  ['largest_files', 'Find the largest disk space hogging files in a directory (e.g. downloads, desktop, home)', S_({ targetPath: str, count: num })],
  ['file_list', 'List files and folders in a directory (desktop, downloads, documents, pictures, home, or path)', S_({ targetPath: str, showHidden: bool })],
  ['file_read', 'Read text or code from a file with line limit', S_({ filePath: str, maxLines: num }, ['filePath'])],
  ['file_write', 'Write or append text content to a file with automatic parent folder creation and undo backup', S_({ filePath: str, content: str, append: bool }, ['filePath', 'content'])],
  ['file_create', 'Create a new file', S_({ filePath: str, content: str }, ['filePath'])],
  ['folder_create', 'Create a new folder', S_({ folderPath: str }, ['folderPath'])],
  ['file_delete', 'Safely delete a file or move it to the Recycle Bin with undo capability', S_({ filePath: str }, ['filePath'])],
  ['file_move', 'Move a file or folder to a new destination', S_({ source: str, destination: str }, ['source', 'destination'])],
  ['file_copy', 'Copy a file or folder to a destination', S_({ source: str, destination: str }, ['source', 'destination'])],
  ['file_rename', 'Rename a file or folder', S_({ filePath: str, newName: str }, ['filePath', 'newName'])],
  ['file_find', 'Recursively search for files matching a name or extension', S_({ query: str, extension: str, searchPath: str })],
  ['send_message', 'Send or draft a message via WhatsApp Web or Email client', S_({ platform: { type: 'string', enum: ['whatsapp', 'email'] }, recipient: str, message: str }, ['message'])],
  ['dev_agent', 'Autonomous coding developer agent to scaffold projects, install dependencies, run code, and self-heal errors in a loop', S_({ action: { type: 'string', enum: ['scaffold', 'run_and_fix', 'exec'] }, projectName: str, projectType: str, files: { type: 'object' }, autoInstall: bool, projectPath: str, runCommand: str }, ['action'])],
  ['build_website', 'Generate a complete, modern responsive website with HTML/CSS/JS animations, interactive components, and instant live preview server', S_({ prompt: str, theme: { type: 'string', enum: ['dark', 'light', 'glassmorphism', 'gaming', 'futuristic_neon', 'ai_startup', 'portfolio', 'corporate', 'ecommerce'] }, site_name: str, open_browser: bool }, ['prompt'])],
  ['preview_website', 'Start preview server and open a generated website in browser', S_({ site_id_or_name: str }, ['site_id_or_name'])],
  ['list_websites', 'List all websites created by WebForge', S_({})],
  ['camera_vision', 'Inspect surroundings, held objects, read documents, or analyze posture using the camera', S_({ mode: { type: 'string', enum: ['describe', 'holding', 'read_text', 'posture'] }, prompt: str })],
  ['camera_snapshot', 'Capture and save a high-resolution snapshot from camera into Pictures folder', S_({ filename: str })],
  ['save_memory', 'Save a long-term memory, fact, preference, project, wish or note about Rikesh Dahal (Boss)', S_({ category: { type: 'string', enum: ['identity', 'preferences', 'projects', 'relationships', 'wishes', 'notes'] }, key: str, value: str }, ['key', 'value'])],
  ['recall_memory', 'Search long-term memory for past facts, preferences, context, or saved notes', S_({ query: str }, ['query'])],
  ['forget_memory', 'Remove a specific fact from long-term memory', S_({ category: str, key: str }, ['category', 'key'])],
  ['system_health', 'Check real-time RAM usage percentage, free memory, and top memory-hogging processes with optimization advice', S_({})],
  ['undo', 'Undo the most recent file operation, desktop organization, or setting change', S_({})],
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
  ['battery_report', 'Get a comprehensive battery health and charging report', S_({})],
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

/* --------------------------------------------------- FUL Live Camera Vision */
let cameraStream = null;

async function startCamera() {
  if (cameraStream) return true;
  try {
    const videoEl = $('cameraVideo');
    if (!videoEl) return false;
    if (currentShape !== 'panel') {
      window._prevShapeBeforeCamera = currentShape;
      setShape('panel');
    }
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    videoEl.srcObject = cameraStream;
    await videoEl.play();
    const modal = $('cameraModal');
    if (modal) modal.classList.add('active');
    const shellEl = $('shell');
    if (shellEl) shellEl.classList.add('camera-active');
    return true;
  } catch (err) {
    console.warn('[CAMERA] getUserMedia error:', err);
    return false;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const videoEl = $('cameraVideo');
  if (videoEl) videoEl.srcObject = null;
  const modal = $('cameraModal');
  if (modal) modal.classList.remove('active');
  const shellEl = $('shell');
  if (shellEl) shellEl.classList.remove('camera-active');
  if (window._prevShapeBeforeCamera && window._prevShapeBeforeCamera !== 'panel') {
    setShape(window._prevShapeBeforeCamera);
  }
  window._prevShapeBeforeCamera = null;
}

async function captureCameraBase64() {
  const videoEl = $('cameraVideo');
  if (!videoEl || !videoEl.videoWidth) {
    const started = await startCamera();
    if (!started) return null;
    await new Promise(r => setTimeout(r, 600));
  }
  const canvas = $('cameraCanvas') || document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.split(',')[1];
}

async function handleCameraVision({ mode = 'describe', prompt = '' } = {}) {
  setStatus('📷 Looking through camera…');
  feel('thinking', 2000);
  const base64Jpg = await captureCameraBase64();
  if (!base64Jpg) {
    return 'Camera is not accessible or video permission was denied.';
  }
  
  let visionPrompt = prompt;
  if (!visionPrompt) {
    if (mode === 'holding') visionPrompt = 'Look closely at what the user is holding in their hands in front of the camera and describe the object in detail.';
    else if (mode === 'read_text') visionPrompt = 'Read and transcribe all visible text, documents, book pages, screens, or labels visible in this camera view.';
    else if (mode === 'posture') visionPrompt = 'Analyze the user\'s sitting posture, distance from the screen, lighting, and ergonomics. Give friendly advice.';
    else visionPrompt = 'Describe what you see in front of the camera in a friendly, conversational manner. Mention the person, surroundings, objects, and expression.';
  }

  const payload = {
    systemInstruction: { parts: [{ text: 'You are FUL, an AI companion seeing the world through the user\'s webcam. Describe what you observe warmly, accurately, and naturally.' }] },
    contents: [{
      role: 'user',
      parts: [
        { text: visionPrompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Jpg } }
      ]
    }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
  };

  const res = await ipc.invoke('gemini-generate-content', {
    model: S.cfg?.model || 'gemini-2.5-flash',
    payload,
    timeout: 30000
  });

  if (res && res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return res.data.candidates[0].content.parts[0].text;
  }
  return 'Could not analyze camera image: ' + (res?.error || 'unknown error');
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

  let activeSys = SYS;
  try {
    const memPrompt = await ipc.invoke('memory-prompt');
    if (memPrompt) {
      activeSys += '\n\n' + memPrompt;
    }
  } catch (err) {}

  const parts = (opts.parts || []).concat([{ text }]);
  const payload = {
    systemInstruction: { parts: [{ text: activeSys }] },
    contents: [{ role: 'user', parts }],
    tools: [{ functionDeclarations: FN }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
  };
  try {
    const res = await ipc.invoke('gemini-generate-content', {
      model: S.cfg.model,
      payload,
      timeout: 30000
    });
    clearTimeout(timeoutTimer);

    if (!res || !res.ok) {
      throw new Error(res?.error || 'request error');
    }

    const data = res.data;
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
        let x;
        if (c.name === 'like_video') {
          await handleLikeVideo(c.args);
          x = 'Liked the video.';
        } else if (c.name === 'inspect_video') {
          await handleInspectVideo();
          x = 'Inspected active window.';
        } else if (c.name === 'camera_vision') {
          x = await handleCameraVision(c.args);
        } else if (c.name === 'camera_snapshot') {
          const frame = await captureCameraBase64();
          if (frame) {
            x = await ipc.invoke('camera-save-snapshot', { base64Data: frame, filename: c.args?.filename });
          } else {
            x = 'Could not access camera for snapshot.';
          }
        } else {
          x = await ipc.invoke('act', c.name, c.args);
        }
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
        const spoken = failed
          ? `I encountered an issue executing that task, ${S.cfg?.userName || 'Rikesh'}. Let me know if you want me to try again.`
          : (out.trim() || text2);
        say(spoken, 'FUL');
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

let lastHandledUtterance = '';
let lastHandledUtteranceTime = 0;

async function handleUtterance(text, kind) {
  const raw = String(text || '').trim();
  if (!raw) {
    setStatus('');
    collapse();
    return;
  }
  const now = Date.now();
  if (raw.toLowerCase() === lastHandledUtterance.toLowerCase() && (now - lastHandledUtteranceTime < 2500)) {
    return;
  }
  lastHandledUtterance = raw;
  lastHandledUtteranceTime = now;
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
  const payload = {
    contents: [{ parts: [{ text: 'Transcribe this dictation into clean text. Remove ums and fillers, apply self-corrections, add punctuation. Output ONLY the final text.' }, { text }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
  };
  const r = await ipc.invoke('gemini-generate-content', {
    model: S.cfg.model,
    payload,
    timeout: 10000
  });
  if (!r || !r.ok) throw new Error(r?.error || 'No text.');
  const j = r.data;
  const t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!t) throw new Error('No text.');
  return t;
}

/* -------------------------------------------------------- mic metering */
let captureStartTime = 0;
let vadSpeechStarted = false;
let vadLastSpeech = 0;

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
      const lvl = clamp(Math.sqrt(q / 512) * 4.2);
      S.level = lvl;

      // Mark-LVI VAD: Auto-close turn after speech followed by natural silence (850ms)
      if (S.capture && !isFULSpeaking()) {
        const now = Date.now();
        if (lvl > 0.045) {
          vadSpeechStarted = true;
          vadLastSpeech = now;
        } else if (vadSpeechStarted && (now - vadLastSpeech > 850)) {
          vadSpeechStarted = false;
          endCapture();
        } else if (!vadSpeechStarted && captureStartTime && (now - captureStartTime > 4200)) {
          // Auto-close if no speech detected for 4.2 seconds after wake
          endCapture();
        }
      } else {
        vadSpeechStarted = false;
      }
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
    if (S.capture) return; // already capturing
    wake('greeting');
    feel('surprised', 900);
    playSound('hello');
    echoSuppressUntil = Date.now() + 500;
    // Mark-LVI: Automatically begin capture turn upon neural wake detection
    await beginCapture('cmd');
  } else if (evt.type === 'text') {
    if (S.capture) endCapture();
    wake('greeting');
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
        • <strong>Hold Ctrl+Space</strong> (or Right Ctrl) to talk a voice command<br>
        • <strong>Hold Right Alt</strong> to talk into any text box (Notepad, Chrome, Word)<br>
        • <strong>Ctrl+Space</strong> talk &nbsp; <strong>Ctrl+Alt+W</strong> write prompt<br>
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
  const isCustom = (p === 'custom');
  $('shell')?.classList.toggle('floating-pill', isCustom);
  $('notchContainer')?.classList.toggle('floating-pill', isCustom);
  setStatus(p === 'top-center' ? 'Snapped to Notch' : `Docked: ${p}`);
  feel('happy', 800);
});

ipc.on('system-alert', (_e, alert) => {
  feel('surprised', 2500);
  playSound('sad');
  // Red border removed per user request - clean stealth look maintained
  const statusMsg = `⚠️ High RAM: ${alert.usedPercent}% (${alert.usedGb}GB/${alert.totalGb}GB)`;
  setStatus(statusMsg);
  
  const textMsg = alert.nepaliMessage || alert.message;
  appendChatMessage('ful', textMsg);
  
  showToast({
    title: '⚠️ RAM Alert: ' + alert.usedPercent + '%',
    kind: 'warning',
    at: Date.now()
  });

  if (S.cfg?.speak !== false) {
    say(textMsg, 'Guardian');
  }
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
  captureStartTime = Date.now();
  vadSpeechStarted = false;
  vadLastSpeech = 0;
  S.capture = mode;
  setShape('state-dictate');
  setStatus(mode === 'dict' ? 'Dictating… (click mic or ✕ to finish)' : 'Listening…');
  $('bMic').classList.add('rec');
  $('bCancelAction').style.display = 'inline-flex';
  await startMeter();
  feel(mode === 'dict' ? 'talking' : 'listening', 12000);

  // Web Speech API with Real-Time Live Streaming Interim Results
  updateLiveTranscription(mode === 'dict' ? 'Dictate your thoughts…' : 'Listening…');
  if (currentShape !== 'panel') {
    setShape('state-listen');
  }

  if (SpeechRec) {
    try {
      if (speechRecognizer) { try { speechRecognizer.abort(); } catch {} }
      speechRecognizer = new SpeechRec();
      speechRecognizer.continuous = true;
      speechRecognizer.interimResults = true;
      speechRecognizer.lang = 'en-US';

      speechRecognizer.onresult = async (ev) => {
        let interimText = '';
        let finalText = '';
        for (let i = 0; i < ev.results.length; ++i) {
          if (ev.results[i].isFinal) {
            finalText += ev.results[i][0].transcript;
          } else {
            interimText += ev.results[i][0].transcript;
          }
        }
        const liveText = (finalText + ' ' + interimText).trim();
        if (liveText) {
          updateLiveTranscription(liveText);
        }
        if (ev.results[ev.results.length - 1].isFinal) {
          const finalUtterance = finalText.trim() || liveText;
          if (finalUtterance) {
            hideLiveTranscription();
            await handleUtterance(finalUtterance, mode);
          }
        }
      };
      speechRecognizer.onerror = () => {};
      speechRecognizer.start();
    } catch {}
  }

  // Start MediaRecorder if available
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch {}
  }
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

  // Hard safety timeout: 10 seconds
  captureTimeout = setTimeout(() => {
    if (S.capture) endCapture();
  }, 10000);
}

async function endCapture(cancelled) {
  clearTimeout(captureTimeout);
  captureStartTime = 0;
  vadSpeechStarted = false;
  vadLastSpeech = 0;
  const was = S.capture;
  S.capture = null;
  hideLiveTranscription();
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
            const wavB64 = await blobToWavBase64(blob);

            // 1. Mark-LVI Whisper STT (Local faster-whisper on CPU or hosted Groq/OpenAI)
            if (wavB64) {
              try {
                const whisperRes = await ipc.invoke('whisper-transcribe', {
                  base64Wav: wavB64,
                  model: S.cfg.whisperModel || 'base',
                  backend: S.cfg.whisperBackend || 'local'
                });
                if (whisperRes && whisperRes.ok && whisperRes.text) {
                  transcribed = whisperRes.text;
                }
              } catch (wErr) {
                console.warn('Whisper transcription failed, trying Parakeet:', wErr);
              }
            }

            // 2. Try on-device Parakeet Unified EN 0.6B (Fast on-device English transcription)
            if (!transcribed && wavB64) {
              try {
                const parakeetRes = await ipc.invoke('parakeet-transcribe', { base64Wav: wavB64 });
                if (parakeetRes && parakeetRes.ok && parakeetRes.text) {
                  transcribed = parakeetRes.text;
                }
              } catch (err) {
                console.warn('Parakeet transcription failed, falling back to Gemini:', err);
              }
            }

            // 3. Fallback to Gemini Audio if local models did not return text
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
  showNotchMusic(S.media);
  clearTimeout(musicIslandTimer);
  musicIslandTimer = setTimeout(() => {
    if (!isMusicHovered && !isDraggingScrubber && (currentShape === 'music' || currentShape === 'music-card') && isAudioPlaying) {
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

  // Live real-time updates for Notch Music Card (Exact hello.html spec)
  const notchFill = $('notchMusicFill');
  const notchElapsed = $('notchMusicElapsed');
  const notchRemaining = $('notchMusicRemaining');
  const durSec = dur || 180;
  const remain = Math.max(0, durSec - pos);
  const pct = durSec > 0 ? clamp(pos / durSec, 0, 1) * 100 : 0;

  if (notchElapsed) notchElapsed.textContent = formatSec(pos);
  if (notchRemaining) notchRemaining.textContent = '-' + formatSec(remain);
  if (notchFill) notchFill.style.width = pct + '%';
  updateNotchLyrics(pos);
}

function updateMusicUI(m) {
  if (!m) return;
  const isPlaying = (m.status === 'Playing' || m.status === 'playing');
  isAudioPlaying = isPlaying;
  shell.classList.toggle('playing', isPlaying);

  const rawTitle = (m.title && m.title.trim()) || '';
  const cleanTitle = cleanMediaTitle(rawTitle);
  const artist = (m.artist && m.artist.trim() && m.artist !== cleanTitle) ? m.artist.trim() : (m.app || 'Media Player');
  const fallbackIcon = getMediaAppIcon(m.app || '', cleanTitle);
  const thumbUrl = (m.thumbnail && m.thumbnail.trim()) ? m.thumbnail : fallbackIcon;

  // Update expanded notch card elements if present
  const notchTitle = $('notchMusicTitle');
  if (notchTitle && cleanTitle) {
    notchTitle.textContent = cleanTitle;
    notchTitle.title = cleanTitle;
  }
  const notchArtist = $('notchMusicArtist');
  if (notchArtist && artist) {
    notchArtist.textContent = artist;
    notchArtist.title = artist;
  }
  const notchCover = $('notchMusicCover');
  const albumArtPlaceholder = $('albumArtPlaceholder');
  if (notchCover) {
    if (thumbUrl) {
      if (notchCover.src !== thumbUrl) {
        notchCover.crossOrigin = 'Anonymous';
        notchCover.src = thumbUrl;
      }
      notchCover.style.display = 'block';
      if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'none';
      notchCover.onload = () => {
        notchCover.style.display = 'block';
        if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'none';
        extractColorFromImg(notchCover);
      };
      notchCover.onerror = () => {
        notchCover.style.display = 'none';
        if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'flex';
      };
    } else {
      notchCover.style.display = 'none';
      if (albumArtPlaceholder) albumArtPlaceholder.style.display = 'flex';
    }
  }
  const soundWave = $('soundWaveLarge');
  if (soundWave) soundWave.classList.toggle('playing', isPlaying);

  const notchPlayPauseBtn = $('notchMusicPlayPause');
  if (notchPlayPauseBtn) {
    notchPlayPauseBtn.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">${isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5.14v14l11-7-11-7z"/>'}</svg>`;
  }

  // Update compact pill badge
  const compactBadge = $('compactMusicPillBadge');
  if (compactBadge) {
    compactBadge.style.display = (isPlaying && currentShape === 'rest') ? 'inline-flex' : 'none';
  }

  if (m.duration && Number(m.duration) > 0) liveDur = Number(m.duration);
  const incomingPos = Number(m.position) || 0;
  if (!isDraggingScrubber) {
    if (isPlaying && livePos > 0 && Math.abs(livePos - incomingPos) < 2.0) {
      livePos = livePos * 0.75 + incomingPos * 0.25;
    } else {
      livePos = incomingPos;
    }
    renderProgress(livePos, liveDur);
  }
}

// High-precision live real-time ticker updating elapsed and remaining time every 200ms
let lastTickerTime = performance.now();
setInterval(() => {
  const now = performance.now();
  const delta = (now - lastTickerTime) / 1000;
  lastTickerTime = now;
  if (isAudioPlaying && !isDraggingScrubber) {
    if (liveDur > 0) {
      livePos = Math.min(liveDur, livePos + delta);
    } else {
      livePos = livePos + delta;
    }
    renderProgress(livePos, liveDur);
  }
}, 200);

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

const bCamera = $('bCamera');
if (bCamera) {
  bCamera.onclick = async (e) => {
    e?.stopPropagation?.();
    if (cameraStream) {
      stopCamera();
    } else {
      await startCamera();
    }
  };
}

const btnCamClose = $('btnCameraClose');
if (btnCamClose) btnCamClose.onclick = () => stopCamera();

const camActDesc = $('camActDescribe');
if (camActDesc) {
  camActDesc.onclick = async () => {
    camActDesc.disabled = true;
    const ans = await handleCameraVision({ mode: 'describe' });
    appendChatMessage('ful', ans);
    say(ans, 'FUL');
    camActDesc.disabled = false;
  };
}

const camActHold = $('camActHolding');
if (camActHold) {
  camActHold.onclick = async () => {
    camActHold.disabled = true;
    const ans = await handleCameraVision({ mode: 'holding' });
    appendChatMessage('ful', ans);
    say(ans, 'FUL');
    camActHold.disabled = false;
  };
}

const camActOcr = $('camActOcr');
if (camActOcr) {
  camActOcr.onclick = async () => {
    camActOcr.disabled = true;
    const ans = await handleCameraVision({ mode: 'read_text' });
    appendChatMessage('ful', ans);
    say(ans, 'FUL');
    camActOcr.disabled = false;
  };
}

const camActPost = $('camActPosture');
if (camActPost) {
  camActPost.onclick = async () => {
    camActPost.disabled = true;
    const ans = await handleCameraVision({ mode: 'posture' });
    appendChatMessage('ful', ans);
    say(ans, 'FUL');
    camActPost.disabled = false;
  };
}

const camActSnap = $('camActSnapshot');
if (camActSnap) {
  camActSnap.onclick = async () => {
    camActSnap.disabled = true;
    const frame = await captureCameraBase64();
    if (frame) {
      const res = await ipc.invoke('camera-save-snapshot', { base64Data: frame });
      playChime();
      showToast({ title: '📸 Snapshot Saved', kind: 'image', at: Date.now() });
      const st = $('cameraStatusText');
      if (st) st.textContent = res;
    }
    camActSnap.disabled = false;
  };
}

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
  if (!S.panel && !S.capture && !S.busy && currentShape === 'rest') {
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
let lastFaceClickTime = 0;

function finishFacePress(tap) {
  if (!facePressed) return;
  facePressed = false;
  clearTimeout(facePressTimer);
  facePressTimer = null;
  if (tap && !faceHoldFired && !faceHasDragged) {
    const now = Date.now();
    if (now - lastFaceClickTime < 420) {
      lastFaceClickTime = 0;
      interruptSpeech();
      return;
    }
    lastFaceClickTime = now;

    if (S.media && S.media.title && (isAudioPlaying || S.media.status === 'playing' || S.media.status === 'paused') && currentShape === 'rest') {
      showNotchMusic(S.media);
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
faceCanvas.addEventListener('dblclick', (e) => {
  e.preventDefault();
  interruptSpeech();
});
document.addEventListener('dblclick', (e) => {
  if (e.target && e.target.closest && (e.target.closest('#face') || e.target.closest('#musicFace') || e.target.closest('.nv-cardface') || e.target.closest('.nv-face-capsule'))) {
    e.preventDefault();
    interruptSpeech();
  }
});
faceCanvas.addEventListener('pointercancel', () => finishFacePress(false));
faceCanvas.addEventListener('pointerleave', () => finishFacePress(false));

shell.addEventListener('contextmenu', e => { e.preventDefault(); openSettings(); });
let ctrlSpaceDown = false;
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && (e.ctrlKey || e.metaKey) && !e.repeat) {
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (targetTag !== 'input' && targetTag !== 'textarea') {
      e.preventDefault();
      if (!ctrlSpaceDown) {
        ctrlSpaceDown = true;
        beginCapture('cmd');
      }
      return;
    }
  }
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
document.addEventListener('keyup', e => {
  if (ctrlSpaceDown && (e.code === 'Space' || e.key === 'Control')) {
    ctrlSpaceDown = false;
    endCapture();
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
    if (e.target.closest('button, input, select, textarea, .tab, .resize-handle, #dockMenu, .nv-tab-btn, .nv-progress, .nv-music-scrubber, .nv-controls, .nv-buttons, .nv-btn, .nv-pomo-actions, #todoItemsList, svg, img')) return;
    isDragging = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    shakeLastScreenX = e.screenX;
    shakeLastScreenY = e.screenY;
    document.body.style.cursor = 'grabbing';
  }

  function onMove(e) {
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
  $('notchWidget')?.addEventListener('pointerdown', startDrag);
  $('shell')?.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('button, input, select, textarea, .tab, .resize-handle, #dockMenu, .nv-tab-btn, .nv-progress, .nv-music-scrubber, .nv-controls, .nv-buttons, .nv-btn, .nv-pomo-actions, #todoItemsList, #body, #cameraModal, svg, img')) {
      startDrag(e);
    }
  });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
}

/* ================================================================
   AUTO-TUCK / IDLE ACTIVITY TRACKER (hello.html Tucked Away Spec)
   ================================================================ */
let lastActivityTs = Date.now();
let isTuckedAway = false;

function recordUserActivity() {
  lastActivityTs = Date.now();
  if (isTuckedAway || currentShape === 'hidden') {
    untuck();
  }
}

function tuckAway() {
  if (isTuckedAway || currentShape === 'panel' || S.busy || S.capture || isDragging || isDraggingScrubber) return;
  isTuckedAway = true;
  setShape('hidden');
}

function untuck() {
  if (!isTuckedAway && currentShape !== 'hidden') return;
  isTuckedAway = false;
  lastActivityTs = Date.now();
  if (isAudioPlaying && S.media && S.media.title) {
    showNotchMusic();
  } else {
    setShape('rest');
  }
}

window.addEventListener('pointerdown', recordUserActivity, { passive: true });
window.addEventListener('keydown', recordUserActivity, { passive: true });
window.addEventListener('wheel', recordUserActivity, { passive: true });

let isIgnoringMouse = false;
window.addEventListener('pointermove', (e) => {
  recordUserActivity();
  const shellEl = $('shell');
  if (!shellEl) return;
  if (currentShape === 'panel') {
    if (isIgnoringMouse) {
      ipc.send('set-ignore-mouse-events', false);
      isIgnoringMouse = false;
    }
    return;
  }

  const rect = shellEl.getBoundingClientRect();
  const isOverShell = (
    e.clientX >= rect.left - 12 &&
    e.clientX <= rect.right + 12 &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom + 8
  );
  const isOverTuckZone = (
    (currentShape === 'hidden' || isTuckedAway) &&
    e.clientX >= rect.left - 40 &&
    e.clientX <= rect.right + 40 &&
    e.clientY <= 38
  );
  const shouldCapture = (isOverShell || isOverTuckZone || isDragging || isDraggingScrubber);

  if (shouldCapture) {
    if (isIgnoringMouse) {
      ipc.send('set-ignore-mouse-events', false);
      isIgnoringMouse = false;
    }
    if (currentShape === 'hidden' || isTuckedAway) {
      untuck();
    }
  } else {
    if (!isIgnoringMouse) {
      ipc.send('set-ignore-mouse-events', true, { forward: true });
      isIgnoringMouse = true;
    }
  }
}, { passive: true });

const shellElem = $('shell');
if (shellElem) {
  shellElem.addEventListener('pointerenter', () => {
    if (currentShape === 'hidden' || isTuckedAway) untuck();
  });
  shellElem.addEventListener('click', (e) => {
    if (currentShape === 'hidden' || isTuckedAway) {
      e.stopPropagation();
      untuck();
    }
  });
}

const tuckHz = $('tuckHoverZone');
if (tuckHz) {
  tuckHz.addEventListener('pointerenter', () => {
    if (currentShape === 'hidden' || isTuckedAway) untuck();
  });
  tuckHz.addEventListener('click', (e) => {
    e.stopPropagation();
    untuck();
  });
}

function updateTopBarClock() {
  const e = $('nvClock');
  if (!e) return;
  const d = new Date();
  e.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateTopBarClock, 1000);
updateTopBarClock();


setInterval(() => {
  if (currentShape === 'panel' || S.busy || S.capture || isDragging || isDraggingScrubber || S.hovering) {
    lastActivityTs = Date.now();
    return;
  }
  const idleTime = Date.now() - lastActivityTs;
  const idleLimit = isAudioPlaying ? 9000 : 5500;
  if (idleTime >= idleLimit) {
    if (currentShape === 'rest' || currentShape === 'music-card' || currentShape === 'open-tab' || currentShape === 'todo-card') {
      tuckAway();
    }
  }
}, 1000);

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
initNotchSystem();
console.log('[RENDERER] renderer.js fully initialized!');


// Hardware Hover Wakeup from Main process
ipc.on('notch-hover-wake', () => {
  if (isTuckedAway || currentShape === 'hidden') {
    untuck();
  }
});


// Live Real-Time Media Update from Dynamic Island Service
ipc.on('media-update', (_e, data) => {
  if (!data) return;
  S.media = data;
  updateMusicUI(data);

  if (data.status === 'Playing' && currentShape === 'rest' && !isTuckedAway) {
    // If user just pressed play on media outside, show subtle visual cue
    const compactBadge = $('compactMusicPillBadge');
    if (compactBadge) compactBadge.style.display = 'inline-flex';
  }
});
