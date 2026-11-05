/*
  Persistent reminder service.

  Uses the existing JSON data store, supports Asia/Kathmandu, recurrence,
  snooze/complete/cancel, missed reminders after sleep, and duplicate-safe
  delivery across restarts.
*/
'use strict';

const DEFAULT_TZ = 'Asia/Kathmandu';
const DAY_NAMES = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const WORD_NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90, half: 0.5
};

const UNIT_SECONDS = {
  second: 1, seconds: 1, sec: 1, secs: 1,
  minute: 60, minutes: 60, min: 60, mins: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600
};

function tzParts(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    weekday: 'short'
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekdayMap[parts.weekday] == null ? 0 : weekdayMap[parts.weekday]
  };
}

function tzOffsetMs(date, tz) {
  const p = tzParts(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

function zonedToUtc(parts, tz) {
  const { year, month, day, hour = 0, minute = 0 } = parts;
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const offset = tzOffsetMs(new Date(guess), tz);
    const next = Date.UTC(year, month - 1, day, hour, minute, 0) - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function addLocalDays(parts, days) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: parts.hour, minute: parts.minute, weekday: d.getUTCDay() };
}

function parseDurationSeconds(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[.,!?]/g, ' ') + ' ';
  if (/\bhalf an hour\b/.test(t)) return 1800;
  const re = /\b(\d+(?:\.\d+)?|[a-z]+)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi;
  let m;
  let total = 0;
  let found = false;
  while ((m = re.exec(t))) {
    let n = /^\d/.test(m[1]) ? parseFloat(m[1]) : WORD_NUMBERS[m[1]];
    if (n == null) continue;
    const unitKey = m[2].toLowerCase();
    const unit = UNIT_SECONDS[unitKey] || UNIT_SECONDS[unitKey.replace(/s$/, '')];
    if (!unit) continue;
    total += n * unit;
    found = true;
  }
  return found ? Math.round(total) : null;
}

function parseClockTime(text) {
  const t = String(text || '').toLowerCase();
  if (/\bnoon\b/.test(t)) return { hour: 12, minute: 0 };
  if (/\bmidnight\b/.test(t)) return { hour: 0, minute: 0 };
  let hour;
  let minute = 0;
  let meridiem;
  let m = t.match(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (m) {
    hour = Number(m[1]);
    minute = m[2] ? Number(m[2]) : 0;
    meridiem = m[3];
  } else {
    m = t.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/);
    if (m) {
      hour = Number(m[1]);
      minute = Number(m[2]);
      meridiem = m[3];
    } else {
      m = t.match(/\b(\d{1,2})\s*(am|pm)\b/);
      if (!m) return null;
      hour = Number(m[1]);
      meridiem = m[2];
    }
  }
  if (minute > 59) return null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (!meridiem && hour > 23) return null;
  if (!meridiem && hour <= 7) hour += 12;
  if (hour === 24) hour = 0;
  return { hour, minute };
}

function parseDayWord(text, nowParts) {
  const t = String(text || '').toLowerCase();
  if (/\btomorrow\b/.test(t)) return { offset: 1, explicit: true };
  if (/\bday after tomorrow\b/.test(t)) return { offset: 2, explicit: true };
  if (/\btoday\b|\btonight\b/.test(t)) return { offset: 0, explicit: true };
  for (const [name, weekday] of Object.entries(DAY_NAMES)) {
    if (new RegExp('\\b(?:on\\s+)?' + name + '\\b').test(t)) {
      let delta = (weekday - nowParts.weekday + 7) % 7;
      if (delta === 0) delta = 7;
      return { offset: delta, explicit: true };
    }
  }
  return { offset: 0, explicit: false };
}

function parsePartOfDay(text) {
  const t = String(text || '').toLowerCase();
  if (/\bmorning\b/.test(t)) return { hour: 8, minute: 0 };
  if (/\bafternoon\b/.test(t)) return { hour: 14, minute: 0 };
  if (/\bevening\b/.test(t)) return { hour: 18, minute: 0 };
  if (/\bnight\b|\btonight\b/.test(t)) return { hour: 21, minute: 0 };
  return null;
}

function parseRecurrence(text) {
  const t = String(text || '').toLowerCase();
  if (/\bevery\s+week\s*day|\bweekdays?\b/.test(t)) return { type: 'weekdays' };
  if (/\bevery\s+day|\bdaily\b|\beach day\b/.test(t)) return { type: 'daily' };
  if (/\bevery\s+week\b/.test(t)) return { type: 'weekly' };
  for (const [name, weekday] of Object.entries(DAY_NAMES)) {
    if (new RegExp('\\bevery\\s+' + name + '\\b').test(t)) return { type: 'weekly', weekday };
  }
  return null;
}

