/*
  Agent orchestrator.

  Plans with the model, executes validated tools, requests approval for
  sensitive actions, replans at most once after a real failure, verifies the
  outcome, and reports only what actually happened.
*/
'use strict';

const path = require('path');

class AgentOrchestrator {
  constructor(deps = {}) {
    this.provider = deps.provider;
    this.registry = deps.registry;
    this.executor = deps.executor;
    this.planner = deps.planner;
    this.verifyFn = deps.verify || (() => Promise.resolve({ complete: true, issues: [], warnings: [], changedFiles: [], commandsRun: [] }));
    this.context = deps.context;
    this.memory = deps.memory;
    this.commands = deps.commands;
    this.permissions = deps.permissions;
    this.getConfig = deps.getConfig || (() => ({}));
    this.emit = deps.emit || (() => { });
    this.onResult = deps.onResult || (() => { });
    this.now = deps.now || (() => Date.now());
    this.active = new Map();
    this.pendingApprovals = new Map();
    this.maxReplans = deps.maxReplans == null ? 1 : deps.maxReplans;
    this.counter = 0;
  }

  get workspaceRoots() {
    const roots = this.permissions.roots || [];
    return roots;
  }

  get activeWorkspace() {
    return this.getConfig().activeWorkspace || null;
  }

  async run(request, options = {}) {
    const text = String(request || '').trim();
    if (!text) return { ok: false, error: 'I need a request first.' };
    if (text.length > 8000) return { ok: false, error: 'That request is too long.' };

    const taskId = options.taskId || 'task_' + (++this.counter) + '_' + Date.now().toString(36);
    const task = {
      id: taskId,
      request: text,
      status: 'planning',
      startedAt: this.now(),
      cancelled: false,
      steps: [],
      changedFiles: [],
      commandsRun: [],
      plan: null
    };
    this.active.set(taskId, task);
    if (this.context) this.context.setTask(taskId, { request: text, status: 'planning', startedAt: task.startedAt });
    this.emit('agent-task', { taskId, status: 'planning', request: text });
    this._history({ type: 'agent-start', taskId, request: text });

    try {
      if (!this.provider) {
        throw new Error('No AI provider is configured. Add an API key in Settings → AI model.');
      }
      if (this.provider.status && !this.provider.status().configured) {
        throw new Error('No AI provider is configured. Add an API key in Settings → AI model.');
      }
      const planResult = await this.planner.createPlan({
        request: text,
        context: this.context ? this.context.summarize() : null,
        workspaceRoots: this.workspaceRoots,
        activeWorkspace: this.activeWorkspace,
        tools: this.registry.list(),
        registry: this.registry
      });
      if (!planResult.ok) {
        return this._finish(task, {
          ok: false,
          error: planResult.error || 'The planner could not create a plan.',
          summary: 'I could not create a safe plan for that request.'
        });
      }
      const plan = planResult.plan;
      task.plan = plan;
      if (plan.needsClarification) {
        return this._finish(task, {
          ok: false,
          needsClarification: true,
          question: plan.needsClarification,
          summary: plan.needsClarification
        });
      }

      this.emit('agent-task', { taskId, status: 'running', goal: plan.goal, steps: plan.steps.length });
      if (this.context) this.context.setTask(taskId, { status: 'running', goal: plan.goal, plan });

      let execution = null;
      let currentPlan = plan;
      let attempts = 0;
      while (true) {
        if (task.cancelled) break;
        execution = await this.executor.executePlan(currentPlan, {
          taskId,
          emit: this.emit,
          isCancelled: () => task.cancelled,
          requestApproval: (approval, meta) => this.requestApproval(approval, meta)
        });
        task.steps = execution.steps;
        task.changedFiles = execution.changedFiles;
        task.commandsRun = execution.commandsRun;
        task.status = execution.ok ? 'verifying' : (execution.cancelled ? 'cancelled' : 'failed');
        this.emit('agent-task', { taskId, status: task.status, steps: execution.steps.length, changedFiles: execution.changedFiles.length });

        if (execution.ok || execution.cancelled) break;
        if (attempts >= this.maxReplans) break;
        const failed = execution.steps.find(s => s.id === execution.failedStep) || null;
        if (failed && (failed.status === 'denied' || failed.status === 'blocked')) break;
        attempts++;
        this.emit('agent-task', { taskId, status: 'replanning', attempt: attempts });
        const replanned = await this.planner.replan({
          request: text,
          previousPlan: currentPlan,
          failure: failed,
          execution,
          workspaceRoots: this.workspaceRoots,
          activeWorkspace: this.activeWorkspace,
          tools: this.registry.list(),
          registry: this.registry
        });
        if (!replanned.ok) break;
        if (replanned.plan.needsClarification) {
          return this._finish(task, {
            ok: false,
            needsClarification: true,
            question: replanned.plan.needsClarification,
            summary: replanned.plan.needsClarification,
            execution
          });
        }
        currentPlan = replanned.plan;
        task.plan = { ...replanned.plan, replanned: true, attempts };
      }

      if (task.cancelled) {
        return this._finish(task, {
          ok: false,
          cancelled: true,
          summary: 'Cancelled.',
          execution
        });
      }

      if (!execution || !execution.ok) {
        const failed = execution && execution.steps ? execution.steps.find(s => s.id === execution.failedStep) : null;
        return this._finish(task, {
          ok: false,
          error: failed ? failed.error : 'The task did not complete.',
          execution,
          summary: failed ? `Task failed at ${failed.tool}: ${failed.error}` : 'The task did not complete.'
        });
      }

      const verification = await this.verifyFn({
        request: text,
        plan: currentPlan,
        execution,
        provider: this.provider,
        useModel: this.getConfig().agentModelVerification === true
      });
      task.status = verification.complete ? 'done' : 'needs-attention';
      const summary = buildSummary(task, execution, verification, this.getConfig());
      return this._finish(task, {
        ok: verification.complete,
        verification,
        execution,
        summary
      });
    } catch (e) {
      return this._finish(task, {
        ok: false,
        error: e.message,
        summary: `I could not finish that: ${e.message}`
      });
    }
  }

