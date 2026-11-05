/**
 * FUL Long-Term Memory Engine - Ported from Mark-LVI
 * Provides deep persistent context, identity tracking, user preferences,
 * project awareness, relationship records, and instant lexical recall.
 */

const fs = require('fs');
const path = require('path');

const MAX_VALUE_LENGTH = 380;
const MEMORY_MAX_CHARS = 200000;
const PROMPT_CORE_CHARS = 900;
const PROMPT_INDEX_CHARS = 420;
const PROMPT_MAX_PER_CATEGORY = 6;

const CATEGORY_LABELS = {
  preferences: 'Preferences',
  projects: 'Active projects / goals',
  relationships: 'People in their life',
  wishes: 'Wishes / plans',
  notes: 'Notes'
};

const IDENTITY_FIELDS = [
  'name', 'age', 'birthday', 'city', 'job',
  'language', 'school', 'nationality'
];

let cachedMemoryPath = null;

function getMemoryPath() {
  if (cachedMemoryPath) return cachedMemoryPath;
  const bases = [];
  if (process.env.APPDATA) bases.push(path.join(process.env.APPDATA, 'ful'));
  if (process.env.LOCALAPPDATA) bases.push(path.join(process.env.LOCALAPPDATA, 'ful'));
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) bases.push(path.join(home, '.config', 'ful'));
  
  for (const b of bases) {
    try {
      if (fs.existsSync(b)) {
        cachedMemoryPath = path.join(b, 'ful-memory.json');
        return cachedMemoryPath;
      }
    } catch {}
  }
  const defaultDir = bases[0] || path.join(__dirname, 'data');
  try { fs.mkdirSync(defaultDir, { recursive: true }); } catch {}
  cachedMemoryPath = path.join(defaultDir, 'ful-memory.json');
  return cachedMemoryPath;
}

function emptyMemory() {
  return {
    identity: {
      name: { value: 'Rikesh Dahal', updated: new Date().toISOString().slice(0, 10) }
    },
    preferences: {},
    projects: {
      ful: { value: 'Building FUL AI desktop voice & screen companion with Mark-LVI capabilities', updated: new Date().toISOString().slice(0, 10) }
    },
    relationships: {},
    wishes: {},
    notes: {},
    sessions: []
  };
}

function loadMemory() {
  const file = getMemoryPath();
  const base = emptyMemory();
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        for (const k of Object.keys(base)) {
          if (!parsed[k] || (typeof parsed[k] === 'object' && !Array.isArray(parsed[k]) && !Object.keys(parsed[k]).length)) {
            parsed[k] = base[k];
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Memory] Failed to read memory file:', err);
  }

  // Attempt to import seed memories from Mark-LVI if available
  try {
    const markLviPath = path.join(__dirname, 'Mark-LVI', 'memory', 'long_term.json');
    if (fs.existsSync(markLviPath)) {
      const mlvi = JSON.parse(fs.readFileSync(markLviPath, 'utf8'));
      if (mlvi && typeof mlvi === 'object') {
        const merged = { ...base, ...mlvi };
        if (!merged.identity || !Object.keys(merged.identity).length) merged.identity = base.identity;
        if (!merged.projects || !Object.keys(merged.projects).length) merged.projects = base.projects;
        saveMemory(merged);
        return merged;
      }
    }
  } catch {}

  const fresh = emptyMemory();
  saveMemory(fresh);
  return fresh;
}

function trimToLimit(memory) {
  let jsonStr = JSON.stringify(memory);
  if (jsonStr.length <= MEMORY_MAX_CHARS) return memory;

  const entries = [];
  for (const [cat, items] of Object.entries(memory)) {
    if (cat === 'sessions' || !items || typeof items !== 'object') continue;
    for (const [k, v] of Object.entries(items)) {
      if (v && typeof v === 'object' && v.value) {
        entries.push({ cat, key: k, updated: v.updated || '0000-00-00' });
      }
    }
  }

  entries.sort((a, b) => (a.updated > b.updated ? 1 : -1));
  for (const item of entries) {
    if (JSON.stringify(memory).length <= MEMORY_MAX_CHARS) break;
    delete memory[item.cat][item.key];
  }
  return memory;
}

