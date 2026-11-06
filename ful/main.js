/*
  FUL desktop companion - main process.

  Owns the always-on-top pill window, the offline speech worker, the global
  hotkey watcher, the media reader and every action FUL can take on the PC.
*/
'use strict';

const { app, BrowserWindow, screen, ipcMain, desktopCapturer, globalShortcut, clipboard, shell, Tray, Menu, nativeImage, dialog, powerMonitor } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const apps = require('./apps');
const intents = require('./intents');
const browserRunner = require('./scripts/browser_runner');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { FileController, ComputerSettings, DevAgent, getWeatherReport, executeUndo, memoryEngine, SystemMonitor, WebsiteBuilder, CameraVision } = require('./actions_engine');
const { echoGuard, splitSentences, speakSystemSapi, stopSystemSapi, speakElevenLabs, transcribeHostedWhisper, languageGuard } = require('./voice_engine');

const systemMonitor = new SystemMonitor({
  ramThresholdPercent: 85,
  cooldownMs: 180000,
  onAlert: (alertData) => {
    send('system-alert', alertData);
  }
});
const websiteBuilder = new WebsiteBuilder();
const cameraVision = new CameraVision();

if (app && app.commandLine) {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
}

const ROOT = __dirname;
let win = null;
let tray = null;
let agent = null;
let workspaceWin = null;
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
  wakePhrase: 'hey ful',
  polished: true,
  speak: true,
  voice: 'Kore',
  sttEngine: 'parakeet',
  sttModel: 'parakeet-unified-en-0.6b',
  hotkeys: true,
  autostart: false,
  alwaysOnTop: true,
  placement: 'top-center',
  customPos: null,
  panelWidth: 460,
  panelHeight: 520,
  glow: true,
  breathe: true,
  sounds: true,
  userName: 'Rikesh',
  language: 'mixed',
  timezone: 'Asia/Kathmandu',
  agentProvider: 'gemini',
  agentApiKey: '',
  agentModel: 'gemini-2.5-flash',
  agentBaseUrl: '',
  agentSpeakResults: true,
  agentModelVerification: false,
  agentWorkspaceRoots: [],
  activeWorkspace: null,
  agentRequireApprovalForWrites: false,
  agentAutoApproveCommands: false,
  agentAllowReadOutside: false,
  agentConfirmationTtlMs: 120000,
  proactive: true,
  proactiveUseAI: true,
  quietMode: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  proactiveMinGapSec: 120,
  proactiveBudgetPerHour: 6,
  idleAvailableSec: 300,
  dailyBriefing: false,
  dailyBriefingTime: '08:00',
  batteryMonitor: true,
  batteryPollMs: 30000,
  batteryLow: 20,
  batteryCritical: 10,
  batteryHigh: 80,
  batteryNotifyCharging: true,
  batteryNotifyUnplug: true,
  chargeLimitEnabled: false,
  diskLowPercent: 10,
  ramAlertThreshold: 85,
  ramAlertEnabled: true,
};

let cfg = { ...DEFAULT_CFG };
let data = { todo: [], notes: [], timers: [], reminders: [] };

/* ------------------------------------------------------------- utilities */
const ud = () => app.getPath('userData');
const cfgPath = () => path.join(ud(), 'ful.json');
const dataPath = () => path.join(ud(), 'ful-data.json');
const statePath = () => path.join(ud(), 'speech-state.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  try { fs.writeFileSync(file, JSON.stringify(value, null, 2)); } catch { }
}

const LEGACY_DIRS = ['nixi-companion', 'heynixi'];
const LEGACY_FILES = {
  'nixi.json': 'ful.json',
  'nixi-data.json': 'ful-data.json',
  'nixi-memory.json': 'ful-memory.json',
  'nixi-reminders.json': 'ful-reminders.json',
  'nixi-battery-state.json': 'ful-battery-state.json',
  'nixi-agent-changes.json': 'ful-agent-changes.json',
  'speech-state.json': 'speech-state.json'
};
const LEGACY_DIR_MAP = {
  'nixi-agent-backups': 'ful-agent-backups',
  'nixi-agent-trash': 'ful-agent-trash',
  'nixi-agent-checkpoints': 'ful-agent-checkpoints'
};

function migrateLegacyData() {
  const current = ud();
  try { fs.mkdirSync(current, { recursive: true }); } catch { }
  const bases = [path.dirname(current)];
  if (process.env.LOCALAPPDATA) bases.push(process.env.LOCALAPPDATA);
  const oldDirs = [];
  for (const base of bases) {
    for (const name of LEGACY_DIRS) {
      const dir = path.join(base, name);
      if (dir !== current && !oldDirs.includes(dir)) oldDirs.push(dir);
    }
  }
  for (const oldDir of oldDirs) {
    let exists = false;
    try { exists = fs.statSync(oldDir).isDirectory(); } catch { }
    if (!exists) continue;
    for (const [from, to] of Object.entries(LEGACY_FILES)) {
      const src = path.join(oldDir, from);
      const dest = path.join(current, to);
      try {
        if (fs.existsSync(src) && !fs.existsSync(dest)) fs.copyFileSync(src, dest);
      } catch { }
    }
    for (const [from, to] of Object.entries(LEGACY_DIR_MAP)) {
      const src = path.join(oldDir, from);
      const dest = path.join(current, to);
      try {
        if (fs.existsSync(src) && !fs.existsSync(dest)) fs.cpSync(src, dest, { recursive: true, errorOnExist: false, force: false });
      } catch { }
    }
  }
}

function loadAll() {
  cfg = { ...DEFAULT_CFG, ...readJson(cfgPath(), {}) };
  data = { ...data, ...readJson(dataPath(), {}) };
  if (typeof cfg.wakePhrase === 'string' && /^hey[\s._-]*nixi$/i.test(cfg.wakePhrase)) {
    cfg.wakePhrase = 'hey ful';
    saveCfg();
  }
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
function psFile(script, args = [], timeout = 20000) {
  return new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err || stderr) {
          console.warn('[PS_WARN]', script, err?.message || stderr);
        }
        const out = (stdout || '').trim();
        if (out) return resolve(out);
        if (stderr && !/ParserError|FullyQualifiedErrorId|CategoryInfo|At line:/i.test(stderr)) {
          return resolve(stderr.trim());
        }
        return resolve('');
      });
  });
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

