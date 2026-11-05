/**
 * FUL Ultimate Actions Engine - Inspired by Mark-LVI
 * Brings autonomous software engineering, full file system mastery,
 * desktop organization, hardware settings, process monitoring,
 * and multi-level undo capabilities to FUL.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, exec, spawn } = require('child_process');

/* -------------------------------------------------------------------------
 * Undo Stack & Transaction History
 * ------------------------------------------------------------------------- */
const UNDO_STACK = [];
const MAX_UNDO_ITEMS = 50;

function pushUndo(action) {
  UNDO_STACK.push({ ...action, timestamp: Date.now() });
  if (UNDO_STACK.length > MAX_UNDO_ITEMS) UNDO_STACK.shift();
}

async function executeUndo() {
  if (!UNDO_STACK.length) {
    return 'Nothing to undo. Undo history is empty.';
  }
  const last = UNDO_STACK.pop();
  try {
    switch (last.type) {
      case 'file_move': {
        if (fs.existsSync(last.destination)) {
          fs.renameSync(last.destination, last.source);
          return `Undone: Moved "${path.basename(last.source)}" back to its original location.`;
        }
        return `Could not undo: "${last.destination}" no longer exists.`;
      }
      case 'file_write': {
        if (last.backupContent != null && fs.existsSync(last.path)) {
          fs.writeFileSync(last.path, last.backupContent, 'utf8');
          return `Undone: Restored previous contents of "${path.basename(last.path)}".`;
        }
        return `Could not undo file write for "${last.path}".`;
      }
      case 'file_create': {
        if (fs.existsSync(last.path)) {
          fs.unlinkSync(last.path);
          return `Undone: Removed newly created file "${path.basename(last.path)}".`;
        }
        return `File "${last.path}" already removed.`;
      }
      case 'desktop_organize': {
        let count = 0;
        for (const item of (last.moves || [])) {
          if (fs.existsSync(item.dest)) {
            try {
              fs.renameSync(item.dest, item.orig);
              count++;
            } catch {}
          }
        }
        return `Undone desktop organization: Restored ${count} files back to the Desktop.`;
      }
      default:
        return `Undo for action type "${last.type}" is not supported.`;
    }
  } catch (err) {
    return `Undo failed: ${err.message}`;
  }
}

/* -------------------------------------------------------------------------
 * Path Helpers
 * ------------------------------------------------------------------------- */
function resolveStandardPath(raw) {
  if (!raw || typeof raw !== 'string') return path.join(os.homedir(), 'Desktop');
  const lower = raw.trim().toLowerCase();
  const home = os.homedir();
  if (lower === 'desktop') return path.join(home, 'Desktop');
  if (lower === 'downloads') return path.join(home, 'Downloads');
  if (lower === 'documents' || lower === 'docs') return path.join(home, 'Documents');
  if (lower === 'pictures' || lower === 'images') return path.join(home, 'Pictures');
  if (lower === 'music') return path.join(home, 'Music');
  if (lower === 'videos') return path.join(home, 'Videos');
  if (lower === 'home' || lower === '~') return home;
  if (lower === 'temp') return os.tmpdir();
  if (path.isAbsolute(raw)) return path.normalize(raw);
  if (raw.startsWith('~/') || raw.startsWith('~\\')) return path.join(home, raw.slice(2));
  return path.resolve(process.cwd(), raw);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function runPs(script, timeout = 15000) {
  return new Promise(resolve => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout, windowsHide: true },
      (err, stdout, stderr) => {
        if (err || stderr) {
          console.warn('[PS_EXEC_WARN]', err?.message || stderr);
        }
        resolve((stdout || '').trim());
      });
  });
}

/* -------------------------------------------------------------------------
 * 1. File Controller - Complete File Mastery & Organization
 * ------------------------------------------------------------------------- */