function saveMemory(memory) {
  if (!memory || typeof memory !== 'object') return;
  const file = getMemoryPath();
  try {
    const trimmed = trimToLimit(memory);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    console.error('[Memory] Error saving memory:', err);
  }
}

function prettyKey(key) {
  return String(key || '').replace(/_/g, ' ').trim();
}

function entryValue(entry) {
  if (entry && typeof entry === 'object') {
    return String(entry.value || '').trim();
  }
  return String(entry || '').trim();
}

function updateMemory({ category, key, value }) {
  if (!key || value == null) return { ok: false, error: 'Missing key or value' };
  const cat = String(category || 'notes').toLowerCase().trim();
  const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!cleanKey) return { ok: false, error: 'Invalid key' };

  let cleanVal = String(value).trim();
  if (cleanVal.length > MAX_VALUE_LENGTH) {
    cleanVal = cleanVal.slice(0, MAX_VALUE_LENGTH).trim() + '…';
  }

  const memory = loadMemory();
  if (!memory[cat] || typeof memory[cat] !== 'object') {
    memory[cat] = {};
  }

  const today = new Date().toISOString().slice(0, 10);
  memory[cat][cleanKey] = {
    value: cleanVal,
    updated: today
  };

  saveMemory(memory);
  return { ok: true, category: cat, key: cleanKey, value: cleanVal, updated: today };
}

function forgetMemory({ category, key }) {
  if (!key) return { ok: false, error: 'Missing key' };
  const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9_]+/g, '_').trim();
  const memory = loadMemory();
  let deleted = false;

  if (category && memory[category] && memory[category][cleanKey]) {
    delete memory[category][cleanKey];
    deleted = true;
  } else {
    // Search all categories
    for (const cat of Object.keys(memory)) {
      if (cat === 'sessions' || !memory[cat] || typeof memory[cat] !== 'object') continue;
      if (memory[cat][cleanKey]) {
        delete memory[cat][cleanKey];
        deleted = true;
      }
    }
  }

  if (deleted) saveMemory(memory);
  return { ok: deleted, key: cleanKey };
}

function scoreRelevance(queryWords, cat, key, val) {
  const hayKey = prettyKey(key).toLowerCase();
  const hayVal = val.toLowerCase();
  let s = 0;
  for (const w of queryWords) {
    if (!w) continue;
    if (w === hayKey) s += 10;
    else if (hayKey.includes(w)) s += 6;
    if (hayVal.includes(w)) s += 3;
    if (cat.includes(w)) s += 1;
  }
  return s;
}

function searchMemory(query, limit = 8) {
  const memory = loadMemory();
  const rawQuery = String(query || '').trim().toLowerCase();
  const words = rawQuery ? rawQuery.split(/[^a-z0-9]+/).filter(w => w.length > 1) : [];

  const rows = [];
  for (const [cat, items] of Object.entries(memory)) {
    if (cat === 'sessions' || !items || typeof items !== 'object') continue;
    for (const [k, entry] of Object.entries(items)) {
      const val = entryValue(entry);
      if (!val) continue;
      const s = words.length ? scoreRelevance(words, cat, k, val) : 1;
      if (s > 0) {
        rows.push({ score: s, category: cat, key: k, value: val });
      }
    }
  }

  if (!rows.length) {
    return rawQuery
      ? `Nothing found in long-term memory about "${rawQuery}".`
      : 'I have not stored any personal facts about you yet.';
  }

  rows.sort((a, b) => b.score - a.score);
  const selected = rows.slice(0, Math.max(1, limit));
  const lines = selected.map(r => `${r.category}/${prettyKey(r.key)}: ${r.value}`);
  const header = rawQuery
    ? `Stored facts matching "${rawQuery}":`
    : 'Everything currently stored in long-term memory:';
  const more = rows.length > selected.length ? `\n(+${rows.length - selected.length} more — query with specific keyword)` : '';
  return header + '\n' + lines.join('\n') + more;
}