  requestApproval(approval, meta = {}) {
    if (!approval) return Promise.resolve({ approved: true });
    const record = this.permissions.createConfirmation({
      action: approval.action || 'action',
      target: approval.target || '',
      extra: approval.extra || null,
      summary: approval.summary || '',
      consequence: approval.consequence || ''
    });
    const payload = {
      ...record,
      taskId: meta.taskId,
      stepId: meta.stepId,
      summary: approval.summary,
      consequence: approval.consequence,
      preview: approval.preview || null
    };
    this.emit('agent-confirm', payload);
    try {
      this.onResult({ type: 'confirmation-required', ...payload });
    } catch { }

    return new Promise(resolve => {
      const timeoutMs = this.getConfig().agentConfirmationTtlMs
        || this.getConfig().confirmationTtlMs
        || 120000;
      const timer = setTimeout(() => {
        this.pendingApprovals.delete(record.id);
        try { this.permissions.resolve(record.id, false); } catch { }
        this.emit('agent-confirm-expired', { id: record.id, taskId: meta.taskId });
        resolve({ approved: false, reason: 'expired' });
      }, timeoutMs);
      if (timer.unref) timer.unref();
      this.pendingApprovals.set(record.id, {
        resolve,
        timer,
        record,
        taskId: meta.taskId,
        stepId: meta.stepId
      });
    });
  }

  resolveConfirmation(id, approved) {
    const pending = this.pendingApprovals.get(String(id));
    if (!pending) return { ok: false, reason: 'confirmation is not pending or has expired' };
    clearTimeout(pending.timer);
    const result = this.permissions.resolve(pending.record.id, approved === true);
    this.pendingApprovals.delete(String(id));
    if (!result.ok) {
      pending.resolve({ approved: false, reason: result.reason });
      return { ok: false, reason: result.reason };
    }
    pending.resolve({ approved: result.approved, record: result.record });
    return { ok: true, approved: result.approved };
  }

  async runTool(tool, args = {}, options = {}) {
    const step = {
      id: options.stepId || 'direct_' + Date.now().toString(36),
      tool,
      args,
      reason: options.reason || 'direct user action'
    };
    const taskId = options.taskId || 'direct';
    const record = await this.executor.executeStep(step, {
      taskId,
      emit: this.emit,
      isCancelled: () => options.isCancelled ? options.isCancelled() : false,
      requestApproval: (approval, meta) => this.requestApproval(approval, meta)
    });
    return record;
  }

