/*
  Tool registry.

  The model may only propose tool calls from this registry. Every argument is
  validated against a schema before a trusted handler runs.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const safety = require('./safetyPolicy');

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateValue(schema, value, label, errors) {
  if (!schema || typeof schema !== 'object') return;
  if (value === undefined) {
    if (schema.required) errors.push(`${label} is required`);
    return;
  }
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  if (types.length) {
    const actual = typeOf(value);
    const matches = types.some(t => t === actual || (t === 'number' && actual === 'integer'));
    if (!matches) {
      errors.push(`${label} must be ${types.join(' or ')} (got ${actual})`);
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${label} must be one of: ${schema.enum.join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${label} is too short`);
    if (schema.maxLength != null && value.length > schema.maxLength) errors.push(`${label} is too long`);
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) errors.push(`${label} has an invalid format`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${label} must be >= ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${label} must be <= ${schema.maximum}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => validateValue(schema.items, item, `${label}[${i}]`, errors));
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${label} has too many items`);
  }
  if (typeOf(value) === 'object' && schema.properties) {
    const allowed = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(value)) {
      if (!allowed.has(key) && schema.additionalProperties !== true) {
        errors.push(`${label}.${key} is not an allowed argument`);
      }
    }
    for (const [key, child] of Object.entries(schema.properties)) {
      validateValue(child, value[key], `${label}.${key}`, errors);
    }
  }
}

function validateArgs(schema, args) {
  const errors = [];
  const value = args == null ? {} : args;
  if (schema && schema.type === 'object') validateValue(schema, value, 'args', errors);
  return { ok: errors.length === 0, errors };
}

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[\s"&|<>^]/.test(text)) return text;
  return '"' + text.replace(/"/g, '\\"') + '"';
}

function textResult(value) {
  if (value == null) return 'Done.';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

class ToolRegistry {
  constructor(deps = {}) {
    this.deps = deps;
    this.tools = new Map();
  }

  register(definition) {
    if (!definition || !definition.name || typeof definition.handler !== 'function') {
      throw new Error('invalid tool definition');
    }
    const name = String(definition.name);
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(name)) throw new Error(`invalid tool name ${name}`);
    this.tools.set(name, {
      risk: 'low',
      category: 'general',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      ...definition,
      name
    });
    return this;
  }

  get(name) {
    return this.tools.get(String(name)) || null;
  }

  list() {
    return [...this.tools.values()].map(t => ({
      name: t.name,
      description: t.description,
      risk: t.risk,
      category: t.category,
      inputSchema: t.inputSchema
    }));
  }

  schemas() {
    return this.list().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }));
  }

  validate(name, args) {
    const tool = this.get(name);
    if (!tool) return { ok: false, errors: [`unknown tool "${name}"`] };
    const result = validateArgs(tool.inputSchema, args);
    return { ok: result.ok, errors: result.errors, tool };
  }

  async invoke(name, args, ctx = {}) {
    const tool = this.get(name);
    if (!tool) throw new Error(`unknown tool "${name}"`);
    const validation = validateArgs(tool.inputSchema, args);
    if (!validation.ok) {
      const err = new Error(`Invalid arguments for ${name}: ${validation.errors.join('; ')}`);
      err.code = 'EINVALIDARGS';
      throw err;
    }
    return tool.handler(args || {}, { registry: this, ...this.deps, ...ctx, tool });
  }

  approvalFor(name, args, ctx = {}) {
    const tool = this.get(name);
    if (!tool) return null;
    if (typeof tool.approve === 'function') {
      return tool.approve(args || {}, { registry: this, ...this.deps, ...ctx, tool });
    }
    return null;
  }
}

function buildToolRegistry(deps) {
  const r = new ToolRegistry(deps);
  const ws = deps.workspace;
  const perms = deps.permissions;
  const commands = deps.commands;

  const fsApproval = (action, args, ctx) => {
    const target = args.path || args.destination;
    if (!target) return null;
    const decision = perms.authorizeFs(action, target);
    if (!decision.allowed) {
      return {
        action,
        target: decision.path || target,
        summary: `FUL wants to ${action} ${decision.path || target}.`,
        consequence: decision.reason,
        blocked: true
      };
    }
    const overwriting = (action === 'write' || action === 'create') && args.overwrite === true && fs.existsSync(decision.path);
    if (!decision.needsApproval && action !== 'delete' && !overwriting) return null;
    const permanent = args.permanent === true;
    const base = {
      action,
      target: decision.path,
      summary: `FUL wants to ${action} ${decision.path}.`,
      consequence: action === 'delete'
        ? (permanent
          ? 'This permanently deletes the item. It cannot be undone.'
          : 'The item will be moved to the Recycle Bin (or permanent trash if unavailable).')
        : 'The existing file will be backed up and then overwritten.'
    };
    if (action === 'write' || action === 'create') {
      try {
        if (args.content != null && fs.existsSync(decision.path)) {
          const old = fs.readFileSync(decision.path, 'utf8').slice(0, 2000);
          const next = String(args.content).slice(0, 2000);
          base.preview = { before: old, after: next };
        } else if (args.search != null) {
          base.preview = { before: String(args.search).slice(0, 1200), after: String(args.replace || '').slice(0, 1200) };
        }
      } catch { }
    }
    return base;
  };

  const registerFs = (name, description, schema, action, handler, risk = 'low') => {
    r.register({
      name,
      description,
      category: 'filesystem',
      risk,
      inputSchema: schema,
      approve: (args, ctx) => fsApproval(action, args, ctx),
      handler
    });
  };

  registerFs('filesystem.list', 'List files and folders inside an approved workspace.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      includeHidden: { type: 'boolean' },
      limit: { type: 'integer', minimum: 1, maximum: 2000 }
    },
    additionalProperties: false
  }, 'list', args => ws.list(args.path, args));

  registerFs('filesystem.tree', 'Get a shallow recursive tree of a workspace folder.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      depth: { type: 'integer', minimum: 1, maximum: 8 }
    },
    additionalProperties: false
  }, 'list', args => ws.tree(args.path, args));

  registerFs('filesystem.read', 'Read a UTF-8 text file. Binary files are returned as base64.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      maxBytes: { type: 'integer', minimum: 1, maximum: 4194304 }
    },
    additionalProperties: false
  }, 'read', args => ws.read(args.path, args));

  registerFs('filesystem.createFile', 'Create a new text file. Never overwrites unless overwrite is true.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      content: { type: 'string' },
      overwrite: { type: 'boolean' }
    },
    additionalProperties: false
  }, 'write', (args, ctx) => ws.createFile(args.path, args.content || '', { taskId: ctx.taskId, overwrite: args.overwrite === true }), 'medium');

  registerFs('filesystem.writeFile', 'Replace the full contents of an existing text file. A backup is created first.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      content: { type: 'string' }
    },
    additionalProperties: false
  }, 'write', (args, ctx) => ws.write(args.path, args.content || '', { taskId: ctx.taskId }), 'medium');

  registerFs('filesystem.applyPatch', 'Replace an exact snippet in an existing file. Fails if the snippet is missing or ambiguous.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      search: { type: 'string', required: true, minLength: 1 },
      replace: { type: 'string' },
      all: { type: 'boolean' }
    },
    additionalProperties: false
  }, 'write', (args, ctx) => {
    const file = ws.read(args.path, { maxBytes: 4 * 1024 * 1024 });
    if (file.binary) throw new Error('cannot patch a binary file');
    const content = file.content;
    const first = content.indexOf(args.search);
    if (first < 0) throw new Error('the search snippet was not found; re-read the file before editing');
    const second = content.indexOf(args.search, first + args.search.length);
    if (second >= 0 && args.all !== true) throw new Error('the search snippet appears more than once; provide more context or set all=true');
    const next = args.all === true ? content.split(args.search).join(args.replace || '') : content.slice(0, first) + (args.replace || '') + content.slice(first + args.search.length);
    const saved = ws.write(args.path, next, { taskId: ctx.taskId });
    return { ...saved, preview: { before: args.search.slice(0, 1200), after: (args.replace || '').slice(0, 1200) } };
  }, 'medium');

  registerFs('filesystem.createDirectory', 'Create a folder (including parents) inside an approved workspace.', {
    type: 'object',
    properties: { path: { type: 'string', required: true, minLength: 1 } },
    additionalProperties: false
  }, 'create', (args, ctx) => ws.createDirectory(args.path, { taskId: ctx.taskId }), 'medium');

  registerFs('filesystem.rename', 'Rename a file or folder without moving it to another directory.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      name: { type: 'string', required: true, minLength: 1, maxLength: 255 }
    },
    additionalProperties: false
  }, 'rename', (args, ctx) => ws.rename(args.path, args.name, { taskId: ctx.taskId }), 'medium');

  registerFs('filesystem.move', 'Move a file or folder to another path inside an approved workspace.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      destination: { type: 'string', required: true, minLength: 1 }
    },
    additionalProperties: false
  }, 'move', (args, ctx) => ws.move(args.path, args.destination, { taskId: ctx.taskId }), 'medium');

  registerFs('filesystem.copy', 'Copy a file or folder inside an approved workspace.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      destination: { type: 'string', required: true, minLength: 1 },
      overwrite: { type: 'boolean' }
    },
    additionalProperties: false
  }, 'copy', (args, ctx) => ws.copy(args.path, args.destination, { overwrite: args.overwrite === true, taskId: ctx.taskId }));

  registerFs('filesystem.search', 'Search file names or file contents inside a workspace.', {
    type: 'object',
    properties: {
      root: { type: 'string', required: true, minLength: 1 },
      query: { type: 'string' },
      name: { type: 'string' },
      content: { type: 'boolean' },
      extensions: { type: 'array', items: { type: 'string' }, maxItems: 20 },
      maxResults: { type: 'integer', minimum: 1, maximum: 500 }
    },
    additionalProperties: false
  }, 'search', args => ws.search(args.root, args));

  registerFs('filesystem.delete', 'Move a file or folder to the Recycle Bin, or permanently delete it when explicitly approved.', {
    type: 'object',
    properties: {
      path: { type: 'string', required: true, minLength: 1 },
      permanent: { type: 'boolean' }
    },
    additionalProperties: false
  }, 'delete', async (args, ctx) => ws.remove(args.path, { permanent: args.permanent === true, taskId: ctx.taskId }), 'high');

  registerFs('filesystem.stat', 'Get metadata for a file or folder.', {
    type: 'object',
    properties: { path: { type: 'string', required: true, minLength: 1 } },
    additionalProperties: false
  }, 'read', args => ws.stat(args.path));

  r.register({
    name: 'filesystem.changes',
    description: 'List files recently created, modified, moved or deleted by FUL, with rollback ids.',
    category: 'filesystem',
    risk: 'low',
    inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 200 } }, additionalProperties: false },
    handler: args => ws.listChanges(args.limit || 50)
  });

  r.register({
    name: 'filesystem.rollback',
    description: 'Restore a file from the backup created for a previous FUL change.',
    category: 'filesystem',
    risk: 'high',
    inputSchema: { type: 'object', properties: { changeId: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    approve: args => ({ action: 'rollback', target: args.changeId, summary: `Restore change ${args.changeId}`, consequence: 'The current file contents will be replaced by the backup.' }),
    handler: args => ws.rollback(args.changeId)
  });

  /* ------------------------------------------------------------- terminal */
  r.register({
    name: 'terminal.checkRuntime',
    description: 'Check whether a runtime (python, node, npm, git, ...) is installed.',
    category: 'terminal',
    risk: 'low',
    inputSchema: { type: 'object', properties: { runtime: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: args => commands.checkRuntime(args.runtime)
  });

  r.register({
    name: 'terminal.runApprovedCommand',
    description: 'Run a validated command from the approved runtime list in a workspace and return stdout, stderr and exit code.',
    category: 'terminal',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', required: true, minLength: 1, maxLength: 4000 },
        cwd: { type: 'string', required: true, minLength: 1 },
        timeoutMs: { type: 'integer', minimum: 1000, maximum: 900000 }
      },
      additionalProperties: false
    },
    approve: (args, ctx) => {
      const decision = perms.classifyCommand(args.command);
      if (!decision.allowed) {
        return { action: 'command', target: args.command, summary: `Blocked command: ${args.command}`, consequence: decision.reasons.join(', '), blocked: true };
      }
      if (!decision.needsApproval) return null;
      return {
        action: 'command',
        target: args.command,
        extra: { cwd: args.cwd },
        summary: `Run this ${decision.risk}-risk command?\n${args.command}`,
        consequence: decision.reasons.join(', ') || 'It executes code on this PC.',
        preview: { command: args.command, cwd: args.cwd }
      };
    },
    handler: (args, ctx) => {
      const decision = perms.classifyCommand(args.command);
      if (!decision.allowed) throw new Error(`Blocked by safety policy: ${decision.reasons.join(', ')}`);
      const pathCheck = perms.validatePath(args.cwd);
      if (!pathCheck.ok) throw new Error(pathCheck.reason);
      return commands.run(args.command, {
        cwd: pathCheck.path,
        timeout: args.timeoutMs,
        taskId: ctx.taskId,
        approved: args.approved === true || !decision.needsApproval,
        onOutput: (stream, text) => { try { ctx.emit && ctx.emit('agent-output', { taskId: ctx.taskId, stream, text }); } catch { } }
      });
    }
  });

  r.register({
    name: 'terminal.startProcess',
    description: 'Start a long-running command (such as a dev server) in the background and return its process id.',
    category: 'terminal',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', required: true, minLength: 1, maxLength: 4000 },
        cwd: { type: 'string', required: true, minLength: 1 }
      },
      additionalProperties: false
    },
    approve: (args, ctx) => {
      const decision = perms.classifyCommand(args.command);
      if (!decision.allowed) {
        return { action: 'command', target: args.command, summary: `Blocked command: ${args.command}`, consequence: decision.reasons.join(', '), blocked: true };
      }
      if (!decision.needsApproval) return null;
      return {
        action: 'command',
        target: args.command,
        extra: { cwd: args.cwd },
        summary: `Start this ${decision.risk}-risk process?\n${args.command}`,
        consequence: decision.reasons.join(', ') || 'It executes code on this PC and may keep running.',
        preview: { command: args.command, cwd: args.cwd }
      };
    },
    handler: (args, ctx) => {
      const decision = perms.classifyCommand(args.command);
      if (!decision.allowed) throw new Error(`Blocked by safety policy: ${decision.reasons.join(', ')}`);
      const pathCheck = perms.validatePath(args.cwd);
      if (!pathCheck.ok) throw new Error(pathCheck.reason);
      let processId = null;
      const started = commands.startBackground(args.command, {
        cwd: pathCheck.path,
        taskId: ctx.taskId,
        approved: args.approved === true || !decision.needsApproval,
        onOutput: (stream, text) => { try { ctx.emit && ctx.emit('agent-output', { taskId: ctx.taskId, processId, stream, text }); } catch { } }
      });
      processId = started.id;
      return started;
    }
  });

  r.register({
    name: 'terminal.getProcessStatus',
    description: 'Get live status and recent output for a command started by FUL.',
    category: 'terminal',
    risk: 'low',
    inputSchema: { type: 'object', properties: { id: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: args => commands.status(args.id)
  });

  r.register({
    name: 'terminal.cancelProcess',
    description: 'Cancel a running command and its child processes.',
    category: 'terminal',
    risk: 'medium',
    inputSchema: { type: 'object', properties: { id: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: args => commands.cancel(args.id)
  });

  r.register({
    name: 'terminal.listProcesses',
    description: 'List commands currently running under FUL.',
    category: 'terminal',
    risk: 'low',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => commands.active
  });

  /* -------------------------------------------------------------- project */
  r.register({
    name: 'project.detectFramework',
    description: 'Inspect a project folder and detect languages, frameworks, manifests and useful commands.',
    category: 'project',
    risk: 'low',
    inputSchema: { type: 'object', properties: { path: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: args => ws.detectProject(args.path)
  });

  r.register({
    name: 'project.installDependencies',
    description: 'Install project dependencies using the detected package manager. Requires approval.',
    category: 'project',
    risk: 'high',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, minLength: 1 },
        manager: { type: 'string', enum: ['npm', 'pnpm', 'yarn', 'pip'] }
      },
      additionalProperties: false
    },
    approve: args => {
      const project = ws.detectProject(args.path);
      const command = dependencyCommand(project, args.manager);
      return {
        action: 'install',
        target: args.path,
        extra: { command },
        summary: `Install dependencies in ${project.path}?`,
        consequence: 'This downloads packages from the internet and may run package install scripts.',
        preview: { command }
      };
    },
    handler: async args => {
      const project = ws.detectProject(args.path);
      const command = dependencyCommand(project, args.manager);
      if (!command) throw new Error('could not determine a dependency install command');
      return commands.run(command, { cwd: project.path, timeout: 10 * 60 * 1000, approved: true });
    }
  });

  r.register({
    name: 'project.run',
    description: 'Start a project in the background using its detected run command.',
    category: 'project',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, minLength: 1 },
        command: { type: 'string' }
      },
      additionalProperties: false
    },
    approve: (args, ctx) => commandApproval(args.command || defaultRunCommand(ws.detectProject(args.path)), args.path, perms),
    handler: async (args, ctx) => {
      const project = ws.detectProject(args.path);
      const command = args.command || defaultRunCommand(project);
      if (!command) throw new Error('no run command was detected; specify a command');
      const decision = perms.classifyCommand(command);
      if (!decision.allowed) throw new Error(`Blocked: ${decision.reasons.join(', ')}`);
      const started = commands.startBackground(command, {
        cwd: project.path,
        taskId: ctx.taskId,
        approved: true,
        onOutput: (stream, text) => { try { ctx.emit && ctx.emit('agent-output', { taskId: ctx.taskId, stream, text }); } catch { } }
      });
      if (!started.ok) throw new Error(started.error || 'could not start the project');
      await new Promise(resolve => setTimeout(resolve, 2500));
      const status = commands.status(started.id);
      return { ...started, status };
    }
  });

  r.register({
    name: 'project.runTests',
    description: 'Run the detected test command and return the real exit code and output.',
    category: 'project',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, minLength: 1 },
        command: { type: 'string' },
        timeoutMs: { type: 'integer', minimum: 1000, maximum: 900000 }
      },
      additionalProperties: false
    },
    approve: (args, ctx) => commandApproval(args.command || defaultTestCommand(ws.detectProject(args.path)), args.path, perms),
    handler: async (args, ctx) => {
      const project = ws.detectProject(args.path);
      const command = args.command || defaultTestCommand(project);
      if (!command) throw new Error('no test command was detected; specify one');
      const decision = perms.classifyCommand(command);
      if (!decision.allowed) throw new Error(`Blocked: ${decision.reasons.join(', ')}`);
      return commands.run(command, {
        cwd: project.path,
        timeout: args.timeoutMs || 5 * 60 * 1000,
        taskId: ctx.taskId,
        approved: true,
        onOutput: (stream, text) => { try { ctx.emit && ctx.emit('agent-output', { taskId: ctx.taskId, stream, text }); } catch { } }
      });
    }
  });

  r.register({
    name: 'project.inspectErrors',
    description: 'Run a test/build command (or inspect a supplied command output) and extract concrete error lines with file locations.',
    category: 'project',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, minLength: 1 },
        command: { type: 'string' },
        output: { type: 'string' }
      },
      additionalProperties: false
    },
    approve: (args, ctx) => {
      if (args.command) return commandApproval(args.command, args.path, perms);
      const command = defaultTestCommand(ws.detectProject(args.path));
      return commandApproval(command, args.path, perms);
    },
    handler: async (args, ctx) => {
      let output = args.output || '';
      let result = null;
      if (!output) {
        const project = ws.detectProject(args.path);
        const command = args.command || defaultTestCommand(project);
        if (!command) throw new Error('no command to inspect');
        result = await commands.run(command, { cwd: project.path, timeout: 5 * 60 * 1000, taskId: ctx.taskId, approved: true });
        output = (result.stdout || '') + '\n' + (result.stderr || '');
      }
      return { command: result ? result.command : args.command || null, exitCode: result ? result.code : null, errors: extractErrors(output) };
    }
  });

  /* ------------------------------------------------------------------ git */
  const git = async (cwd, args, ctx) => {
    const project = ws.detectProject(cwd);
    if (!project.isGit) throw new Error('this folder is not a git repository');
    return commands.run(`git -C ${quoteCmdArg(project.path)} ${args}`, {
      cwd: project.path,
      timeout: 120000,
      taskId: ctx.taskId,
      approved: true
    });
  };

  r.register({
    name: 'git.status',
    description: 'Show git working-tree status for a project.',
    category: 'git',
    risk: 'low',
    inputSchema: { type: 'object', properties: { path: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: (args, ctx) => git(args.path, 'status --short --branch', ctx)
  });

  r.register({
    name: 'git.diff',
    description: 'Show the current git diff for a project.',
    category: 'git',
    risk: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, minLength: 1 },
        staged: { type: 'boolean' },
        file: { type: 'string' }
      },
      additionalProperties: false
    },
    handler: (args, ctx) => {
      const staged = args.staged ? ' --staged' : '';
      const file = args.file ? ' -- ' + quoteCmdArg(args.file) : '';
      return git(args.path, 'diff --no-color' + staged + file, ctx);
    }
  });

  r.register({
    name: 'git.createCheckpoint',
    description: 'Save the current git status and diff to a checkpoint file without committing or discarding changes.',
    category: 'git',
    risk: 'low',
    inputSchema: { type: 'object', properties: { path: { type: 'string', required: true, minLength: 1 } }, additionalProperties: false },
    handler: async (args, ctx) => {
      const project = ws.detectProject(args.path);
      if (!project.isGit) throw new Error('this folder is not a git repository');
      const status = await git(args.path, 'status --short --branch', ctx);
      const diff = await git(args.path, 'diff --no-color', ctx);
      const dir = path.join(deps.userData || os.homedir(), 'ful-agent-checkpoints');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, new Date().toISOString().replace(/[:.]/g, '-') + '.patch');
      fs.writeFileSync(file, `# FUL checkpoint\n# project: ${project.path}\n\n## status\n${status.stdout}\n\n## diff\n${diff.stdout}\n`, 'utf8');
      return { checkpoint: file, status: status.stdout, diffBytes: diff.stdout.length };
    }
  });

  /* --------------------------------------------------------------- system */
  const actionTool = (name, description, schema, fn, risk = 'low', approve) => {
    r.register({
      name,
      description,
      category: 'system',
      risk,
      inputSchema: schema,
      ...(approve ? { approve } : {}),
      handler: (args, ctx) => fn(args, ctx)
    });
  };

  actionTool('system.launchApp', 'Launch an installed application by friendly name.', {
    type: 'object',
    properties: { name: { type: 'string', required: true, minLength: 1 } },
    additionalProperties: false
  }, async args => {
    if (!deps.actions || !deps.actions.open_app) throw new Error('application launcher is unavailable');
    return deps.actions.open_app({ names: [args.name] });
  });

  actionTool('system.openFolder', 'Open a file or folder in Windows Explorer.', {
    type: 'object',
    properties: { path: { type: 'string', required: true, minLength: 1 } },
    additionalProperties: false
  }, async args => {
    const check = perms.validatePath(args.path);
    if (!check.ok) throw new Error(check.reason);
    if (!deps.openPath) throw new Error('openPath is unavailable');
    const error = await deps.openPath(check.path);
    if (error) throw new Error(error);
    return `Opened ${check.path}.`;
  });

  actionTool('system.activeApp', 'Identify the foreground application.', {
    type: 'object', properties: {}, additionalProperties: false
  }, async () => {
    if (!deps.getActiveApp) throw new Error('active app reader is unavailable');
    return deps.getActiveApp();
  });

  actionTool('system.media', 'Control system media playback.', {
    type: 'object',
    properties: { action: { type: 'string', required: true, enum: ['play', 'pause', 'playpause', 'next', 'prev', 'stop'] } },
    additionalProperties: false
  }, async args => {
    if (!deps.actions || !deps.actions.media) throw new Error('media controls are unavailable');
    return deps.actions.media({ action: args.action });
  });

  actionTool('system.volume', 'Change the system volume or mute state.', {
    type: 'object',
    properties: {
      action: { type: 'string', required: true, enum: ['up', 'down', 'mute', 'unmute', 'set', 'get'] },
      value: { type: 'integer', minimum: 0, maximum: 100 },
      amount: { type: 'integer', minimum: 1, maximum: 50 }
    },
    additionalProperties: false
  }, async args => {
    if (!deps.actions) throw new Error('volume controls are unavailable');
    if (args.action === 'set') return deps.actions.volume_set({ value: args.value || 0 });
    if (args.action === 'get') return deps.actions.volume_get({});
    return deps.actions.volume({ action: args.action, amount: args.amount });
  });

  actionTool('system.lock', 'Lock the Windows workstation.', {
    type: 'object', properties: {}, additionalProperties: false
  }, async () => {
    if (!deps.actions || !deps.actions.lock) throw new Error('lock action is unavailable');
    return deps.actions.lock({});
  });

  actionTool('system.screenshot', 'Capture the primary screen and save it to Pictures.', {
    type: 'object', properties: {}, additionalProperties: false
  }, async () => {
    if (!deps.actions || !deps.actions.screenshot) throw new Error('screenshot action is unavailable');
    return deps.actions.screenshot({});
  });

  actionTool('system.info', 'Report CPU, memory, disk and battery status.', {
    type: 'object', properties: {}, additionalProperties: false
  }, async () => {
    const battery = deps.getBattery ? await deps.getBattery() : null;
    return systemSnapshot(battery);
  });

  actionTool('system.openSettings', 'Open a Windows Settings page.', {
    type: 'object',
    properties: { page: { type: 'string', maxLength: 80 } },
    additionalProperties: false
  }, async args => {
    if (!deps.openExternal) throw new Error('openExternal is unavailable');
    const page = String(args.page || '').replace(/[^a-z0-9_-]/gi, '');
    await deps.openExternal('ms-settings:' + page);
    return 'Opened Windows Settings.';
  });

  actionTool('system.window', 'Minimize, maximize, restore, close or switch the active window.', {
    type: 'object',
    properties: {
      action: { type: 'string', required: true, enum: ['minimize', 'maximize', 'restore', 'close', 'switch'] },
      target: { type: 'string' }
    },
    additionalProperties: false
  }, async args => {
    if (!deps.windowAction) throw new Error('window controls are unavailable');
    return deps.windowAction(args);
  }, 'medium');

  actionTool('system.recycleBin', 'Inspect or empty the Windows Recycle Bin.', {
    type: 'object',
    properties: { action: { type: 'string', required: true, enum: ['status', 'empty'] } },
    additionalProperties: false
  }, async args => {
    if (!deps.recycleBin) throw new Error('Recycle Bin controls are unavailable');
    return deps.recycleBin(args.action);
  }, 'high', args => args.action === 'empty' ? {
    action: 'empty-recycle-bin',
    target: 'Recycle Bin',
    summary: 'Empty the Windows Recycle Bin?',
    consequence: 'Every item in the Recycle Bin will be permanently deleted. This cannot be undone.'
  } : null);

  /* ------------------------------------------------------------ reminders */
  if (deps.reminders) {
    actionTool('reminder.create', 'Create a persistent reminder. Ask for a specific time if it is ambiguous.', {
      type: 'object',
      properties: {
        text: { type: 'string', required: true, minLength: 1, maxLength: 500 },
        at: { type: 'integer', description: 'Unix timestamp in milliseconds' },
        time: { type: 'string', description: 'Natural time such as "6 PM" or "tomorrow morning"' },
        minutes: { type: 'integer', minimum: 1 },
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekdays', 'weekly'] }
      },
      additionalProperties: false
    }, async args => deps.reminders.create(args));

    actionTool('reminder.list', 'List active reminders.', {
      type: 'object', properties: { includeDone: { type: 'boolean' } }, additionalProperties: false
    }, async args => deps.reminders.list(args));

    actionTool('reminder.cancel', 'Cancel a reminder by id or by matching text.', {
      type: 'object',
      properties: { id: { type: 'string' }, text: { type: 'string' } },
      additionalProperties: false
    }, async args => deps.reminders.remove(args));

    actionTool('reminder.snooze', 'Snooze a reminder for a number of minutes.', {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        minutes: { type: 'integer', required: true, minimum: 1, maximum: 1440 }
      },
      additionalProperties: false
    }, async args => deps.reminders.snooze(args.id, args.minutes));

    actionTool('reminder.complete', 'Mark a reminder as completed.', {
      type: 'object',
      properties: { id: { type: 'string', required: true } },
      additionalProperties: false
    }, async args => deps.reminders.complete(args.id));
  }

  /* --------------------------------------------------------------- memory */
  if (deps.memory) {
    actionTool('memory.list', 'List user-approved saved facts and preferences.', {
      type: 'object', properties: {}, additionalProperties: false
    }, async () => ({ facts: deps.memory.getFacts(100), preferences: deps.memory.data.preferences }));

    actionTool('memory.addFact', 'Save a fact the user explicitly asked FUL to remember.', {
      type: 'object',
      properties: { text: { type: 'string', required: true, minLength: 1, maxLength: 500 } },
      additionalProperties: false
    }, async args => deps.memory.addFact(args.text, 'explicit'));

    actionTool('memory.removeFact', 'Delete a saved memory by id.', {
      type: 'object',
      properties: { id: { type: 'string', required: true } },
      additionalProperties: false
    }, async args => deps.memory.removeFact(args.id));

    actionTool('memory.setPreference', 'Store a user preference such as language or speaking frequency.', {
      type: 'object',
      properties: {
        key: { type: 'string', required: true, minLength: 1, maxLength: 80 },
        value: { type: ['string', 'number', 'boolean'] }
      },
      additionalProperties: false
    }, async args => { deps.memory.setPref(args.key, args.value); return { ok: true }; });
  }

  return r;
}

