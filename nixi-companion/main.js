/*
  Nixi desktop companion - main process.

  Owns the always-on-top pill window, the offline speech worker, the global
  hotkey watcher, the media reader and every action Nixi can take on the PC.
*/
'use strict';

const { app, BrowserWindow, screen, ipcMain, desktopCapturer, globalShortcut, clipboard, shell, Tray, Menu, nativeImage } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const apps = require('./apps');
const intents = require('./intents');

const ROOT = __dirname;
let win = null;
let tray = null;
let speechProc = null;
let hotkeyProc = null;
let speechMode = 'wake';
let captureGen = 0;
let mediaCache = { at: 0, value: null };
const lastTrigger = {};

const DEFAULT_CFG = {
  key: '',
  model: 'gemini-2.5-flash',
  think: true,
  pill: '#000000',
  shade: '#12141a',
  eye: '#ffffff',
  outfit: 'none',
  wake: true,
  wakePhrase: 'hey nixi',
  polished: true,
  speak: true,
  voice: 'Aoede',
  hotkeys: true,
  autostart: false,
  alwaysOnTop: true,
  placement: 'top-center',
  customPos: null,
  panelWidth: 460,
  panelHeight: 520,
  glow: true,
  breathe: true,
};

let cfg = { ...DEFAULT_CFG };
let data = { todo: [], notes: [], timers: [], reminders: [] };

/* ------------------------------------------------------------- utilities */
const ud = () => app.getPath('userData');
const cfgPath = () => path.join(ud(), 'nixi.json');
const dataPath = () => path.join(ud(), 'nixi-data.json');
const statePath = () => path.join(ud(), 'speech-state.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  try { fs.writeFileSync(file, JSON.stringify(value, null, 2)); } catch { }
}
function loadAll() {
  cfg = { ...DEFAULT_CFG, ...readJson(cfgPath(), {}) };
  data = { ...data, ...readJson(dataPath(), {}) };
  for (const k of ['todo', 'notes', 'timers', 'reminders']) {
    if (!Array.isArray(data[k])) {
      if (Array.isArray(data.todos) && k === 'todo') data.todo = data.todos;
      else if (Array.isArray(data.lists) && k === 'todo') data.todo = data.lists;
      else data[k] = [];
    }
  }
}
const saveCfg = () => writeJson(cfgPath(), cfg);
const saveData = () => writeJson(dataPath(), data);

function ps(command, timeout = 15000) {
  return new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => resolve((stdout || '').trim()));
  });
}
async function psJson(script, args = []) {
  const out = await new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => resolve((stdout || '').trim()));
  });
  try { return JSON.parse(out); } catch { return null; }
}
const sendKeys = (keys, times = 1) => ps(`$s=New-Object -ComObject WScript.Shell;1..${times}|%{$s.SendKeys('${keys}')}`);
const mediaKey = code => ps(`$s=New-Object -ComObject WScript.Shell;$s.SendKeys([char]${code})`);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ------------------------------------------------------- window handling */
const PAD = 24;
let currentW = 112;
let currentH = 56;

function getActiveWorkArea() {
  if (win && !win.isDestroyed()) {
    return screen.getDisplayMatching(win.getBounds()).workArea;
  }
  const pt = screen.getCursorScreenPoint();
  return screen.getDisplayNearestPoint(pt).workArea;
}

function calculateWindowBounds(w, h) {
  const area = getActiveWorkArea();
  const width = Math.max(60, Math.min(Math.round(w) + PAD * 2, area.width));
  const height = Math.max(40, Math.min(Math.round(h) + PAD * 2, area.height));
  let x, y;
  const placement = cfg.placement || 'top-center';

  if (placement === 'top-center') {
    x = Math.round(area.x + (area.width - width) / 2);
    y = Math.round(area.y + 4);
  } else if (placement === 'top-right') {
    x = Math.round(area.x + area.width - width - 16);
    y = Math.round(area.y + 12);
  } else if (placement === 'top-left') {
    x = Math.round(area.x + 16);
    y = Math.round(area.y + 12);
  } else if (placement === 'bottom-right') {
    x = Math.round(area.x + area.width - width - 16);
    y = Math.round(area.y + area.height - height - 12);
  } else if (placement === 'custom' && cfg.customPos) {
    if (win && !win.isDestroyed()) {
      const cur = win.getBounds();
      const centerX = cur.x + cur.width / 2;
      x = Math.round(centerX - width / 2);
      if (cur.y + cur.height > area.y + area.height * 0.65) {
        y = Math.round(cur.y + cur.height - height);
      } else {
        y = Math.round(cur.y);
      }
    } else {
      x = Math.round(cfg.customPos.x);
      y = Math.round(cfg.customPos.y);
    }
  } else {
    x = Math.round(area.x + (area.width - width) / 2);
    y = Math.round(area.y + 4);
  }

  x = Math.max(area.x, Math.min(area.x + area.width - width, x));
  y = Math.max(area.y, Math.min(area.y + area.height - height, y));

  return { x, y, width, height };
}

