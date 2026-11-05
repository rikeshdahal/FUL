/*
  Speech interaction manager.

  Coordinates availability, interruption and a bounded notification queue.
  Actual audio is produced by the existing renderer TTS; the renderer reports
  when playback starts and finishes.
*/
'use strict';

class SpeechManager {
  constructor(options = {}) {
    this.context = options.context;
    this.deliver = options.deliver || (() => {});
    this.now = options.now || (() => Date.now());
    this.queue = [];
    this.current = null;
    this.lastFinishedAt = 0;
    this.dedupe = new Map();
    this.maxQueue = options.maxQueue || 12;
  }

  get state() {
    return {
      speaking: !!(this.context && this.context.state.speaking),
      userSpeaking: !!(this.context && this.context.state.userSpeaking),
      listening: !!(this.context && this.context.state.listening),
      queueLength: this.queue.length,
      current: this.current ? { id: this.current.id, text: this.current.text, urgency: this.current.urgency } : null,
      lastFinishedAt: this.lastFinishedAt
    };
  }

  setUserSpeaking(value) {
    if (!this.context) return;
    this.context.setState({ userSpeaking: !!value });
    if (!value) setTimeout(() => this.flush(), 300);
  }

  setListening(value) {
    if (!this.context) return;
    this.context.setState({ listening: !!value });
  }

  markSpeaking(value) {
    if (!this.context) return;
    this.context.setState({ speaking: !!value });
  }

  finished(id) {
    if (!this.current || (id && this.current.id !== id)) return;
    if (this.current.timer) clearTimeout(this.current.timer);
    this.current = null;
    this.lastFinishedAt = this.now();
    this.markSpeaking(false);
    setTimeout(() => this.flush(), 500);
  }

  cancelCurrent() {
    if (!this.current) return false;
    const current = this.current;
    if (current.timer) clearTimeout(current.timer);
    this.current = null;
    this.markSpeaking(false);
    try { this.deliver({ type: 'cancel', id: current.id }); } catch { }
    return true;
  }

  _isDuplicate(eventKey, cooldownMs) {
    if (!eventKey) return false;
    const last = this.dedupe.get(eventKey);
    const now = this.now();
    if (last && now - last < cooldownMs) return true;
    this.dedupe.set(eventKey, now);
    if (this.dedupe.size > 300) {
      for (const [key, ts] of this.dedupe) if (now - ts > 24 * 60 * 60 * 1000) this.dedupe.delete(key);
    }
    return false;
  }

  /**
   * Deliver or queue a notification.
   * urgency: 'low' | 'normal' | 'high'
   */
  notify(message = {}) {
    const text = String(message.text || '').trim();
    if (!text) return { delivered: false, queued: false, reason: 'empty' };
    const urgency = message.urgency || 'normal';
    const eventKey = message.eventKey || null;
    const cooldown = message.cooldownMs == null ? 10 * 60 * 1000 : message.cooldownMs;
    if (eventKey && this._isDuplicate(eventKey, cooldown)) {
      return { delivered: false, queued: false, reason: 'duplicate' };
    }

    const payload = {
      id: message.id || 'speech_' + this.now() + '_' + Math.random().toString(36).slice(2, 7),
      text,
      title: message.title || 'FUL',
      kind: message.kind || 'message',
      urgency,
      eventKey,
      at: this.now()
    };

    if (this.current) {
      if (urgency === 'high') {
        this.cancelCurrent();
      } else {
        return this._enqueue(payload);
      }
    }

    const userSpeaking = this.context && this.context.state.userSpeaking;
    const busy = this.context && (this.context.state.listening || this.context.state.busy);
    if (userSpeaking || busy) {
      if (urgency === 'high' && !userSpeaking) {
        // urgent warnings may interrupt FUL's own work, never the user's voice
        return this._deliverNow(payload);
      }
      return this._enqueue(payload);
    }

    return this._deliverNow(payload);
  }

  _enqueue(payload) {
    if (this.queue.some(q => q.eventKey && q.eventKey === payload.eventKey)) {
      return { delivered: false, queued: true, reason: 'already-queued' };
    }
    this.queue.push(payload);
    if (this.queue.length > this.maxQueue) {
      const removed = this.queue.shift();
      return { delivered: false, queued: true, reason: 'queue-full', removed: removed.id };
    }
    return { delivered: false, queued: true, reason: 'queued', id: payload.id };
  }

  _deliverNow(payload) {
    this.current = payload;
    this.markSpeaking(true);
    const maxMs = Math.max(15000, Math.min(120000, String(payload.text || '').length * 95 + 8000));
    payload.timer = setTimeout(() => this.finished(payload.id), maxMs);
    if (payload.timer.unref) payload.timer.unref();
    try {
      const result = this.deliver({
        type: 'speak',
        id: payload.id,
        text: payload.text,
        title: payload.title,
        kind: payload.kind,
        urgency: payload.urgency,
        eventKey: payload.eventKey,
        at: payload.at
      });
      if (result && result.ok === false) {
        clearTimeout(payload.timer);
        this.current = null;
        this.markSpeaking(false);
        return { delivered: false, queued: false, reason: result.error || 'delivery-failed', id: payload.id };
      }
    } catch (e) {
      clearTimeout(payload.timer);
      this.current = null;
      this.markSpeaking(false);
      return { delivered: false, queued: false, reason: e.message, id: payload.id };
    }
    return { delivered: true, queued: false, id: payload.id };
  }

  flush(options = {}) {
    if (!this.current) this.markSpeaking(false);
    if (this.current || !this.queue.length) return 0;
    if (this.context && (this.context.state.userSpeaking || this.context.state.listening || this.context.state.busy)) return 0;
    if (this.context && this.context.isQuiet() && options.urgent !== true) return 0;
    const next = this.queue.shift();
    const result = this._deliverNow(next);
    return result.delivered ? 1 : 0;
  }

  clearQueue() {
    this.queue = [];
    return true;
  }

  notifyIfAllowed(message = {}) {
    const idleSeconds = Number(message.idleSeconds) || 0;
    const urgent = message.urgency === 'high';
    if (this.context) {
      const allowed = this.context.proactiveAllowed({ idleSeconds, urgent });
      if (!allowed.allowed && !urgent) {
        return { delivered: false, queued: false, reason: allowed.reason };
      }
    }
    const result = this.notify(message);
    if (result.delivered && this.context && message.text) {
      this.context.recordProactive(message.text, { kind: message.kind || 'notification', eventKey: message.eventKey || null });
    }
    return result;
  }
}

module.exports = { SpeechManager };
