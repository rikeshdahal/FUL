/*
  Battery and laptop health monitor.

  Polling is deliberately slow (default 30s) and uses one short PowerShell/CIM
  query. Notifications are driven by state transitions and hysteresis, never
  by repeating the same reading every poll.
*/
'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson, writeJson } = require('../data/store');

const STATUS_ONLINE = new Set([2, 3, 6, 7, 8, 9, 11]);
const STATUS_CHARGING = new Set([6, 7, 8, 9]);

function defaultState() {
  return {
    online: null,
    percent: null,
    full: false,
    cycle: 0,
    flags: { low20: false, low10: false, high80: false, full100: false, chargeStarted: false },
    lastUpdated: 0
  };
}

function normalizeConfig(cfg = {}) {
  return {
    enabled: cfg.batteryMonitor !== false,
    pollMs: Math.max(15000, Math.min(10 * 60 * 1000, Number(cfg.batteryPollMs) || 30000)),
    low: Math.max(5, Math.min(90, Number(cfg.batteryLow) || 20)),
    critical: Math.max(3, Math.min(80, Number(cfg.batteryCritical) || 10)),
    high: Math.max(50, Math.min(99, Number(cfg.batteryHigh) || 80)),
    notifyCharging: cfg.batteryNotifyCharging !== false,
    notifyUnplug: cfg.batteryNotifyUnplug !== false,
    chargeLimitEnabled: cfg.chargeLimitEnabled === true,
    language: cfg.language || 'mixed',
    userName: cfg.userName || 'Rikesh'
  };
}

function language(cfg) {
  return String(cfg.language || 'mixed').toLowerCase();
}

const PHRASES = {
  charging: {
    nepali: [
      `Aah, charger plug in bhayo! Thank you {name}, full power charge hudai chha!`,
      `Yes! Charger lagyo {name}. Energy recharge suru bhayo ({percent}%)!`,
      `Energy boost! Charger connected bhayo {name}, battery {percent}% bata badhdai chha!`,
      `Nice, charger lagyo! Kaam jari rakhau {name}, battery charging ma chha ({percent}%).`
    ],
    english: [
      `Plugged in! Recharging up to full power now, {name} — currently at {percent}%.`,
      `Charger connected! Giving you an energy boost, {name} ({percent}%).`,
      `Awesome, charger is plugged in! Recharging happily at {percent}%.`,
      `Power connected! Charging full steam ahead, {name} ({percent}%)!`
    ]
  },
  unplugged: {
    nepali: [
      `Charger disconnect bhayo {name}! Battery {percent}% ma chha, on-the-go mode ready!`,
      `Charger unplug bhayo! Battery {percent}% baki chha, power save garera chalauney hai {name}!`,
      `Plug out bhayo! Aba battery power ma chaldaichha — {percent}% charge chha {name}.`,
      `Charger nikalio {name}! Battery {percent}% chha, let's keep going!`
    ],
    english: [
      `Charger unplugged! Running on battery power now, {name} — {percent}% remaining.`,
      `Plugged out! We're on battery mode at {percent}%, ready to go, {name}!`,
      `The charger was disconnected. Battery is currently at {percent}%, {name}.`,
      `Unplugged! Running portable now with {percent}% battery, {name}!`
    ]
  },
  low20: {
    nepali: [
      `Hey {name}, battery {percent}% pugyo hai! Malai thakai lagna thalyo, please charger lagaidinu na!`,
      `Warning {name}! Battery 20% bhanda tala aaisakyo ({percent}%). Chhito charger plug in gara hai!`,
      `Battery low bhayo {name} — {percent}% matra baki chha. Ekchhin ma nidauchu hola, charger lagau na!`,
      `Rikesh, battery {percent}% ma pugyo! Important files save gara ra charger khojera lagau!`
    ],
    english: [
      `Hey {name}, battery is down to {percent}%! I'm getting a little tired, please plug in the charger!`,
      `Warning {name}! Battery is at {percent}%. Save your work and grab the charger soon!`,
      `Low battery alert! We're at {percent}%, {name}. Time to recharge before I doze off!`,
      `Battery is at {percent}%, {name}. Let's plug in so we don't get interrupted!`
    ]
  },
  low10: {
    nepali: [
      `Emergency {name}! Battery {percent}% matra chha! Chhito file save gara ra charger lagau natra laptop off hunchha!`,
      `Aaiyaa! {percent}% battery matra baki chha! Laptop shut down huna sakchha, please charger plug in gara chhito!`,
      `Critical alert {name}! Battery almost khali bhayo ({percent}%). Chhito charger lagau hai!`,
      `Save everything now {name}! Battery is critically low at {percent}%!`
    ],
    english: [
      `Emergency {name}! Battery is critically low at {percent}%! Save your work and plug in immediately!`,
      `Critical battery alert! Only {percent}% left, {name}! Grab that charger fast!`,
      `Warning {name}! At {percent}%, the laptop could shut down any minute. Please plug in now!`
    ]
  },
  full: {
    nepali: [
      `Yay {name}, battery 100% full charge bhayo! Overcharging bachaauna charger unplug garna sakchhau!`,
      `Full power! Battery 100% pugyo {name}, unplug garna milchha!`,
      `Battery ekdam full bhayo {name} — 100%! Ready to conquer the day!`
    ],
    english: [
      `Woohoo! Battery is 100% full, {name}! You can unplug the charger now!`,
      `Fully charged at 100%! All topped up and ready to go, {name}!`,
      `100% power achieved! You can unplug the laptop to protect battery longevity, {name}!`
    ]
  },
  high80: {
    nepali: [
      `Battery {percent}% pugyo hai {name}. Battery health ramro rakhna ahile unplug garna milchha.`,
      `Battery {percent}% chha {name}. Chaheko bela unplug garna sakchhau.`
    ],
    english: [
      `Battery is at {percent}%, {name}. You can unplug now to preserve optimal battery health.`,
      `Good level! Battery reached {percent}%, {name}. Feel free to unplug if you like.`
    ]
  }
};