function securePrefs(extra = {}) {
  return {
    preload: path.join(ROOT, 'preload', 'bridge.js'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
    ...extra
  };
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
    webPreferences: securePrefs({
      backgroundThrottling: false,
      spellcheck: false
    })
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  try {
    win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(['media', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock'].includes(permission));
    });
  } catch { }
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const lineStr = `[Renderer ${level}] (${sourceId}:${line}) ${message}\n`;
    try { fs.appendFileSync(path.join(ROOT, 'renderer.log'), lineStr); } catch {}
    console.log(lineStr.trim());
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.showInactive());

  screen.on('display-metrics-changed', () => placeWindow(currentW, currentH));
  screen.on('display-added', () => placeWindow(currentW, currentH));
  screen.on('display-removed', () => placeWindow(currentW, currentH));

  powerMonitor.on('resume', () => {
    if (win && !win.isDestroyed()) {
      placeWindow(currentW, currentH);
      win.showInactive();
    }
  });
  powerMonitor.on('unlock-screen', () => {
    if (win && !win.isDestroyed()) {
      placeWindow(currentW, currentH);
      win.showInactive();
    }
  });
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
    webPreferences: securePrefs()
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
  const height = 480;

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
    webPreferences: securePrefs()
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
    const height = 480;
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
    webPreferences: securePrefs()
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
    webPreferences: securePrefs()
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
    webPreferences: securePrefs()
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
    const trayPath = path.join(ROOT, 'icons', 'tray.png');
    const trayImg = fs.existsSync(trayPath) ? nativeImage.createFromPath(trayPath) : makeTrayIcon();
    tray = new Tray(trayImg);
    tray.setToolTip('FUL - your voice assistant');
    // Custom popup matching Screenshot 2 on both click and right-click
    tray.on('click', (_event, bounds) => showTrayMenu(bounds));
    tray.on('right-click', (_event, bounds) => showTrayMenu(bounds));
  } catch (e) { tray = null; }
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function broadcast(channel, payload) {
  const windows = [win, workspaceWin, settingsWin];
  const seen = new Set();
  for (const w of windows) {
    if (!w || w.isDestroyed() || seen.has(w.id)) continue;
    seen.add(w.id);
    try { w.webContents.send(channel, payload); } catch { }
  }
}

function openWorkspaceWindow() {
  if (workspaceWin && !workspaceWin.isDestroyed()) {
    workspaceWin.show();
    workspaceWin.focus();
    return workspaceWin;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1220, area.width - 48);
  const height = Math.min(820, area.height - 48);
  const x = Math.round(area.x + (area.width - width) / 2);
  const y = Math.round(area.y + (area.height - height) / 2);
  workspaceWin = new BrowserWindow({
    x, y, width, height,
    minWidth: 920,
    minHeight: 620,
    frame: false,
    transparent: false,
    backgroundColor: '#08090d',
    alwaysOnTop: false,
    resizable: true,
    show: false,
    webPreferences: securePrefs({ backgroundThrottling: false })
  });
  workspaceWin.loadFile(path.join(ROOT, 'workspace.html'));
  workspaceWin.once('ready-to-show', () => workspaceWin.show());
  workspaceWin.on('closed', () => { workspaceWin = null; });
  return workspaceWin;
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
  writeJson(statePath(), {
    mode: speechMode,
    wake: cfg.wakePhrase || 'hey ful',
    listen: !!cfg.wake,
    capturing: false,
    gen: captureGen,
    isSpeaking: echoGuard.isSpeaking,
    suppressingUntil: echoGuard.suppressingUntil,
    ...patch
  });
}

/* -------------------------------------------------------- neural wake word worker (openwakeword) */
let wakeWordProc = null;

function startWakeWordWorker() {
  if (wakeWordProc) return;
  const pyScript = path.join(ROOT, 'scripts', 'wake_word_worker.py');
  if (!fs.existsSync(pyScript)) return;

  try {
    wakeWordProc = spawn('python', [pyScript, '--state-file', statePath(), '--threshold', '0.5'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    wakeWordProc = null;
    return;
  }

  let buffer = '';
  wakeWordProc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'wake') {
          if (!echoGuard.isSpeaking && Date.now() >= echoGuard.suppressingUntil) {
            send('speech', { type: 'wake', model: msg.model || 'openwakeword' });
          }
        }
      } catch {}
    }
  });

  wakeWordProc.on('exit', () => {
    wakeWordProc = null;
  });

  wakeWordProc.on('error', () => {
    wakeWordProc = null;
  });
}

function stopWakeWordWorker() {
  if (wakeWordProc) {
    try {
      if (wakeWordProc.stdin && wakeWordProc.stdin.writable) wakeWordProc.stdin.end();
      wakeWordProc.kill();
    } catch {}
    wakeWordProc = null;
  }
}

function stopSpeech() {
  if (speechProc) {
    try { speechProc.kill(); } catch { }
    speechProc = null;
  }
  stopWakeWordWorker();
}

function startSpeech() {
  stopSpeech();
  speechState({});
  if (cfg.wake) {
    startWakeWordWorker();
  }
  const args = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(ROOT, 'speech.ps1'),
    '-Mode', speechMode,
    '-StateFile', statePath(),
    '-WakePhrase', cfg.wakePhrase || 'hey ful'
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
    globalShortcut.register('Control+Space', () => toggleHotkey('cmd'));
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
  if (id === 'cmd') {
    lastTrigger['on_cmd'] = down;
    return guard(down ? 'cmd' : 'cmd-up');
  }
  if (id === 'dict') {
    lastTrigger['on_dict'] = down;
    return guard(down ? 'dict' : 'dict-up');
  }
  if (id === 'write') return guard(down ? 'write' : 'write-up');
  if (id === 'mute') return guard(down ? 'mute' : 'mute-up');
}

/* ---------------------------------------------------------------- media */
function toggleHotkey(id) {
  if (hotkeyProc && (id === 'cmd' || id === 'dict')) return;
  const now = Date.now();
  const stamp = 'toggle_' + id;
  if (lastTrigger[stamp] && now - lastTrigger[stamp] < 400) return;
  lastTrigger[stamp] = now;
  const on = !lastTrigger['on_' + id];
  lastTrigger['on_' + id] = on;
  send('hotkey', on ? id : id + '-up');
}