function placeWindow(w, h) {
  if (!win || win.isDestroyed()) return;
  currentW = w;
  currentH = h;
  const target = calculateWindowBounds(w, h);
  const cur = win.getBounds();
  if (cur.x !== target.x || cur.y !== target.y || cur.width !== target.width || cur.height !== target.height) {
    win.setBounds(target);
  }
}

function moveWindowByDelta(dx, dy) {
  if (!win || win.isDestroyed()) return;
  let deltaX = 0, deltaY = 0;
  if (typeof dx === 'object' && dx !== null) {
    deltaX = Number(dx.dx) || 0;
    deltaY = Number(dx.dy) || 0;
  } else {
    deltaX = Number(dx) || 0;
    deltaY = Number(dy) || 0;
  }
  deltaX = Math.round(deltaX);
  deltaY = Math.round(deltaY);
  if (deltaX === 0 && deltaY === 0) return;

  const b = win.getBounds();
  const area = screen.getDisplayMatching(b).workArea;
  const newX = Math.round(Math.max(area.x - 20, Math.min(area.x + area.width - b.width + 20, b.x + deltaX)));
  const newY = Math.round(Math.max(area.y - 10, Math.min(area.y + area.height - b.height + 10, b.y + deltaY)));
  if (Number.isInteger(newX) && Number.isInteger(newY)) {
    win.setPosition(newX, newY);
  }
}

function handleDragEnd() {
  if (!win || win.isDestroyed()) return;
  const b = win.getBounds();
  const area = screen.getDisplayMatching(b).workArea;
  const centerX = b.x + b.width / 2;
  const screenCenterX = area.x + area.width / 2;

  // Snap to top-center
  if (Math.abs(centerX - screenCenterX) < 90 && b.y <= area.y + 45) {
    cfg.placement = 'top-center';
    cfg.customPos = null;
    saveCfg();
    placeWindow(currentW, currentH);
    send('placement-snapped', 'top-center');
    return;
  }

  // Snap to top-right
  if (b.x + b.width >= area.x + area.width - 90 && b.y <= area.y + 60) {
    cfg.placement = 'top-right';
    cfg.customPos = null;
    saveCfg();
    placeWindow(currentW, currentH);
    send('placement-snapped', 'top-right');
    return;
  }

  // Snap to bottom-right
  if (b.x + b.width >= area.x + area.width - 90 && b.y + b.height >= area.y + area.height - 80) {
    cfg.placement = 'bottom-right';
    cfg.customPos = null;
    saveCfg();
    placeWindow(currentW, currentH);
    send('placement-snapped', 'bottom-right');
    return;
  }

  // Free float
  cfg.placement = 'custom';
  cfg.customPos = { x: b.x, y: b.y };
  saveCfg();
  send('placement-snapped', 'custom');
}

function createWindow() {
  const initBounds = calculateWindowBounds(112, 56);
  win = new BrowserWindow({
    x: initBounds.x,
    y: initBounds.y,
    width: initBounds.width,
    height: initBounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    show: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  try {
    win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(['media', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock'].includes(permission));
    });
  } catch { }
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.showInactive());
  win.on('closed', () => { win = null; });
}

/* ----------------------------------------------------------- notification toast */
let toastWin = null;

function createNotificationWindow() {
  if (toastWin && !toastWin.isDestroyed()) return toastWin;
  const area = screen.getPrimaryDisplay().workArea;
  const width = 340;
  const height = 90;
  const x = Math.round(area.x + area.width - width - 16);
  const y = Math.round(area.y + area.height - height - 12);

  toastWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  toastWin.loadFile(path.join(ROOT, 'toast.html'));
  toastWin.on('closed', () => { toastWin = null; });
  return toastWin;
}

function showNotificationToast(toastData) {
  try {
    const tw = createNotificationWindow();
    const sendData = () => {
      if (tw && !tw.isDestroyed()) {
        tw.webContents.send('show-toast', toastData);
        tw.showInactive();
      }
    };
    if (tw.webContents.isLoading()) {
      tw.once('ready-to-show', sendData);
    } else {
      sendData();
    }
  } catch (e) {}
}

/* --------------------------------------------------------------- tray & popup menu */
let trayMenuWin = null;
let settingsWin = null;

function createTrayMenuWindow() {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) return trayMenuWin;

  const width = 216;
  const height = 446;

  trayMenuWin = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  trayMenuWin.loadFile(path.join(ROOT, 'tray-menu.html'));
  trayMenuWin.on('blur', () => {
    if (trayMenuWin && !trayMenuWin.isDestroyed()) {
      trayMenuWin.hide();
    }
  });
  trayMenuWin.on('closed', () => { trayMenuWin = null; });
  return trayMenuWin;
}