function commandApproval(command, cwd, perms) {
  if (!command) return null;
  const decision = perms.classifyCommand(command);
  if (!decision.allowed) {
    return { action: 'command', target: command, summary: `Blocked: ${command}`, consequence: decision.reasons.join(', '), blocked: true };
  }
  if (!decision.needsApproval) return null;
  return {
    action: 'command',
    target: command,
    extra: { cwd },
    summary: `Run this ${decision.risk}-risk command?\n${command}`,
    consequence: decision.reasons.join(', ') || 'It executes project code on this PC.',
    preview: { command, cwd }
  };
}

function dependencyCommand(project, manager) {
  if (manager === 'pip' || (project.runtimes.includes('python') && !project.manifests.includes('package.json'))) {
    if (project.manifests.includes('requirements.txt')) return 'pip install -r requirements.txt';
    if (project.manifests.includes('pyproject.toml')) return 'pip install -e .';
    return null;
  }
  if (!project.manifests.includes('package.json')) return null;
  if (manager === 'pnpm') return 'pnpm install';
  if (manager === 'yarn') return 'yarn install';
  return 'npm install';
}

function defaultRunCommand(project) {
  if (!project) return null;
  if (project.commands && project.commands.start) return project.commands.start;
  if (project.commands && project.commands.dev) return project.commands.dev;
  if (project.manifests.includes('package.json')) return 'npm start';
  if (project.frameworks.includes('Django')) return 'python manage.py runserver';
  return null;
}

