/*
  Proactive event engine.

  Meaningful state changes are deduplicated, checked against quiet hours and
  availability, then delivered through the speech queue and/or a toast.
*/
'use strict';

const path = require('path');

class EventEngine {
  constructor(options = {}) {
    this.context = options.context;
    this.speech = options.speech;
    this.reminders = options.reminders;
    this.memory = options.memory;
    this.provider = options.provider;
    this.getConfig = options.getConfig || (() => ({}));
    this.getIdleSeconds = options.getIdleSeconds || (() => 0);
    this.onToast = options.onToast || (() => { });
    this.onRecord = options.onRecord || (() => { });
    this.getTodo = options.getTodo || (() => []);
    this.now = options.now || (() => Date.now());
    this.timer = null;
    this.lastDiskCheck = 0;
    this.lastBriefing = null;
    this.lastBattery = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      try { this.tick(); } catch { }
    }, 20000);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    const now = this.now();
    const reminders = this.reminders ? this.reminders.tick(now) : [];
    for (const notification of reminders) this.deliverReminder(notification);
    this.maybeBriefing(now);
    if (this.speech) this.speech.flush();
    return { reminders: reminders.length, at: now };
  }

  async _phrase(event, fallback) {
    const cfg = this.getConfig();
    if (!this.provider || cfg.proactiveUseAI === false) return fallback;
    const language = String(cfg.language || 'mixed');
    const prompt = [
      `You are FUL, a friendly Windows desktop companion.`,
      `User name: ${cfg.userName || 'Rikesh'}. Preferred language: ${language}.`,
      `Write ONE short, natural notification (max 22 words) for this real event.`,
      `Event: ${event.kind}. Details: ${JSON.stringify(event.details || {})}`,
      `Do not invent facts, do not claim an action happened unless it is in the details, and do not repeat this phrase: "${(this.context && this.context.phraseHistory.slice(-5).map(p => p.text).join(' | ')) || ''}".`,
      `Return plain text only.`
    ].join('\n');
    try {
      const result = await this.provider.generate({ prompt, temperature: 0.7, maxTokens: 120, timeoutMs: 20000 });
      if (!result.ok || !result.text) return fallback;
      const text = result.text.replace(/^["'`]|["'`]$/g, '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 220) return fallback;
      if (this.context && this.context.isRepetitive(text)) return fallback;
      return text;
    } catch {
      return fallback;
    }
  }

  _shouldDeliver(event, cooldownMs = 10 * 60 * 1000) {
    if (!event) return false;
    if (this.context && event.eventKey && this.context.shouldDedupeEvent(event.eventKey, cooldownMs)) return false;
    return true;
  }

  async _deliver(event, options = {}) {
    const cfg = this.getConfig();
    const urgency = event.urgency || 'normal';
    const idleSeconds = this.getIdleSeconds();
    const text = options.phrase === false ? event.text : await this._phrase(event, event.text);
    if (this.context && this.context.isRepetitive(text) && event.text) {
      // fall back to the deterministic message instead of repeating an old idea
      if (text !== event.text) return this._deliver({ ...event, text: event.text }, { ...options, phrase: false });
    }
    const payload = {
      title: event.title || 'FUL',
      text,
      kind: event.kind || 'notification',
      urgency,
      eventKey: event.eventKey,
      cooldownMs: options.cooldownMs,
      idleSeconds
    };
    let result = { delivered: false, queued: false, reason: 'speech-unavailable' };
    if (this.speech) result = this.speech.notifyIfAllowed(payload);

    const shouldToast = options.toast !== false && (!this.context || !this.context.isQuiet() || urgency === 'high');
    if (shouldToast) {
      try {
        this.onToast({ title: payload.title, subtitle: text, kind: payload.kind, urgency });
      } catch { }
    }
    if (this.memory) {
      try {
        this.memory.addHistory({ type: 'proactive', eventKey: event.eventKey || null, kind: payload.kind, delivered: result.delivered, queued: result.queued, reason: result.reason || null });
      } catch { }
    }
    try { this.onRecord({ event, payload, result, at: this.now() }); } catch { }
    return { ...result, text, title: payload.title };
  }

  deliverReminder(notification) {
    if (!notification) return;
    if (!this._shouldDeliver(notification, 24 * 60 * 60 * 1000)) return;
    return this._deliver({
      ...notification,
      kind: 'reminder',
      title: notification.title || 'Reminder',
      details: { text: notification.text, missed: notification.missed, at: notification.at }
    }, { phrase: false, toast: true });
  }

  async deliverBattery(notification) {
    if (!notification) return;
    const isTransition = notification.kind === 'charging' || notification.kind === 'unplugged' || notification.kind === 'full';
    const cooldown = isTransition ? 3000 : 8 * 60 * 1000;
    if (!this._shouldDeliver(notification, cooldown)) return;
    return this._deliver({
      kind: 'battery',
      title: notification.title || 'Battery',
      text: notification.text,
      urgency: notification.urgency || 'high',
      eventKey: notification.eventKey,
      details: { threshold: notification.threshold, percent: notification.percent, cycle: notification.cycle }
    }, { toast: true, cooldownMs: cooldown, phrase: false });
  }

  onBatterySnapshot(snapshot) {
    this.lastBattery = snapshot;
    this.checkDisk(snapshot);
  }

  checkDisk(snapshot) {
    if (!snapshot || !snapshot.disk || snapshot.disk.totalBytes == null) return;
    const now = this.now();
    if (now - this.lastDiskCheck < 5 * 60 * 1000) return;
    this.lastDiskCheck = now;
    const cfg = this.getConfig();
    const threshold = Math.max(2, Math.min(30, Number(cfg.diskLowPercent) || 10));
    const freePercent = Math.round((snapshot.disk.freeBytes / snapshot.disk.totalBytes) * 100);
    if (freePercent > threshold) return;
    const bucket = freePercent <= 3 ? 'critical' : 'low';
    const freeGb = Math.round(snapshot.disk.freeBytes / 1024 / 1024 / 1024);
    const event = {
      kind: 'disk',
      title: 'Low disk space',
      text: `Disk space is low — about ${freeGb} GB free (${freePercent}%). I can help clear temporary files if you want.`,
      urgency: bucket === 'critical' ? 'high' : 'normal',
      eventKey: `disk:${bucket}`,
      details: { freePercent, freeGb }
    };
    if (!this._shouldDeliver(event, 6 * 60 * 60 * 1000)) return;
    return this._deliver(event, { toast: true, cooldownMs: 6 * 60 * 60 * 1000 });
  }

  async deliverAgentResult(task) {
    if (!task) return;
    const ok = task.ok === true;
    const cfg = this.getConfig();
    const event = {
      kind: 'agent',
      title: ok ? 'Task complete' : 'Task needs attention',
      text: ok
        ? `${cfg.userName || 'Rikesh'}, task complete bhayo. ${task.summary || 'The requested steps finished.'}`
        : `${cfg.userName || 'Rikesh'}, task ma problem aayo. ${task.error || 'A step failed.'}`,
      urgency: ok ? 'normal' : 'high',
      eventKey: `agent:${task.taskId || 'unknown'}`,
      details: {
        taskId: task.taskId || null,
        changedFiles: Array.isArray(task.changedFiles) ? task.changedFiles.slice(0, 10) : [],
        commands: Array.isArray(task.commandsRun) ? task.commandsRun.slice(0, 10).map(c => ({ command: c.command, exitCode: c.exitCode })) : [],
        error: task.error || null
      }
    };
    if (!this._shouldDeliver(event, 60 * 1000)) return;
    return this._deliver(event, { toast: true, phrase: ok, cooldownMs: 60 * 1000 });
  }

  maybeBriefing(now = this.now()) {
    const cfg = this.getConfig();
    if (cfg.dailyBriefing !== true) return null;
    const [hour, minute] = String(cfg.dailyBriefingTime || '08:00').split(':').map(Number);
    const date = new Date(now);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    if (this.lastBriefing === key) return null;
    if (date.getHours() < (hour || 8) || (date.getHours() === (hour || 8) && date.getMinutes() < (minute || 0))) return null;
    if (this.context && this.context.isQuiet(now)) return null;
    this.lastBriefing = key;
    const reminders = this.reminders ? this.reminders.list().slice(0, 5) : [];
    const todo = (this.getTodo() || []).filter(t => !t.done).slice(0, 5);
    const parts = [];
    parts.push(`${cfg.userName || 'Rikesh'}, good morning.`);
    if (reminders.length) parts.push(`You have ${reminders.length} upcoming reminder${reminders.length === 1 ? '' : 's'}: ${reminders.map(r => r.text || r.label).join(', ')}.`);
    if (todo.length) parts.push(`Pending tasks: ${todo.map(t => t.text).join(', ')}.`);
    if (!reminders.length && !todo.length) parts.push('Nothing is scheduled yet. What is today’s main task?');
    const event = {
      kind: 'briefing',
      title: 'Daily briefing',
      text: parts.join(' '),
      urgency: 'normal',
      eventKey: `briefing:${key}`,
      details: { reminders: reminders.length, tasks: todo.length }
    };
    this._deliver(event, { toast: true, phrase: false, cooldownMs: 24 * 60 * 60 * 1000 });
    return event;
  }
}

module.exports = { EventEngine };