async function nowPlaying(force) {
  if (!force && mediaCache.value && Date.now() - mediaCache.at < 2500) {
    if (mediaCache.value.status === 'playing' || mediaCache.value.playing) {
      const elapsedSec = (Date.now() - mediaCache.at) / 1000;
      const copy = { ...mediaCache.value };
      if (copy.duration > 0) {
        copy.position = Math.min(copy.duration, (copy.position || 0) + elapsedSec);
      } else {
        copy.position = (copy.position || 0) + elapsedSec;
      }
      return copy;
    }
    return mediaCache.value;
  }
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
    const expanded = [];
    for (const item of list) {
      if (!item) continue;
      const parts = String(item).split(/[\s,]+and[\s,]+|[\s,]+&[\s,]+|[,;]+|\s+/i)
        .map(s => s.trim())
        .filter(Boolean);
      if (parts.length > 1 && parts.some(p => apps.resolve(p) || (apps.WEB && apps.WEB[p.toLowerCase()]) || (apps.EXE && apps.EXE[p.toLowerCase()]) || (apps.ALIAS && apps.ALIAS[p.toLowerCase()]))) {
        expanded.push(...parts);
      } else {
        expanded.push(item);
      }
    }
    const out = [];
    for (const n of expanded) {
      if (!n) continue;
      const r = await apps.launch(n);
      out.push(r.message || `Opened ${n}.`);
    }
    return out.join('\n');
  },
  async browser_script({ script, description, headless = false }) {
    try {
      const res = await browserRunner.runBrowserScript(script, {
        headless: !!headless,
        description: description || 'Browser automation task'
      });
      return res.message;
    } catch (e) {
      return `Browser script failed: ${e.message}`;
    }
  },
  async browser_task({ action = 'open', url, query, selector, platform, headless = false }) {
    try {
      if (action === 'scrape' && url) {
        const res = await browserRunner.scrapePage(url, { selector: selector || 'body' });
        return res.content || res.message || 'Scrape completed.';
      }
      if (action === 'open' && url) {
        const res = await browserRunner.openWebsites(url, { headless: !!headless });
        return res.message;
      }
      if (action === 'search' && query) {
        const res = await apps.searchOn(platform || 'google', query);
        return res.message;
      }
      return 'Unknown browser task.';
    } catch (e) {
      return `Browser task failed: ${e.message}`;
    }
  },
  async search_on({ platform, query }) {
    const res = await apps.searchOn(platform, query);
    return res.message;
  },
  async play_music({ song, platform = 'youtube' }) {
    const res = await apps.playMusic(song, platform);
    return res.message;
  },
  async run_script({ script, description }) {
    const code = String(script || '').trim();
    if (!code) return 'No script provided.';

    // Deletion guardian: Block dangerous system-wide destructive scripts
    if (/(?:del|rmdir|Remove-Item|rm)\s+.*(?:[cC]:\\(?:Windows|Program Files|Users\b|\*)|system32|\$env:SystemRoot|\$HOME\s*[-*\/])/i.test(code)) {
      return 'Action blocked for safety: Recursive deletion of critical system directory detected.';
    }

    const tempDir = path.join(ud(), 'scripts');
    try { fs.mkdirSync(tempDir, { recursive: true }); } catch {}
    const tempFile = path.join(tempDir, `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ps1`);
    const wrappedScript = `$OutputEncoding = [System.Text.Encoding]::UTF8\n[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n${code}\n`;
    try {
      fs.writeFileSync(tempFile, wrappedScript, 'utf8');
      const out = await new Promise(resolve => {
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tempFile],
          { timeout: 25000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
          (err, stdout, stderr) => {
            try { fs.unlinkSync(tempFile); } catch {}
            if (err && !stdout) {
              resolve(`Script error: ${(stderr || err.message || '').trim()}`);
            } else {
              const res = (stdout || '').trim();
              const errOut = (stderr || '').trim();
              if (errOut && !res) resolve(`Task message: ${errOut}`);
              else if (errOut && res) resolve(`${res}\n${errOut}`);
              else resolve(res || (description ? `Completed: ${description}` : 'Task completed successfully.'));
            }
          });
      });
      return out;
    } catch (e) {
      try { fs.unlinkSync(tempFile); } catch {}
      return `Script failed: ${e.message}`;
    }
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
    return `Searching for â€œ${q}â€.`;
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
      subtitle: `Timer Â· in ${intents.humanDuration(s)}`,
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
    const subStr = diffMin > 0 ? `Reminder Â· in ${diffMin} minutes` : `Reminder Â· at ${stamp}`;
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
    return all.map(t => `â€¢ ${t.label} â€” ${new Date(t.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join('\n');
  },
  async todo_add({ item }) {
    const text = String(item || '').trim();
    if (!text) return 'Nothing to add.';
    data.todo.push({ id: Date.now() + Math.random(), text, done: false, at: Date.now() });
    saveData();
    return `Added â€œ${text}â€.`;
  },
  async todo_list() {
    if (!data.todo.length) return 'Your list is empty.';
    return data.todo.map(t => `â€¢ ${t.done ? 'âœ“' : 'â—‹'} ${t.text}`).join('\n');
  },
  async todo_remove({ item }) {
    const q = String(item || '').toLowerCase();
    const before = data.todo.length;
    data.todo = data.todo.filter(t => !t.text.toLowerCase().includes(q));
    saveData();
    return before === data.todo.length ? `â€œ${item}â€ was not on the list.` : `Removed â€œ${item}â€.`;
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
    return data.notes.slice(-8).map(n => `â€¢ ${n.text}`).join('\n');
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
    if (!hits.length) return `Could not find â€œ${query}â€.`;
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
    const dir = path.join(app.getPath('pictures'), 'Screenshots', 'FUL');
    try { fs.mkdirSync(dir, { recursive: true }); } catch { }
    const file = path.join(dir, `FUL ${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
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
  },
  async mouse_action({ action = 'click', x = -1, y = -1, amount = 0 }) {
    try {
      const mouseScript = path.join(ROOT, 'mouse.ps1');
      const out = await psFile(mouseScript, ['-Action', action, '-X', String(x), '-Y', String(y), '-Amount', String(amount)]);
      return out || `Mouse action ${action} completed.`;
    } catch (e) {
      return `Mouse action failed: ${e.message}`;
    }
  },
  async keyboard_action({ keys, text }) {
    try {
      if (text) {
        clipboard.writeText(String(text));
        await pasteText('');
        return `Typed: "${text}".`;
      }
      if (keys) {
        await sendKeys(keys);
        return `Sent key: ${keys}.`;
      }
      return 'No keys or text specified.';
    } catch (e) {
      return `Keyboard action failed: ${e.message}`;
    }
  },
  async window_action({ action = 'minimize', target = '' }) {
    try {
      const winScript = path.join(ROOT, 'window.ps1');
      const out = await psFile(winScript, ['-Action', action, '-Target', target]);
      return out || `Window action ${action} completed.`;
    } catch (e) {
      return `Window action failed: ${e.message}`;
    }
  },
  async compound({ actions = [] }) {
    const list = Array.isArray(actions) ? actions : [];
    const results = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a && a.id && ACTIONS[a.id]) {
        if (i > 0 && (list[i - 1].id === 'play_music' || list[i - 1].id === 'open_app')) {
          await new Promise(r => setTimeout(r, 3800));
        }
        const r = await ACTIONS[a.id](a.args || {});
        results.push(r);
      }
    }
    return results.filter(Boolean).join('\n') || 'Executed tasks.';
  },
  async like_video({ clickX = -1, clickY = -1, platform = '' }) {
    try {
      const likeScript = path.join(ROOT, 'scripts', 'like_video.ps1');
      const out = await psFile(likeScript, ['-ClickX', String(clickX), '-ClickY', String(clickY), '-Platform', platform]);
      const cleanOut = (out || '').trim();
      if (!cleanOut || /ParserError|Exception|FullyQualifiedErrorId|At line:/i.test(cleanOut)) {
        return 'Could not locate like button.';
      }
      return cleanOut;
    } catch (e) {
      return 'Could not locate like button.';
    }
  },
  async inspect_active() {
    try {
      const activeScript = path.join(ROOT, 'active-app.ps1');
      const json = await psJson(activeScript, []);
      const media = await nowPlaying(true);
      return {
        app: json?.app || '',
        title: json?.title || '',
        process: json?.process || '',
        media: media || null
      };
    } catch (e) {
      return { error: e.message };
    }
  },
  async vision_click({ x_percent, y_percent }) {
    try {
      const { width, height } = screen.getPrimaryDisplay().size;
      const x = Math.round((Number(x_percent) / 100) * width);
      const y = Math.round((Number(y_percent) / 100) * height);
      const mouseScript = path.join(ROOT, 'mouse.ps1');
      const out = await psFile(mouseScript, ['-Action', 'click', '-X', String(x), '-Y', String(y)]);
      return out || `Clicked at (${x}, ${y}).`;
    } catch (e) {
      return `Vision click failed: ${e.message}`;
    }
  },

  /* Mark-LVI File Controller */
  async file_list(args) { return FileController.listFiles(args || {}); },
  async file_read(args) { return FileController.readFile(args || {}); },
  async file_write(args) { return FileController.writeFile(args || {}); },
  async file_create(args) { return FileController.writeFile(args || {}); },
  async folder_create(args) { return FileController.createFolder(args || {}); },
  async file_delete(args) { return FileController.deleteFile(args || {}); },
  async file_move(args) { return FileController.moveFile(args || {}); },
  async file_copy(args) { return FileController.copyFile(args || {}); },
  async file_rename(args) { return FileController.renameFile(args || {}); },
  async file_find(args) { return FileController.findFiles(args || {}); },
  async largest_files(args) { return FileController.getLargestFiles(args || {}); },
  async disk_usage() { return FileController.getDiskUsage(); },
  async organize_desktop() { return FileController.organizeDesktop(); },

  /* Mark-LVI Computer Settings & Hardware */
  async brightness({ level = 70 } = {}) { return ComputerSettings.setBrightness({ level }); },
  async wifi_scan() { return ComputerSettings.wifiScan(); },
  async wifi_toggle({ enable = true } = {}) { return ComputerSettings.wifiToggle({ enable }); },
  async clean_temp() { return ComputerSettings.cleanTemp(); },
  async process_list({ count = 10 } = {}) { return ComputerSettings.processList({ count }); },
  async kill_process({ processName } = {}) { return ComputerSettings.killProcess({ processName }); },
  async battery_report() { return ComputerSettings.batteryReport(); },

  /* Live Weather & Communication */
  async weather_report({ location = '' } = {}) { return getWeatherReport({ location }); },
  async send_message({ platform = 'whatsapp', recipient = '', message = '' } = {}) {
    if (String(platform).toLowerCase() === 'whatsapp') {
      const cleanPhone = String(recipient || '').replace(/[^\d+]/g, '');
      const url = cleanPhone
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
        : `https://web.whatsapp.com/`;
      await shell.openExternal(url);
      return `Opened WhatsApp Web to message ${recipient || 'contact'}.`;
    }
    const mailto = `mailto:${recipient || ''}?subject=${encodeURIComponent('Message from FUL')}&body=${encodeURIComponent(message)}`;
    await shell.openExternal(mailto);
    return `Opened email client to draft message for ${recipient || 'contact'}.`;
  },

  /* Undo */
  async undo() { return executeUndo(); },

  /* Mark-LVI Autonomous Dev Agent */
  async dev_agent({ action = 'scaffold', projectName, projectType, files, autoInstall = true, projectPath, runCommand } = {}) {
    if (action === 'scaffold' || action === 'build') {
      return DevAgent.scaffoldProject({ projectName, projectType, files: files || {}, autoInstall });
    }
    if (action === 'run_and_fix' || action === 'fix_errors') {
      return DevAgent.runAndSelfHeal({ projectPath, runCommand });
    }
    if (action === 'exec' || action === 'run') {
      const r = await DevAgent.executeCommand({ command: runCommand, cwd: projectPath || process.cwd() });
      return r.output || (r.success ? 'Command executed successfully.' : 'Command exited with error.');
    }
    return `Unknown dev_agent action: ${action}`;
  },

  /* Mark-LVI Long-Term Memory Engine */
  async save_memory({ category = 'notes', key, value } = {}) {
    if (!key || !value) return 'Please specify key and value to remember.';
    return memoryEngine.updateMemory({ category, key, value });
  },
  async recall_memory({ query = '' } = {}) {
    const hits = memoryEngine.searchMemory(query);
    if (!hits.length) return `No memories found matching "${query}".`;
    return hits.map(h => `[${h.category.toUpperCase()}] ${h.key}: ${h.value}`).join('\n');
  },
  async forget_memory({ category, key } = {}) {
    const ok = memoryEngine.forgetMemory(category, key);
    return ok ? `Forgot "${key}" from ${category || 'all categories'}.` : `Could not find "${key}" in memory.`;
  },

  /* F.U.L WebForge Website Builder */
  async build_website({ prompt, theme = 'dark', site_name, open_browser = true } = {}) {
    return websiteBuilder.buildWebsite({ prompt, theme, site_name, open_browser });
  },
  async preview_website({ site_id_or_name, open_browser = true } = {}) {
    return websiteBuilder.previewWebsite({ site_id_or_name, open_browser });
  },
  async list_websites() {
    const sites = websiteBuilder.listWebsites();
    if (!sites.length) return 'No websites created yet. Ask me to build one!';
    return sites.map(s => `• ${s.name} (${s.theme}) - Updated: ${s.updatedAt}\n  Path: ${s.dir}`).join('\n');
  },

  /* F.U.L Camera Vision */
  async camera_snapshot({ base64_image, filename } = {}) {
    if (!base64_image) return 'No image frame provided for camera snapshot.';
    return cameraVision.saveSnapshot(base64_image, filename);
  },

  /* System Health & RAM Guardian */
  async system_health() {
    const stats = await systemMonitor.checkMemory();
    const topStr = stats.topProcesses.slice(0, 5).map(p => `  • ${p.name}: ${p.mb} MB (${p.count} proc)`).join('\n');
    return `System Health:\nRAM Usage: ${stats.usedPercent}% (${stats.usedGb} GB used / ${stats.totalGb} GB total)\nFree RAM: ${stats.freeGb} GB\nStatus: ${stats.alert ? '⚠️ HIGH RAM USAGE' : '✅ Normal'}\n\nTop Memory Consumers:\n${topStr}`;
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

let geminiTtsCooldownUntil = 0;

function geminiPostJson(urlStr, payload, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyBuf = Buffer.from(JSON.stringify(payload), 'utf8');
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuf.length
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          let errMsg = `HTTP ${res.statusCode}`;
          try {
            const j = JSON.parse(data);
            errMsg = j?.error?.message || errMsg;
          } catch {}
          const isQuota = res.statusCode === 429 || /quota|exceeded|rate.?limit/i.test(errMsg);
          if (isQuota && urlStr.includes('tts')) {
            geminiTtsCooldownUntil = Date.now() + 18 * 3600 * 1000;
          }
          return reject(new Error(errMsg));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from Gemini: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini request timed out')); });
    req.write(bodyBuf);
    req.end();
  });
}

