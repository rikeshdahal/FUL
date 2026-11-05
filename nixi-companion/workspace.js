'use strict';

const bridge = window.fulBridge;
const ipc = bridge && bridge.ipcRenderer;

const state = {
  root: null,
  rootName: '',
  current: null,
  original: '',
  dirty: false,
  taskId: null,
  taskStatus: 'idle',
  taskSummary: '',
  steps: [],
  loggedSteps: new Set(),
  changedFiles: [],
  commands: [],
  agentReady: false,
  provider: null,
  confirmQueue: [],
  activeConfirm: null,
  bgProcessId: null,
  mountedCard: null,
  searchTimer: null
};

const $ = id => document.getElementById(id);
const els = {
  workspacePath: $('workspacePath'),
  rootName: $('rootName'),
  tree: $('tree'),
  searchResults: $('searchResults'),
  searchInput: $('searchInput'),
  searchContent: $('searchContent'),
  searchMeta: $('searchMeta'),
  fileName: $('fileName'),
  dirtyDot: $('dirtyDot'),
  editor: $('editor'),
  editorBody: $('editorBody'),
  editorEmpty: $('editorEmpty'),
  lineNumbers: $('lineNumbers'),
  fileMeta: $('fileMeta'),
  cursorMeta: $('cursorMeta'),
  saveMeta: $('saveMeta'),
  taskInput: $('taskInput'),
  taskLog: $('taskLog'),
  terminalOutput: $('terminalOutput'),
  terminalInput: $('terminalInput'),
  agentBadge: $('agentBadge'),
  confirmBackdrop: $('confirmBackdrop'),
  confirmSummary: $('confirmSummary'),
  confirmConsequence: $('confirmConsequence'),
  confirmPreview: $('confirmPreview'),
  toast: $('toast')
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseName(target) {
  const bits = String(target || '').split(/[\\/]/).filter(Boolean);
  return bits[bits.length - 1] || target || '';
}

function joinPath(root, name) {
  if (!root) return name;
  const sep = root.includes('/') && !root.includes('\\') ? '/' : '\\';
  return String(root).replace(/[\\/]+$/, '') + sep + name;
}

let promptResolver = null;

function askText(title, defaultValue = '') {
  return new Promise(resolve => {
    promptResolver = resolve;
    $('promptTitle').textContent = title;
    $('promptInput').value = defaultValue;
    $('promptBackdrop').hidden = false;
    setTimeout(() => {
      $('promptInput').focus();
      $('promptInput').select();
    }, 20);
  });
}

function closePrompt(value) {
  if (!promptResolver) return;
  const resolve = promptResolver;
  promptResolver = null;
  $('promptBackdrop').hidden = true;
  resolve(value);
}

let toastTimer = null;
function toast(message, kind = '') {
  els.toast.textContent = message;
  els.toast.className = 'toast ' + kind;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 4200);
}

function setDirty(dirty) {
  state.dirty = dirty;
  els.dirtyDot.hidden = !dirty;
  els.btnSave.disabled = !state.current || !dirty;
  updateStatusBar();
}

function lineCount(text) {
  if (!text) return 1;
  let count = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++;
  return count;
}

function renderLineNumbers() {
  const count = lineCount(els.editor.value);
  let out = '';
  for (let i = 1; i <= count; i++) out += i + '\n';
  els.lineNumbers.textContent = out.trimEnd();
}

function updateStatusBar() {
  if (!state.current) {
    els.fileMeta.textContent = 'Ready';
    return;
  }
  const bytes = new Blob([els.editor.value]).size;
  const lines = lineCount(els.editor.value);
  els.fileMeta.textContent = `${state.current.path}  |  ${lines} lines  |  ${bytes} bytes`;
}

function updateCursor() {
  if (!state.current) {
    els.cursorMeta.textContent = 'Ln 1, Col 1';
    return;
  }
  const pos = els.editor.selectionStart || 0;
  const before = els.editor.value.slice(0, pos);
  const line = (before.match(/\n/g) || []).length + 1;
  const col = pos - before.lastIndexOf('\n');
  els.cursorMeta.textContent = `Ln ${line}, Col ${col}`;
}

