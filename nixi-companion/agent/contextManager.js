/*
  Conversation and availability context.

  Tracks recent messages, tasks, speech state, quiet hours, proactive delivery
  history and phrase similarity so FUL does not repeat itself.
*/
'use strict';

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function trigrams(text) {
  const t = ' ' + normalize(text) + ' ';
  const out = new Set();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

function similarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const item of A) if (B.has(item)) intersection++;
  return intersection / (A.size + B.size - intersection);
}

function parseClock(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

function inQuietHours(now, start, end) {
  const s = parseClock(start);
  const e = parseClock(end);
  if (!s || !e) return false;
  const date = now instanceof Date ? now : new Date(now);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const a = s.hour * 60 + s.minute;
  const b = e.hour * 60 + e.minute;
  if (a === b) return false;
  if (a < b) return minutes >= a && minutes < b;
  return minutes >= a || minutes < b;
}

class ContextManager {
  constructor(options = {}) {
    this.config = {
      userName: options.userName || 'Rikesh',
      language: options.language || 'mixed',
      proactive: options.proactive !== false,
      quietMode: options.quietMode === true,
      quietHoursStart: options.quietHoursStart || '22:00',
      quietHoursEnd: options.quietHoursEnd || '07:00',
      proactiveMinGapSec: options.proactiveMinGapSec || 120,
      proactiveBudgetPerHour: options.proactiveBudgetPerHour || 6,
      idleAvailableSec: options.idleAvailableSec || 300
    };
    this.messages = [];
    this.tasks = new Map();
    this.phraseHistory = [];
    this.proactiveHistory = [];
    this.eventHistory = new Map();
    this.state = {
      speaking: false,
      listening: false,
      userSpeaking: false,
      busy: false,
      presenting: false,
      sleeping: false
    };
    this.now = options.now || (() => Date.now());
  }

  setConfig(patch = {}) {
    this.config = { ...this.config, ...patch };
    return this.config;
  }

  addMessage(role, text, meta = {}) {
    const entry = { role, text: String(text || '').slice(0, 4000), ts: this.now(), ...meta };
    this.messages.push(entry);
    if (this.messages.length > 40) this.messages = this.messages.slice(-40);
    return entry;
  }

  recentMessages(limit = 10) {
    return this.messages.slice(-limit);
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    return this.state;
  }

  setTask(id, task) {
    this.tasks.set(String(id), { id: String(id), updatedAt: this.now(), ...task });
  }

  updateTask(id, patch) {
    const current = this.tasks.get(String(id)) || { id: String(id) };
    this.tasks.set(String(id), { ...current, ...patch, updatedAt: this.now() });
  }

  getTasks() {
    return [...this.tasks.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);
  }

  isQuiet(now = this.now()) {
    if (this.config.quietMode) return true;
    return inQuietHours(new Date(now), this.config.quietHoursStart, this.config.quietHoursEnd);
  }

  availability({ idleSeconds = 0, now = this.now() } = {}) {
    if (this.state.presenting) return { available: false, reason: 'presenting' };
    if (this.isQuiet(now)) return { available: false, reason: 'quiet-hours' };
    if (this.state.userSpeaking) return { available: false, reason: 'user-speaking' };
    if (this.state.listening) return { available: false, reason: 'listening' };
    if (this.state.speaking) return { available: false, reason: 'ful-speaking' };
    if (this.state.busy) return { available: false, reason: 'busy' };
    if (this.state.sleeping) return { available: false, reason: 'sleeping' };
    if (idleSeconds > this.config.idleAvailableSec) return { available: false, reason: 'user-away' };
    return { available: true, reason: 'available' };
  }

  notePhrase(text) {
    const phrase = String(text || '').trim();
    if (!phrase) return;
    this.phraseHistory.push({ text: phrase, ts: this.now() });
    if (this.phraseHistory.length > 50) this.phraseHistory = this.phraseHistory.slice(-50);
  }

  isRepetitive(text, threshold = 0.72) {
    const normalized = normalize(text);
    if (!normalized) return false;
    for (const item of this.phraseHistory.slice(-20)) {
      if (normalize(item.text) === normalized) return true;
      if (similarity(text, item.text) >= threshold) return true;
    }
    return false;
  }

  proactiveAllowed({ idleSeconds = 0, urgent = false, now = this.now() } = {}) {
    if (!this.config.proactive) return { allowed: false, reason: 'proactive-disabled' };
    if (this.isQuiet(now) && !urgent) return { allowed: false, reason: 'quiet-hours' };
    const availability = this.availability({ idleSeconds, now });
    if (!availability.available && !urgent) return { allowed: false, reason: availability.reason };

    const gap = this.config.proactiveMinGapSec * 1000;
    const last = this.proactiveHistory[this.proactiveHistory.length - 1];
    if (last && now - last.ts < gap && !urgent) return { allowed: false, reason: 'cooldown' };

    const hourAgo = now - 60 * 60 * 1000;
    const recent = this.proactiveHistory.filter(p => p.ts >= hourAgo);
    if (recent.length >= this.config.proactiveBudgetPerHour && !urgent) {
      return { allowed: false, reason: 'hourly-budget' };
    }
    return { allowed: true, reason: 'ok' };
  }

  recordProactive(text, meta = {}) {
    this.proactiveHistory.push({ text: String(text || '').slice(0, 500), ts: this.now(), ...meta });
    if (this.proactiveHistory.length > 200) this.proactiveHistory = this.proactiveHistory.slice(-200);
    this.notePhrase(text);
  }

  shouldDedupeEvent(key, cooldownMs = 10 * 60 * 1000, now = this.now()) {
    if (!key) return false;
    const last = this.eventHistory.get(key);
    if (last && now - last < cooldownMs) return true;
    this.eventHistory.set(key, now);
    if (this.eventHistory.size > 500) {
      const cutoff = now - 24 * 60 * 60 * 1000;
      for (const [k, ts] of this.eventHistory) if (ts < cutoff) this.eventHistory.delete(k);
    }
    return false;
  }

  summarize() {
    return {
      userName: this.config.userName,
      language: this.config.language,
      recentMessages: this.recentMessages(8),
      activeTasks: this.getTasks().filter(t => t.status !== 'done').slice(0, 5),
      state: this.state,
      quiet: this.isQuiet()
    };
  }
}

module.exports = { ContextManager, similarity, inQuietHours, parseClock };
