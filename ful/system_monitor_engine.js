/**
 * FUL System Monitor & RAM Guardian Engine - Ported & Enhanced from Mark-LVI & F.U.L
 * Continuously monitors RAM, CPU, and process memory hogs.
 * Proactively warns the user when memory is near exhaustion.
 */

const os = require('os');
const { exec } = require('child_process');

class SystemMonitor {
  constructor(options = {}) {
    this.ramThresholdPercent = options.ramThresholdPercent || 85.0;
    this.cpuThresholdPercent = options.cpuThresholdPercent || 90.0;
    this.cooldownMs = options.cooldownMs || 180000; // 3 minutes cooldown between alerts
    this.lastRamAlert = 0;
    this.lastCpuAlert = 0;
    this.timer = null;
    this.onAlert = options.onAlert || null;
  }

  getMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);
    const usedGb = (usedMem / (1024 ** 3)).toFixed(1);
    const totalGb = (totalMem / (1024 ** 3)).toFixed(1);

    // Approximate CPU load via 1-minute load avg or os.cpus()
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    const cpuPercent = total > 0 ? Math.round(100 - (100 * idle / total)) : 0;

    return {
      ramPercent,
      usedGb,
      totalGb,
      cpuPercent
    };
  }

  getTopMemoryProcesses(count = 5) {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        return resolve([]);
      }
      exec('tasklist /FO CSV /NH', { timeout: 3000, windowsHide: true }, (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const procs = {};
          const lines = stdout.split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim()) continue;
            // Line format: "Image Name","PID","Session Name","Session#","Mem Usage"
            const parts = line.split('","').map(s => s.replace(/^"|"$/g, '').trim());
            if (parts.length >= 5) {
              const name = parts[0];
              const memStr = parts[4].replace(/[^\d]/g, '');
              const kb = parseInt(memStr, 10) || 0;
              procs[name] = (procs[name] || 0) + kb;
            }
          }
          const sorted = Object.entries(procs)
            .map(([name, kb]) => ({ name, mb: Math.round(kb / 1024) }))
            .filter(p => p.mb > 50 && !['System Idle Process', 'Memory Compression'].includes(p.name))
            .sort((a, b) => b.mb - a.mb)
            .slice(0, count);
          resolve(sorted);
        } catch {
          resolve([]);
        }
      });
    });
  }

  async checkMemory() {
    const m = this.getMetrics();
    const topProcs = await this.getTopMemoryProcesses(8);
    const freeGb = Math.max(0, parseFloat(m.totalGb) - parseFloat(m.usedGb)).toFixed(1);
    return {
      usedPercent: m.ramPercent,
      cpuPercent: m.cpuPercent,
      usedGb: m.usedGb,
      totalGb: m.totalGb,
      freeGb,
      alert: m.ramPercent >= this.ramThresholdPercent,
      topProcesses: topProcs
    };
  }

  async check() {
    const m = this.getMetrics();
    const now = Date.now();
    let alertData = null;

    if (m.ramPercent >= this.ramThresholdPercent && (now - this.lastRamAlert > this.cooldownMs)) {
      this.lastRamAlert = now;
      const topProcs = await this.getTopMemoryProcesses(3);
      const topStr = topProcs.length ? ` (Top: ${topProcs.map(p => `${p.name} ${p.mb}MB`).join(', ')})` : '';
      alertData = {
        type: 'high_ram',
        percent: m.ramPercent,
        usedGb: m.usedGb,
        totalGb: m.totalGb,
        topProcesses: topProcs,
        message: `High RAM alert: Memory usage is at ${m.ramPercent}% (${m.usedGb}GB / ${m.totalGb}GB used)${topStr}. Would you like me to close heavy background apps?`,
        nepaliMessage: `Boss, RAM usage ${m.ramPercent}% pugyo (${m.usedGb}GB / ${m.totalGb}GB)${topStr}. Kehi heavy background apps banda garam?`
      };
    } else if (m.cpuPercent >= this.cpuThresholdPercent && (now - this.lastCpuAlert > this.cooldownMs)) {
      this.lastCpuAlert = now;
      alertData = {
        type: 'high_cpu',
        percent: m.cpuPercent,
        message: `High CPU alert: Processor load has reached ${m.cpuPercent}%.`,
        nepaliMessage: `Boss, CPU load ${m.cpuPercent}% pugyo.`
      };
    }

    if (alertData && typeof this.onAlert === 'function') {
      this.onAlert(alertData);
    }
    return alertData;
  }

  start(intervalMs = 15000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = {
  SystemMonitor
};