function markActiveFile(target) {
  els.tree.querySelectorAll('.tree-file').forEach(el => {
    el.classList.toggle('active', el.dataset.path === target);
  });
  els.searchResults.querySelectorAll('.tree-file').forEach(el => {
    el.classList.toggle('active', el.dataset.path === target);
  });
}

async function chooseFolder() {
  if (!ipc) return;
  const picked = await ipc.invoke('workspace-pick');
  if (!picked || picked.cancelled) return;
  if (!picked.ok) return toast(picked.error || 'Could not open that folder.', 'error');
  const active = await ipc.invoke('workspace-set-active', picked.path);
  if (!active || !active.ok) return toast(active && active.error || 'Could not activate workspace.', 'error');
  state.root = active.path;
  state.rootName = baseName(active.path);
  await refreshTree();
  showFilesView();
  toast(`Workspace: ${state.rootName}`);
}

async function refreshTree() {
  if (!ipc) return;
  if (!state.root) {
    els.tree.innerHTML = '<div class="tree-empty">Open a folder to start. FUL can only read and write inside approved workspace roots.</div>';
    return;
  }
  els.tree.innerHTML = '<div class="tree-empty">Loading files...</div>';
  const res = await ipc.invoke('workspace-tree', { path: state.root, depth: 3 });
  if (!res || !res.ok) {
    els.tree.innerHTML = `<div class="tree-empty">${escapeHtml(res && res.error || 'Could not read this folder.')}</div>`;
    return;
  }
  const tree = res.result || {};
  state.rootName = baseName(tree.path || state.root);
  state.root = tree.path || state.root;
  els.rootName.textContent = state.rootName || state.root;
  els.workspacePath.textContent = state.root;
  els.tree.innerHTML = '';
  if (!tree.children || !tree.children.length) {
    els.tree.innerHTML = '<div class="tree-empty">This folder is empty.</div>';
    return;
  }
  els.tree.appendChild(renderNodes(tree.children));
}

function renderNodes(nodes) {
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    if (node.isDirectory) {
      const details = document.createElement('details');
      details.className = 'tree-folder';
      details.open = node.relative.split(/[\\/]/).length < 2;
      const summary = document.createElement('summary');
      summary.textContent = node.name;
      details.appendChild(summary);
      if (node.children && node.children.length) {
        const children = document.createElement('div');
        children.className = 'tree-children';
        children.appendChild(renderNodes(node.children));
        details.appendChild(children);
      }
      frag.appendChild(details);
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-file';
      button.dataset.path = node.path;
      button.title = node.relative || node.path;
      const glyph = document.createElement('span');
      glyph.className = 'file-glyph';
      glyph.textContent = (node.name.split('.').length > 1 ? node.name.split('.').pop().slice(0, 3) : '');
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = node.name;
      button.append(glyph, name);
      button.addEventListener('click', () => openFile(node.path));
      frag.appendChild(button);
    }
  }
  return frag;
}

async function openFile(target) {
  if (!ipc || !target) return;
  if (state.dirty && state.current && state.current.path !== target) {
    const proceed = window.confirm('Discard unsaved changes and open another file?');
    if (!proceed) return;
  }
  const res = await ipc.invoke('workspace-read', { path: target });
  if (!res || !res.ok) return toast(res && res.error || 'Could not open file.', 'error');
  const file = res.result || {};
  if (file.binary) {
    return toast('This looks like a binary file. FUL will not edit it here.', 'error');
  }
  state.current = { path: file.path, truncated: !!file.truncated };
  state.original = file.content || '';
  els.editor.value = state.original;
  els.editorBody.hidden = false;
  els.editorEmpty.hidden = true;
  els.fileName.textContent = baseName(file.path);
  els.btnRename.disabled = false;
  els.btnDelete.disabled = false;
  els.saveMeta.textContent = file.truncated ? 'Preview truncated' : '';
  renderLineNumbers();
  setDirty(false);
  updateStatusBar();
  updateCursor();
  markActiveFile(file.path);
  els.editor.focus();
  els.editor.setSelectionRange(0, 0);
}

function closeEditor() {
  state.current = null;
  state.original = '';
  els.editor.value = '';
  els.editorBody.hidden = true;
  els.editorEmpty.hidden = false;
  els.fileName.textContent = 'No file open';
  els.btnRename.disabled = true;
  els.btnDelete.disabled = true;
  els.saveMeta.textContent = '';
  setDirty(false);
  updateStatusBar();
}

