const fs = require('fs');
const path = require('path');
const { readJson, writeJson } = require('./store');
const os = require('os');

function getDataDir() {
  const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(base, 'ful-companion');
}

class ReminderStore {
  constructor() {
    this.dir = getDataDir();
    this.file = path.join(this.dir, 'ful-reminders.json');
    this.data = readJson(this.file, { reminders: [] });
  }

  save() {
    writeJson(this.file, this.data);
  }

  list() {
    return this.data.reminders || [];
  }

  add(reminder) {
    const r = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      createdAt: Date.now(),
      done: false,
      notified: false,
      snoozedUntil: null,
      ...reminder
    };
    this.data.reminders.push(r);
    this.save();
    return r;
  }

  update(id, patch) {
    const r = this.data.reminders.find(x => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    this.save();
    return r;
  }

  remove(id) {
    this.data.reminders = this.data.reminders.filter(x => x.id !== id);
    this.save();
  }

  clear() {
    this.data.reminders = [];
    this.save();
  }
}

module.exports = new ReminderStore();