const FileController = {
  async listFiles({ targetPath = 'desktop', showHidden = false }) {
    const dir = resolveStandardPath(targetPath);
    if (!fs.existsSync(dir)) return `Directory does not exist: ${dir}`;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const filtered = entries.filter(e => showHidden || !e.name.startsWith('.'));
      if (!filtered.length) return `Folder is empty: ${dir}`;

      const lines = filtered.slice(0, 50).map(e => {
        try {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) return `📁 [DIR]  ${e.name}`;
          const stat = fs.statSync(full);
          return `📄 [FILE] ${e.name.padEnd(28)} (${formatBytes(stat.size)})`;
        } catch {
          return `📄 ${e.name}`;
        }
      });
      const more = filtered.length > 50 ? `\n... and ${filtered.length - 50} more items.` : '';
      return `Contents of ${dir} (${filtered.length} items):\n${lines.join('\n')}${more}`;
    } catch (err) {
      return `Failed to list files: ${err.message}`;
    }
  },

  async readFile({ filePath, maxLines = 150 }) {
    const resolved = resolveStandardPath(filePath);
    if (!fs.existsSync(resolved)) return `File not found: ${resolved}`;
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      const lines = content.split(/\r?\n/);
      if (lines.length > maxLines) {
        return `Showing first ${maxLines} lines of ${path.basename(resolved)}:\n` +
          lines.slice(0, maxLines).join('\n') + `\n... [${lines.length - maxLines} lines truncated]`;
      }
      return content || '(File is empty)';
    } catch (err) {
      return `Could not read file: ${err.message}`;
    }
  },

  async writeFile({ filePath, content = '', append = false }) {
    const resolved = resolveStandardPath(filePath);
    try {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      if (fs.existsSync(resolved) && !append) {
        const oldContent = fs.readFileSync(resolved, 'utf8');
        pushUndo({ type: 'file_write', path: resolved, backupContent: oldContent });
      } else if (!fs.existsSync(resolved)) {
        pushUndo({ type: 'file_create', path: resolved });
      }

      if (append) {
        fs.appendFileSync(resolved, content, 'utf8');
        return `Appended content to "${path.basename(resolved)}".`;
      } else {
        fs.writeFileSync(resolved, content, 'utf8');
        return `Successfully written to "${path.basename(resolved)}" (${formatBytes(Buffer.byteLength(content))}).`;
      }
    } catch (err) {
      return `Failed to write file: ${err.message}`;
    }
  },

  async createFolder({ folderPath }) {
    const resolved = resolveStandardPath(folderPath);
    try {
      fs.mkdirSync(resolved, { recursive: true });
      return `Created folder: ${resolved}`;
    } catch (err) {
      return `Failed to create folder: ${err.message}`;
    }
  },

  async deleteFile({ filePath }) {
    const resolved = resolveStandardPath(filePath);
    if (!fs.existsSync(resolved)) return `File does not exist: ${resolved}`;
    try {
      // Safe Recycle Bin deletion via PowerShell COM/VisualBasic API
      const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${resolved.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
      await runPs(script);
      if (!fs.existsSync(resolved)) {
        return `Safely moved "${path.basename(resolved)}" to the Recycle Bin.`;
      }
      // Fallback to unlink if needed
      fs.unlinkSync(resolved);
      return `Deleted "${path.basename(resolved)}".`;
    } catch (err) {
      return `Failed to delete file: ${err.message}`;
    }
  },

  async moveFile({ source, destination }) {
    const src = resolveStandardPath(source);
    let dst = resolveStandardPath(destination);
    if (!fs.existsSync(src)) return `Source does not exist: ${src}`;
    try {
      if (fs.existsSync(dst) && fs.statSync(dst).isDirectory()) {
        dst = path.join(dst, path.basename(src));
      } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
      }
      fs.renameSync(src, dst);
      pushUndo({ type: 'file_move', source: src, destination: dst });
      return `Moved "${path.basename(src)}" to "${dst}".`;
    } catch (err) {
      return `Failed to move file: ${err.message}`;
    }
  },

  async copyFile({ source, destination }) {
    const src = resolveStandardPath(source);
    let dst = resolveStandardPath(destination);
    if (!fs.existsSync(src)) return `Source does not exist: ${src}`;
    try {
      if (fs.existsSync(dst) && fs.statSync(dst).isDirectory()) {
        dst = path.join(dst, path.basename(src));
      } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
      }
      fs.copyFileSync(src, dst);
      return `Copied "${path.basename(src)}" to "${dst}".`;
    } catch (err) {
      return `Failed to copy file: ${err.message}`;
    }
  },

  async renameFile({ filePath, newName }) {
    const src = resolveStandardPath(filePath);
    if (!fs.existsSync(src)) return `Target does not exist: ${src}`;
    try {
      const cleanName = path.basename(newName);
      const dst = path.join(path.dirname(src), cleanName);
      fs.renameSync(src, dst);
      pushUndo({ type: 'file_move', source: src, destination: dst });
      return `Renamed "${path.basename(src)}" to "${cleanName}".`;
    } catch (err) {
      return `Failed to rename: ${err.message}`;
    }
  },

  async findFiles({ query = '', extension = '', searchPath = 'home', maxResults = 20 }) {
    const root = resolveStandardPath(searchPath);
    if (!fs.existsSync(root)) return `Search directory does not exist: ${root}`;
    const results = [];

    function searchDir(dir, depth = 0) {
      if (depth > 4 || results.length >= maxResults) return;
      try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '$Recycle.Bin') continue;
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            searchDir(full, depth + 1);
          } else {
            const matchesQuery = !query || item.name.toLowerCase().includes(query.toLowerCase());
            const matchesExt = !extension || item.name.toLowerCase().endsWith(extension.toLowerCase());
            if (matchesQuery && matchesExt) {
              const stat = fs.statSync(full);
              results.push({ name: item.name, path: full, size: formatBytes(stat.size) });
              if (results.length >= maxResults) return;
            }
          }
        }
      } catch {}
    }

    searchDir(root, 0);
    if (!results.length) return `No files found matching "${query || extension}" in ${root}.`;
    const lines = results.map(r => `📄 ${r.name.padEnd(28)} (${r.size}) - ${r.path}`);
    return `Found ${results.length} files in ${root}:\n${lines.join('\n')}`;
  },

  async getLargestFiles({ targetPath = 'downloads', count = 10 }) {
    const dir = resolveStandardPath(targetPath);
    if (!fs.existsSync(dir)) return `Directory does not exist: ${dir}`;
    const files = [];

    function scan(d, depth = 0) {
      if (depth > 3) return;
      try {
        const items = fs.readdirSync(d, { withFileTypes: true });
        for (const it of items) {
          if (it.name.startsWith('.') || it.name === 'node_modules') continue;
          const full = path.join(d, it.name);
          if (it.isDirectory()) scan(full, depth + 1);
          else {
            const s = fs.statSync(full);
            files.push({ name: it.name, path: full, size: s.size });
          }
        }
      } catch {}
    }

    scan(dir, 0);
    files.sort((a, b) => b.size - a.size);
    const top = files.slice(0, count);
    if (!top.length) return `No files found in ${dir}.`;
    const lines = top.map((f, i) => `${i + 1}) ${f.name.padEnd(30)} [${formatBytes(f.size)}] - ${f.path}`);
    return `Largest ${top.length} files in ${dir}:\n${lines.join('\n')}`;
  },

  async getDiskUsage() {
    try {
      const script = `Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,1)}}, @{Name="UsedGB";Expression={[math]::Round(($_.Used)/1GB,1)}}, @{Name="TotalGB";Expression={[math]::Round(($_.Used+$_.Free)/1GB,1)}} | ConvertTo-Json`;
      const out = await runPs(script);
      const parsed = JSON.parse(out);
      const drives = Array.isArray(parsed) ? parsed : [parsed];
      const lines = drives.filter(Boolean).map(d =>
        `Drive ${d.Name}: ${d.FreeGB} GB free of ${d.TotalGB} GB total (${Math.round((d.FreeGB / (d.TotalGB || 1)) * 100)}% available)`
      );
      return lines.join('\n') || 'Disk usage retrieved.';
    } catch (e) {
      return `Failed to inspect disk usage: ${e.message}`;
    }
  },

  async organizeDesktop() {
    const desktop = path.join(os.homedir(), 'Desktop');
    if (!fs.existsSync(desktop)) return 'Desktop directory not found.';

    const CATEGORIES = {
      '📁 Documents': ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.ppt', '.csv', '.md'],
      '📁 Images': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'],
      '📁 Media': ['.mp4', '.mp3', '.wav', '.mkv', '.avi', '.mov', '.flac', '.webm'],
      '📁 Archives': ['.zip', '.rar', '.7z', '.tar', '.gz'],
      '📁 Installers': ['.exe', '.msi', '.iso'],
      '📁 Code & Dev': ['.js', '.py', '.html', '.css', '.json', '.ts', '.cpp', '.cs', '.java', '.rs', '.sql']
    };

    const protectedFolders = new Set(Object.keys(CATEGORIES).concat(['Desktop', 'node_modules', '$Recycle.Bin']));
    const items = fs.readdirSync(desktop, { withFileTypes: true });
    const moves = [];

    for (const item of items) {
      if (item.isDirectory() || item.name.startsWith('.') || item.name.endsWith('.lnk') || protectedFolders.has(item.name)) {
        continue;
      }
      const ext = path.extname(item.name).toLowerCase();
      let targetFolder = null;
      for (const [folderName, extList] of Object.entries(CATEGORIES)) {
        if (extList.includes(ext)) {
          targetFolder = folderName;
          break;
        }
      }
      if (targetFolder) {
        const destDir = path.join(desktop, targetFolder);
        fs.mkdirSync(destDir, { recursive: true });
        const srcPath = path.join(desktop, item.name);
        const dstPath = path.join(destDir, item.name);
        try {
          fs.renameSync(srcPath, dstPath);
          moves.push({ orig: srcPath, dest: dstPath });
        } catch {}
      }
    }

    if (!moves.length) {
      return 'Desktop is already tidy! No loose unorganized files found.';
    }
    pushUndo({ type: 'desktop_organize', moves });
    return `Successfully organized ${moves.length} files on your Desktop into categorized folders (Documents, Images, Media, Archives, Installers, Code). You can say "undo" anytime to restore them.`;
  }
};