async function saveFile() {
  if (!ipc || !state.current || !state.dirty) return;
  els.btnSave.disabled = true;
  const res = await ipc.invoke('workspace-save', { path: state.current.path, content: els.editor.value });
  if (!res || !res.ok) {
    els.btnSave.disabled = false;
    return toast(res && res.error || 'Could not save file.', 'error');
  }
  state.original = els.editor.value;
  setDirty(false);
  els.saveMeta.textContent = 'Saved ' + new Date().toLocaleTimeString();
  toast('Saved ' + baseName(state.current.path));
  markActiveFile(state.current.path);
}

async function newFile() {
  if (!state.root) return toast('Open a folder first.', 'error');
  const name = await askText('New file name (relative to workspace root)', 'untitled.txt');
  if (!name || !name.trim()) return;
  const target = joinPath(state.root, name.trim());
  const res = await ipc.invoke('workspace-create', { path: target, content: '' });
  if (!res || !res.ok) return toast(res && res.error || 'Could not create file.', 'error');
  await refreshTree();
  await openFile(res.result && res.result.path || target);
}

async function renameFile() {
  if (!state.current) return;
  const next = await askText('Rename file to', baseName(state.current.path));
  if (!next || !next.trim() || next.trim() === baseName(state.current.path)) return;
  const dir = state.current.path.replace(/[\\/][^\\/]+$/, '');
  const target = joinPath(dir, next.trim());
  const res = await ipc.invoke('workspace-rename', { path: state.current.path, name: target });
  if (!res || !res.ok) return toast(res && res.error || 'Could not rename file.', 'error');
  const result = res.result || {};
  const newPath = result.path || target;
  state.current.path = newPath;
  els.fileName.textContent = baseName(newPath);
  await refreshTree();
  markActiveFile(newPath);
  toast('Renamed to ' + baseName(newPath));
}

async function deleteFile() {
  if (!state.current) return;
  const target = state.current.path;
  const res = await ipc.invoke('workspace-delete', { path: target, permanent: false });
  if (!res) return;
  if (!res.ok) {
    if (!res.denied) toast(res.error || 'Could not delete file.', 'error');
    return;
  }
  if (state.current && state.current.path === target) closeEditor();
  await refreshTree();
  toast('Moved to Recycle Bin: ' + baseName(target));
}

function showFilesView() {
  document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === 'files'));
  $('viewFiles').classList.add('active');
  $('viewSearch').classList.remove('active');
}

function showSearchView() {
  document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === 'search'));
  $('viewFiles').classList.remove('active');
  $('viewSearch').classList.add('active');
  els.searchInput.focus();
}

async function runSearch() {
  const query = els.searchInput.value.trim();
  if (!state.root) {
    els.searchMeta.textContent = 'Open a folder first.';
    els.searchResults.innerHTML = '';
    return;
  }
  if (!query) {
    els.searchMeta.textContent = 'Type a file name or content to search.';
    els.searchResults.innerHTML = '';
    return;
  }
  els.searchMeta.textContent = 'Searching...';
  const res = await ipc.invoke('workspace-search', {
    root: state.root,
    query,
    content: els.searchContent.checked,
    maxResults: 80
  });
  if (!res || !res.ok) {
    els.searchMeta.textContent = res && res.error || 'Search failed.';
    return;
  }
  const data = res.result || {};
  const results = data.results || [];
  els.searchMeta.textContent = `${results.length} result${results.length === 1 ? '' : 's'} in ${data.scanned || 0} files${data.truncated ? ' (truncated)' : ''}`;
  els.searchResults.innerHTML = '';
  if (!results.length) {
    els.searchResults.innerHTML = '<div class="tree-empty">No matches.</div>';
    return;
  }
  for (const hit of results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-hit';
    button.dataset.path = hit.path;
    button.innerHTML = `<strong>${escapeHtml(hit.name)}${hit.line ? ':' + hit.line : ''}</strong><small>${escapeHtml(hit.snippet || hit.path)}</small>`;
    button.addEventListener('click', () => openFile(hit.path));
    els.searchResults.appendChild(button);
  }
}

