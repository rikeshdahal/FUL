const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

function readJson(p, def = null) {
  try {
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return def;
  }
}

function writeJson(p, obj) {
  try {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

module.exports = { ensureDir, readJson, writeJson };