ipcMain.handle('gemini-generate-content', async (_e, { model, payload, key, timeout = 30000 } = {}) => {
  const k = key || cfg.key || cfg.apiKey;
  if (!k) return { ok: false, error: 'No Gemini API key configured.' };
  const m = model || cfg.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
  try {
    const data = await geminiPostJson(url, payload, timeout);
    return { ok: true, data };
  } catch (err) {
    const isQuota = /quota|exceeded|rate.?limit|429/i.test(err.message);
    return { ok: false, error: err.message, isQuota };
  }
});

ipcMain.handle('gemini-tts', async (_e, { text, voice, key } = {}) => {
  try {
    if (Date.now() < geminiTtsCooldownUntil) {
      return { ok: false, error: 'Gemini TTS daily quota reached (cooldown active)' };
    }
    const k = key || cfg.key || cfg.apiKey;
    if (!k) throw new Error('No Gemini API key configured.');
    const v = voice || cfg.voice || 'Kore';
    const cleanText = String(text || '').replace(/\s+/g, ' ').replace(/[#*`_~]/g, '').slice(0, 800);
    if (!cleanText.trim()) throw new Error('Empty text.');

    // Prioritize high-performance, active Gemini TTS models
    const models = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let lastErr = null;

    for (const model of models) {
      if (Date.now() < geminiTtsCooldownUntil) break;
      try {
        const promptText = model.includes('2.5') ? `Read aloud verbatim: ${cleanText}` : cleanText;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k}`;
        const payload = {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
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

        const data = await geminiPostJson(url, payload);
        const part = data?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType || 'audio/wav';
        if (!audioData) throw new Error('No audio returned by Gemini.');

        // Convert audio to standard, clean WAV container (stripping C2PA metadata chunks that break browser decoding)
        let finalAudioData = audioData;
        let finalMimeType = 'audio/wav';
        const rawBuf = Buffer.from(audioData, 'base64');
        const mt = (mimeType || '').toLowerCase();

        if (rawBuf.slice(0, 4).toString() === 'RIFF') {
          // Standard RIFF container - strip any trailing metadata (e.g. Google C2PA watermark block)
          const dataIdx = rawBuf.indexOf('data');
          if (dataIdx !== -1 && dataIdx + 8 <= rawBuf.length) {
            const dataSize = rawBuf.readUInt32LE(dataIdx + 4);
            const sampleRate = (rawBuf.length >= 28) ? rawBuf.readUInt32LE(24) : 24000;
            const channels = (rawBuf.length >= 24) ? rawBuf.readUInt16LE(22) : 1;
            const bits = (rawBuf.length >= 36) ? rawBuf.readUInt16LE(34) : 16;
            const pcmEnd = Math.min(rawBuf.length, dataIdx + 8 + dataSize);
            const cleanPcm = rawBuf.subarray(dataIdx + 8, pcmEnd);
            const cleanWav = pcmToWavBuffer(cleanPcm, sampleRate || 24000, channels || 1, bits || 16);
            finalAudioData = cleanWav.toString('base64');
            finalMimeType = 'audio/wav';
          }
        } else if (mt.includes('pcm') || mt.includes('l16') || mt.includes('raw')) {
          const rateMatch = mt.match(/rate=(\d+)/i);
          const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
          const cleanWav = pcmToWavBuffer(rawBuf, sampleRate, 1, 16);
          finalAudioData = cleanWav.toString('base64');
          finalMimeType = 'audio/wav';
        } else if (mt.includes('mp3') || mt.includes('mpeg')) {
          finalMimeType = 'audio/mp3';
        } else if (mt.includes('ogg') || mt.includes('opus')) {
          finalMimeType = 'audio/ogg';
        }

        return { ok: true, audioData: finalAudioData, mimeType: finalMimeType };
      } catch (e) {
        lastErr = e;
        if (/quota|exceeded|429/i.test(e.message)) {
          break; // Don't try other models if quota exceeded
        }
      }
    }
    return { ok: false, error: lastErr?.message || 'TTS generation failed.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('edge-tts', async (_e, { text, voice = 'en-US-AriaNeural' } = {}) => {
  try {
    const cleanText = String(text || '').replace(/\s+/g, ' ').replace(/[#*`_~]/g, '').slice(0, 1000);
    if (!cleanText.trim()) throw new Error('Empty text.');

    // Realistic neural female voice (Aria is expressive and ultra-realistic)
    const voiceName = (voice && voice.includes('Neural')) ? voice : 'en-US-AriaNeural';

    // 1) Primary: In-process MsEdgeTTS
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleanText);
      const audioBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        const timer = setTimeout(() => reject(new Error('Edge TTS timed out')), 8000);
        audioStream.on('data', d => chunks.push(d));
        audioStream.on('end', () => {
          clearTimeout(timer);
          resolve(Buffer.concat(chunks));
        });
        audioStream.on('error', err => {
          clearTimeout(timer);
          reject(err);
        });
      });
      if (audioBuffer && audioBuffer.length > 500) {
        return { ok: true, audioData: audioBuffer.toString('base64'), mimeType: 'audio/mp3', engine: 'edge-tts' };
      }
    } catch (inProcErr) {
      // Fall through to python edge_tts fallback
    }

    // 2) Fallback: python edge_tts
    const tempMp3 = path.join(ud(), `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);
    const pyScript = `import edge_tts, asyncio; asyncio.run(edge_tts.Communicate('''${cleanText.replace(/'''/g, '')}''', '${voiceName}').save(r'${tempMp3}'))`;
    await new Promise((resolve, reject) => {
      execFile('python', ['-c', pyScript], { timeout: 10000, windowsHide: true }, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    if (fs.existsSync(tempMp3)) {
      const data = fs.readFileSync(tempMp3);
      try { fs.unlinkSync(tempMp3); } catch {}
      return { ok: true, audioData: data.toString('base64'), mimeType: 'audio/mp3', engine: 'edge-tts' };
    }

    throw new Error('Edge TTS failed to produce audio.');
  } catch (err) {
    return { ok: false, error: err.message };
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
ipcMain.handle('transcribe-audio', async (_e, { base64Webm, promptText, mimeType } = {}) => {
  const k = cfg.key || cfg.apiKey;
  if (!k || !base64Webm) return null;
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', cfg.model, 'gemini-3.8-flash'].filter(Boolean);
  const audioMime = mimeType || 'audio/webm';
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
      const payload = {
        contents: [{
          parts: [
            { text: promptText || 'Transcribe this spoken audio verbatim into clean text. Remove fillers and ums. Output ONLY the transcription.' },
            { inlineData: { mimeType: audioMime, data: base64Webm } }
          ]
        }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.1 }
      };
      const data = await geminiPostJson(url, payload, 15000);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text.replace(/^["']|["']$/g, '').trim();
    } catch (e) {
      // continue to next model
    }
  }
  return null;
});

let parakeetProc = null;
const parakeetRequests = new Map();
let parakeetReqId = 0;

function startParakeetWorker() {
  if (parakeetProc) return;
  const pyScript = path.join(ROOT, 'scripts', 'parakeet_transcribe.py');
  if (!fs.existsSync(pyScript)) return;

  try {
    parakeetProc = spawn('python', [pyScript, '--worker'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    parakeetProc = null;
    return;
  }

  let buffer = '';
  parakeetProc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && parakeetRequests.has(msg.id)) {
          const cb = parakeetRequests.get(msg.id);
          parakeetRequests.delete(msg.id);
          cb(msg);
        }
      } catch {}
    }
  });

  parakeetProc.on('exit', () => {
    parakeetProc = null;
  });
  parakeetProc.on('error', () => {
    parakeetProc = null;
  });
}

ipcMain.handle('parakeet-status', () => {
  const enc = path.join(ROOT, 'models', 'parakeet-unified-en-0.6b', 'encoder.int8.onnx');
  const tok = path.join(ROOT, 'models', 'parakeet-unified-en-0.6b', 'tokens.txt');
  const ready = fs.existsSync(enc) && fs.existsSync(tok) && fs.statSync(enc).size > 1000000;
  return { ready, running: !!parakeetProc };
});

ipcMain.handle('parakeet-transcribe', async (_e, { audioPath, base64Wav } = {}) => {
  let file = audioPath;
  let tempCreated = false;
  try {
    if (!file && base64Wav) {
      const tmpDir = path.join(ud(), 'audio');
      fs.mkdirSync(tmpDir, { recursive: true });
      file = path.join(tmpDir, `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
      fs.writeFileSync(file, Buffer.from(base64Wav, 'base64'));
      tempCreated = true;
    }
    if (!file || !fs.existsSync(file)) {
      return { ok: false, error: 'Audio file not found' };
    }

    if (!parakeetProc) startParakeetWorker();

    if (parakeetProc && parakeetProc.stdin && parakeetProc.stdin.writable) {
      const id = 'req_' + (++parakeetReqId);
      const res = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          parakeetRequests.delete(id);
          resolve({ ok: false, error: 'Parakeet transcription timeout' });
        }, 15000);
        parakeetRequests.set(id, (r) => {
          clearTimeout(timer);
          resolve(r);
        });
        parakeetProc.stdin.write(JSON.stringify({ id, audio: file }) + '\n');
      });
      return res;
    } else {
      // Direct one-shot python execution fallback
      const pyScript = path.join(ROOT, 'scripts', 'parakeet_transcribe.py');
      const out = await new Promise((resolve) => {
        execFile('python', [pyScript, file], { timeout: 20000, windowsHide: true }, (err, stdout) => {
          if (err) resolve({ ok: false, error: err.message });
          else {
            try { resolve(JSON.parse(stdout)); } catch (e) { resolve({ ok: false, error: stdout || e.message }); }
          }
        });
      });
      return out;
    }
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (tempCreated && file) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
});

/* -------------------------------------------------------- whisper STT worker */
let whisperProc = null;
const whisperRequests = new Map();
let whisperReqId = 0;

function startWhisperWorker() {
  if (whisperProc) return;
  const pyScript = path.join(ROOT, 'scripts', 'whisper_transcribe.py');
  if (!fs.existsSync(pyScript)) return;

  try {
    whisperProc = spawn('python', [pyScript, '--worker'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    whisperProc = null;
    return;
  }

  let buffer = '';
  whisperProc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && whisperRequests.has(msg.id)) {
          const cb = whisperRequests.get(msg.id);
          whisperRequests.delete(msg.id);
          cb(msg);
        }
      } catch {}
    }
  });

  whisperProc.on('exit', () => { whisperProc = null; });
  whisperProc.on('error', () => { whisperProc = null; });
}

ipcMain.handle('whisper-status', () => {
  return { ready: true, running: !!whisperProc };
});

ipcMain.handle('whisper-transcribe', async (_e, { audioPath, base64Wav, model = 'base', language, backend = 'local', apiKey, baseUrl } = {}) => {
  let file = audioPath;
  let tempCreated = false;
  try {
    if (!file && base64Wav) {
      const tmpDir = path.join(ud(), 'audio');
      fs.mkdirSync(tmpDir, { recursive: true });
      file = path.join(tmpDir, `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
      fs.writeFileSync(file, Buffer.from(base64Wav, 'base64'));
      tempCreated = true;
    }
    if (!file || !fs.existsSync(file)) {
      return { ok: false, error: 'Audio file not found' };
    }

    const hostKey = apiKey || cfg.groqKey || cfg.openaiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (backend === 'hosted' || (hostKey && backend !== 'local')) {
      try {
        const hostUrl = baseUrl || (cfg.groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1');
        const hostModel = (model === 'base' || !model) ? 'whisper-large-v3-turbo' : model;
        return await transcribeHostedWhisper({ audioPath: file, apiKey: hostKey, baseUrl: hostUrl, model: hostModel, language });
      } catch (hostErr) {
        // Fall back to local worker
      }
    }

    if (!whisperProc) startWhisperWorker();

    if (whisperProc && whisperProc.stdin && whisperProc.stdin.writable) {
      const id = 'wreq_' + (++whisperReqId);
      const res = await new Promise((resolve) => {
        const timer = setTimeout(() => {
          whisperRequests.delete(id);
          resolve({ ok: false, error: 'Whisper transcription timeout' });
        }, 25000);
        whisperRequests.set(id, (r) => {
          clearTimeout(timer);
          resolve(r);
        });
        whisperProc.stdin.write(JSON.stringify({ id, audio: file, model, language }) + '\n');
      });
      return res;
    } else {
      const pyScript = path.join(ROOT, 'scripts', 'whisper_transcribe.py');
      const out = await new Promise((resolve) => {
        execFile('python', [pyScript, file, model], { timeout: 30000, windowsHide: true }, (err, stdout) => {
          if (err) resolve({ ok: false, error: err.message });
          else {
            try { resolve(JSON.parse(stdout)); } catch (e) { resolve({ ok: false, error: stdout || e.message }); }
          }
        });
      });
      return out;
    }
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (tempCreated && file) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
});

/* -------------------------------------------------------- mark-lvi voice & echo guard handlers */
ipcMain.handle('system-tts', async (_e, { text, voice } = {}) => {
  return speakSystemSapi(text, voice);
});

ipcMain.handle('stop-speech', async () => {
  stopSystemSapi();
  echoGuard.stop();
  speechState({});
  return { ok: true };
});

ipcMain.on('speech-stop', () => {
  stopSystemSapi();
  echoGuard.stop();
  speechState({});
});

ipcMain.handle('elevenlabs-tts', async (_e, { text, apiKey, voiceId, model } = {}) => {
  try {
    const key = apiKey || cfg.elevenlabsKey || process.env.ELEVENLABS_API_KEY;
    const vid = voiceId || cfg.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
    return await speakElevenLabs({ text, apiKey: key, voiceId: vid, model: model || 'eleven_flash_v2_5' });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.on('echo-guard-start', (_e, durationMs) => {
  echoGuard.start(Number(durationMs) || 2000);
  speechState({});
});

ipcMain.on('echo-guard-stop', () => {
  echoGuard.stop();
  speechState({});
});

ipcMain.handle('echo-guard-check', () => {
  return { isEcho: echoGuard.isEcho(), isSpeaking: echoGuard.isSpeaking };
});
ipcMain.handle('act', async (_e, name, args) => {
  try {
    const fn = ACTIONS[name];
    if (!fn) return `I do not know how to â€œ${name}â€ yet.`;
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
ipcMain.handle('active-app', async () => {
  try {
    const res = await psJson(path.join(ROOT, 'active-app.ps1'));
    if (res && res.icon) return res;
  } catch {}
  return { process: 'Antigravity IDE', title: 'Antigravity IDE', app: 'Antigravity IDE', icon: 'icons/antigravity.png' };
});
ipcMain.handle('volume-get', () => currentVolume());
ipcMain.handle('files', async (_e, q) => findFiles(q));

/* Mark-LVI Memory & Guardian IPC */
ipcMain.handle('system-check', async () => systemMonitor.checkMemory());
ipcMain.handle('system-optimize', async () => {
  const r = await ComputerSettings.cleanTemp();
  const fresh = await systemMonitor.checkMemory();
  return { result: r, stats: fresh };
});
ipcMain.handle('memory-prompt', () => memoryEngine.formatMemoryForPrompt());
ipcMain.handle('memory-get', () => memoryEngine.loadMemory());
ipcMain.handle('memory-save', (_e, { category, key, value }) => memoryEngine.updateMemory({ category, key, value }));
ipcMain.handle('memory-recall', (_e, { query, limit }) => memoryEngine.searchMemory(query, limit));
ipcMain.handle('memory-forget', (_e, { category, key }) => memoryEngine.forgetMemory(category, key));
ipcMain.handle('website-build', async (_e, opts) => websiteBuilder.buildWebsite(opts));
ipcMain.handle('website-preview', async (_e, opts) => websiteBuilder.previewWebsite(opts));
ipcMain.handle('website-list', async () => websiteBuilder.listWebsites());
ipcMain.handle('camera-save-snapshot', async (_e, { base64Data, filename }) => cameraVision.saveSnapshot(base64Data, filename));
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
  } else if (action === 'workspace') {
    openWorkspaceWindow();
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
ipcMain.on('open-workspace', () => openWorkspaceWindow());
ipcMain.on('workspace-window-control', (event, action) => {
  const target = BrowserWindow.fromWebContents(event.sender);
  if (!target) return;
  if (action === 'minimize') target.minimize();
  else if (action === 'maximize') target.isMaximized() ? target.unmaximize() : target.maximize();
  else if (action === 'close') target.close();
});
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
ipcMain.handle('battery-get', async () => {
  try {
    if (agent && agent.battery) {
      return await agent.battery.getSnapshot(true);
    }
  } catch {}
  return null;
});

function initPowerMonitor() {
  powerMonitor.on('on-ac', async () => {
    try {
      let percent = null;
      if (agent && agent.battery) {
        await agent.battery.onPowerEvent('on-ac');
        const snap = agent.battery.snapshot;
        percent = snap ? snap.percent : null;
      }
      broadcast('power-event', { type: 'plugged-in', percent, online: true, at: Date.now() });
    } catch {}
  });

  powerMonitor.on('on-battery', async () => {
    try {
      let percent = null;
      if (agent && agent.battery) {
        await agent.battery.onPowerEvent('on-battery');
        const snap = agent.battery.snapshot;
        percent = snap ? snap.percent : null;
      }
      broadcast('power-event', { type: 'unplugged', percent, online: false, at: Date.now() });
    } catch {}
  });
}

/* ------------------------------------------------------------- agent boot */
function initAgent() {
  if (agent) return agent;
  const { createAgentRuntime } = require('./agent/runtime');
  agent = createAgentRuntime({
    rootDir: ROOT,
    userData: ud(),
    data,
    saveData: () => {
      saveData();
      send('data-updated');
      if (workspaceWin && !workspaceWin.isDestroyed()) workspaceWin.webContents.send('data-updated');
    },
    getConfig: () => cfg,
    setConfig: patch => {
      cfg = { ...cfg, ...patch };
      saveCfg();
      applyCfg();
      send('cfg', cfg);
      broadcast('cfg', cfg);
      return true;
    },
    broadcast,
    toast: showNotificationToast,
    actions: ACTIONS,
    openPath: target => shell.openPath(target),
    openExternal: target => shell.openExternal(target),
    showItemInFolder: target => shell.showItemInFolder(target),
    trash: target => shell.trashItem(target),
    pickFolder: async () => {
      const parent = workspaceWin && !workspaceWin.isDestroyed() ? workspaceWin : (settingsWin && !settingsWin.isDestroyed() ? settingsWin : win);
      const result = await dialog.showOpenDialog(parent || undefined, {
        title: 'Choose a workspace folder',
        properties: ['openDirectory', 'createDirectory']
      });
      return result.canceled ? null : result.filePaths[0];
    },
    getIdleSeconds: () => {
      try { return powerMonitor.getSystemIdleTime(); } catch { return 0; }
    },
    getActiveApp: async () => {
      try {
        const res = await psJson(path.join(ROOT, 'active-app.ps1'));
        if (res) return res;
      } catch { }
      return { process: '', title: '', app: '' };
    },
    windowAction: async ({ action }) => {
      const keys = {
        minimize: "%{SPACE}n",
        maximize: "%{SPACE}x",
        restore: "%{SPACE}r",
        close: '%{F4}',
        switch: '%{TAB}'
      };
      const seq = keys[action];
      if (!seq) return 'Unknown window action.';
      await ps(`$s=New-Object -ComObject WScript.Shell; $s.SendKeys('${seq}')`);
      return {
        minimize: 'Minimized the active window.',
        maximize: 'Maximized the active window.',
        restore: 'Restored the active window.',
        close: 'Closed the active window.',
        switch: 'Switched windows.'
      }[action];
    },
    recycleBin: async action => {
      if (action === 'empty') {
        await ps('Clear-RecycleBin -Force -ErrorAction SilentlyContinue');
        return 'Recycle Bin emptied.';
      }
      const out = await ps(`$shell=New-Object -ComObject Shell.Application; $bin=$shell.Namespace(10); if($bin){$bin.Items().Count}else{0}`);
      return `Recycle Bin contains ${Number(out) || 0} item(s).`;
    }
  });
  agent.registerIpc(ipcMain);
  agent.start();
  return agent;
}

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
  if (agent) agent.applyConfig();
  send('cfg', cfg);
  broadcast('cfg', cfg);
}

/* ----------------------------------------------------------------- boot */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.showInactive(); win.focus(); } });

  app.whenReady().then(() => {
    migrateLegacyData();
    loadAll();
    initAgent();
    initPowerMonitor();
    createWindow();
    createTray();

    applyCfg();
    trackCursor();
    try {
      if (cfg.ramAlertEnabled !== false) {
        systemMonitor.start(15000);
      }
    } catch (e) {
      console.warn('[SYSTEM-MONITOR] Start error:', e);
    }
    if (process.argv.includes('--workspace')) setTimeout(() => openWorkspaceWindow(), 700);
    if (process.argv.includes('--test-startup')) {
      setTimeout(() => {
        console.log('[TEST-STARTUP] Window and renderer loaded successfully.');
        app.exit(0);
      }, 3500);
    }

    setInterval(() => {
      const now = Date.now();
      const due = data.timers.filter(t => t.at <= now);
      if (due.length) {
        data.timers = data.timers.filter(t => t.at > now);
        saveData();
        due.forEach(t => {
          send('toast', { title: t.label, kind: t.kind, at: t.at });
          showNotificationToast({
            title: t.label || 'Timer',
            subtitle: 'Timer Done!',
            kind: t.kind
          });
        });
      }
    }, 500);

    app.on('activate', () => { if (win) win.showInactive(); });
  });

  app.on('will-quit', () => {
    try { systemMonitor && systemMonitor.stop(); } catch { }
    try { globalShortcut.unregisterAll(); } catch { }
    try { stopWakeWordWorker(); } catch { }
    try { speechProc && speechProc.kill(); } catch { }
    try { hotkeyProc && hotkeyProc.kill(); } catch { }
    try { agent && agent.dispose(); } catch { }
  });

  app.on('window-all-closed', () => app.quit());
}

