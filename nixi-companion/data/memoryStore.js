const { readJson, writeJson } = require('./store');
const path = require('path');
const os = require('os');

function getDataDir() {
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'ful-companion');
}

const SECRET_RE = /\bAIza[0-9A-Za-z_-]{20,}\b|\bsk-[A-Za-z0-9_-]{16,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\b(?:api[_-]?key|password|secret|access[_-]?token)\s*[:=]\s*\S+/i;

class MemoryStore {
  constructor() {
    this.dir = getDataDir();
    this.file = path.join(this.dir, 'ful-memory.json');
    this.data = readJson(this.file, {
      version: 1,
      facts: [],
      preferences: {},
      recentTasks: [],
      history: []
    });
    for (const key of ['facts', 'recentTasks', 'history']) {
      if (!Array.isArray(this.data[key])) this.data[key] = [];
    }
    if (!this.data.preferences || typeof this.data.preferences !== 'object') this.data.preferences = {};
  }

  save() {
    writeJson(this.file, this.data);
  }

  addFact(text, source = 'explicit') {
    if (!text) return null;
    const t = String(text).trim();
    if (!t) return null;
    if (SECRET_RE.test(t)) return null;
    const exists = this.data.facts.find(f => f.text.toLowerCase() === t.toLowerCase());
    if (exists) return exists;
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t.slice(0, 500), source, ts: Date.now() };
    this.data.facts.push(entry);
    this.save();
    return entry;
  }

  getFacts(limit = 50) {
    return this.data.facts.slice(-limit).reverse();
  }

  removeFact(id) {
    const before = this.data.facts.length;
    this.data.facts = this.data.facts.filter(f => String(f.id) !== String(id));
    this.save();
    return before !== this.data.facts.length;
  }

  clearFacts() {
    this.data.facts = [];
    this.save();
  }

  setPref(k, v) {
    if (!k) return;
    if (typeof v === 'string' && SECRET_RE.test(v)) return;
    this.data.preferences[k] = v;
    this.save();
  }

  getPref(k, def) {
    return this.data.preferences[k] !== undefined ? this.data.preferences[k] : def;
  }

  addTaskOutcome(task) {
    if (!task) return;
    this.data.recentTasks.push({ ts: Date.now(), ...task });
    if (this.data.recentTasks.length > 100) this.data.recentTasks = this.data.recentTasks.slice(-100);
    this.save();
  }

  getTaskOutcomes(limit = 20) {
    return this.data.recentTasks.slice(-limit).reverse();
  }

  addHistory(entry) {
    this.data.history.push({ ts: Date.now(), ...entry });
    if (this.data.history.length > 200) this.data.history = this.data.history.slice(-200);
    this.save();
  }

  getHistory(limit = 30) {
    return this.data.history.slice(-limit).reverse();
  }

  exportAll() {
    return JSON.parse(JSON.stringify(this.data));
  }

  clearAll() {
    this.data = { version: 1, facts: [], preferences: {}, recentTasks: [], history: [] };
    this.save();
    return true;
  }
}

module.exports = new MemoryStore();