function pickPhrase(list, name, percent) {
  if (!Array.isArray(list) || !list.length) return '';
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].replace(/\{name\}/g, name || 'Rikesh').replace(/\{percent\}/g, String(percent != null ? percent : ''));
}

function buildMessage(kind, percent, cfg, extra = {}) {
  const name = cfg.userName || 'Rikesh';
  const nepali = language(cfg).includes('nepali') || language(cfg) === 'mixed';
  const group = PHRASES[kind];
  if (group) {
    const list = nepali ? (group.nepali || group.english) : (group.english || group.nepali);
    const msg = pickPhrase(list, name, percent);
    if (msg) return msg;
  }
  return extra.text || `Battery is at ${percent}%.`;
}

/**
 * Pure transition evaluator. Returns notifications and updated persistent state.
 */
function evaluateBattery(prevSnapshot, snapshot, state = defaultState(), cfg = {}) {
  const config = normalizeConfig(cfg);
  const next = {
    ...defaultState(),
    ...state,
    flags: { ...defaultState().flags, ...(state && state.flags ? state.flags : {}) }
  };
  const notifications = [];
  if (!snapshot || snapshot.hasBattery === false || snapshot.percent == null) {
    return { state: next, notifications, changed: false };
  }

  const percent = Math.max(0, Math.min(100, Math.round(Number(snapshot.percent))));
  const online = snapshot.online === true;
  const full = snapshot.full === true || percent >= 100;
  const charging = snapshot.charging === true || (online && !full);
  const wasOnline = next.online;

  if (next.percent == null) next.percent = percent;

  if (wasOnline === null) {
    next.online = online;
    next.percent = percent;
    next.full = full;
    next.flags.chargeStarted = online;
    if (!online && percent <= config.critical) {
      notifications.push(notification('low10', percent, config, next.cycle, 'high'));
      next.flags.low10 = true;
      next.flags.low20 = true;
    } else if (!online && percent <= config.low) {
      notifications.push(notification('low20', percent, config, next.cycle, 'high'));
      next.flags.low20 = true;
    }
  } else {
    if (wasOnline !== online) {
      if (online) {
        next.cycle = (next.cycle || 0) + 1;
        next.flags.high80 = false;
        next.flags.full100 = false;
        next.flags.chargeStarted = true;
        if (config.notifyCharging) {
          notifications.push(notification('charging', percent, config, next.cycle, 'high'));
        }
      } else {
        next.flags.high80 = false;
        next.flags.full100 = false;
        next.flags.chargeStarted = false;
        next.cycle = (next.cycle || 0) + 1;
        if (config.notifyUnplug) {
          notifications.push(notification('unplugged', percent, config, next.cycle, 'high'));
        }
      }
    }

    if (online && !next.flags.chargeStarted && wasOnline === false) {
      next.flags.chargeStarted = true;
    }

    if (percent > config.low + 5) next.flags.low20 = false;
    if (percent > config.critical + 5) next.flags.low10 = false;

    if (!online && percent <= config.low && percent > config.critical && !next.flags.low20) {
      notifications.push(notification('low20', percent, config, next.cycle, 'high'));
      next.flags.low20 = true;
    }
    if (!online && percent <= config.critical && !next.flags.low10) {
      notifications.push(notification('low10', percent, config, next.cycle, 'high'));
      next.flags.low10 = true;
    }

    if (online && charging && percent >= config.high && percent < 100 && !next.flags.high80) {
      notifications.push(notification('high80', percent, config, next.cycle, 'normal'));
      next.flags.high80 = true;
    }

    const crossedFull = (next.percent != null && next.percent < 100 && percent >= 100) || (next.full === false && full && online);
    if (online && crossedFull && !next.flags.full100) {
      notifications.push(notification('full', percent, config, next.cycle, 'high'));
      next.flags.full100 = true;
    }
    if (!online && full) {
      next.flags.full100 = true;
    }

    next.online = online;
    next.percent = percent;
    next.full = full;
  }

  next.lastUpdated = Date.now();
  return { state: next, notifications, changed: wasOnline !== online || (prevSnapshot && prevSnapshot.percent !== percent) };
}