function showTrayMenu(bounds) {
  try {
    const tmw = createTrayMenuWindow();
    if (tmw.isVisible()) {
      tmw.hide();
      return;
    }

    const area = screen.getPrimaryDisplay().workArea;
    const width = 216;
    const height = 446;
    let x, y;

    if (bounds && typeof bounds.x === 'number' && bounds.x > 0) {
      x = Math.round(bounds.x + bounds.width / 2 - width / 2);
      y = Math.round(bounds.y - height - 6);
      if (y < area.y) y = Math.round(bounds.y + bounds.height + 6);
    } else {
      const cur = screen.getCursorScreenPoint();
      x = Math.round(cur.x - width / 2);
      y = Math.round(cur.y - height - 8);
    }

    x = Math.max(area.x + 8, Math.min(area.x + area.width - width - 8, x));
    y = Math.max(area.y + 8, Math.min(area.y + area.height - height - 8, y));

    tmw.setPosition(x, y);
    tmw.show();
    tmw.focus();
  } catch (e) {}
}

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return settingsWin;
  }

  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(940, area.width - 60);
  const height = Math.min(680, area.height - 60);
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);

  settingsWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    resizable: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWin.loadFile(path.join(ROOT, 'settings.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
  return settingsWin;
}

let aboutWin = null;
let guideWin = null;

function openAboutWindow() {
  if (aboutWin && !aboutWin.isDestroyed()) {
    aboutWin.show();
    aboutWin.focus();
    return aboutWin;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const width = 540;
  const height = 460;
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);

  aboutWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  aboutWin.loadFile(path.join(ROOT, 'about.html'));
  aboutWin.once('ready-to-show', () => aboutWin.show());
  aboutWin.on('closed', () => { aboutWin = null; });
  return aboutWin;
}

function openGuideWindow() {
  if (guideWin && !guideWin.isDestroyed()) {
    guideWin.show();
    guideWin.focus();
    return guideWin;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const width = 680;
  const height = 560;
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);

  guideWin = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: false,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  guideWin.loadFile(path.join(ROOT, 'guide.html'));
  guideWin.once('ready-to-show', () => guideWin.show());
  guideWin.on('closed', () => { guideWin = null; });
  return guideWin;
}

function makeTrayIcon() {
  const s = 32;
  const buf = Buffer.alloc(s * s * 4);
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= s || y >= s) return;
    const i = (y * s + x) * 4;
    buf[i] = b; buf[i + 1] = g; buf[i + 2] = r; buf[i + 3] = a;
  };
  // rounded pill
  const px = 2, py = 9, pw = 28, ph = 14, rad = 7;
  for (let y = py; y < py + ph; y++) {
    for (let x = px; x < px + pw; x++) {
      const cx = Math.min(Math.max(x, px + rad), px + pw - rad - 1);
      const cy = Math.min(Math.max(y, py + rad), py + ph - rad - 1);
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad) set(x, y, 20, 20, 24, 255);
    }
  }
  // eyes
  for (const ex of [10, 20]) {
    for (let y = 12; y < 20; y++) {
      for (let x = ex; x < ex + 4; x++) {
        const inx = x >= ex + 1 && x <= ex + 2;
        const iny = y >= 13 && y <= 18;
        if (inx || iny) set(x, y, 245, 247, 250, 255);
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

function createTray() {
  try {
    tray = new Tray(makeTrayIcon());
    tray.setToolTip('heynixi - your voice assistant');
    // Custom popup matching Screenshot 2 on both click and right-click
    tray.on('click', (_event, bounds) => showTrayMenu(bounds));
    tray.on('right-click', (_event, bounds) => showTrayMenu(bounds));
  } catch (e) { tray = null; }
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

/* --------------------------------------------------------------- cursor */
function trackCursor() {
  let last = { x: -1, y: -1 };
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    if (p.x === last.x && p.y === last.y) return;
    last = p;
    send('cursor', { x: p.x, y: p.y });
  }, 80);
}

/* -------------------------------------------------------- speech worker */
function speechState(patch) {
  writeJson(statePath(), { mode: speechMode, wake: cfg.wakePhrase || 'hey nixi', listen: !!cfg.wake, capturing: false, gen: captureGen, ...patch });
}

function stopSpeech() {
  if (speechProc) {
    try { speechProc.kill(); } catch { }
    speechProc = null;
  }
}

function startSpeech() {
  stopSpeech();
  speechState({});
  const args = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(ROOT, 'speech.ps1'),
    '-Mode', speechMode,
    '-StateFile', statePath(),
    '-WakePhrase', cfg.wakePhrase || 'hey nixi'
  ];
  try {
    speechProc = spawn('powershell', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    speechProc = null;
    return;
  }
  let buffer = '';
  speechProc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try { send('speech', JSON.parse(line)); } catch { }
    }
  });
  speechProc.stderr.on('data', () => { });
  speechProc.on('exit', () => {
    speechProc = null;
    send('speech', { type: 'bye' });
    setTimeout(() => { if (!speechProc) startSpeech(); }, 1500);
  });
  speechProc.on('error', () => { speechProc = null; });
}

function setSpeechMode(mode) {
  speechMode = mode;
  speechState({ mode });
}