function appendTerminal(text) {
  if (!text) return;
  els.terminalOutput.textContent += text;
  els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight;
}

function commandResultText(res) {
  const result = res && res.result || {};
  let out = '';
  if (result.command) out += `$ ${result.command}\n`;
  if (result.stdout) out += result.stdout;
  if (result.stderr) out += (out && !out.endsWith('\n') ? '\n' : '') + result.stderr;
  if (result.code != null) out += `\n[exit ${result.code}]\n`;
  if (!out && res && res.summary) out = res.summary + '\n';
  return out;
}

async function runTerminalCommand(event) {
  if (event) event.preventDefault();
  const command = els.terminalInput.value.trim();
  if (!command) return;
  els.terminalInput.value = '';
  appendTerminal(`\n> ${command}\n`);
  if (!state.root) {
    appendTerminal('Open a workspace folder first.\n');
    return;
  }
  const background = $('bgProcess').checked;
  const res = await ipc.invoke('workspace-run', {
    command,
    cwd: state.root,
    background
  });
  if (!res) {
    appendTerminal('\n[no response]\n');
    return;
  }
  if (!res.ok) {
    if (res.denied) appendTerminal('[denied by policy]\n');
    else appendTerminal(`[error] ${res.error || 'command failed'}\n`);
    return;
  }
  const result = res.result || {};
  if (background) {
    state.bgProcessId = result.id || null;
    appendTerminal(`[started pid ${result.pid || '?'}${result.id ? ', id ' + result.id : ''}]\n`);
  } else {
    appendTerminal(commandResultText(res));
  }
  await refreshTree();
}

function logLine(html, status = '') {
  const div = document.createElement('div');
  div.className = 'log-line ' + status;
  div.innerHTML = html;
  els.taskLog.appendChild(div);
  els.taskLog.scrollTop = els.taskLog.scrollHeight;
}

function renderCard() {
  if (!state.mountedCard) return;
  state.mountedCard.update({
    status: state.taskStatus,
    subtitle: state.taskSummary || (state.agentReady
      ? 'Ready to inspect, edit, and run inside this workspace.'
      : 'Add an AI key in Settings to enable planning and tool use.'),
    steps: state.steps,
    changedFiles: state.changedFiles,
    commands: state.commands,
    onCancel: cancelTask,
    onOpenWorkspace: () => els.taskInput.focus()
  });
}

function setTaskStatus(status, summary) {
  state.taskStatus = status;
  if (summary != null) state.taskSummary = summary;
  const active = ['planning', 'running', 'replanning', 'verifying', 'cancelling'].includes(status);
  $('btnRun').disabled = active;
  $('btnStop').disabled = !active;
  renderCard();
}

function resetTask() {
  state.taskId = null;
  state.steps = [];
  state.loggedSteps = new Set();
  state.changedFiles = [];
  state.commands = [];
  state.taskSummary = '';
  els.taskLog.innerHTML = '';
  setTaskStatus('idle', '');
}

function upsertStep(payload) {
  if (!payload) return null;
  const key = payload.stepId || payload.tool || ('step-' + state.steps.length);
  let step = state.steps.find(s => s.id === key);
  if (!step) {
    step = { id: key, tool: payload.tool || 'step', status: 'pending' };
    state.steps.push(step);
  }
  if (payload.tool) step.tool = payload.tool;
  if (payload.status) step.status = payload.status;
  if (payload.summary) step.summary = payload.summary;
  return step;
}

async function runTask() {
  const request = els.taskInput.value.trim();
  if (!request) return toast('Describe what you want FUL to do.', 'error');
  if (!state.agentReady) {
    toast('No AI provider is configured. Add a key in Settings.', 'error');
    return;
  }
  resetTask();
  setTaskStatus('planning', 'Planning the safest path to the outcome.');
  logLine('<span class="log-state">planning</span>Planning task...', 'running');
  const res = await ipc.invoke('agent-run', {
    request,
    workspace: state.root || undefined
  });
  if (!res) {
    setTaskStatus('failed', 'No response from the agent.');
    return;
  }
  if (!res.ok && !state.taskStatus.includes('done') && state.taskStatus !== 'failed') {
    setTaskStatus(res.cancelled ? 'cancelled' : 'failed', res.error || 'Task failed.');
  }
  if (res.cancelled) {
    setTaskStatus('cancelled', 'Task cancelled.');
    logLine('<span class="log-state">cancelled</span>Task cancelled.', 'denied');
  }
}

