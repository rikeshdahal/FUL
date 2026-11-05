/*
  Workspace filesystem service.

  All reads/writes go through the permission manager. Writes are atomic-ish,
  existing files are backed up before modification, and every mutation is
  recorded in a rollback change log.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { readJson, writeJson, ensureDir } = require('../data/store');

const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', 'dist', 'build', '.next', '.nuxt', '.venv', 'venv', '__pycache__', '.cache', 'coverage']);
const TEXT_EXT = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.jsonc', '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.py', '.pyi', '.rb', '.php', '.java', '.kt', '.kts', '.c', '.h', '.cpp', '.hpp', '.cc', '.cs', '.go', '.rs', '.swift',
  '.md', '.markdown', '.txt', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env', '.sh', '.ps1', '.bat', '.cmd',
  '.sql', '.xml', '.svg', '.vue', '.svelte', '.graphql', '.gql', '.lock'
]);

function looksBinary(buffer) {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) if (buffer[i] === 0) return true;
  return false;
}

function slug(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

class WorkspaceService {
  constructor(options = {}) {
    this.permissions = options.permissions;
    this.trash = typeof options.trash === 'function' ? options.trash : null;
    this.now = options.now || (() => Date.now());
    const userData = options.userData || path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ful-companion');
    this.userData = userData;
    this.logFile = options.changeLogPath || path.join(userData, 'ful-agent-changes.json');
    this.backupDir = options.backupDir || path.join(userData, 'ful-agent-backups');
    this.maxReadBytes = options.maxReadBytes || 512 * 1024;
    this.maxListEntries = options.maxListEntries || 2000;
    this.changes = readJson(this.logFile, { version: 1, changes: [] });
    if (!Array.isArray(this.changes.changes)) this.changes.changes = [];
  }

  _saveLog() {
    if (this.changes.changes.length > 1000) this.changes.changes = this.changes.changes.slice(-1000);
    ensureDir(path.dirname(this.logFile));
    writeJson(this.logFile, this.changes);
  }

  _record(change) {
    const entry = {
      id: crypto.randomBytes(8).toString('hex'),
      ts: this.now(),
      ...change
    };
    this.changes.changes.push(entry);
    this._saveLog();
    return entry;
  }

  _check(action, target, opts = {}) {
    const result = this.permissions.authorizeFs(action, target, opts);
    if (!result.allowed) {
      const err = new Error(result.reason || `access denied for ${action}`);
      err.code = 'EPERMISSION';
      err.details = result;
      throw err;
    }
    return result;
  }

  _backup(file, taskId) {
    try {
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
      const stamp = new Date(this.now()).toISOString().replace(/[:.]/g, '-');
      const dest = path.join(this.backupDir, stamp + '-' + slug(file), path.basename(file));
      ensureDir(path.dirname(dest));
      fs.copyFileSync(file, dest);
      return dest;
    } catch {
      return null;
    }
  }

  stat(target) {
    const check = this._check('read', target);
    const s = fs.statSync(check.path);
    return {
      path: check.path,
      name: path.basename(check.path),
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      size: s.size,
      mtime: s.mtimeMs,
      relative: check.relative
    };
  }

  list(target, opts = {}) {
    const check = this._check('list', target);
    const s = fs.statSync(check.path);
    if (!s.isDirectory()) throw new Error('not a directory');

    const includeHidden = opts.includeHidden === true;
    const limit = Math.max(1, Math.min(this.maxListEntries, Number(opts.limit) || this.maxListEntries));
    const entries = [];
    const children = fs.readdirSync(check.path, { withFileTypes: true })
      .filter(d => includeHidden || !d.name.startsWith('.'))
      .filter(d => !SKIP_DIRS.has(d.name.toLowerCase()))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    for (const d of children) {
      if (entries.length >= limit) break;
      const full = path.join(check.path, d.name);
      let size = 0;
      try { size = d.isFile() ? fs.statSync(full).size : 0; } catch { }
      entries.push({
        name: d.name,
        path: full,
        relative: check.relative ? path.join(check.relative, d.name) : d.name,
        isDirectory: d.isDirectory(),
        isFile: d.isFile(),
        size,
        extension: path.extname(d.name).toLowerCase()
      });
    }
    return {
      path: check.path,
      root: check.root,
      entries,
      truncated: children.length > entries.length
    };
  }

  tree(target, opts = {}) {
    const check = this._check('list', target);
    const maxDepth = Math.max(0, Math.min(8, Number(opts.depth) || 3));
    const maxNodes = Math.max(1, Math.min(5000, Number(opts.maxNodes) || 1500));
    let nodes = 0;

    const walk = (dir, depth, relative) => {
      if (nodes >= maxNodes || depth > maxDepth) return [];
      let dirents;
      try { dirents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
      dirents = dirents
        .filter(d => !d.name.startsWith('.'))
        .filter(d => !SKIP_DIRS.has(d.name.toLowerCase()))
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      const out = [];
      for (const d of dirents) {
        if (nodes >= maxNodes) break;
        nodes++;
        const full = path.join(dir, d.name);
        const rel = path.posix.join(relative, d.name);
        if (d.isDirectory()) {
          out.push({ name: d.name, path: full, relative: rel, isDirectory: true, children: walk(full, depth + 1, rel) });
        } else {
          out.push({ name: d.name, path: full, relative: rel, isDirectory: false, size: safeSize(full) });
        }
      }
      return out;
    };

    return { path: check.path, root: check.root, children: walk(check.path, 1, '') };
  }

  read(target, opts = {}) {
    const check = this._check('read', target);
    const s = fs.statSync(check.path);
    if (!s.isFile()) throw new Error('not a file');
    const max = Math.max(1, Math.min(Number(opts.maxBytes) || this.maxReadBytes, 4 * 1024 * 1024));
    const length = Math.min(s.size, max);
    const fd = fs.openSync(check.path, 'r');
    const buffer = Buffer.alloc(length);
    try { fs.readSync(fd, buffer, 0, length, 0); } finally { fs.closeSync(fd); }
    const binary = looksBinary(buffer);
    return {
      path: check.path,
      relative: check.relative,
      size: s.size,
      extension: path.extname(check.path).toLowerCase(),
      binary,
      truncated: s.size > max,
      content: binary ? buffer.toString('base64') : buffer.toString('utf8'),
      mtime: s.mtimeMs
    };
  }

  write(target, content, opts = {}) {
    if (typeof content !== 'string') throw new Error('content must be a string');
    if (Buffer.byteLength(content, 'utf8') > 4 * 1024 * 1024) throw new Error('file is too large to write (max 4 MB)');
    const check = this._check('write', target, { allowSensitive: opts.allowSensitive === true });
    const exists = fs.existsSync(check.path);
    if (exists && opts.overwrite === false) {
      const err = new Error('file already exists');
      err.code = 'EEXIST';
      throw err;
    }
    if (exists && !fs.statSync(check.path).isFile()) throw new Error('target is not a file');

    const backup = exists ? this._backup(check.path, opts.taskId) : null;
    const tmp = check.path + '.ful-' + crypto.randomBytes(4).toString('hex') + '.tmp';
    ensureDir(path.dirname(check.path));
    try {
      fs.writeFileSync(tmp, content, 'utf8');
      fs.copyFileSync(tmp, check.path);
    } finally {
      try { fs.unlinkSync(tmp); } catch { }
    }
    const record = this._record({
      action: exists ? 'modify' : 'create',
      path: check.path,
      relative: check.relative,
      backup,
      taskId: opts.taskId || null,
      bytes: Buffer.byteLength(content, 'utf8')
    });
    return { path: check.path, created: !exists, bytes: Buffer.byteLength(content, 'utf8'), backup, changeId: record.id };
  }

  createFile(target, content = '', opts = {}) {
    return this.write(target, content, { ...opts, overwrite: opts.overwrite === true });
  }

  createDirectory(target, opts = {}) {
    const check = this._check('create', target, { allowSensitive: opts.allowSensitive === true });
    if (fs.existsSync(check.path)) {
      if (!fs.statSync(check.path).isDirectory()) throw new Error('a file with that name already exists');
      return { path: check.path, created: false };
    }
    ensureDir(check.path);
    const record = this._record({ action: 'mkdir', path: check.path, relative: check.relative, taskId: opts.taskId || null });
    return { path: check.path, created: true, changeId: record.id };
  }

  rename(target, newName, opts = {}) {
    const check = this._check('rename', target);
    const name = String(newName || '').trim();
    if (!name || /[\\/]/.test(name) || name === '.' || name === '..') throw new Error('invalid file name');
    const dest = path.join(path.dirname(check.path), name);
    const destCheck = this._check('create', dest, { allowSensitive: opts.allowSensitive === true });
    if (fs.existsSync(destCheck.path)) throw new Error('target already exists');
    fs.renameSync(check.path, destCheck.path);
    const record = this._record({ action: 'rename', path: check.path, to: destCheck.path, relative: check.relative, taskId: opts.taskId || null });
    return { path: destCheck.path, from: check.path, changeId: record.id };
  }

  move(target, destination, opts = {}) {
    const source = this._check('move', target);
    const dest = this._check('create', destination, { allowSensitive: opts.allowSensitive === true });
    if (fs.existsSync(dest.path)) throw new Error('destination already exists');
    ensureDir(path.dirname(dest.path));
    fs.renameSync(source.path, dest.path);
    const record = this._record({ action: 'move', path: source.path, to: dest.path, relative: source.relative, taskId: opts.taskId || null });
    return { path: dest.path, from: source.path, changeId: record.id };
  }

  copy(target, destination, opts = {}) {
    const source = this._check('copy', target);
    const dest = this._check('create', destination, { allowSensitive: opts.allowSensitive === true });
    if (fs.existsSync(dest.path) && opts.overwrite !== true) throw new Error('destination already exists');
    const s = fs.statSync(source.path);
    ensureDir(path.dirname(dest.path));
    if (s.isDirectory()) fs.cpSync(source.path, dest.path, { recursive: true, force: opts.overwrite === true });
    else fs.copyFileSync(source.path, dest.path);
    const record = this._record({ action: 'copy', path: source.path, to: dest.path, relative: source.relative, taskId: opts.taskId || null });
    return { path: dest.path, from: source.path, changeId: record.id };
  }

  async remove(target, opts = {}) {
    const check = this._check('delete', target);
    const s = fs.statSync(check.path);
    let method = 'permanent';
    if (opts.permanent !== true) {
      if (this.trash) {
        await this.trash(check.path);
        method = 'recycle-bin';
      } else {
        const trashDir = path.join(this.userData, 'ful-agent-trash');
        ensureDir(trashDir);
        const dest = path.join(trashDir, new Date(this.now()).toISOString().replace(/[:.]/g, '-') + '-' + path.basename(check.path));
        fs.renameSync(check.path, dest);
        method = 'ful-trash';
      }
    } else {
      if (s.isDirectory()) fs.rmSync(check.path, { recursive: true, force: true });
      else fs.unlinkSync(check.path);
    }
    const record = this._record({
      action: method === 'permanent' ? 'delete' : 'trash',
      path: check.path,
      relative: check.relative,
      taskId: opts.taskId || null
    });
    return { path: check.path, method, changeId: record.id };
  }

  async rollback(changeId) {
    const entry = this.changes.changes.find(c => c.id === changeId);
    if (!entry) throw new Error('change not found');
    if (!entry.backup || !fs.existsSync(entry.backup)) throw new Error('no backup exists for this change');
    const check = this._check('write', entry.path);
    fs.copyFileSync(entry.backup, check.path);
    const record = this._record({ action: 'rollback', path: check.path, changeId, taskId: null });
    return { path: check.path, restoredFrom: entry.backup, changeId: record.id };
  }

  listChanges(limit = 50) {
    return this.changes.changes.slice(-Math.max(1, limit)).reverse();
  }

  search(root, opts = {}) {
    const check = this._check('search', root);
    const query = String(opts.query || '').trim();
    const namePattern = opts.name ? String(opts.name) : '';
    const extensions = Array.isArray(opts.extensions)
      ? opts.extensions.map(e => e.startsWith('.') ? e.toLowerCase() : '.' + e.toLowerCase())
      : [];
    const inContent = opts.content === true && query.length > 0;
    const maxResults = Math.max(1, Math.min(500, Number(opts.maxResults) || 100));
    const maxDepth = Math.max(0, Math.min(12, Number(opts.depth) || 8));
    const results = [];
    let scanned = 0;

    const matchesGlob = (name) => {
      if (!namePattern) return true;
      const patterns = namePattern.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return patterns.some(p => {
        if (p.startsWith('*.')) return name.toLowerCase().endsWith(p.slice(1));
        if (p.includes('*')) {
          const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
          return re.test(name);
        }
        return name.toLowerCase().includes(p);
      });
    };

    const walk = (dir, depth) => {
      if (results.length >= maxResults || depth > maxDepth || scanned > 12000) return;
      let dirents;
      try { dirents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const d of dirents) {
        if (results.length >= maxResults || scanned > 12000) break;
        if (d.name.startsWith('.') || SKIP_DIRS.has(d.name.toLowerCase())) continue;
        const full = path.join(dir, d.name);
        if (d.isDirectory()) {
          walk(full, depth + 1);
          continue;
        }
        scanned++;
        if (!d.isFile()) continue;
        const ext = path.extname(d.name).toLowerCase();
        if (extensions.length && !extensions.includes(ext)) continue;
        if (!matchesGlob(d.name)) continue;
        if (!query) {
          results.push({ path: full, name: d.name, match: 'name' });
          continue;
        }
        if (inContent) {
          if (!TEXT_EXT.has(ext) && ext !== '') continue;
          try {
            const size = fs.statSync(full).size;
            if (size > 256 * 1024) continue;
            const content = fs.readFileSync(full, 'utf8');
            const idx = content.toLowerCase().indexOf(query.toLowerCase());
            if (idx >= 0) {
              const line = content.slice(0, idx).split(/\r?\n/).length;
              const snippet = content.slice(Math.max(0, idx - 60), idx + query.length + 60).replace(/\s+/g, ' ');
              results.push({ path: full, name: d.name, line, snippet, match: 'content' });
            }
          } catch { }
        } else if (d.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ path: full, name: d.name, match: 'name' });
        }
      }
    };

    walk(check.path, 0);
    return { root: check.path, results, scanned, truncated: results.length >= maxResults || scanned > 12000 };
  }

  detectProject(target) {
    const check = this._check('read', target);
    const s = fs.statSync(check.path);
    const dir = s.isDirectory() ? check.path : path.dirname(check.path);
    const info = {
      path: dir,
      name: path.basename(dir),
      languages: [],
      frameworks: [],
      manifests: [],
      runtimes: [],
      scripts: {},
      commands: {}
    };
    const readIf = (name) => {
      const file = path.join(dir, name);
      try { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; } catch { return null; }
    };

    const pkgRaw = readIf('package.json');
    if (pkgRaw) {
      info.manifests.push('package.json');
      info.runtimes.push('node');
      info.languages.push('JavaScript');
      try {
        const pkg = JSON.parse(pkgRaw);
        info.name = pkg.name || info.name;
        info.scripts = pkg.scripts || {};
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps.react) { info.frameworks.push('React'); info.languages.push('JavaScript/JSX'); }
        if (deps.vue) info.frameworks.push('Vue');
        if (deps.svelte) info.frameworks.push('Svelte');
        if (deps.next) info.frameworks.push('Next.js');
        if (deps.vite) info.frameworks.push('Vite');
        if (deps.electron) info.frameworks.push('Electron');
        if (deps.typescript) info.languages.push('TypeScript');
        if (info.scripts.dev) info.commands.dev = 'npm run dev';
        if (info.scripts.start) info.commands.start = 'npm run start';
        if (info.scripts.build) info.commands.build = 'npm run build';
        if (info.scripts.test) info.commands.test = 'npm test';
      } catch { }
    }
    if (readIf('tsconfig.json')) { info.manifests.push('tsconfig.json'); if (!info.languages.includes('TypeScript')) info.languages.push('TypeScript'); }
    if (readIf('requirements.txt') || readIf('pyproject.toml') || readIf('setup.py')) {
      info.manifests.push(readIf('requirements.txt') ? 'requirements.txt' : readIf('pyproject.toml') ? 'pyproject.toml' : 'setup.py');
      info.runtimes.push('python');
      info.languages.push('Python');
      if (readIf('manage.py')) info.frameworks.push('Django');
      if (readIf('app.py') || readIf('main.py')) info.commands.start = 'python ' + (readIf('main.py') ? 'main.py' : 'app.py');
    }
    if (readIf('manage.py')) { info.frameworks.push('Django'); info.commands.test = 'python manage.py test'; info.commands.start = 'python manage.py runserver'; }
    if (readIf('Cargo.toml')) { info.manifests.push('Cargo.toml'); info.runtimes.push('cargo'); info.languages.push('Rust'); info.commands.test = 'cargo test'; }
    if (readIf('go.mod')) { info.manifests.push('go.mod'); info.runtimes.push('go'); info.languages.push('Go'); info.commands.test = 'go test ./...'; }
    if (readIf('pom.xml') || readIf('build.gradle')) { info.runtimes.push('java'); info.languages.push('Java'); }
    if (readIf('index.html')) { info.languages.push('HTML'); info.frameworks.push('Web'); }
    if (readIf('.git')) { /* directory, handled below */ }
    try { if (fs.existsSync(path.join(dir, '.git'))) info.isGit = true; } catch { }
    info.frameworks = [...new Set(info.frameworks)];
    info.languages = [...new Set(info.languages)];
    info.runtimes = [...new Set(info.runtimes)];
    return info;
  }
}

function safeSize(file) {
  try { return fs.statSync(file).size; } catch { return 0; }
}

module.exports = { WorkspaceService, looksBinary, TEXT_EXT, SKIP_DIRS };