function defaultTestCommand(project) {
  if (!project) return null;
  if (project.commands && project.commands.test) return project.commands.test;
  if (project.manifests.includes('package.json')) return 'npm test';
  if (project.runtimes.includes('python')) return 'python -m pytest -q';
  if (project.runtimes.includes('cargo')) return 'cargo test';
  if (project.runtimes.includes('go')) return 'go test ./...';
  return null;
}

function extractErrors(output) {
  const text = String(output || '');
  const lines = text.split(/\r?\n/);
  const hits = [];
  const seen = new Set();
  const re = /(?:^|\s)([A-Za-z]:\\[^\s:]+|[\w./-]+\.(?:js|jsx|ts|tsx|py|rb|php|java|cs|go|rs|c|cc|cpp|h|hpp|vue|svelte))[:(](\d+)(?::(\d+))?[)\s:-]*(.*)$/i;
  for (const line of lines) {
    if (!/error|exception|traceback|failed|syntaxerror|typeerror|referenceerror|cannot find|undefined/i.test(line)) continue;
    const m = line.match(re);
    const key = (m ? m[1] + ':' + m[2] : line.trim()).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      file: m ? m[1] : null,
      line: m ? Number(m[2]) : null,
      column: m && m[3] ? Number(m[3]) : null,
      message: (m ? m[4] : line).trim().slice(0, 1000)
    });
    if (hits.length >= 40) break;
  }
  return hits;
}

function systemSnapshot(battery) {
  const cpus = os.cpus();
  const total = os.totalmem();
  const free = os.freemem();
  let disk = null;
  try {
    const stat = fs.statfsSync(os.homedir());
    disk = {
      freeBytes: stat.bfree * stat.bsize,
      totalBytes: stat.blocks * stat.bsize
    };
  } catch { }
  return {
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: cpus[0] ? cpus[0].model.trim() : 'unknown',
    cpuCount: cpus.length,
    memory: { totalBytes: total, freeBytes: free, usedPercent: Math.round((1 - free / total) * 100) },
    disk,
    uptimeSeconds: Math.round(os.uptime()),
    battery: battery || null
  };
}

module.exports = {
  ToolRegistry,
  buildToolRegistry,
  validateArgs,
  extractErrors,
  dependencyCommand,
  defaultRunCommand,
  defaultTestCommand,
  systemSnapshot,
  quoteCmdArg
};