/* -------------------------------------------------------- hotkey worker */
function startHotkeys() {
  if (hotkeyProc) return;
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'hotkey.ps1')];
  try { hotkeyProc = spawn('powershell', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); } catch { hotkeyProc = null; return; }
  let buffer = '';
  hotkeyProc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const evt = JSON.parse(line);
        if (evt.id === 'error') continue;
        onHotkey(evt.id, !!evt.down);
      } catch { }
    }
  });
  hotkeyProc.stderr.on('data', () => { });
  hotkeyProc.on('exit', () => { hotkeyProc = null; setTimeout(() => { if (cfg.hotkeys) startHotkeys(); }, 2000); });
  hotkeyProc.on('error', () => { hotkeyProc = null; });
}

function registerShortcuts() {
  try {
    globalShortcut.register('Control+Shift+Space', () => toggleHotkey('cmd'));
    globalShortcut.register('Control+Shift+D', () => toggleHotkey('dict'));
    globalShortcut.register('Control+Shift+W', () => send('hotkey', 'write'));
  } catch { }
}

function onHotkey(id, down) {
  if (!cfg.hotkeys) return;
  const now = Date.now();
  if (lastTrigger[id] === down) return;
  lastTrigger[id] = down;
  const guard = key => {
    if (lastTrigger['guard_' + key] && now - lastTrigger['guard_' + key] < 300) return;
    lastTrigger['guard_' + key] = now;
    send('hotkey', key);
  };
  if (id === 'rc') return guard(down ? 'cmd-hold' : 'cmd-release');
  if (id === 'ra') return guard(down ? 'dict-hold' : 'dict-release');
  if (id === 'cmd') return guard(down ? 'cmd' : 'cmd-up');
  if (id === 'dict') return guard(down ? 'dict' : 'dict-up');
  if (id === 'write') return guard(down ? 'write' : 'write-up');
  if (id === 'mute') return guard(down ? 'mute' : 'mute-up');
}

/* ---------------------------------------------------------------- media */
function toggleHotkey(id) {
  const now = Date.now();
  const stamp = 'toggle_' + id;
  if (lastTrigger[stamp] && now - lastTrigger[stamp] < 400) return;
  lastTrigger[stamp] = now;
  const on = !lastTrigger['on_' + id];
  lastTrigger['on_' + id] = on;
  send('hotkey', on ? id : id + '-up');
}

async function nowPlaying(force) {
  if (!force && mediaCache.value && Date.now() - mediaCache.at < 2500) return mediaCache.value;
  const value = await psJson(path.join(ROOT, 'media.ps1'));
  mediaCache = { at: Date.now(), value: value || { playing: false, title: '', artist: '', status: 'none' } };
  return mediaCache.value;
}

/* -------------------------------------------------------------- actions */
async function currentVolume() {
  const v = await psJson(path.join(ROOT, 'volume.ps1'));
  return v && typeof v.volume === 'number' ? v.volume : null;
}

function calcExpression(source) {
  const tokens = String(source).match(/\d+\.?\d*|[-+*/^%()]/g);
  if (!tokens) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = t => { if (tokens[pos] === t) { pos++; return true; } return false; };
  function parseExpr() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = tokens[pos++];
      const right = parseUnary();
      if ((op === '/' || op === '%') && right === 0) return NaN;
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }
  function parseUnary() {
    if (eat('-')) return -parseUnary();
    if (eat('+')) return parseUnary();
    return parsePower();
  }
  function parsePower() {
    const base = parseAtom();
    if (peek() === '^') { pos++; return Math.pow(base, parseUnary()); }
    return base;
  }
  function parseAtom() {
    if (eat('(')) { const v = parseExpr(); eat(')'); return v; }
    const t = tokens[pos++];
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }
  const value = parseExpr();
  if (isNaN(value) || !isFinite(value)) return null;
  return Math.round(value * 1e10) / 1e10;
}

