'use strict';

const os = require('os');
const path = require('path');
const { fileURLToPath } = require('url');
const memory = require('../data/memoryStore');
const { PermissionManager, defaultRoots } = require('./permissionManager');
const { WorkspaceService } = require('./workspace');
const { CommandService } = require('./commandService');
const { ReminderService } = require('./reminderService');
const { ContextManager } = require('./contextManager');
const { SpeechManager } = require('./speechManager');
const { ProviderRegistry } = require('./aiProvider');
const { Planner } = require('./planner');
const { buildToolRegistry } = require('./toolRegistry');
const { ToolExecutor } = require('./toolExecutor');
const { AgentOrchestrator } = require('./agentOrchestrator');
const { verify } = require('./verification');
const { BatteryMonitor } = require('./batteryMonitor');
const { EventEngine } = require('./eventEngine');

function agentRoots(cfg) {
  const custom = Array.isArray(cfg.agentWorkspaceRoots) ? cfg.agentWorkspaceRoots.filter(Boolean) : [];
  return custom.length ? custom : defaultRoots(os.homedir());
}

function toolReply(record) {
  if (!record) return { ok: false, error: 'no result' };
  if (record.status === 'ok') return { ok: true, result: record.result, summary: record.summary || '', record };
  if (record.status === 'denied') return { ok: false, denied: true, error: record.error, record };
  if (record.status === 'cancelled') return { ok: false, cancelled: true, error: record.error || 'cancelled', record };
  return { ok: false, error: record.error || `tool ${record.status}`, status: record.status, record };
}

