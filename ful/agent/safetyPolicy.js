/*
  FUL safety policy.

  Pure, dependency-free helpers used by the trusted main-process executor.
  Nothing here executes code; it only classifies and validates.
*/
'use strict';

const path = require('path');
const crypto = require('crypto');

const RISK = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high', BLOCKED: 'blocked' });

const ALLOWED_RUNTIMES = new Set([
  'node', 'npm', 'npm.cmd', 'npx', 'npx.cmd', 'pnpm', 'pnpm.cmd', 'yarn', 'yarn.cmd',
  'python', 'python3', 'python.exe', 'py', 'py.exe', 'pip', 'pip3', 'pip.exe',
  'git', 'git.exe', 'dotnet', 'java', 'javac', 'cargo', 'rustc', 'go', 'gofmt',
  'tsc', 'tsc.cmd', 'vite', 'vite.cmd', 'electron', 'electron.cmd',
  'deno', 'bun', 'ruby', 'php', 'composer', 'sqlite3',
  'where', 'where.exe', 'echo', 'pytest', 'pytest.exe', 'ruff', 'ruff.exe',
  'eslint', 'prettier', 'jest', 'vitest'
]);

const BLOCKED_PATTERNS = [
  { re: /\bInvoke-Expression\b|\biex\b/i, why: 'dynamic expression execution' },
  { re: /\b(curl|wget|Invoke-WebRequest|irm)\b[^\n|]*\|\s*(sh|bash|zsh|iex|powershell|cmd)\b/i, why: 'piping downloaded content into a shell' },
  { re: /\b(powershell|pwsh|cmd)(\.exe)?\b[^\n]*(?:-enc|-encodedcommand)\b/i, why: 'encoded command execution' },
  { re: /\b(downloadstring|downloadfile)\b[^\n]*(?:iex|invoke-expression)/i, why: 'downloading and executing code' },
  { re: /\bformat(?:\.com)?\s+[a-z]:/i, why: 'disk formatting' },
  { re: /\bdiskpart\b/i, why: 'raw disk partitioning' },
  { re: /\bbcdedit\b/i, why: 'boot configuration changes' },
  { re: /\b(vssadmin|wbadmin)\b[^\n]*\bdelete\b/i, why: 'deleting backups/shadow copies' },
  { re: /\bcipher(?:\.exe)?\s+\/w\b/i, why: 'disk wiping' },
  { re: /\b(net\s+user|net\s+localgroup)\b/i, why: 'account modification' },
  { re: /\breg\s+(delete|add)\b/i, why: 'registry modification' },
  { re: /\btakeown\b|\bicacls\b[^\n]*\/grant/i, why: 'permission tampering' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};:/, why: 'fork bomb' },
  { re: /\b(mkfs|mke2fs)\b/i, why: 'filesystem creation' },
  { re: /\bdd\s+if=.*\bof=\/dev\//i, why: 'raw device write' }
];

const HIGH_PATTERNS = [
  { re: /\bgit\s+(?:push\b[^\n]*(?:--force|-f\b)|reset\s+--hard|clean\s+-[a-z]*f|branch\s+-D)/i, why: 'destructive git operation' },
  { re: /\b(?:rm|del|erase|rd|rmdir|Remove-Item)\b[^\n]*(?:-rf\b|-fr\b|\/s\b|\/q\b|-Recurse\b|-Force\b)/i, why: 'recursive deletion' },
  { re: /\b(taskkill|Stop-Process|kill)\b/i, why: 'terminating processes' },
  { re: /\b(?:shutdown|Restart-Computer|Stop-Computer)\b/i, why: 'power state change' },
  { re: /\b(?:npm|pnpm|yarn)\s+publish\b/i, why: 'publishing a package' },
  { re: /\bgit\s+checkout\s+--\s+\./i, why: 'discarding working tree changes' },
  { re: /\b(?:chmod|chown|attrib)\b[^\n]*(?:777|\/s\b)/i, why: 'broad permission change' },
  { re: /[>|]\s*(?:[a-z]:\\|\\\\|\/etc\/|\/usr\/)/i, why: 'redirection into a system path' }
];

const MEDIUM_PATTERNS = [
  { re: /\b(?:npm|pnpm|yarn)\s+(?:install|i|add|update|upgrade)\b/i, why: 'dependency installation' },
  { re: /\b(?:pip|pip3)\s+install\b/i, why: 'dependency installation' },
  { re: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:dev|start|serve|build|test)\b/i, why: 'running project code' },
  { re: /\b(?:node|python|python3|py|deno|bun|ruby|php)\b\s+\S+/i, why: 'executing project code' },
  { re: /\bgit\s+(?:commit|merge|rebase|cherry-pick|tag)\b/i, why: 'repository history change' },
  { re: /\bgit\s+push\b/i, why: 'publishing commits' },
  { re: /\b(?:tsc|vite|electron|dotnet|java|javac|cargo|go)\b/i, why: 'build or execution' }
];

