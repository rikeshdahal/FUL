/*
  Nixi app launcher.

  Maps friendly names to websites, protocol handlers and executables, then
  launches them. Anything unknown is looked up in the Windows Start Menu, so
  almost every installed program works even if it is not listed here.
*/
const { execFile } = require('child_process');
const electron = require('electron');
const shell = (electron && typeof electron === 'object' && electron.shell) ? electron.shell : (typeof electron === 'object' ? electron : null);
const path = require('path');

async function openSafe(target) {
  if (shell && typeof shell.openExternal === 'function') {
    try {
      await shell.openExternal(target);
      return true;
    } catch {}
  }
  await ps(`Start-Process '${String(target).replace(/'/g, "''")}'`);
  return true;
}

const WEB = {
  google: 'https://google.com',
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  tiktok: 'https://tiktok.com',
  youtube: 'https://youtube.com',
  'youtube music': 'https://music.youtube.com',
  gmail: 'https://mail.google.com',
  'google mail': 'https://mail.google.com',
  'google docs': 'https://docs.google.com',
  'google drive': 'https://drive.google.com',
  'google calendar': 'https://calendar.google.com',
  'google meet': 'https://meet.google.com',
  github: 'https://github.com',
  figma: 'https://figma.com',
  reddit: 'https://reddit.com',
  x: 'https://x.com',
  twitter: 'https://x.com',
  linear: 'https://linear.app',
  claude: 'https://claude.ai',
  chatgpt: 'https://chatgpt.com',
  perplexity: 'https://perplexity.ai',
  trello: 'https://trello.com',
  notion: 'https://notion.so',
  slack: 'https://app.slack.com',
  drive: 'https://drive.google.com',
  docs: 'https://docs.google.com',
  calendar: 'https://calendar.google.com',
  meet: 'https://meet.google.com',
  netflix: 'https://netflix.com',
  amazon: 'https://amazon.com',
  'google search': 'https://google.com',
  search: 'https://google.com',
  wikipedia: 'https://wikipedia.org',
  stackoverflow: 'https://stackoverflow.com',
  'stack overflow': 'https://stackoverflow.com',
  translate: 'https://translate.google.com',
  maps: 'https://maps.google.com',
  news: 'https://news.google.com',
  weather: 'https://weather.com',
  'chatgpt.com': 'https://chatgpt.com',
  'gemini.google.com': 'https://gemini.google.com',
  'github.com': 'https://github.com',
  'youtube.com': 'https://youtube.com',
  'notion.so': 'https://notion.so',
  'figma.com': 'https://figma.com',
  linkedin: 'https://linkedin.com',
  pinterest: 'https://pinterest.com',
  twitch: 'https://twitch.tv',
  zoomus: 'https://zoom.us',
  'google photos': 'https://photos.google.com',
  'google keep': 'https://keep.google.com',
  'google tasks': 'https://tasks.google.com',
  'google contacts': 'https://contacts.google.com',
  'google analytics': 'https://analytics.google.com',
  'google studio': 'https://studio.google.com',
  'gemini': 'https://gemini.google.com',
  huggingface: 'https://huggingface.co',
  kaggle: 'https://kaggle.com',
  mdn: 'https://developer.mozilla.org',
  caniuse: 'https://caniuse.com',
  npm: 'https://npmjs.com',
  'stackblitz': 'https://stackblitz.com',
  codesandbox: 'https://codesandbox.io',
  replit: 'https://replit.com',
  vercel: 'https://vercel.com',
  netlify: 'https://netlify.com',
  supabase: 'https://supabase.com',
  'figma community': 'https://figma.com/community',
  miro: 'https://miro.com',
  jira: 'https://jira.com',
  asana: 'https://asana.com',
  monday: 'https://monday.com',
  dropbox: 'https://dropbox.com',
  onedrive: 'https://onedrive.live.com',
  'google photos album': 'https://photos.google.com',
  'amazon music': 'https://music.amazon.com',
  'apple music': 'https://music.apple.com',
  'soundcloud': 'https://soundcloud.com',
  bandcamp: 'https://bandcamp.com',
  'nixi site': 'https://nixi.app',
};

