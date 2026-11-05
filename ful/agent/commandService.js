/*
  Trusted command execution service.

  Commands are validated by the safety policy, run without a user-controlled
  shell string being interpolated into PowerShell, tracked by task id, and
  killed (including child processes) on timeout or cancellation.
*/
'use strict';

const { spawn, execFile } = require('child_process');
const path = require('path');
const safety = require('./safetyPolicy');

const MAX_OUTPUT = 512 * 1024;
const DEFAULT_TIMEOUT = 120 * 1000;

function cleanEnv(extra = {}) {
  const keep = [
    'SystemRoot', 'SystemDrive', 'windir', 'PATH', 'Path', 'PATHEXT', 'TEMP', 'TMP',
    'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HOMEDRIVE', 'HOMEPATH', 'ComSpec',
    'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'ProgramFiles', 'ProgramFiles(x86)',
    'ProgramW6432', 'CommonProgramFiles', 'USERNAME', 'USERDOMAIN'
  ];
  const out = {};
  for (const key of keep) if (process.env[key] != null) out[key] = process.env[key];
  out.FUL_AGENT = '1';
  out.CI = process.env.CI || '1';
  out.NO_COLOR = '1';
  return { ...out, ...extra };
}

class CommandService {
  constructor(options = {}) {
    this.permissions = options.permissions;
    this.now = options.now || (() => Date.now());
    this.processes = new Map();
    this.history = [];
    this.counter = 0;
  }

  get active() {
    return [...this.processes.entries()].map(([id, p]) => ({
      id,
      command: p.command,
      pid: p.child.pid,
      cwd: p.cwd,
      startedAt: p.startedAt,
      taskId: p.taskId
    }));
  }

  checkRuntime(runtime) {
    const name = String(runtime || '').trim();
    if (!name) return Promise.resolve({ name, available: false, reason: 'no runtime name given' });
    const bin = process.platform === 'win32' ? 'where.exe' : 'which';
    return new Promise(resolve => {
      execFile(bin, [name], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
        const lines = String(stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        resolve({ name, available: !err && lines.length > 0, path: lines[0] || null });
      });
    });
  }

  _register(id, command, cwd, child, taskId) {
    const record = { id, command, cwd, child, taskId, startedAt: this.now(), stdout: '', stderr: '', truncated: false };
    this.processes.set(id, record);
    return record;
  }

  _append(record, key, chunk) {
    const text = chunk.toString();
    if (record[key].length + text.length > MAX_OUTPUT) {
      record[key] += text.slice(0, Math.max(0, MAX_OUTPUT - record[key].length));
      record.truncated = true;
    } else {
      record[key] += text;
    }
  }