function createAgentRuntime(options = {}) {
  const getConfig = options.getConfig || (() => ({}));
  const setConfig = options.setConfig || (() => { });
  const broadcast = options.broadcast || (() => { });
  const toast = options.toast || (() => { });
  const userData = options.userData || process.cwd();
  const now = options.now || (() => Date.now());
  const cfg = getConfig() || {};

  const permissions = new PermissionManager({
    workspaceRoots: agentRoots(cfg),
    requireApprovalForWrites: cfg.agentRequireApprovalForWrites === true,
    autoApproveCommands: cfg.agentAutoApproveCommands === true,
    allowReadOutside: cfg.agentAllowReadOutside === true,
    confirmationTtlMs: Math.max(30000, Number(cfg.agentConfirmationTtlMs) || 120000)
  });

  const workspace = new WorkspaceService({
    permissions,
    userData,
    trash: options.trash,
    now
  });

  const commands = new CommandService({ permissions, now });
  const reminders = new ReminderService({
    data: options.data,
    save: options.saveData,
    getConfig,
    now
  });
  const context = new ContextManager({
    userName: cfg.userName || 'Rikesh',
    language: cfg.language || 'mixed',
    proactive: cfg.proactive !== false,
    quietMode: cfg.quietMode === true,
    quietHoursStart: cfg.quietHoursStart || '22:00',
    quietHoursEnd: cfg.quietHoursEnd || '07:00',
    proactiveMinGapSec: cfg.proactiveMinGapSec || 120,
    proactiveBudgetPerHour: cfg.proactiveBudgetPerHour || 6,
    idleAvailableSec: cfg.idleAvailableSec || 300,
    now
  });

  const speech = new SpeechManager({
    context,
    now,
    deliver: payload => {
      try {
        broadcast('agent-speak', payload);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
  });

  const provider = new ProviderRegistry(getConfig);
  const memoryApi = memory;

  const eventEngine = new EventEngine({
    context,
    speech,
    reminders,
    memory: memoryApi,
    provider,
    getConfig,
    getIdleSeconds: options.getIdleSeconds || (() => 0),
    getTodo: () => {
      const data = options.data || {};
      return Array.isArray(data.todo) ? data.todo : [];
    },
    onToast: toast,
    onRecord: options.onProactiveRecord,
    now
  });

  const battery = new BatteryMonitor({
    getConfig,
    userData,
    onSnapshot: snapshot => {
      eventEngine.onBatterySnapshot(snapshot);
      try { broadcast('agent-battery', snapshot); } catch { }
    },
    onNotification: notification => {
      eventEngine.deliverBattery(notification).catch(() => { });
    }
  });

  const registry = buildToolRegistry({
    workspace,
    permissions,
    commands,
    reminders,
    memory: memoryApi,
    actions: options.actions,
    openPath: options.openPath,
    openExternal: options.openExternal,
    windowAction: options.windowAction,
    recycleBin: options.recycleBin,
    getActiveApp: options.getActiveApp,
    getBattery: () => battery.getSnapshot(),
    userData
  });

  const planner = new Planner({ provider, now });
  const executor = new ToolExecutor({ registry, now, permissions });
  const orchestrator = new AgentOrchestrator({
    provider,
    registry,
    executor,
    planner,
    verify,
    context,
    memory: memoryApi,
    commands,
    permissions,
    getConfig,
    emit: (channel, payload) => {
      try { broadcast(channel, payload); } catch { }
    },
    onResult: result => {
      if (!result || result.needsClarification || result.cancelled) return;
      if (getConfig().agentSpeakResults === false) return;
      eventEngine.deliverAgentResult(result).catch(() => { });
    },
    now
  });

  function applyConfig() {
    const next = getConfig() || {};
    permissions.setConfig({
      workspaceRoots: agentRoots(next),
      requireApprovalForWrites: next.agentRequireApprovalForWrites === true,
      autoApproveCommands: next.agentAutoApproveCommands === true,
      allowReadOutside: next.agentAllowReadOutside === true,
      confirmationTtlMs: Math.max(30000, Number(next.agentConfirmationTtlMs) || 120000)
    });
    context.setConfig({
      userName: next.userName || 'Rikesh',
      language: next.language || 'mixed',
      proactive: next.proactive !== false,
      quietMode: next.quietMode === true,
      quietHoursStart: next.quietHoursStart || '22:00',
      quietHoursEnd: next.quietHoursEnd || '07:00',
      proactiveMinGapSec: next.proactiveMinGapSec || 120,
      proactiveBudgetPerHour: next.proactiveBudgetPerHour || 6,
      idleAvailableSec: next.idleAvailableSec || 300
    });
    battery.applyConfig();
  }

  function start() {
    eventEngine.start();
    battery.applyConfig();
  }

  function stop() {
    eventEngine.stop();
    battery.stop();
    orchestrator.cancelAll();
  }

  function isTrustedSender(event) {
    try {
      const url = event && event.senderFrame && event.senderFrame.url;
      if (!url || !url.startsWith('file:')) return false;
      const file = path.resolve(fileURLToPath(url));
      const root = path.resolve(options.rootDir || process.cwd());
      const rel = path.relative(root, file);
      return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
    } catch {
      return false;
    }
  }

  function registerIpc(ipcMain) {
    const handles = new Map();
    const handle = (channel, fn) => {
      if (handles.has(channel)) return;
      handles.set(channel, true);
      ipcMain.handle(channel, async (event, ...args) => {
        if (!isTrustedSender(event)) return { ok: false, error: 'untrusted sender' };
        try {
          return await fn(...args);
        } catch (e) {
          return { ok: false, error: e.message };
        }
      });
    };

    const on = (channel, fn) => {
      ipcMain.on(channel, (event, ...args) => {
        if (!isTrustedSender(event)) return;
        try { fn(...args); } catch { }
      });
    };

    handle('agent-run', async payload => {
      const request = typeof payload === 'string' ? payload : payload && payload.request;
      const requestedWorkspace = payload && payload.workspace;
      if (requestedWorkspace) {
        const check = permissions.validatePath(requestedWorkspace);
        if (!check.ok) return { ok: false, error: check.reason };
        if (getConfig().activeWorkspace !== check.path) setConfig({ activeWorkspace: check.path });
      }
      return orchestrator.run(request, { taskId: payload && payload.taskId });
    });

    handle('agent-cancel', taskId => orchestrator.cancel(taskId));
    handle('agent-status', taskId => ({ ok: true, task: orchestrator.status(taskId), tasks: orchestrator.status() }));
    handle('agent-confirm', payload => orchestrator.resolveConfirmation(payload && payload.id, payload && payload.approved === true));
    handle('agent-pending', () => ({
      ok: true,
      confirmations: [...orchestrator.pendingApprovals.values()].map(p => ({
        id: p.record.id,
        action: p.record.action,
        target: p.record.target,
        summary: p.record.summary,
        consequence: p.record.consequence,
        taskId: p.taskId,
        stepId: p.stepId,
        expiresAt: p.record.expiresAt
      }))
    }));
    handle('agent-tools', () => ({ ok: true, tools: registry.list() }));
    handle('agent-state', () => ({
      ok: true,
      provider: provider.status(),
      speech: speech.state,
      permissions: {
        roots: permissions.roots,
        requireApprovalForWrites: permissions.config.requireApprovalForWrites,
        autoApproveCommands: permissions.config.autoApproveCommands
      },
      tasks: orchestrator.status(),
      battery: battery.snapshot,
      memory: { facts: memoryApi.getFacts(100).length, history: memoryApi.getHistory(100).length },
      activeWorkspace: getConfig().activeWorkspace || null
    }));
    handle('agent-apply-config', () => { applyConfig(); return { ok: true }; });

    handle('agent-speech-event', payload => {
      const evt = payload || {};
      if (evt.idleSeconds != null) context.setState({ idleSeconds: Number(evt.idleSeconds) || 0 });
      if (evt.type === 'user-speaking') speech.setUserSpeaking(evt.value === true);
      else if (evt.type === 'listening') speech.setListening(evt.value === true);
      else if (evt.type === 'speaking') {
        context.setState({ speaking: evt.value === true });
        if (evt.value === false) speech.flush();
      } else if (evt.type === 'finished') {
        if (evt.id) speech.finished(evt.id);
        else {
          context.setState({ speaking: false });
          setTimeout(() => speech.flush(), 300);
        }
      } else if (evt.type === 'cancel') {
        speech.cancelCurrent();
      }
      return { ok: true };
    });
    handle('agent-speech-cancel', () => ({ ok: true, cancelled: speech.cancelCurrent() }));
    handle('agent-presentation', value => {
      context.setState({ presenting: value === true });
      return { ok: true, presenting: value === true };
    });

    handle('workspace-roots', () => ({ ok: true, roots: permissions.roots, active: getConfig().activeWorkspace || null }));
    handle('workspace-pick', async () => {
      if (!options.pickFolder) return { ok: false, error: 'folder picker is unavailable' };
      const picked = await options.pickFolder();
      if (!picked) return { ok: false, cancelled: true };
      const check = permissions.validatePath(picked);
      if (!check.ok) return { ok: false, error: check.reason };
      return { ok: true, path: check.path };
    });
    handle('workspace-set-active', folder => {
      const check = permissions.validatePath(folder);
      if (!check.ok) return { ok: false, error: check.reason };
      setConfig({ activeWorkspace: check.path });
      broadcast('agent-workspace', { active: check.path });
      return { ok: true, path: check.path };
    });

    const direct = (channel, tool, mapArgs) => {
      handle(channel, async payload => {
        const args = mapArgs ? mapArgs(payload || {}) : (payload || {});
        return toolReply(await orchestrator.runTool(tool, args, { reason: 'workspace action' }));
      });
    };

    direct('workspace-list', 'filesystem.list', p => ({ path: p.path, includeHidden: p.includeHidden, limit: p.limit }));
    direct('workspace-tree', 'filesystem.tree', p => ({ path: p.path, depth: p.depth }));
    direct('workspace-read', 'filesystem.read', p => ({ path: p.path, maxBytes: p.maxBytes }));
    direct('workspace-stat', 'filesystem.stat', p => ({ path: p.path }));
    direct('workspace-search', 'filesystem.search', p => ({ root: p.root, query: p.query, name: p.name, content: p.content, extensions: p.extensions, maxResults: p.maxResults }));
    direct('workspace-create', 'filesystem.createFile', p => ({ path: p.path, content: p.content || '', overwrite: p.overwrite === true }));
    direct('workspace-save', 'filesystem.createFile', p => ({ path: p.path, content: p.content || '', overwrite: true }));
    direct('workspace-mkdir', 'filesystem.createDirectory', p => ({ path: p.path }));
    direct('workspace-rename', 'filesystem.rename', p => ({ path: p.path, name: p.name }));
    direct('workspace-move', 'filesystem.move', p => ({ path: p.path, destination: p.destination }));
    direct('workspace-copy', 'filesystem.copy', p => ({ path: p.path, destination: p.destination, overwrite: p.overwrite === true }));
    direct('workspace-delete', 'filesystem.delete', p => ({ path: p.path, permanent: p.permanent === true }));
    direct('workspace-detect', 'project.detectFramework', p => ({ path: p.path }));
    direct('workspace-changes', 'filesystem.changes', p => ({ limit: p.limit || 100 }));
    direct('workspace-rollback', 'filesystem.rollback', p => ({ changeId: p.changeId }));

    handle('workspace-run', async payload => {
      const p = payload || {};
      const tool = p.background ? 'terminal.startProcess' : 'terminal.runApprovedCommand';
      const args = { command: p.command, cwd: p.cwd };
      if (!p.background) args.timeoutMs = p.timeoutMs;
      return toolReply(await orchestrator.runTool(tool, args, { reason: 'workspace terminal' }));
    });
    handle('workspace-process-status', id => toolReply({ status: 'ok', result: commands.status(id), summary: 'process status' }));
    handle('workspace-process-cancel', id => toolReply({ status: 'ok', result: commands.cancel(id), summary: 'process cancelled' }));
    handle('workspace-processes', () => ({ ok: true, processes: commands.active }));
    handle('workspace-open', async payload => {
      const check = permissions.validatePath((payload || {}).path);
      if (!check.ok) return { ok: false, error: check.reason };
      if (!options.openPath) return { ok: false, error: 'openPath is unavailable' };
      const error = await options.openPath(check.path);
      return error ? { ok: false, error } : { ok: true, path: check.path };
    });
    handle('workspace-reveal', payload => {
      const check = permissions.validatePath((payload || {}).path);
      if (!check.ok) return { ok: false, error: check.reason };
      if (!options.showItemInFolder) return { ok: false, error: 'reveal is unavailable' };
      options.showItemInFolder(check.path);
      return { ok: true };
    });

    const reminderReply = fn => async payload => {
      try {
        return { ok: true, result: fn(payload || {}) };
      } catch (e) {
        return { ok: false, error: e.message, needsClarification: e.code === 'ECLARIFICATION' };
      }
    };
    handle('reminder-create', reminderReply(p => reminders.create(p)));
    handle('reminder-list', reminderReply(p => reminders.list(p)));
    handle('reminder-remove', reminderReply(p => reminders.remove(p)));
    handle('reminder-snooze', reminderReply(p => reminders.snooze(p.id, p.minutes)));
    handle('reminder-complete', reminderReply(p => reminders.complete(p.id)));
    handle('reminder-history', () => ({ ok: true, history: Array.isArray((options.data || {}).reminderHistory) ? options.data.reminderHistory.slice(-100).reverse() : [] }));

    handle('memory-list', () => ({ ok: true, facts: memoryApi.getFacts(200), preferences: memoryApi.data.preferences, tasks: memoryApi.getTaskOutcomes(50) }));
    handle('memory-add', payload => ({ ok: true, fact: memoryApi.addFact((payload || {}).text, 'explicit') }));
    handle('memory-remove', payload => ({ ok: true, removed: memoryApi.removeFact((payload || {}).id) }));
    handle('memory-clear', () => { memoryApi.clearFacts(); return { ok: true }; });
    handle('memory-export', () => ({ ok: true, data: memoryApi.exportAll() }));
    handle('memory-clear-all', () => { memoryApi.clearAll(); return { ok: true }; });

    handle('battery-snapshot', async force => {
      const snapshot = await battery.getSnapshot(force === true);
      return { ok: true, battery: snapshot };
    });

    on('agent-speak-finished', payload => {
      if (payload && payload.id) speech.finished(payload.id);
    });
    on('agent-user-speaking', value => speech.setUserSpeaking(value === true));
    on('agent-listening', value => speech.setListening(value === true));

    return { handle, on };
  }

  function dispose() {
    stop();
    for (const proc of commands.active) {
      try { commands.cancel(proc.id); } catch { }
    }
  }

  return {
    permissions,
    workspace,
    commands,
    reminders,
    context,
    speech,
    provider,
    memory: memoryApi,
    battery,
    eventEngine,
    registry,
    planner,
    executor,
    orchestrator,
    applyConfig,
    start,
    stop,
    dispose,
    registerIpc
  };
}

module.exports = { createAgentRuntime, agentRoots, toolReply };