const URI = {
  spotify: 'spotify:',
  whatsapp: 'whatsapp:',
  telegram: 'tg:',
  discord: 'discord:',
  slack: 'slack:',
  zoom: 'zoommtg:',
  teams: 'msteams:',
  outlook: 'ms-outlook:',
  mail: 'mailto:',
  obsidian: 'obsidian:',
  notion: 'notion:',
  steam: 'steam:',
  epic: 'com.epicgames.launcher:',
  'google drive folder': 'googledrive:',
  'onedrive': 'onedrive:',
  clipboard: 'clipboard:',
};

const EXE = {
  chrome: 'chrome',
  'google chrome': 'chrome',
  brave: 'brave',
  'brave browser': 'brave',
  edge: 'msedge',
  'microsoft edge': 'msedge',
  firefox: 'firefox',
  explorer: 'explorer',
  'file explorer': 'explorer',
  files: 'explorer',
  calculator: 'calc',
  calc: 'calc',
  notepad: 'notepad',
  paint: 'mspaint',
  word: 'winword',
  'microsoft word': 'winword',
  excel: 'excel',
  'microsoft excel': 'excel',
  powerpoint: 'powerpnt',
  'microsoft powerpoint': 'powerpnt',
  outlook: 'outlook',
  'microsoft outlook': 'outlook',
  'vs code': 'code',
  'visual studio code': 'code',
  vscode: 'code',
  cursor: 'cursor',
  terminal: 'wt',
  'windows terminal': 'wt',
  cmd: 'cmd',
  'command prompt': 'cmd',
  powershell: 'powershell',
  'task manager': 'taskmgr',
  regedit: 'regedit',
  'registry editor': 'regedit',
  'control panel': 'control',
  'device manager': 'devmgmt.msc',
  'services': 'services.msc',
  'ms-settings': 'ms-settings:',
  'system settings': 'ms-settings:',
  settings: 'ms-settings:',
  'snipping tool': 'SnippingTool.exe',
  'screen recorder': 'screenrecorder.exe',
  camera: 'microsoft.windows.camera:',
  'snip and sketch': 'snippingtool:',
  'voice recorder': 'soundrecorder:',
  'media player': 'wmplayer',
  movies: 'microsoft.windowsstore:',
  'weather': 'msn:weather',
  clock: 'ms-clock:',
  'sticky notes': 'StickyNotes:',
  'calendar': 'outlookcal:',
  'character map': 'charmap',
  'color picker': 'ms-color:',
  magnifier: 'magnify',
  narrator: ' Narrator.exe',
  'paint 3d': 'paint3d',
  '3d viewer': '3dviewer',
  'windows terminal preview': 'wt',
  'remote desktop': 'mstsc',
  'vpn': 'rasphone',
  'task scheduler': 'taskschd.msc',
  'disk cleanup': 'cleanmgr',
  'system info': 'msinfo32',
  'windows memory diagnostic': 'mdsched',
  'windows update': 'ms-settings:windowsupdate',
};

const ALIAS = {
  'google chrome': 'chrome',
  'ms edge': 'edge',
  'microsoft edge': 'edge',
  'brave browser': 'brave',
  'v s code': 'vs code',
  'visual studio code': 'vs code',
  'code editor': 'vs code',
  'word processor': 'word',
  'spreadsheet': 'excel',
  'slides': 'powerpoint',
  'ppt': 'powerpoint',
  'files': 'file explorer',
  'folder': 'file explorer',
  'my files': 'file explorer',
  'terminal': 'windows terminal',
  'command prompt': 'cmd',
  'console': 'cmd',
  'notepad': 'notepad',
  'text editor': 'notepad',
  'piano': 'notepad',
  'calculator': 'calculator',
  'media': 'media player',
  'photos': 'google photos',
  'drive': 'google drive',
  'docs': 'google docs',
  'doc': 'google docs',
  'mail': 'gmail',
  'email': 'outlook',
  'youtube music': 'youtube music',
  'yt': 'youtube',
  'tube': 'youtube',
  'x twitter': 'x',
  'twitter': 'x',
  'tg': 'telegram',
  'wa': 'whatsapp',
  'vsc': 'vs code',
  'taskmgr': 'task manager',
  'control panel': 'control panel',
  'settings app': 'settings',
  'windows settings': 'settings',
};