async function cancelTask() {
  if (!state.taskId) return;
  setTaskStatus('cancelling', 'Stopping the current task...');
  await ipc.invoke('agent-cancel', state.taskId);
}

function handleTaskEvent(payload) {
  if (!payload) return;
  if (payload.taskId && !state.taskId) state.taskId = payload.taskId;
  if (state.taskId && payload.taskId && payload.taskId !== state.taskId) return;
  const status = payload.status || '';
  if (status) setTaskStatus(status, status === 'replanning' ? 'The first plan did not work. Replanning...' : state.taskSummary);
  if (status === 'running') logLine('<span class="log-state">running</span>Executing the plan.', 'running');
  if (status === 'replanning') logLine('<span class="log-state">replan</span>Adjusting the plan after a failed step.', 'failed');
  if (status === 'verifying') logLine('<span class="log-state">verify</span>Verifying the result.', 'running');
}

function handleProgress(payload) {
  if (!payload) return;
  if (state.taskId && payload.taskId && payload.taskId !== state.taskId) return;
  const step = upsertStep(payload);
  renderCard();
  if (!step) return;
  const key = `${payload.stepId || step.id}:${payload.status}`;
  if (state.loggedSteps.has(key)) return;
  if (payload.status === 'awaiting-approval') {
    state.loggedSteps.add(key);
    logLine(`<span class="log-state">approval</span><span class="log-tool">${escapeHtml(payload.tool || step.tool)}</span> requires approval`, 'denied');
  } else if (payload.status === 'failed' || payload.status === 'denied' || payload.status === 'blocked') {
    state.loggedSteps.add(key);
    logLine(`<span class="log-state">${escapeHtml(payload.status)}</span><span class="log-tool">${escapeHtml(step.tool)}</span> ${escapeHtml(payload.summary || '')}`, 'failed');
  } else if (payload.status === 'ok') {
    state.loggedSteps.add(key);
    logLine(`<span class="log-state">ok</span><span class="log-tool">${escapeHtml(step.tool)}</span> ${escapeHtml(payload.summary || 'completed')}`, 'ok');
  }
}

function handleResult(payload) {
  if (!payload) return;
  if (state.taskId && payload.taskId && payload.taskId !== state.taskId) return;
  const execution = payload.execution || {};
  state.steps = Array.isArray(execution.steps) ? execution.steps.map(s => ({ ...s, id: s.id || s.tool, tool: s.tool || 'step' })) : state.steps;
  state.changedFiles = Array.isArray(execution.changedFiles) ? execution.changedFiles : [];
  state.commands = Array.isArray(execution.commandsRun) ? execution.commandsRun : [];
  const summary = payload.summary || payload.error || '';
  if (payload.needsClarification) {
    setTaskStatus('clarification', payload.question || 'FUL needs one more detail.');
    logLine(`<span class="log-state">question</span>${escapeHtml(payload.question || summary)}`, 'denied');
  } else if (payload.cancelled) {
    setTaskStatus('cancelled', 'Task cancelled.');
    logLine('<span class="log-state">cancelled</span>Task cancelled.', 'denied');
  } else if (payload.ok) {
    setTaskStatus('done', summary || 'Task complete.');
    logLine(`<span class="log-state">done</span>${escapeHtml(summary || 'Task complete.')}`, 'ok');
  } else {
    setTaskStatus('failed', summary || 'Task failed.');
    logLine(`<span class="log-state">failed</span>${escapeHtml(summary || payload.error || 'Task failed.')}`, 'failed');
  }
  if (state.changedFiles.length) {
    logLine(`<span class="log-state">changed</span>${state.changedFiles.length} file${state.changedFiles.length === 1 ? '' : 's'} changed`, 'ok');
    refreshTree();
  }
  renderCard();
}