function firstToken(command) {
  const text = String(command || '').trim();
  if (!text) return '';
  const quoted = text.match(/^"([^"]+)"|^'([^']+)'/);
  if (quoted) return (quoted[1] || quoted[2] || '').trim();
  return text.split(/\s+/)[0];
}

function runtimeName(token) {
  const raw = String(token || '').replace(/^["']|["']$/g, '');
  return path.basename(raw).toLowerCase();
}

function classifyCommand(command) {
  const text = String(command || '').trim();
  if (!text) return { risk: RISK.BLOCKED, reasons: ['empty command'], executable: '', allowed: false };
  if (text.length > 4000) return { risk: RISK.BLOCKED, reasons: ['command is too long'], executable: '', allowed: false };

  const exe = firstToken(text);
  const name = runtimeName(exe);
  const reasons = [];

  for (const p of BLOCKED_PATTERNS) {
    if (p.re.test(text)) reasons.push(p.why);
  }
  if (reasons.length) {
    return { risk: RISK.BLOCKED, reasons, executable: name, allowed: false };
  }

  if (!ALLOWED_RUNTIMES.has(name)) {
    return {
      risk: RISK.BLOCKED,
      reasons: [`executable "${name || exe}" is not on the approved list`],
      executable: name,
      allowed: false
    };
  }

  const high = HIGH_PATTERNS.filter(p => p.re.test(text)).map(p => p.why);
  if (high.length) return { risk: RISK.HIGH, reasons: high, executable: name, allowed: true };

  const medium = MEDIUM_PATTERNS.filter(p => p.re.test(text)).map(p => p.why);
  if (medium.length) return { risk: RISK.MEDIUM, reasons: medium, executable: name, allowed: true };

  return { risk: RISK.LOW, reasons: [], executable: name, allowed: true };
}

function realOrParent(target) {
  const fs = require('fs');
  let current = path.resolve(target);
  for (let i = 0; i < 8; i++) {
    try {
      return fs.realpathSync.native(current);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(target);
}

function isWithin(root, target) {
  if (!root || !target) return false;
  const r = path.resolve(root);
  const t = path.resolve(target);
  const rel = path.relative(r, t);
  return rel === '' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

function normalizePath(target) {
  return String(target || '').replace(/^~(?=$|[\\/])/, require('os').homedir());
}

function validatePath(target, roots, opts = {}) {
  const source = normalizePath(target);
  if (!source || source.includes('\0')) return { ok: false, reason: 'invalid path' };
  if (source.length > 1000) return { ok: false, reason: 'path is too long' };

  let resolved;
  try {
    resolved = realOrParent(source);
  } catch {
    return { ok: false, reason: 'could not resolve path' };
  }

  const list = (Array.isArray(roots) ? roots : [roots]).filter(Boolean).map(r => realOrParent(r));
  if (!list.length) return { ok: false, reason: 'no workspace roots are configured', path: resolved };

  const inside = list.find(root => isWithin(root, resolved));
  if (!inside) {
    return { ok: false, reason: 'path is outside the approved workspace roots', path: resolved };
  }

  const rel = path.relative(inside, resolved);
  const segments = rel.split(/[\\/]+/).filter(Boolean).map(s => s.toLowerCase());
  const sensitive = new Set(['.git', '.ssh', '.aws', '.azure', '.kube', 'windows', 'system32']);
  const hit = segments.find(s => sensitive.has(s));
  if (hit && opts.allowSensitive !== true) {
    return { ok: false, reason: `path touches a protected area (${hit})`, path: resolved, root: inside };
  }

  return { ok: true, path: resolved, root: inside, relative: rel };
}

function fingerprint(action, target, extra) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ action, target: String(target || ''), extra: extra || null }))
    .digest('hex');
}

const SECRET_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^\s"',;]{6,}/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi
];

function redactSecrets(text, maxLength = 200000) {
  let out = String(text == null ? '' : text);
  for (const re of SECRET_PATTERNS) out = out.replace(re, m => {
    if (/^(?:api|token|secret|password)/i.test(m)) return m.split(/[:=]/)[0] + '=[REDACTED]';
    if (/^Bearer/i.test(m)) return 'Bearer [REDACTED]';
    return '[REDACTED]';
  });
  if (out.length > maxLength) out = out.slice(0, maxLength) + `\n…[truncated ${out.length - maxLength} chars]`;
  return out;
}

function isSensitiveName(name) {
  const n = String(name || '').toLowerCase();
  return n === '.env' || n.startsWith('.env.') || n.includes('credential') || n.includes('secret') ||
    n === 'id_rsa' || n === 'id_ed25519' || n.endsWith('.pem') || n.endsWith('.pfx') || n.endsWith('.key');
}

module.exports = {
  RISK,
  ALLOWED_RUNTIMES,
  classifyCommand,
  validatePath,
  isWithin,
  normalizePath,
  fingerprint,
  redactSecrets,
  isSensitiveName,
  firstToken,
  runtimeName
};
