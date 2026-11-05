/*
  Tool executor.

  Runs a model-proposed plan one validated step at a time, requesting human
  approval for sensitive actions, enforcing timeouts and supporting cancel.
*/
'use strict';

const DEFAULT_TIMEOUTS = {
  filesystem: 30 * 1000,
  terminal: 15 * 60 * 1000,
  project: 15 * 60 * 1000,
  git: 120 * 1000,
  system: 60 * 1000,
  reminder: 10 * 1000,
  memory: 10 * 1000,
  general: 30 * 1000
};

const TRANSIENT = /EAGAIN|EBUSY|ETIMEDOUT|ECONNRESET|EAI_AGAIN|EPERM|locked/i;

class ToolExecutor {
  constructor(deps = {}) {
    this.registry = deps.registry;
    this.commands = deps.commands;
    this.now = deps.now || (() => Date.now());
    this.maxRetries = deps.maxRetries == null ? 1 : deps.maxRetries;
  }

  timeoutFor(tool) {
    return DEFAULT_TIMEOUTS[tool.category] || DEFAULT_TIMEOUTS.general;
  }

  async executeStep(step, ctx) {
    const started = this.now();
    const base = {
      id: step.id,
      tool: step.tool,
      reason: step.reason || '',
      status: 'pending',
      attempts: 0,
      startedAt: started
    };

    const validation = this.registry.validate(step.tool, step.args);
    if (!validation.ok) {
      return { ...base, status: 'failed', finishedAt: this.now(), error: validation.errors.join('; '), retryable: false };
    }
    const tool = validation.tool;

    if (ctx.isCancelled && ctx.isCancelled()) {
      return { ...base, status: 'cancelled', finishedAt: this.now(), error: 'cancelled before start' };
    }

    let approval = null;
    try {
      approval = this.registry.approvalFor(step.tool, step.args || {}, ctx);
    } catch (e) {
      return { ...base, status: 'failed', finishedAt: this.now(), error: `approval check failed: ${e.message}`, retryable: false };
    }

    if (approval && approval.blocked) {
      return { ...base, status: 'blocked', finishedAt: this.now(), error: approval.consequence || approval.summary || 'blocked by policy', retryable: false };
    }

    if (approval && typeof ctx.requestApproval === 'function') {
      try {
        ctx.emit && ctx.emit('agent-progress', {
          taskId: ctx.taskId,
          stepId: step.id,
          status: 'awaiting-approval',
          tool: step.tool,
          approval
        });
        const decision = await ctx.requestApproval(approval, { taskId: ctx.taskId, stepId: step.id });
        if (!decision || decision.approved !== true) {
          return { ...base, status: 'denied', finishedAt: this.now(), error: 'the user denied this action', retryable: false, approval };
        }
        step.args = { ...(step.args || {}), approved: true };
      } catch (e) {
        return { ...base, status: 'denied', finishedAt: this.now(), error: e.message, retryable: false, approval };
      }
    }

    let lastError = null;
    const maxAttempts = tool.risk === 'high' ? 1 : 1 + this.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (ctx.isCancelled && ctx.isCancelled()) {
        if (this.commands && ctx.taskId) this.commands.cancelTask(ctx.taskId);
        return { ...base, attempts: attempt, status: 'cancelled', finishedAt: this.now(), error: 'cancelled', retryable: false };
      }
      base.attempts = attempt;
      try {
        ctx.emit && ctx.emit('agent-progress', {
          taskId: ctx.taskId,
          stepId: step.id,
          status: 'running',
          tool: step.tool,
          attempt,
          reason: step.reason
        });
        const result = await this._runWithTimeout(step, tool, ctx);
        const record = this._summarize(step, tool, result, started, attempt);
        ctx.emit && ctx.emit('agent-progress', {
          taskId: ctx.taskId,
          stepId: step.id,
          status: record.status,
          tool: step.tool,
          summary: record.summary
        });
        if (record.status === 'failed') {
          lastError = record;
          const retryable = record.retryable !== false && attempt < maxAttempts && TRANSIENT.test(String(record.error || ''));
          if (retryable) continue;
          return record;
        }
        return record;
      } catch (e) {
        lastError = { ...base, attempts: attempt, status: 'failed', finishedAt: this.now(), error: e.message, code: e.code || null };
        const retryable = attempt < maxAttempts && (e.code === 'ETIMEDOUT' || TRANSIENT.test(String(e.message || '')));
        if (!retryable) break;
      }
    }
    return { ...lastError, status: 'failed', finishedAt: this.now() };
  }

  async _runWithTimeout(step, tool, ctx) {
    const timeout = step.timeoutMs || this.timeoutFor(tool);
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        if (this.commands && ctx.taskId) this.commands.cancelTask(ctx.taskId);
        const err = new Error(`step timed out after ${timeout}ms`);
        err.code = 'ETIMEDOUT';
        reject(err);
      }, timeout);
    });
    try {
      return await Promise.race([
        this.registry.invoke(step.tool, step.args || {}, ctx),
        timeoutPromise
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _summarize(step, tool, result, started, attempts) {
    const base = { id: step.id, tool: step.tool, attempts, startedAt: started, finishedAt: this.now(), reason: step.reason || '' };
    if (result && result.ok === false && result.error) {
      return { ...base, status: result.needsApproval ? 'awaiting-approval' : 'failed', error: result.error, retryable: result.risk !== 'high', raw: safeSlice(result) };
    }
    if (tool.category === 'terminal' || tool.category === 'project' || tool.category === 'git') {
      const failed = result && typeof result === 'object' && result.code != null && result.code !== 0;
      return {
        ...base,
        status: failed ? 'failed' : 'ok',
        exitCode: result && result.code,
        command: result && result.command,
        error: failed ? (result.error || `command exited with code ${result.code}`) : null,
        stdout: result && result.stdout ? String(result.stdout).slice(-12000) : '',
        stderr: result && result.stderr ? String(result.stderr).slice(-12000) : '',
        retryable: false,
        summary: failed ? `command failed (exit ${result.code})` : 'command succeeded'
      };
    }
    return { ...base, status: 'ok', result: safeSlice(result), summary: summarizeResult(step.tool, result) };
  }

  async executePlan(plan, ctx = {}) {
    const steps = Array.isArray(plan.steps) ? plan.steps : [];
    const records = [];
    const changedFiles = [];
    const commandsRun = [];
    const observations = [];

    const stepCtx = {
      ...ctx,
      isCancelled: ctx.isCancelled || (() => false)
    };

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.id) step.id = 'step_' + (i + 1);
      const record = await this.executeStep(step, stepCtx);
      records.push(record);

      if (record.command) commandsRun.push({ command: record.command, exitCode: record.exitCode, stepId: record.id });
      if (record.result && record.result.path) changedFiles.push({ path: record.result.path, action: step.tool, changeId: record.result.changeId || null });
      if (record.result && record.result.stdout) observations.push({ stepId: record.id, output: record.result.stdout.slice(-2000) });
      if (record.stdout) observations.push({ stepId: record.id, output: record.stdout.slice(-2000) });
      if (record.status === 'failed' || record.status === 'blocked' || record.status === 'denied' || record.status === 'cancelled') {
        if (stepCtx.isCancelled()) return { ok: false, cancelled: true, steps: records, changedFiles, commandsRun, observations, failedStep: record.id, error: record.error };
        if (step.optional === true) continue;
        return { ok: false, steps: records, changedFiles, commandsRun, observations, failedStep: record.id, error: record.error };
      }
    }

    return { ok: true, steps: records, changedFiles, commandsRun, observations };
  }
}

function safeSlice(value, limit = 4000) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  try {
    const json = JSON.stringify(value);
    if (json && json.length > limit) return { truncated: true, preview: json.slice(0, limit) };
    return JSON.parse(json);
  } catch {
    return { note: 'result was not serializable' };
  }
}

function summarizeResult(name, result) {
  if (result == null) return 'done';
  if (typeof result === 'string') return result.slice(0, 200);
  if (Array.isArray(result)) return `${name} returned ${result.length} item(s)`;
  if (result.content != null) return `read ${result.path || 'file'} (${result.content.length} chars)`;
  if (result.path && result.created) return `created ${result.path}`;
  if (result.path && result.bytes != null) return `wrote ${result.path}`;
  if (result.results) return `${result.results.length} search result(s)`;
  if (result.entries) return `${result.entries.length} item(s)`;
  if (result.children) return `tree at ${result.path}`;
  return 'done';
}

module.exports = { ToolExecutor, DEFAULT_TIMEOUTS };