function percentageCrossed(before, after, direction) {
  if (before == null) return true;
  if (direction < 0) return after < before;
  return after > before;
}

function notification(kind, percent, cfg, cycle, urgency) {
  return {
    kind,
    threshold: kind,
    percent,
    urgency,
    cycle,
    title: kind === 'low10' ? 'Battery critically low' : kind === 'low20' ? 'Low battery' : kind === 'charging' ? 'Charging' : kind === 'unplugged' ? 'Charger disconnected' : 'Battery',
    text: buildMessage(kind, percent, cfg),
    eventKey: `battery:${kind}:${cycle}`
  };
}

function parsePowerShellJson(output) {
  try {
    const parsed = JSON.parse(String(output || '').trim());
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

class BatteryMonitor {
  constructor(options = {}) {
    this.getConfig = options.getConfig || (() => ({}));
    this.userData = options.userData;
    this.onSnapshot = options.onSnapshot || (() => { });
    this.onNotification = options.onNotification || (() => { });
    this.stateFile = this.userData ? path.join(this.userData, 'ful-battery-state.json') : null;
    this.state = this._loadState();
    this.snapshot = null;
    this.timer = null;
    this.reading = false;
    this.startTime = Date.now();
  }

  _loadState() {
    if (!this.stateFile) return defaultState();
    return { ...defaultState(), ...readJson(this.stateFile, {}) };
  }

  _saveState() {
    if (this.stateFile) writeJson(this.stateFile, this.state);
  }

  applyConfig() {
    this.stop();
    if (normalizeConfig(this.getConfig()).enabled) this.start();
  }

  start() {
    if (this.timer) return;
    const tick = () => this.poll().catch(() => { });
    tick();
    const interval = normalizeConfig(this.getConfig()).pollMs;
    this.timer = setInterval(tick, interval);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async getSnapshot(force = false) {
    if (this.snapshot && !force && Date.now() - this.snapshot.at < 10000) return this.snapshot;
    return this.poll();
  }

  async onPowerEvent(type) {
    const online = type === 'plugged-in' || type === 'on-ac';
    if (this.snapshot) {
      this.snapshot.online = online;
      this.snapshot.charging = online && (this.snapshot.percent < 100);
    }
    return this.poll();
  }

  async poll() {
    if (this.reading) return this.snapshot;
    this.reading = true;
    try {
      const snapshot = await this._read();
      const prev = this.snapshot;
      this.snapshot = { ...snapshot, at: Date.now() };
      const evaluation = evaluateBattery(prev, this.snapshot, this.state, this.getConfig());
      const stateChanged = JSON.stringify(evaluation.state) !== JSON.stringify(this.state);
      this.state = evaluation.state;
      if (stateChanged) this._saveState();
      try { this.onSnapshot(this.snapshot, evaluation); } catch { }
      for (const item of evaluation.notifications) {
        try { this.onNotification(item); } catch { }
      }
      return this.snapshot;
    } finally {
      this.reading = false;
    }
  }

  _readSystem() {
    const total = os.totalmem();
    const free = os.freemem();
    let disk = null;
    try {
      const root = path.parse(process.cwd()).root || 'C:\\';
      const stat = fs.statfsSync(root);
      disk = { freeBytes: stat.bfree * stat.bsize, totalBytes: stat.blocks * stat.bsize };
      disk.usedPercent = disk.totalBytes ? Math.round((1 - disk.freeBytes / disk.totalBytes) * 100) : null;
    } catch { }
    return {
      memory: { totalBytes: total, freeBytes: free, usedPercent: Math.round((1 - free / total) * 100) },
      disk,
      uptimeSeconds: Math.round(os.uptime())
    };
  }

  _read() {
    const script = `
$ErrorActionPreference='SilentlyContinue'
$b = Get-CimInstance Win32_Battery | Select-Object -First 1
$bs = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus | Select-Object -First 1
$fc = Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity | Select-Object -First 1
$sd = Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData | Select-Object -First 1
$tz = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1
[ordered]@{
  hasBattery = [bool]$b
  percent = if ($b) { [int]$b.EstimatedChargeRemaining } else { $null }
  statusCode = if ($b) { [int]$b.BatteryStatus } else { $null }
  powerOnline = if ($null -ne $bs.PowerOnline) { [bool]$bs.PowerOnline } else { $null }
  name = if ($b) { [string]$b.Name } else { $null }
  designCapacity = if ($sd) { [int]$sd.DesignedCapacity } else { $null }
  fullChargeCapacity = if ($fc) { [int]$fc.FullChargedCapacity } else { $null }
  thermalZoneRaw = if ($tz) { [double]$tz.CurrentTemperature } else { $null }
} | ConvertTo-Json -Compress
`;
    return new Promise(resolve => {
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024
      }, (_err, stdout) => {
        const raw = parsePowerShellJson(stdout);
        const system = this._readSystem();
        if (!raw) {
          resolve({ hasBattery: false, available: false, ...system, at: Date.now(), error: 'battery information is not available' });
          return;
        }
        const statusCode = raw.statusCode == null ? null : Number(raw.statusCode);
        const online = raw.powerOnline == null ? STATUS_ONLINE.has(statusCode) : raw.powerOnline === true;
        const charging = STATUS_CHARGING.has(statusCode) || (online && Number(raw.percent) < 100);
        const full = statusCode === 3 || Number(raw.percent) >= 100;
        const healthPercent = raw.designCapacity > 0 && raw.fullChargeCapacity > 0
          ? Math.round((raw.fullChargeCapacity / raw.designCapacity) * 1000) / 10
          : null;
        const thermalZoneC = raw.thermalZoneRaw != null && raw.thermalZoneRaw > 0
          ? Math.round((raw.thermalZoneRaw / 10 - 273.15) * 10) / 10
          : null;
        resolve({
          hasBattery: !!raw.hasBattery,
          available: !!raw.hasBattery,
          percent: raw.percent == null ? null : Number(raw.percent),
          online,
          charging,
          full,
          statusCode,
          name: raw.name || null,
          healthPercent,
          thermalZoneC,
          temperatureSource: thermalZoneC != null ? 'ACPI thermal zone (not specific to battery)' : null,
          ...system,
          at: Date.now()
        });
      });
    });
  }
}

module.exports = {
  BatteryMonitor,
  evaluateBattery,
  defaultState,
  normalizeConfig,
  buildMessage,
  STATUS_ONLINE,
  STATUS_CHARGING
};