function extractTaskText(original) {
  let text = String(original || '').trim();
  text = text.replace(/^\s*(?:please\s+)?(?:remind\s+me|reminder|alarm|don'?t\s+let\s+me\s+forget)\b/i, '');
  text = text.replace(/^\s*(?:to|that|about)\s+/i, '');
  const patterns = [
    /\bevery\s+(?:day|weekday|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:daily|weekdays?)\b/gi,
    /\b(?:day after tomorrow|tomorrow|today|tonight)\b/gi,
    /\b(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi,
    /\b\d{1,2}(?::\d{2})\s*(?:am|pm)?\b/gi,
    /\b\d{1,2}\s*(?:am|pm)\b/gi,
    /\b(?:in|after)\s+(?:\d+(?:\.\d+)?|[a-z]+)\s*(?:hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi,
    /\b(?:morning|afternoon|evening|night|noon|midnight)\b/gi
  ];
  for (const re of patterns) text = text.replace(re, ' ');
  text = text.replace(/\b(?:at|by|in|after|on)\s*$/i, '').replace(/^[\s,;:-]+|[\s,;:-]+$/g, '').replace(/\s+/g, ' ').trim();
  text = text.replace(/^(?:to|that|about)\s+/i, '').trim();
  return text;
}

/**
 * Parse a reminder request. Returns {at, task, recurrence, needsClarification}.
 * Never invents a date/time when the request is ambiguous.
 */
function parseReminderSpec(input, options = {}) {
  const raw = typeof input === 'string' ? input : String(input && (input.text || input.time) || '');
  const now = options.now == null ? Date.now() : new Date(options.now);
  const nowDate = now instanceof Date ? now : new Date(now);
  const timezone = options.timezone || DEFAULT_TZ;
  const nowParts = tzParts(nowDate, timezone);
  const recurrence = parseRecurrence(raw);
  const duration = parseDurationSeconds(raw);
  const hasRelative = /\b(?:in|after)\s+(?:\d|[a-z])/i.test(raw);
  const clock = parseClockTime(raw);
  const day = parseDayWord(raw, nowParts);
  const part = parsePartOfDay(raw);
  const task = extractTaskText(raw);

  if (!task) {
    return { needsClarification: 'What should I remind you about?', task: '', at: null, recurrence };
  }

  let at = null;
  let explicitTime = false;

  if (hasRelative && duration != null) {
    at = new Date(nowDate.getTime() + duration * 1000);
    explicitTime = true;
  } else if (clock || part) {
    const chosen = clock || part;
    const base = addLocalDays({ ...nowParts }, day.offset);
    at = zonedToUtc({ ...base, hour: chosen.hour, minute: chosen.minute }, timezone);
    explicitTime = true;
    if (!day.explicit && day.offset === 0 && at.getTime() <= nowDate.getTime()) {
      const tomorrow = addLocalDays({ ...nowParts }, 1);
      at = zonedToUtc({ ...tomorrow, hour: chosen.hour, minute: chosen.minute }, timezone);
    }
  } else if (day.explicit) {
    if (recurrence && recurrence.type === 'weekly' && recurrence.weekday != null) {
      const base = addLocalDays({ ...nowParts }, day.offset || 0);
      const diff = (recurrence.weekday - base.weekday + 7) % 7;
      at = zonedToUtc({ ...addLocalDays(base, diff), hour: 9, minute: 0 }, timezone);
      explicitTime = true;
    } else {
      return { needsClarification: 'What time should I remind you? For example, “tomorrow at 8 AM”.', task, at: null, recurrence };
    }
  } else if (recurrence) {
    return { needsClarification: 'What time should the recurring reminder use? For example, “every day at 8 AM”.', task, at: null, recurrence };
  }

  if (!at) {
    return { needsClarification: 'When should I remind you? Please give a time like “at 6 PM” or “in 20 minutes”.', task, at: null, recurrence };
  }

  return {
    at: at.getTime(),
    task,
    recurrence: recurrence || null,
    explicitTime,
    timezone
  };
}

function nextOccurrence(atMs, recurrence, timezone = DEFAULT_TZ) {
  if (!recurrence) return null;
  const date = new Date(atMs);
  const parts = tzParts(date, timezone);
  if (recurrence.type === 'daily') {
    return zonedToUtc(addLocalDays(parts, 1), timezone).getTime();
  }
  if (recurrence.type === 'weekly') {
    const target = recurrence.weekday;
    let delta = 7;
    if (target != null) {
      delta = (target - parts.weekday + 7) % 7;
      if (delta === 0) delta = 7;
    }
    return zonedToUtc(addLocalDays(parts, delta), timezone).getTime();
  }
  if (recurrence.type === 'weekdays') {
    let next = addLocalDays(parts, 1);
    while (next.weekday === 0 || next.weekday === 6) next = addLocalDays(next, 1);
    return zonedToUtc(next, timezone).getTime();
  }
  return null;
}

function advancePast(atMs, recurrence, nowMs, timezone) {
  let next = nextOccurrence(atMs, recurrence, timezone);
  let guard = 0;
  while (next != null && next <= nowMs && guard++ < 400) {
    next = nextOccurrence(next, recurrence, timezone);
  }
  return next;
}

class ReminderService {
  constructor(options = {}) {
    this.data = options.data || { reminders: [], reminderHistory: [] };
    this.save = options.save || (() => { });
    this.onNotification = options.onNotification || (() => { });
    this.getConfig = options.getConfig || (() => ({}));
    this.now = options.now || (() => Date.now());
    this._ensure();
  }

  _ensure() {
    if (!Array.isArray(this.data.reminders)) this.data.reminders = [];
    if (!Array.isArray(this.data.reminderHistory)) this.data.reminderHistory = [];
  }

  get timezone() {
    return this.getConfig().timezone || DEFAULT_TZ;
  }

  _log(message) {
    this._ensure();
    this.data.reminderHistory.push({ id: message.id, text: message.text, at: message.at, createdAt: message.createdAt, notifiedAt: message.notifiedAt, completedAt: message.completedAt, recurrence: message.recurrence || null, done: true });
    if (this.data.reminderHistory.length > 500) this.data.reminderHistory = this.data.reminderHistory.slice(-500);
  }

  create(args = {}) {
    this._ensure();
    let spec;
    if (args.at != null) {
      const at = Number(args.at);
      if (!Number.isFinite(at) || at <= 0) throw new Error('invalid reminder timestamp');
      spec = {
        at,
        task: String(args.text || '').trim(),
        recurrence: args.recurrence && args.recurrence !== 'none' ? { type: String(args.recurrence) } : parseRecurrence(args.text || ''),
        timezone: this.timezone
      };
      if (!spec.task) throw new Error('what should I remind you about?');
    } else {
      spec = parseReminderSpec(args.time ? `${args.text || ''} ${args.time}` : String(args.text || ''), { now: this.now(), timezone: this.timezone });
      if (spec.needsClarification) {
        const err = new Error(spec.needsClarification);
        err.code = 'ECLARIFICATION';
        err.question = spec.needsClarification;
        throw err;
      }
      if (args.minutes != null && !args.time) {
        spec.at = this.now() + Math.max(1, Number(args.minutes)) * 60000;
      }
      if (args.recurrence && args.recurrence !== 'none' && !spec.recurrence) {
        spec.recurrence = { type: String(args.recurrence) };
      }
    }

    if (!spec.task) throw new Error('what should I remind you about?');
    if (spec.recurrence && spec.at <= this.now()) {
      const advanced = advancePast(spec.at, spec.recurrence, this.now(), this.timezone);
      if (advanced) spec.at = advanced;
    }

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: spec.task,
      label: spec.task,
      kind: 'reminder',
      at: spec.at,
      createdAt: this.now(),
      done: false,
      notified: false,
      notifiedAt: null,
      lastNotifiedOccurrence: null,
      recurrence: spec.recurrence || null,
      timezone: spec.timezone || this.timezone,
      source: 'agent'
    };
    this.data.reminders.push(item);
    this.save();
    return { ...item, humanTime: new Date(item.at).toLocaleString() };
  }

  list(options = {}) {
    this._ensure();
    const includeDone = options.includeDone === true;
    return this.data.reminders
      .filter(r => includeDone || !r.done)
      .sort((a, b) => a.at - b.at)
      .map(r => ({ ...r, humanTime: new Date(r.at).toLocaleString(), overdue: r.at <= this.now() }));
  }

  find(args = {}) {
    this._ensure();
    if (args.id) return this.data.reminders.find(r => String(r.id) === String(args.id)) || null;
    if (args.text) {
      const q = String(args.text).toLowerCase();
      return this.data.reminders.find(r => String(r.text || r.label || '').toLowerCase().includes(q)) || null;
    }
    return null;
  }

  remove(args = {}) {
    this._ensure();
    if (args.id) {
      const before = this.data.reminders.length;
      this.data.reminders = this.data.reminders.filter(r => String(r.id) !== String(args.id));
      this.save();
      return { ok: before !== this.data.reminders.length, removed: before - this.data.reminders.length };
    }
    if (args.text) {
      const q = String(args.text).toLowerCase();
      const before = this.data.reminders.length;
      this.data.reminders = this.data.reminders.filter(r => !String(r.text || r.label || '').toLowerCase().includes(q));
      this.save();
      return { ok: before !== this.data.reminders.length, removed: before - this.data.reminders.length };
    }
    return { ok: false, error: 'provide a reminder id or text' };
  }

  update(id, patch = {}) {
    this._ensure();
    const item = this.data.reminders.find(r => String(r.id) === String(id));
    if (!item) return null;
    Object.assign(item, patch);
    this.save();
    return item;
  }

  snooze(id, minutes) {
    this._ensure();
    const item = this.data.reminders.find(r => String(r.id) === String(id));
    if (!item) return null;
    item.at = this.now() + Math.max(1, Number(minutes) || 5) * 60000;
    item.notifiedAt = null;
    item.notified = false;
    item.snoozedAt = this.now();
    item.snoozeCount = (item.snoozeCount || 0) + 1;
    this.save();
    return item;
  }

  complete(id) {
    this._ensure();
    const item = this.data.reminders.find(r => String(r.id) === String(id));
    if (!item) return null;
    item.done = true;
    item.completedAt = this.now();
    item.notifiedAt = this.now();
    this.data.reminders = this.data.reminders.filter(r => String(r.id) !== String(id));
    this._log(item);
    this.save();
    return item;
  }

  tick(now = this.now()) {
    this._ensure();
    const notifications = [];
    const keep = [];
    let changed = false;
    for (const item of this.data.reminders) {
      if (item.kind && item.kind !== 'reminder') { keep.push(item); continue; }
      if (item.done) { changed = true; continue; }
      const at = Number(item.at);
      if (!Number.isFinite(at) || at > now) { keep.push(item); continue; }
      const occurrence = `${item.id}:${at}`;
      if (item.lastNotifiedOccurrence === occurrence || item.notifiedAt && item.notifiedAt >= at && !item.recurrence) {
        if (!item.recurrence) { changed = true; this._log(item); continue; }
        keep.push(item);
        continue;
      }

      const missed = now - at > 5 * 60 * 1000;
      const notification = {
        id: item.id,
        kind: 'reminder',
        title: missed ? 'Missed reminder' : 'Reminder',
        text: reminderText(item, missed, this.getConfig()),
        urgency: 'normal',
        eventKey: `reminder:${occurrence}`,
        reminderId: item.id,
        at,
        missed
      };
      notifications.push(notification);
      item.lastNotifiedOccurrence = occurrence;
      item.notifiedAt = now;
      item.notified = true;
      changed = true;

      if (item.recurrence) {
        const next = advancePast(at, item.recurrence, now, item.timezone || this.timezone);
        if (next != null) {
          item.at = next;
          item.notified = false;
          item.notifiedAt = null;
          keep.push(item);
        } else {
          this._log(item);
        }
      } else {
        item.done = true;
        item.completedAt = now;
        this._log(item);
      }
    }
    this.data.reminders = keep;
    if (changed) this.save();
    if (notifications.length) {
      for (const n of notifications) {
        try { this.onNotification(n); } catch { }
      }
    }
    return notifications;
  }

  history(limit = 50) {
    this._ensure();
    return this.data.reminderHistory.slice(-Math.max(1, limit)).reverse();
  }

  clearCompleted() {
    this._ensure();
    this.data.reminderHistory = [];
    this.save();
    return { ok: true };
  }
}

function reminderText(item, missed, cfg) {
  const name = (cfg && cfg.userName) || 'Rikesh';
  const label = item.text || item.label || 'your reminder';
  const nepali = String((cfg && cfg.language) || '').toLowerCase().includes('nepali') || (cfg && cfg.language) === 'mixed';
  if (missed) {
    return nepali
      ? `${name}, yo reminder miss bhayo: ${label}.`
      : `${name}, this reminder was missed while the PC was asleep: ${label}.`;
  }
  return nepali
    ? `${name}, reminder: ${label}.`
    : `${name}, reminder: ${label}.`;
}

module.exports = {
  ReminderService,
  parseReminderSpec,
  parseDurationSeconds,
  parseClockTime,
  parseRecurrence,
  extractTaskText,
  nextOccurrence,
  advancePast,
  tzParts,
  zonedToUtc,
  DEFAULT_TZ
};