const clean = s => String(s || '').toLowerCase().replace(/[.,!?;:]+$/g, '').replace(/\s+/g, ' ').trim();
const key = s => clean(s).replace(/^(the |my |a |an |open |launch |start |run )+/, '').trim();

function resolve(name) {
  let k = key(name);
  if (ALIAS[k]) k = ALIAS[k];
  return k;
}

function ps(command, timeout = 15000) {
  return new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout, windowsHide: true },
      (err, stdout) => resolve((stdout || '').trim()));
  });
}

async function findStartMenuApp(name) {
  const q = clean(name).replace(/'/g, '');
  if (!q) return '';
  const cmd = `$roots=@("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs","$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs");` +
    `$all=Get-ChildItem -Path $roots -Recurse -Filter *.lnk -ErrorAction SilentlyContinue;` +
    `$exact=$all|Where-Object{$_.BaseName -ieq '${q}'}|Select-Object -First 1;` +
    `if($exact){$exact.FullName;exit};` +
    `$part=$all|Where-Object{$_.BaseName -like "*${q}*" -and $_.BaseName -notlike "*uninstall*"}|Select-Object -First 1;` +
    `if($part){$part.FullName}`;
  return await ps(cmd);
}

async function isHttpUrl(value) {
  return /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) && /\.[a-z]{2,}/i.test(value);
}

async function launch(name) {
  const k = resolve(name);
  if (!k) return { ok: false, message: 'Tell me what to open.' };

  if (WEB[k]) {
    await openSafe(WEB[k]);
    return { ok: true, message: `Opened ${k}.` };
  }
  if (URI[k]) {
    await openSafe(URI[k]);
    return { ok: true, message: `Opened ${k}.` };
  }
  if (/^https?:\/\//i.test(k) || /^[\w-]+\.[a-z]{2,}(\/\S*)?$/i.test(k)) {
    await openSafe(/^https?:/i.test(k) ? k : 'https://' + k);
    return { ok: true, message: `Opened ${k}.` };
  }

  const exe = EXE[k] || k;
  if (EXE[k] && /^[a-z]+:/i.test(exe)) {
    await openSafe(exe);
    return { ok: true, message: `Opened ${k}.` };
  }

  // 1) Start Menu shortcut (covers nearly every installed program)
  const lnk = await findStartMenuApp(k);
  if (lnk) {
    await ps(`Start-Process -LiteralPath "${lnk.replace(/"/g, '')}"`);
    return { ok: true, message: `Opened ${k}.` };
  }

  // 2) Executable on PATH / registered app
  await ps(`Start-Process '${exe.replace(/'/g, '')}' -ErrorAction SilentlyContinue`);
  return { ok: true, message: `Opened ${k}.` };
}

const SEARCH_URLS = {
  tiktok: q => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`,
  youtube: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  github: q => `https://github.com/search?q=${encodeURIComponent(q)}`,
  spotify: q => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  reddit: q => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  x: q => `https://x.com/search?q=${encodeURIComponent(q)}`,
  twitter: q => `https://x.com/search?q=${encodeURIComponent(q)}`,
  amazon: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  wikipedia: q => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  chatgpt: q => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
  netflix: q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  instagram: q => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
  facebook: q => `https://www.facebook.com/search/top/?q=${encodeURIComponent(q)}`
};

async function searchOn(platform, query) {
  const p = resolve(platform);
  const q = String(query || '').trim();
  if (SEARCH_URLS[p]) {
    await openSafe(SEARCH_URLS[p](q));
    return { ok: true, message: `Searching ${p} for “${q}”.` };
  }
  await openSafe(`https://www.google.com/search?q=${encodeURIComponent(q + ' ' + platform)}`);
  return { ok: true, message: `Searching for “${q}” on ${platform}.` };
}

function quickList() {
  const names = new Set([...Object.keys(WEB), ...Object.keys(URI), ...Object.keys(EXE)]);
  return [...names].sort();
}

module.exports = { launch, searchOn, SEARCH_URLS, quickList, resolve, WEB, URI, EXE, ALIAS, ps, findStartMenuApp, clean, key, isHttpUrl };