async function findFiles(query) {
  const q = String(query || '').replace(/['"\\]/g, '').trim();
  if (!q) return [];
  const script = `
$q='${q}';
$dirs=@("$env:USERPROFILE\\Desktop","$env:USERPROFILE\\Documents","$env:USERPROFILE\\Downloads","$env:USERPROFILE\\Pictures","$env:USERPROFILE\\Videos","$env:USERPROFILE\\OneDrive");
$found=@();
foreach($d in $dirs){ if(Test-Path $d){ $found += Get-ChildItem -LiteralPath $d -Recurse -Depth 4 -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$q*" } | Select-Object -First 6 -ExpandProperty FullName } }
if($found.Count -eq 0){ $found = Get-ChildItem -LiteralPath "$env:USERPROFILE" -Recurse -Depth 5 -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$q*" } | Select-Object -First 6 -ExpandProperty FullName }
$found | Select-Object -Unique -First 6`;
  const out = await ps(script, 25000);
  return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

async function pasteText(text) {
  clipboard.writeText(text || '');
  const visible = win && win.isVisible();
  if (visible) { win.hide(); }
  await sleep(260);
  await sendKeys('^v');
  await sleep(140);
  if (visible && win && !win.isDestroyed()) win.showInactive();
}

async function focusBrowser() {
  if (win && !win.isDestroyed()) { win.hide(); await sleep(200); }
}

const ACTIONS = {
  async time_date({ date }) {
    const d = new Date();
    if (date) return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  },
  async open_app({ names = [] }) {
    const list = Array.isArray(names) ? names : [names];
    const out = [];
    for (const n of list) {
      if (!n) continue;
      const r = await apps.launch(n);
      out.push(r.message || `Opened ${n}.`);
    }
    return out.join('\n');
  },
  async search_on({ platform, query }) {
    const res = await apps.searchOn(platform, query);
    return res.message;
  },
  async compound({ actions = [] }) {
    const results = [];
    for (const a of actions) {
      if (!a || !a.id) continue;
      const fn = ACTIONS[a.id];
      if (fn) {
        const r = await fn(a.args || {});
        if (r && typeof r === 'string') results.push(r);
      }
    }
    return results.join('\n') || 'Done.';
  },
  async open_url({ url }) {
    const u = String(url || '').trim();
    if (!u) return 'No address given.';
    await shell.openExternal(/^https?:/i.test(u) ? u : 'https://' + u);
    return `Opened ${u}.`;
  },
  async web_search({ query }) {
    const q = String(query || '').trim();
    await shell.openExternal('https://www.google.com/search?q=' + encodeURIComponent(q));
    return `Searching for “${q}”.`;
  },
  async set_timer({ seconds, label }) {
    const s = Math.max(1, Math.round(Number(seconds) || 0));
    const now = Date.now();
    const item = { id: now + Math.random(), at: now + s * 1000, startAt: now, totalSeconds: s, label: label || 'Timer', kind: 'timer' };
    data.timers.push(item);
    saveData();
    send('data-updated');
    showNotificationToast({
      title: item.label,
      subtitle: `Timer · in ${intents.humanDuration(s)}`,
      kind: 'timer'
    });
    return `Timer set for ${intents.humanDuration(s)}.`;
  },
  async set_reminder({ text, time, minutes, at }) {
    let when = Number(at) || null;
    if (!when) {
      if (time) { const d = intents.parseClockTime(time); if (d) when = d.getTime(); }
    }
    if (!when && minutes) when = Date.now() + Number(minutes) * 60000;
    if (!when) when = Date.now() + 60000;
    const now = Date.now();
    const item = { id: now + Math.random(), at: when, startAt: now, label: text || 'Reminder', kind: 'reminder' };
    data.reminders.push(item);
    saveData();
    send('data-updated');
    const stamp = new Date(when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const diffMin = Math.round((when - now) / 60000);
    const subStr = diffMin > 0 ? `Reminder · in ${diffMin} minutes` : `Reminder · at ${stamp}`;
    showNotificationToast({
      title: item.label,
      subtitle: subStr,
      kind: 'reminder'
    });
    return `Reminder set for ${stamp}: ${item.label}.`;
  },
  async cancel_timer({ all, id }) {
    if (id) {
      data.timers = data.timers.filter(t => String(t.id) !== String(id));
      data.reminders = data.reminders.filter(r => String(r.id) !== String(id));
    } else {
      data.timers = []; data.reminders = [];
    }
    saveData();
    send('data-updated');
    return `Cancelled.`;
  },
  async list_timers() {
    const all = [...data.timers, ...data.reminders].sort((a, b) => a.at - b.at);
    if (!all.length) return 'Nothing scheduled.';
    return all.map(t => `• ${t.label} — ${new Date(t.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join('\n');
  },
  async todo_add({ item }) {
    const text = String(item || '').trim();
    if (!text) return 'Nothing to add.';
    data.todo.push({ id: Date.now() + Math.random(), text, done: false, at: Date.now() });
    saveData();
    return `Added “${text}”.`;
  },
  async todo_list() {
    if (!data.todo.length) return 'Your list is empty.';
    return data.todo.map(t => `• ${t.done ? '✓' : '○'} ${t.text}`).join('\n');
  },
  async todo_remove({ item }) {
    const q = String(item || '').toLowerCase();
    const before = data.todo.length;
    data.todo = data.todo.filter(t => !t.text.toLowerCase().includes(q));
    saveData();
    return before === data.todo.length ? `“${item}” was not on the list.` : `Removed “${item}”.`;
  },
  async todo_toggle({ item }) {
    const q = String(item || '').toLowerCase();
    const hit = data.todo.find(t => t.text.toLowerCase().includes(q));
    if (!hit) return 'Not on the list.';
    hit.done = !hit.done;
    saveData();
    return `${hit.done ? 'Done' : 'Not done'}: ${hit.text}`;
  },
  async todo_clear() {
    const n = data.todo.length;
    data.todo = [];
    saveData();
    return `Cleared ${n} item${n === 1 ? '' : 's'}.`;
  },
  async note({ text }) {
    const t = String(text || '').trim();
    if (!t) return 'Nothing to note.';
    data.notes.push({ id: Date.now() + Math.random(), text: t, at: Date.now() });
    saveData();
    return 'Noted.';
  },
  async list_notes() {
    if (!data.notes.length) return 'No notes yet.';
    return data.notes.slice(-8).map(n => `• ${n.text}`).join('\n');
  },
  async volume({ action, amount = 5 }) {
    const step = Math.max(1, Math.min(50, Number(amount) || 5));
    const cur = await currentVolume();
    if (action === 'mute') { await psJson(path.join(ROOT, 'volume.ps1'), ['-Mute']); return 'Muted.'; }
    if (action === 'unmute') { await psJson(path.join(ROOT, 'volume.ps1'), ['-Unmute']); return 'Unmuted.'; }
    const base = cur == null ? 50 : cur;
    const next = action === 'down' ? base - step : base + step;
    await psJson(path.join(ROOT, 'volume.ps1'), ['-Set', String(Math.max(0, Math.min(100, next)))]);
    return `Volume ${action === 'down' ? 'down' : 'up'} to ${Math.max(0, Math.min(100, next))}%.`;
  },
  async volume_set({ value }) {
    const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    await psJson(path.join(ROOT, 'volume.ps1'), ['-Set', String(v)]);
    return `Volume ${v}%.`;
  },
  async volume_get() {
    const v = await currentVolume();
    return v == null ? 'Could not read the volume.' : `Volume ${v}%.`;
  },
  async media({ action }) {
    const map = { playpause: 179, play: 179, pause: 179, next: 176, prev: 177, stop: 178 };
    const code = map[action];
    if (!code) return 'Unknown media action.';
    await mediaKey(code);
    return { playpause: 'Play / pause.', play: 'Playing.', pause: 'Paused.', next: 'Next track.', prev: 'Previous track.', stop: 'Stopped.' }[action];
  },
  async now_playing() {
    const m = await nowPlaying(true);
    if (!m || !m.title) return 'Nothing is playing right now.';
    const who = m.artist ? ` by ${m.artist}` : '';
    return `Now playing: ${m.title}${who}.`;
  },
  async dark_mode({ enable = true }) {
    const v = enable ? 0 : 1;
    const p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize';
    await ps(`Set-ItemProperty -Path '${p}' -Name AppsUseLightTheme -Value ${v}; Set-ItemProperty -Path '${p}' -Name SystemUsesLightTheme -Value ${v}; Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue`);
    return enable ? 'Dark mode on.' : 'Light mode on.';
  },
  async find_file({ query }) {
    const hits = await findFiles(query);
    if (!hits.length) return `Could not find “${query}”.`;
    await ps(`explorer.exe /select,"${hits[0].replace(/"/g, '')}"`);
    const extra = hits.length > 1 ? `\nAlso found: ${hits.slice(1).map(h => path.basename(h)).join(', ')}` : '';
    return `Found ${path.basename(hits[0])}.${extra}`;
  },
  async browser_action({ action }) {
    const keys = { new_tab: '^t', close_tab: '^w', zoom_in: '^{ADD}', zoom_out: '^{SUBTRACT}', scroll_down: '{PGDN}', scroll_up: '{PGUP}', refresh: '{F5}' };
    const k = keys[action];
    if (!k) return 'Unknown browser action.';
    await focusBrowser();
    await sendKeys(k);
    return {
      new_tab: 'New tab opened.', close_tab: 'Tab closed.', zoom_in: 'Zoomed in.', zoom_out: 'Zoomed out.',
      scroll_down: 'Scrolled down.', scroll_up: 'Scrolled up.', refresh: 'Refreshed.'
    }[action];
  },
  async teleprompter({ script }) {
    return { tele: script };
  },
  async calculate({ expression }) {
    const value = calcExpression(expression);
    if (value == null) return 'I could not work that out.';
    return `${expression.replace(/\s+/g, ' ')} = ${value}`;
  },
  async lock() {
    setTimeout(() => ps('rundll32.exe user32.dll,LockWorkStation'), 600);
    return 'Locking your PC.';
  },
  async screenshot() {
    const { width, height } = screen.getPrimaryDisplay().size;
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.min(width, 1600), height: Math.min(height, 900) } });
    if (!sources.length) return 'Could not capture the screen.';
    const png = sources[0].thumbnail.toPNG();
    const dir = path.join(app.getPath('pictures'), 'Screenshots', 'Nixi');
    try { fs.mkdirSync(dir, { recursive: true }); } catch { }
    const file = path.join(dir, `Nixi ${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
    fs.writeFileSync(file, png);
    return `Saved ${path.basename(file)}.`;
  },
  async clipboard_read() {
    const t = clipboard.readText();
    return t ? t.slice(0, 2000) : 'The clipboard is empty.';
  },
  async clipboard_paste() {
    await pasteText('');
    return 'Pasted.';
  },
  async system_info() {
    const cpu = os.cpus()[0] ? os.cpus()[0].model.trim() : 'unknown CPU';
    const mem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const free = Math.round(os.freemem() / 1024 / 1024 / 1024);
    return `${os.type()} ${os.release()} (${os.arch()})\n${cpu}\nRAM ${free} GB free of ${mem} GB\nScreen ${screen.getPrimaryDisplay().size.width}x${screen.getPrimaryDisplay().size.height}`;
  }
};

/* ------------------------------------------------------------------ ipc */
ipcMain.on('size', (_e, w, h) => placeWindow(w, h));
ipcMain.on('prepare-size', (_e, data) => {
  if (data && typeof data === 'object') placeWindow(data.w, data.h);
  else if (data != null) placeWindow(data, arguments[2]);
});
ipcMain.on('window-move-delta', (_e, data, maybeDy) => moveWindowByDelta(data, maybeDy));
ipcMain.on('window-drag-end', () => handleDragEnd());
ipcMain.on('window-set-placement', (_e, placement) => {
  cfg.placement = placement;
  if (placement !== 'custom') cfg.customPos = null;
  saveCfg();
  placeWindow(currentW, currentH);
  send('cfg', cfg);
});
ipcMain.on('window-resize-panel', (_e, { width, height }) => {
  cfg.panelWidth = Math.max(340, Math.min(760, Math.round(width)));
  cfg.panelHeight = Math.max(260, Math.min(800, Math.round(height)));
  saveCfg();
  placeWindow(cfg.panelWidth, cfg.panelHeight);
});
ipcMain.handle('window-get-placement', () => ({
  placement: cfg.placement || 'top-center',
  customPos: cfg.customPos,
  panelWidth: cfg.panelWidth || 460,
  panelHeight: cfg.panelHeight || 520
}));
ipcMain.on('quit', () => app.quit());
ipcMain.handle('cfg-set', (_e, c) => { cfg = { ...cfg, ...c }; saveCfg(); applyCfg(); return true; });
ipcMain.handle('cfg-get', () => cfg);
ipcMain.handle('data-get', () => data);
ipcMain.handle('intent', (_e, text) => intents.match(text));
ipcMain.handle('classify', (_e, text) => intents.classify(text));
function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

ipcMain.handle('gemini-tts', async (_e, { text, voice, key } = {}) => {
  try {
    const k = key || cfg.key || cfg.apiKey;
    if (!k) throw new Error('No Gemini API key configured.');
    const v = voice || cfg.voice || 'Aoede';
    const cleanText = String(text || '').replace(/\s+/g, ' ').slice(0, 600);
    if (!cleanText.trim()) throw new Error('Empty text.');

    // Use gemini-2.5-flash-preview-tts as requested
    const models = ['gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts'];
    let lastErr = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k}`;
        const payload = {
          contents: [{ parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: v
                }
              }
            }
          }
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const part = data?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType || 'audio/wav';
        if (!audioData) throw new Error('No audio returned by Gemini.');

        // Convert raw PCM to WAV container so HTML5 Audio plays smoothly
        let finalAudioData = audioData;
        let finalMimeType = mimeType;
        if (mimeType.includes('pcm') || mimeType.includes('L16')) {
          const rateMatch = mimeType.match(/rate=(\d+)/i);
          const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
          const pcmBuf = Buffer.from(audioData, 'base64');
          const wavBuf = pcmToWavBuffer(pcmBuf, sampleRate, 1, 16);
          finalAudioData = wavBuf.toString('base64');
          finalMimeType = 'audio/wav';
        }

        return { ok: true, audioData: finalAudioData, mimeType: finalMimeType };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('TTS generation failed.');
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('paste', async (_e, text) => {
  try {
    await pasteText(text || '');
    return true;
  } catch (e) {
    return false;
  }
});
ipcMain.handle('transcribe-audio', async (_e, { base64Webm, promptText } = {}) => {
  const k = cfg.key || cfg.apiKey;
  if (!k || !base64Webm) return null;
  const models = [cfg.model || 'gemini-2.5-flash', 'gemini-3.8-flash'].filter(Boolean);
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
      const payload = JSON.stringify({
        contents: [{
          parts: [
            { text: promptText || 'Transcribe this spoken audio verbatim.' },
            { inlineData: { mimeType: 'audio/webm', data: base64Webm } }
          ]
        }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
      });
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payload))
        },
        body: payload
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {}
  }
  return null;
});
ipcMain.handle('act', async (_e, name, args) => {
  try {
    const fn = ACTIONS[name];
    if (!fn) return `I do not know how to “${name}” yet.`;
    const res = await fn(args || {});
    return res == null ? 'Done.' : res;
  } catch (e) {
    return `That did not work: ${e.message}`;
  }
});
ipcMain.handle('shot', async () => {
  const { width, height } = screen.getPrimaryDisplay().size;
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.min(width, 1600), height: Math.min(height, 900) } });
  if (!sources.length) return '';
  return sources[0].thumbnail.toPNG().toString('base64');
});
ipcMain.handle('media', async (_e, force) => nowPlaying(!!force));
ipcMain.handle('media-seek', async (_e, position) => {
  mediaCache = { at: 0, value: null };
  const pos = Math.max(0, Number(position) || 0);
  return await psJson(path.join(ROOT, 'media.ps1'), ['-Action', 'seek', '-Position', String(pos)]);
});
ipcMain.handle('media-action', async (_e, action, position = 0) => {
  mediaCache = { at: 0, value: null };
  return await psJson(path.join(ROOT, 'media.ps1'), ['-Action', String(action), '-Position', String(position)]);
});
ipcMain.handle('volume-get', () => currentVolume());
ipcMain.handle('files', async (_e, q) => findFiles(q));
ipcMain.on('speech-mode', (_e, mode) => setSpeechMode(mode));
ipcMain.on('speech-capture', () => { captureGen++; speechState({ capturing: true, gen: captureGen }); });
ipcMain.on('speech-stop', () => { speechState({ capturing: false }); setSpeechMode('wake'); });
ipcMain.on('panel', (_e, what) => send('panel-open', what));
ipcMain.on('tray-menu-action', (_e, action) => {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) {
    trayMenuWin.hide();
  }
  if (action === 'quit') {
    app.quit();
  } else if (action === 'settings') {
    openSettingsWindow();
  } else if (action === 'about') {
    openAboutWindow();
  } else if (action === 'guide') {
    openGuideWindow();
  } else if (action === 'close') {
    // closed
  } else {
    if (win && !win.isDestroyed()) {
      win.showInactive();
      win.focus();
      send('panel-open', action === 'open' ? 'chat' : action);
    }
  }
});
ipcMain.on('toggle-tray-menu', (_e, pt) => {
  showTrayMenu(pt);
});
ipcMain.on('open-settings', () => openSettingsWindow());
ipcMain.on('close-settings', () => {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
});
ipcMain.on('close-about', () => {
  if (aboutWin && !aboutWin.isDestroyed()) aboutWin.close();
});
ipcMain.on('close-guide', () => {
  if (guideWin && !guideWin.isDestroyed()) guideWin.close();
});
ipcMain.on('try-prompt', (_e, text) => {
  if (win && !win.isDestroyed()) {
    win.showInactive();
    win.focus();
    send('panel-open', 'chat');
    send('chat-prompt', text);
  }
});
ipcMain.on('dismiss-toast', () => {
  if (toastWin && !toastWin.isDestroyed()) toastWin.hide();
});
ipcMain.on('open-companion-panel', () => {
  if (win && !win.isDestroyed()) {
    win.showInactive();
    win.focus();
    send('panel-open', 'chat');
  }
});
ipcMain.on('focus', () => { if (win) { win.showInactive(); win.focus(); } });
ipcMain.handle('window-show', () => { if (win) { win.showInactive(); } return true; });
ipcMain.handle('window-hide', () => { if (win) win.hide(); return true; });