/* -------------------------------------------------------------------------
 * 2. Computer & Hardware Settings Controller
 * ------------------------------------------------------------------------- */
const ComputerSettings = {
  async setBrightness({ level = 70 }) {
    const val = Math.max(0, Math.min(100, Math.round(level)));
    try {
      const script = `(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${val})`;
      await runPs(script);
      return `Screen brightness set to ${val}%.`;
    } catch {
      return `Brightness adjustment sent (${val}%).`;
    }
  },

  async wifiScan() {
    try {
      const out = await runPs('netsh wlan show networks mode=bssid');
      const lines = out.split('\n');
      const ssids = [];
      for (const line of lines) {
        const m = line.match(/SSID\s+\d+\s+:\s+(.+)/i);
        if (m && m[1].trim() && !ssids.includes(m[1].trim())) {
          ssids.push(m[1].trim());
        }
      }
      if (!ssids.length) return 'No Wi-Fi networks found in range or Wi-Fi is disabled.';
      return `Available Wi-Fi Networks (${ssids.length}):\n• ${ssids.slice(0, 10).join('\n• ')}`;
    } catch (e) {
      return `Failed to scan Wi-Fi: ${e.message}`;
    }
  },

  async wifiToggle({ enable = true }) {
    try {
      const state = enable ? 'enable' : 'disable';
      await runPs(`netsh interface set interface "Wi-Fi" admin=${state}`);
      return `Wi-Fi adapter has been ${enable ? 'enabled' : 'disabled'}.`;
    } catch (e) {
      return `Failed to toggle Wi-Fi: ${e.message}`;
    }
  },

  async cleanTemp() {
    try {
      const script = `
        $bytes = 0
        Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
          try {
            $bytes += $_.Length
            Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue
          } catch {}
        }
        [math]::Round($bytes / 1MB, 1)
      `;
      const mb = await runPs(script);
      return `Temporary cache cleared. Freed approximately ${mb || '0'} MB of disk space.`;
    } catch (e) {
      return `Cleaned temporary files.`;
    }
  },

  async processList({ count = 10 }) {
    try {
      const script = `
        Get-Process | Sort-Object -Descending WS | Select-Object -First ${count} -Property ProcessName, Id, @{Name="RAM_MB";Expression={[math]::Round($_.WS/1MB,1)}}, @{Name="CPU_s";Expression={[math]::Round($_.CPU,1)}} | ConvertTo-Json
      `;
      const out = await runPs(script);
      const parsed = JSON.parse(out);
      const procs = Array.isArray(parsed) ? parsed : [parsed];
      const lines = procs.filter(Boolean).map((p, i) =>
        `${i + 1}) ${p.ProcessName.padEnd(20)} [${p.RAM_MB} MB RAM] (PID: ${p.Id})`
      );
      return `Top memory-consuming processes:\n${lines.join('\n')}`;
    } catch (e) {
      return `Could not retrieve process list: ${e.message}`;
    }
  },

  async killProcess({ processName }) {
    if (!processName) return 'Please specify process name to close.';
    const clean = processName.replace(/\.exe$/i, '').trim();
    // Safety guard: Never close FUL itself or critical OS components
    const protectedNames = ['electron', 'nixi', 'ful', 'explorer', 'dwm', 'csrss', 'smss', 'system'];
    if (protectedNames.includes(clean.toLowerCase())) {
      return `Safety restriction: Cannot terminate critical process "${clean}".`;
    }
    try {
      await runPs(`Stop-Process -Name "${clean}" -Force -ErrorAction SilentlyContinue`);
      return `Closed application "${clean}".`;
    } catch (e) {
      return `Could not close "${clean}": ${e.message}`;
    }
  },

  async batteryReport() {
    try {
      const script = `
        $b = Get-CimInstance -ClassName Win32_Battery
        if ($b) {
          @{
            Percent = $b.EstimatedChargeRemaining
            Status = $b.BatteryStatus
            TimeRemaining = $b.EstimatedRunTime
            DesignCap = $b.DesignCapacity
            FullCap = $b.FullChargeCapacity
          } | ConvertTo-Json
        }
      `;
      const out = await runPs(script);
      if (!out) return 'Battery information is not available (Desktop or AC power).';
      const b = JSON.parse(out);
      const statusMap = { 1: 'Discharging', 2: 'On AC Power / Charging', 3: 'Fully Charged', 4: 'Low', 5: 'Critical' };
      const statusText = statusMap[b.Status] || 'Running on battery';
      const runtime = b.TimeRemaining && b.TimeRemaining < 71582 ? ` (approx. ${Math.round(b.TimeRemaining / 60)} hrs remaining)` : '';
      return `Battery: ${b.Percent}% • ${statusText}${runtime}.`;
    } catch (e) {
      return `Battery status could not be read.`;
    }
  }
};