  cancel(taskId) {
    const task = this.active.get(String(taskId));
    if (!task) return { ok: false, reason: 'task not found' };
    task.cancelled = true;
    task.status = 'cancelling';
    if (this.commands) this.commands.cancelTask(taskId);
    for (const [id, pending] of this.pendingApprovals) {
      if (pending.taskId === taskId) {
        clearTimeout(pending.timer);
        this.permissions.resolve(id, false);
        pending.resolve({ approved: false, reason: 'cancelled' });
        this.pendingApprovals.delete(id);
      }
    }
    this.emit('agent-task', { taskId, status: 'cancelling' });
    return { ok: true };
  }

  cancelAll() {
    for (const id of this.active.keys()) this.cancel(id);
  }

  status(taskId) {
    if (taskId) {
      const task = this.active.get(String(taskId));
      return task ? publicTask(task) : null;
    }
    return [...this.active.values()].map(publicTask);
  }

  _finish(task, result) {
    task.status = result.cancelled ? 'cancelled' : result.ok ? 'done' : result.needsClarification ? 'clarification' : 'failed';
    task.finishedAt = this.now();
    task.result = result;
    if (this.context) {
      this.context.updateTask(task.id, {
        status: task.status,
        ok: result.ok === true,
        summary: result.summary || '',
        changedFiles: (result.execution && result.execution.changedFiles) || task.changedFiles,
        finishedAt: task.finishedAt
      });
      if (result.summary) this.context.addMessage('assistant', result.summary, { taskId: task.id });
    }
    this._history({
      type: 'agent-finish',
      taskId: task.id,
      ok: result.ok === true,
      status: task.status,
      error: result.error || null,
      changedFiles: (result.execution && result.execution.changedFiles) || task.changedFiles
    });
    const payload = {
      taskId: task.id,
      ok: result.ok === true,
      cancelled: !!result.cancelled,
      needsClarification: !!result.needsClarification,
      question: result.question || null,
      summary: result.summary || '',
      error: result.error || null,
      status: task.status,
      plan: task.plan,
      execution: result.execution || null,
      verification: result.verification || null
    };
    this.emit('agent-result', payload);
    try { this.onResult(payload); } catch { }
    const cleanup = setTimeout(() => this.active.delete(task.id), 10 * 60 * 1000);
    if (cleanup.unref) cleanup.unref();
    return payload;
  }

  _history(entry) {
    if (!this.memory) return;
    try { this.memory.addHistory(entry); } catch { }
  }
}

function publicTask(task) {
  return {
    id: task.id,
    request: task.request,
    status: task.status,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt || null,
    steps: (task.steps || []).map(s => ({
      id: s.id,
      tool: s.tool,
      status: s.status,
      error: s.error || null,
      command: s.command || null,
      exitCode: s.exitCode == null ? null : s.exitCode
    })),
    changedFiles: task.changedFiles || [],
    commandsRun: task.commandsRun || []
  };
}

function buildSummary(task, execution, verification, cfg) {
  const changed = execution.changedFiles || [];
  const commands = execution.commandsRun || [];
  const failedCommands = commands.filter(c => c.exitCode != null && c.exitCode !== 0);
  const parts = [];
  if (verification && verification.modelSummary) {
    parts.push(verification.modelSummary);
  } else if (verification && verification.complete) {
    parts.push('Done.');
  } else {
    parts.push('Finished with some issues.');
  }
  if (changed.length) {
    const names = changed.slice(0, 6).map(c => path.basename(c.path || c.action || 'file'));
    parts.push(`Changed ${changed.length} file${changed.length === 1 ? '' : 's'}: ${names.join(', ')}${changed.length > 6 ? '…' : ''}.`);
  }
  if (commands.length) {
    const last = commands[commands.length - 1];
    parts.push(`Ran ${commands.length} command${commands.length === 1 ? '' : 's'}${last ? `; last exit code ${last.exitCode}` : ''}.`);
  }
  if (failedCommands.length) parts.push(`${failedCommands.length} command${failedCommands.length === 1 ? '' : 's'} failed.`);
  if (verification && verification.warnings && verification.warnings.length) {
    parts.push(`Note: ${verification.warnings[0]}`);
  }
  return parts.join(' ').slice(0, 1200);
}

module.exports = { AgentOrchestrator, buildSummary };