function showNextConfirmation() {
  if (state.activeConfirm) return;
  const next = state.confirmQueue.shift();
  if (!next) {
    els.confirmBackdrop.hidden = true;
    return;
  }
  state.activeConfirm = next;
  $('confirmTitle').textContent = next.action ? `Approve ${String(next.action).replace(/[._]/g, ' ')}?` : 'Approve this action?';
  els.confirmSummary.textContent = next.summary || next.target || 'FUL wants to perform a system action.';
  els.confirmConsequence.textContent = next.consequence || 'This action may change files or system state.';
  const preview = next.preview && (next.preview.diff || next.preview.content || next.preview.text);
  els.confirmPreview.textContent = preview ? String(preview).slice(0, 12000) : '';
  els.confirmPreview.hidden = !preview;
  els.confirmBackdrop.hidden = false;
  $('btnApprove').focus();
}

function queueConfirmation(payload) {
  if (!payload || !payload.id) return;
  if (state.activeConfirm && state.activeConfirm.id === payload.id) return;
  if (state.confirmQueue.some(item => item.id === payload.id)) return;
  state.confirmQueue.push(payload);
  showNextConfirmation();
}

async function resolveConfirmation(approved) {
  const current = state.activeConfirm;
  if (!current) return;
  state.activeConfirm = null;
  els.confirmBackdrop.hidden = true;
  await ipc.invoke('agent-confirm', { id: current.id, approved: approved === true });
  showNextConfirmation();
}

async function loadPendingConfirmations() {
  const res = await ipc.invoke('agent-pending');
  if (res && res.ok && Array.isArray(res.confirmations)) {
    for (const item of res.confirmations) queueConfirmation(item);
  }
}

function setAgentState(payload) {
  if (!payload) return;
  state.provider = payload.provider || null;
  state.agentReady = !!(payload.provider && payload.provider.configured);
  const name = payload.provider ? String(payload.provider.provider || '').toUpperCase() : 'OFFLINE';
  els.agentBadge.textContent = state.agentReady ? (name || 'ONLINE') : 'OFFLINE';
  els.agentBadge.classList.toggle('online', state.agentReady);
  if (state.taskStatus === 'idle' && !state.taskSummary) {
    state.taskSummary = state.agentReady
      ? `${payload.provider.model || 'Model'} ready in ${payload.activeWorkspace ? baseName(payload.activeWorkspace) : 'no workspace'}.`
      : 'Configure an AI provider in Settings to enable agent tasks.';
  }
  renderCard();
}

function bindEvents() {
  $('btnPick').addEventListener('click', chooseFolder);
  $('btnPickHero').addEventListener('click', chooseFolder);
  $('btnSettings').addEventListener('click', () => ipc.send('open-settings'));
  $('btnMin').addEventListener('click', () => ipc.send('workspace-window-control', 'minimize'));
  $('btnMax').addEventListener('click', () => ipc.send('workspace-window-control', 'maximize'));
  $('btnClose').addEventListener('click', () => ipc.send('workspace-window-control', 'close'));

  $('btnRefresh').addEventListener('click', refreshTree);
  $('btnNewFile').addEventListener('click', newFile);
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => tab.dataset.view === 'search' ? showSearchView() : showFilesView());
  });

  els.searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(runSearch, 320);
  });
  els.searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { clearTimeout(state.searchTimer); runSearch(); }
  });

  els.editor.addEventListener('input', () => {
    setDirty(els.editor.value !== state.original);
    renderLineNumbers();
    updateStatusBar();
    updateCursor();
  });
  els.editor.addEventListener('scroll', () => { els.lineNumbers.scrollTop = els.editor.scrollTop; });
  ['click', 'keyup', 'select'].forEach(type => els.editor.addEventListener(type, updateCursor));
  els.editor.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = els.editor.selectionStart;
      const end = els.editor.selectionEnd;
      els.editor.value = els.editor.value.slice(0, start) + '  ' + els.editor.value.slice(end);
      els.editor.selectionStart = els.editor.selectionEnd = start + 2;
      setDirty(els.editor.value !== state.original);
      renderLineNumbers();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveFile();
    }
  });

  $('btnSave').addEventListener('click', saveFile);
  $('btnRename').addEventListener('click', renameFile);
  $('btnDelete').addEventListener('click', deleteFile);

  $('btnRun').addEventListener('click', runTask);
  $('btnStop').addEventListener('click', cancelTask);
  els.taskInput.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runTask();
    }
  });

  $('terminalForm').addEventListener('submit', runTerminalCommand);
  $('btnClearTerm').addEventListener('click', () => { els.terminalOutput.textContent = ''; });
  $('btnKillProcess').addEventListener('click', async () => {
    const id = state.bgProcessId;
    if (!id) return toast('No background process is tracked here.', 'error');
    const res = await ipc.invoke('workspace-process-cancel', id);
    appendTerminal(res && res.ok ? '\n[background process cancelled]\n' : `\n[error] ${res && res.error || 'could not cancel'}\n`);
    state.bgProcessId = null;
  });

  $('btnApprove').addEventListener('click', () => resolveConfirmation(true));
  $('btnDeny').addEventListener('click', () => resolveConfirmation(false));
  $('btnPromptCancel').addEventListener('click', () => closePrompt(null));
  $('btnPromptOk').addEventListener('click', () => closePrompt($('promptInput').value));
  $('promptInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); closePrompt($('promptInput').value); }
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('promptBackdrop').hidden) closePrompt(null);
    else if (event.key === 'Escape' && state.activeConfirm) resolveConfirmation(false);
  });
}