/* -------------------------------------------------------------------------
 * 3. Real-time Live Weather Report (Zero API Key, Open-Meteo & Wttr)
 * ------------------------------------------------------------------------- */
async function getWeatherReport({ location = '' }) {
  const city = (location || '').trim();
  try {
    const url = city
      ? `https://wttr.in/${encodeURIComponent(city)}?format=%l:+%C+%t+(feels+like+%f)+|+Humidity:+%h+|+Wind:+%w`
      : `https://wttr.in/?format=%l:+%C+%t+(feels+like+%f)+|+Humidity:+%h+|+Wind:+%w`;
    const res = await fetch(url, { headers: { 'User-Agent': 'curl/7.68.0' } });
    if (res.ok) {
      const text = await res.text();
      return text.trim() || `Weather report for ${city || 'your location'} received.`;
    }
  } catch {}
  return `Currently unable to fetch live weather for ${city || 'location'}. Please check internet connection.`;
}

/* -------------------------------------------------------------------------
 * 4. Autonomous Developer & Coding Agent (dev_agent)
 * Inspired by Mark-LVI dev_agent.py
 * ------------------------------------------------------------------------- */
const DevAgent = {
  async executeCommand({ command, cwd = process.cwd(), timeout = 30000 }) {
    return new Promise(resolve => {
      exec(command, { cwd, timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
        const out = (stdout || '').trim();
        const errOut = (stderr || '').trim();
        const exitCode = err ? (err.code || 1) : 0;
        resolve({
          success: exitCode === 0,
          exitCode,
          output: out || errOut,
          stderr: errOut,
          stdout: out
        });
      });
    });
  },

  async scaffoldProject({ projectName, projectType = 'node', files = {}, autoInstall = true }) {
    const baseDir = path.join(os.homedir(), 'Desktop', projectName || 'ful_project');
    try {
      fs.mkdirSync(baseDir, { recursive: true });
      const createdFiles = [];

      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.join(baseDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
        createdFiles.push(relPath);
      }

      let installMsg = '';
      if (autoInstall) {
        if (files['package.json']) {
          await this.executeCommand({ command: 'npm install', cwd: baseDir, timeout: 60000 });
          installMsg = ' Dependencies installed via npm.';
        } else if (files['requirements.txt']) {
          await this.executeCommand({ command: 'pip install -r requirements.txt', cwd: baseDir, timeout: 60000 });
          installMsg = ' Dependencies installed via pip.';
        }
      }

      // Launch in VS Code if available
      exec(`code "${baseDir}"`, () => {});

      return `Project "${projectName}" created successfully at "${baseDir}" with ${createdFiles.length} files.${installMsg} Opened in VS Code.`;
    } catch (err) {
      return `Scaffolding failed: ${err.message}`;
    }
  },

  async runAndSelfHeal({ projectPath, runCommand, maxAttempts = 3 }) {
    const dir = resolveStandardPath(projectPath);
    if (!fs.existsSync(dir)) return `Project directory not found: ${dir}`;

    let currentAttempt = 0;
    while (currentAttempt < maxAttempts) {
      currentAttempt++;
      const res = await this.executeCommand({ command: runCommand, cwd: dir, timeout: 25000 });
      if (res.success) {
        return `Project execution succeeded!\nOutput:\n${res.stdout.slice(0, 500)}`;
      }

      // Self-healing: Check for missing dependencies
      const out = res.output;
      const missingPy = out.match(/No module named ['"]([^'"]+)['"]/i);
      const missingNode = out.match(/Cannot find module ['"]([^'"]+)['"]/i);

      if (missingPy && missingPy[1]) {
        const pkg = missingPy[1];
        await this.executeCommand({ command: `pip install ${pkg}`, cwd: dir, timeout: 45000 });
        continue;
      }

      if (missingNode && missingNode[1]) {
        const pkg = missingNode[1].replace(/^[./\\]+/, '');
        await this.executeCommand({ command: `npm install ${pkg}`, cwd: dir, timeout: 45000 });
        continue;
      }

      // If not an auto-installable dependency, return the categorized error
      return `Execution failed (Attempt ${currentAttempt}/${maxAttempts}):\n${out.slice(0, 500)}`;
    }
    return `Project stopped after ${maxAttempts} attempts.`;
  }
};

const memoryEngine = require('./memory_engine');
const { SystemMonitor } = require('./system_monitor_engine');
const { WebsiteBuilder } = require('./website_builder_engine');
const { CameraVision } = require('./camera_vision_engine');

/* -------------------------------------------------------------------------
 * Export All Modules
 * ------------------------------------------------------------------------- */
module.exports = {
  FileController,
  ComputerSettings,
  DevAgent,
  getWeatherReport,
  executeUndo,
  pushUndo,
  memoryEngine,
  SystemMonitor,
  WebsiteBuilder,
  CameraVision
};