function formatMemoryForPrompt(memory = null) {
  const mem = memory || loadMemory();
  const coreLines = [];

  // 1. Identity in full
  const identity = mem.identity || {};
  for (const f of IDENTITY_FIELDS) {
    const val = entryValue(identity[f]);
    if (!val) continue;
    if (f === 'language') {
      coreLines.push(`Has spoken to you in: ${val} (observation — answer in language of CURRENT message)`);
    } else {
      coreLines.push(`${f.charAt(0).toUpperCase() + f.slice(1)}: ${val}`);
    }
  }

  for (const [k, v] of Object.entries(identity)) {
    if (IDENTITY_FIELDS.includes(k)) continue;
    const val = entryValue(v);
    if (val) coreLines.push(`${prettyKey(k)}: ${val}`);
  }

  // 2. Recency-ordered facts across other categories
  const rest = [];
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    const catItems = mem[cat] || {};
    for (const [k, v] of Object.entries(catItems)) {
      const val = entryValue(v);
      if (!val) continue;
      const updated = (v && typeof v === 'object' && v.updated) ? v.updated : '0000-00-00';
      rest.push({ updated, cat, key: k, value: val });
    }
  }

  rest.sort((a, b) => (a.updated < b.updated ? 1 : -1));

  let used = coreLines.reduce((acc, l) => acc + l.length + 1, 0);
  const shown = {};
  const overflow = {};
  const perCatCount = {};

  for (const item of rest) {
    const line = `  - ${prettyKey(item.key)}: ${item.value}`;
    const curCatCount = perCatCount[item.cat] || 0;
    if (curCatCount < PROMPT_MAX_PER_CATEGORY && (used + line.length + 1 <= PROMPT_CORE_CHARS)) {
      if (!shown[item.cat]) shown[item.cat] = [];
      shown[item.cat].push(line);
      perCatCount[item.cat] = curCatCount + 1;
      used += line.length + 1;
    } else {
      if (!overflow[item.cat]) overflow[item.cat] = [];
      overflow[item.cat].push(prettyKey(item.key));
    }
  }

  // 3. Table of contents of overflow items
  const indexed = [];
  if (Object.keys(overflow).length) {
    const cats = Object.keys(CATEGORY_LABELS).filter(c => overflow[c] && overflow[c].length);
    const cursor = {};
    cats.forEach(c => { cursor[c] = 0; });
    while (cats.length) {
      for (const c of [...cats]) {
        const i = cursor[c];
        if (i >= overflow[c].length) {
          cats.splice(cats.indexOf(c), 1);
          continue;
        }
        indexed.push(overflow[c][i]);
        cursor[c] = i + 1;
      }
    }
  }

  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    if (shown[cat] && shown[cat].length) {
      coreLines.push('');
      coreLines.push(`${label}:`);
      coreLines.push(...shown[cat]);
    }
  }

  if (!coreLines.length && !indexed.length) return '';

  const out = [
    '[WHAT YOU KNOW ABOUT THIS PERSON — use naturally, never recite like a list]',
    ...coreLines
  ];

  if (indexed.length) {
    let budget = PROMPT_INDEX_CHARS;
    const names = [];
    for (const n of indexed) {
      if (budget - n.length - 2 < 0) break;
      names.push(n);
      budget -= n.length + 2;
    }
    if (names.length) {
      out.push('');
      out.push('[ALSO REMEMBERED — Call recall_memory with keyword to read any of these before saying you do not know]');
      out.push(names.join(', ') + (indexed.length > names.length ? ` (+${indexed.length - names.length} more)` : ''));
    }
  }

  return out.join('\n') + '\n';
}

function saveSessionSummary(summary, language = 'English') {
  if (!summary) return;
  const memory = loadMemory();
  if (!Array.isArray(memory.sessions)) memory.sessions = [];
  memory.sessions.push({
    date: new Date().toISOString().slice(0, 10),
    summary: String(summary).trim().slice(0, 500),
    language
  });
  if (memory.sessions.length > 15) {
    memory.sessions.splice(0, memory.sessions.length - 15);
  }
  saveMemory(memory);
}

module.exports = {
  loadMemory,
  saveMemory,
  updateMemory,
  forgetMemory,
  searchMemory,
  formatMemoryForPrompt,
  saveSessionSummary
};
