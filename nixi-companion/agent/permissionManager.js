/*
  Permission manager.

  Owns workspace-root validation, command risk decisions and the short-lived
  confirmation registry used for destructive actions.
*/
'use strict';

const crypto = require('crypto');
const safety = require('./safetyPolicy');

function defaultRoots(homedir) {
  if (!homedir) return [];
  const path = require('path');
  return ['Desktop', 'Documents', 'Downloads', 'Projects', 'source']
    .map(name => path.join(homedir, name));
}

const FS_ACTIONS = new Set(['read', 'list', 'search', 'write', 'create', 'delete', 'move', 'copy', 'rename', 'execute']);

class PermissionManager {
  constructor(options = {}) {
    this.config = {
      workspaceRoots: options.workspaceRoots || [],
      requireApprovalForWrites: options.requireApprovalForWrites === true,
      autoApproveCommands: options.autoApproveCommands === true,
      allowPermanentDelete: options.allowPermanentDelete === true,
      confirmationTtlMs: options.confirmationTtlMs || 2 * 60 * 1000,
      allowReadOutside: options.allowReadOutside === true
    };
    this.pending = new Map();
    this.now = options.now || (() => Date.now());
  }

  setConfig(patch = {}) {
    const next = { ...this.config };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      next[key] = value;
    }
    if (Array.isArray(next.workspaceRoots)) {
      next.workspaceRoots = next.workspaceRoots.map(String).filter(Boolean);
    }
    this.config = next;
    return this.config;
  }

  get roots() {
    return this.config.workspaceRoots;
  }

  validatePath(target, opts = {}) {
    return safety.validatePath(target, this.config.workspaceRoots, opts);
  }

  /**
   * Decide whether a filesystem operation is permitted.
   * Deletes and writes outside roots always require an explicit confirmation.
   */
  authorizeFs(action, target, opts = {}) {
    if (!FS_ACTIONS.has(action)) {
      return { allowed: false, needsApproval: false, reason: `unknown filesystem action "${action}"` };
    }
    const check = this.validatePath(target, { allowSensitive: opts.allowSensitive });
    if (!check.ok) {
      return {
        allowed: false,
        needsApproval: false,
        reason: check.reason,
        path: check.path
      };
    }

    const destructive = action === 'delete';
    const sensitive = safety.isSensitiveName(require('path').basename(check.path));
    const needsApproval =
      destructive ||
      (action === 'write' && (this.config.requireApprovalForWrites || sensitive)) ||
      (action === 'create' && sensitive);

    return {
      allowed: true,
      needsApproval: !!needsApproval,
      path: check.path,
      root: check.root,
      relative: check.relative,
      reason: needsApproval ? 'confirmation required by policy' : ''
    };
  }

  classifyCommand(command) {
    const result = safety.classifyCommand(command);
    const needsApproval =
      result.risk === safety.RISK.HIGH ||
      (result.risk === safety.RISK.MEDIUM && !this.config.autoApproveCommands);
    return { ...result, needsApproval, allowed: result.allowed };
  }

  createConfirmation(details = {}) {
    const now = this.now();
    const id = crypto.randomBytes(12).toString('hex');
    const action = String(details.action || 'unknown');
    const target = String(details.target || '');
    const extra = details.extra || null;
    const record = {
      id,
      action,
      target,
      extra,
      summary: details.summary || '',
      consequence: details.consequence || '',
      fingerprint: safety.fingerprint(action, target, extra),
      createdAt: now,
      expiresAt: now + this.config.confirmationTtlMs,
      approved: null,
      used: false
    };
    this.pending.set(id, record);
    this.prune(now);
    return { ...record };
  }

  peek(id) {
    this.prune();
    const record = this.pending.get(String(id));
    return record ? { ...record } : null;
  }

  listPending() {
    this.prune();
    return [...this.pending.values()].map(r => ({ ...r }));
  }

  resolve(id, approved, revalidation = {}) {
    const record = this.pending.get(String(id));
    if (!record) return { ok: false, reason: 'confirmation not found or already used' };
    if (record.expiresAt <= this.now()) {
      this.pending.delete(record.id);
      return { ok: false, reason: 'confirmation expired' };
    }
    if (record.used) return { ok: false, reason: 'confirmation already used' };

    if (revalidation.action !== undefined || revalidation.target !== undefined) {
      const fp = safety.fingerprint(
        revalidation.action !== undefined ? revalidation.action : record.action,
        revalidation.target !== undefined ? revalidation.target : record.target,
        revalidation.extra !== undefined ? revalidation.extra : record.extra
      );
      if (fp !== record.fingerprint) {
        return { ok: false, reason: 'confirmation does not match the requested action and target' };
      }
    }

    if (!approved) {
      record.approved = false;
      record.used = true;
      this.pending.delete(record.id);
      return { ok: true, approved: false, record: { ...record } };
    }

    record.approved = true;
    record.used = true;
    this.pending.delete(record.id);
    return { ok: true, approved: true, record: { ...record } };
  }

  consumeApproved(id, revalidation = {}) {
    const record = this.pending.get(String(id));
    if (!record) return { ok: false, reason: 'approval not found' };
    if (record.approved !== true) return { ok: false, reason: 'approval was not granted' };
    if (record.expiresAt <= this.now()) {
      this.pending.delete(record.id);
      return { ok: false, reason: 'approval expired' };
    }
    const fp = safety.fingerprint(
      revalidation.action !== undefined ? revalidation.action : record.action,
      revalidation.target !== undefined ? revalidation.target : record.target,
      revalidation.extra !== undefined ? revalidation.extra : record.extra
    );
    if (fp !== record.fingerprint) return { ok: false, reason: 'approval fingerprint mismatch' };
    this.pending.delete(record.id);
    return { ok: true, record: { ...record } };
  }

  prune(now = this.now()) {
    for (const [id, record] of this.pending) {
      if (record.expiresAt <= now || (record.used && record.approved !== true)) this.pending.delete(id);
    }
  }
}

module.exports = { PermissionManager, defaultRoots, FS_ACTIONS };