function bindIpc() {
  ipc.on('agent-task', (_event, payload) => handleTaskEvent(payload));
  ipc.on('agent-progress', (_event, payload) => handleProgress(payload));
  ipc.on('agent-result', (_event, payload) => handleResult(payload));
  ipc.on('agent-confirm', (_event, payload) => queueConfirmation(payload));
  ipc.on('agent-confirm-expired', (_event, payload) => {
    if (state.activeConfirm && payload && state.activeConfirm.id === payload.id) {
      state.activeConfirm = null;
      els.confirmBackdrop.hidden = true;
      showNextConfirmation();
    }
  });
  ipc.on('agent-state', (_event, payload) => setAgentState(payload));
  ipc.on('agent-workspace', (_event, payload) => {
    if (payload && payload.active) {
      state.root = payload.active;
      state.rootName = baseName(payload.active);
      refreshTree();
    }
  });
  ipc.on('agent-battery', (_event, payload) => {
    if (!payload) return;
    if (payload.critical && !payload.plugged) logLine(`<span class="log-state">battery</span>Critical battery: ${escapeHtml(payload.percent + '%')} remaining.`, 'failed');
  });
}

async function boot() {
  if (!ipc) {
    document.body.innerHTML = '<div style="padding:30px;color:#ffb2b8">FUL bridge unavailable. The preload script did not load.</div>';
    return;
  }
  bindEvents();
  bindIpc();
  if (window.FULCards && window.FULCards.mountAgentCard) {
    state.mountedCard = window.FULCards.mountAgentCard($('agentCard'), {
      title: 'FUL Agent',
      subtitle: 'Loading workspace status...',
      status: 'idle',
      steps: [],
      changedFiles: [],
      commands: [],
      onCancel: cancelTask,
      onOpenWorkspace: () => els.taskInput.focus()
    });
  } else {
    $('agentCard').innerHTML = '<div class="tree-empty">Agent card bundle is missing. Run npm run build:ui.</div>';
  }
  renderLineNumbers();
  updateStatusBar();
  updateCursor();

  const roots = await ipc.invoke('workspace-roots');
  if (roots && roots.ok) {
    if (roots.active) {
      state.root = roots.active;
      state.rootName = baseName(roots.active);
    } else if (Array.isArray(roots.roots) && roots.roots.length) {
      state.root = roots.roots[0];
      state.rootName = baseName(roots.roots[0]);
    }
  }
  if (state.root) {
    els.rootName.textContent = state.rootName;
    els.workspacePath.textContent = state.root;
    await refreshTree();
  } else {
    els.tree.innerHTML = '<div class="tree-empty">Open a folder to start. FUL can only read and write inside approved workspace roots.</div>';
  }

  const agentState = await ipc.invoke('agent-state');
  if (agentState && agentState.ok) setAgentState(agentState);
  await loadPendingConfirmations();
  els.taskInput.focus();
}

boot().catch(error => {
  console.error(error);
  toast(error.message || 'Workspace failed to start.', 'error');
});