  _killTree(child) {
    if (!child || !child.pid) return;
    try {
      execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }, () => { });
    } catch {
      try { child.kill('SIGKILL'); } catch { }
    }
  }

  cancel(id) {
    const record = this.processes.get(String(id));
    if (!record) return { ok: false, reason: 'process not found' };
    record.cancelled = true;
    this._killTree(record.child);
    return { ok: true, id: String(id) };
  }

  cancelTask(taskId) {
    const hits = [...this.processes.values()].filter(p => p.taskId === taskId);
    for (const hit of hits) this.cancel(hit.id);
    return { ok: true, cancelled: hits.length };
  }

  cancelAll() {
    for (const id of [...this.processes.keys()]) this.cancel(id);
  }

  _result(record, extra = {}) {
    return {
      id: record.id,
      taskId: record.taskId,
      command: record.command,
      cwd: record.cwd,
      code: extra.code == null ? null : extra.code,
      signal: extra.signal || null,
      timedOut: !!extra.timedOut,
      cancelled: !!extra.cancelled,
      durationMs: this.now() - record.startedAt,
      stdout: safety.redactSecrets(record.stdout),
      stderr: safety.redactSecrets(record.stderr),
      truncated: record.truncated,
      ok: extra.ok === true,
      error: extra.error || null
    };
  }

  async run(command, opts = {}) {
    const text = String(command || '').trim();
    const classification = this.permissions.classifyCommand(text);
    if (!classification.allowed) {
      return {
        id: null,
        command: text,
        code: null,
        ok: false,
        error: `Blocked by safety policy: ${classification.reasons.join(', ') || 'not allowed'}`,
        stdout: '',
        stderr: '',
        risk: classification.risk
      };
    }
    if (classification.needsApproval && opts.approved !== true) {
      return {
        id: null,
        command: text,
        code: null,
        ok: false,
        needsApproval: true,
        error: 'This command needs explicit approval.',
        risk: classification.risk,
        reasons: classification.reasons,
        stdout: '',
        stderr: ''
      };
    }

    const executable = safety.runtimeName(safety.firstToken(text));
    const runtime = await this.checkRuntime(executable);
    if (!runtime.available) {
      return {
        id: null,
        command: text,
        code: null,
        ok: false,
        missingRuntime: true,
        error: `Runtime "${executable}" was not found on this system.`,
        stdout: '',
        stderr: '',
        risk: classification.risk
      };
    }

    const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
    const timeout = opts.timeout === 0 ? 0 : Math.max(1000, Math.min(15 * 60 * 1000, Number(opts.timeout) || DEFAULT_TIMEOUT));
    const taskId = opts.taskId || null;
    const id = 'proc_' + (++this.counter);
    const comspec = process.env.ComSpec || 'cmd.exe';

    return new Promise(resolve => {
      let child;
      try {
        child = spawn(comspec, ['/d', '/s', '/c', text], {
          cwd,
          env: cleanEnv(opts.env || {}),
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (e) {
        resolve({ id: null, command: text, code: null, ok: false, error: e.message, stdout: '', stderr: '', risk: classification.risk });
        return;
      }

      const record = this._register(id, text, cwd, child, taskId);
      record.risk = classification.risk;
      let timer = null;
      let timedOut = false;

      if (timeout) {
        timer = setTimeout(() => {
          timedOut = true;
          this._killTree(child);
        }, timeout);
      }

      child.stdout.on('data', chunk => {
        this._append(record, 'stdout', chunk);
        try { opts.onOutput && opts.onOutput('stdout', safety.redactSecrets(chunk.toString())); } catch { }
      });
      child.stderr.on('data', chunk => {
        this._append(record, 'stderr', chunk);
        try { opts.onOutput && opts.onOutput('stderr', safety.redactSecrets(chunk.toString())); } catch { }
      });

      const finish = (code, signal, error) => {
        if (timer) clearTimeout(timer);
        this.processes.delete(id);
        const result = this._result(record, {
          code,
          signal,
          timedOut,
          cancelled: !!record.cancelled,
          ok: code === 0 && !timedOut && !record.cancelled && !error,
          error: error ? error.message : timedOut ? 'command timed out' : record.cancelled ? 'cancelled' : null
        });
        result.risk = classification.risk;
        this.history.push({ ...result, at: this.now() });
        if (this.history.length > 100) this.history = this.history.slice(-100);
        try { opts.onExit && opts.onExit(result); } catch { }
        resolve(result);
      };

      child.on('error', err => finish(null, null, err));
      child.on('close', (code, signal) => finish(code, signal, null));
    });
  }

  startBackground(command, opts = {}) {
    const text = String(command || '').trim();
    const classification = this.permissions.classifyCommand(text);
    if (!classification.allowed) {
      return { ok: false, error: `Blocked by safety policy: ${classification.reasons.join(', ') || 'not allowed'}`, risk: classification.risk };
    }
    if (classification.needsApproval && opts.approved !== true) {
      return { ok: false, needsApproval: true, risk: classification.risk, reasons: classification.reasons, error: 'This command needs explicit approval.' };
    }
    const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
    const taskId = opts.taskId || null;
    const id = 'proc_' + (++this.counter);
    const comspec = process.env.ComSpec || 'cmd.exe';
    let child;
    try {
      child = spawn(comspec, ['/d', '/s', '/c', text], {
        cwd,
        env: cleanEnv(opts.env || {}),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const record = this._register(id, text, cwd, child, taskId);
    record.risk = classification.risk;
    record.background = true;
    child.stdout.on('data', chunk => {
      this._append(record, 'stdout', chunk);
      try { opts.onOutput && opts.onOutput('stdout', safety.redactSecrets(chunk.toString())); } catch { }
    });
    child.stderr.on('data', chunk => {
      this._append(record, 'stderr', chunk);
      try { opts.onOutput && opts.onOutput('stderr', safety.redactSecrets(chunk.toString())); } catch { }
    });
    child.on('close', code => {
      record.exited = true;
      record.exitCode = code;
      this.processes.delete(id);
      try { opts.onExit && opts.onExit(this._result(record, { code, ok: code === 0 })); } catch { }
    });
    return { ok: true, id, pid: child.pid, command: text, cwd, taskId, risk: classification.risk };
  }

  status(id) {
    const record = this.processes.get(String(id));
    if (!record) {
      const past = this.history.filter(h => h.id === String(id)).pop();
      return past ? { running: false, ...past } : { running: false, error: 'process not found' };
    }
    return {
      running: true,
      id: record.id,
      command: record.command,
      pid: record.child.pid,
      cwd: record.cwd,
      startedAt: record.startedAt,
      pidRunning: !record.exited,
      stdout: safety.redactSecrets(record.stdout.slice(-20000)),
      stderr: safety.redactSecrets(record.stderr.slice(-20000))
    };
  }

  recent(limit = 20) {
    return this.history.slice(-limit).reverse();
  }
}

module.exports = { CommandService, cleanEnv, DEFAULT_TIMEOUT, MAX_OUTPUT };