/* ---------------------------------------------------------- config apply */
function applyCfg() {
  if (cfg.alwaysOnTop === false && win) win.setAlwaysOnTop(false);
  else if (win) win.setAlwaysOnTop(true, 'screen-saver');
  if (cfg.hotkeys) { startHotkeys(); registerShortcuts(); } else { try { hotkeyProc && hotkeyProc.kill(); } catch { } hotkeyProc = null; globalShortcut.unregisterAll(); }
  // The speech worker always runs: the wake phrase can be switched off, but
  // the hotkeys still need the recogniser.
  setSpeechMode('wake');
  speechState({ listen: !!cfg.wake });
  if (!speechProc) startSpeech();
  send('cfg', cfg);
}

/* ----------------------------------------------------------------- boot */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.showInactive(); win.focus(); } });

  app.whenReady().then(() => {
    loadAll();
    createWindow();
    createTray();

    applyCfg();
    trackCursor();

    // timers and reminders
    setInterval(() => {
      const now = Date.now();
      const due = [...data.timers, ...data.reminders].filter(t => t.at <= now);
      if (due.length) {
        data.timers = data.timers.filter(t => t.at > now);
        data.reminders = data.reminders.filter(t => t.at > now);
        saveData();
        due.forEach(t => {
          send('toast', { title: t.label, kind: t.kind, at: t.at });
          showNotificationToast({
            title: t.label || (t.kind === 'reminder' ? 'Reminder' : 'Timer'),
            subtitle: `${t.kind === 'reminder' ? 'Reminder Due' : 'Timer Done!'}`,
            kind: t.kind
          });
        });
      }
    }, 500);

    app.on('activate', () => { if (win) win.showInactive(); });
  });

  app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch { }
    try { speechProc && speechProc.kill(); } catch { }
    try { hotkeyProc && hotkeyProc.kill(); } catch { }
  });

  app.on('window-all-closed', () => app.quit());
}
