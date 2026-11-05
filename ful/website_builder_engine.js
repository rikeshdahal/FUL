/**
 * FUL WebForge — Autonomous Website Builder Engine
 * Ported & Enhanced from F.U.L (Fulkumari WebForge)
 * 
 * Features:
 * - High-speed planning & generation of complete, production-ready, mobile-responsive websites
 * - Multi-theme support: dark, light, glassmorphism, gaming, futuristic_neon, ai_startup, portfolio, corporate, ecommerce
 * - Built-in zero-dependency preview server with automatic port discovery
 * - Automatic saving to ~/Projects/<project-name>
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { exec } = require('child_process');

const THEME_CSS_VARS = {
  dark: {
    bg: '#0a0a0a', bg2: '#111827', text: '#f9fafb', textMuted: '#9ca3af',
    accent: '#3b82f6', accent2: '#06b6d4', card: '#1f2937', border: 'rgba(255,255,255,0.1)',
    glow: 'rgba(59,130,246,0.3)'
  },
  light: {
    bg: '#ffffff', bg2: '#f8fafc', text: '#0f172a', textMuted: '#64748b',
    accent: '#2563eb', accent2: '#0891b2', card: '#f1f5f9', border: 'rgba(0,0,0,0.08)',
    glow: 'rgba(37,99,235,0.2)'
  },
  glassmorphism: {
    bg: '#0f0c29', bg2: '#302b63', text: '#ffffff', textMuted: '#cbd5e1',
    accent: '#a78bfa', accent2: '#38bdf8', card: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.18)',
    glow: 'rgba(167,139,250,0.4)'
  },
  gaming: {
    bg: '#050505', bg2: '#0d0d0d', text: '#ffffff', textMuted: '#a3a3a3',
    accent: '#ff0055', accent2: '#ff6600', card: '#111111', border: 'rgba(255,0,85,0.35)',
    glow: 'rgba(255,0,85,0.5)'
  },
  futuristic_neon: {
    bg: '#020014', bg2: '#0a0028', text: '#e0e0ff', textMuted: '#94a3b8',
    accent: '#00ffcc', accent2: '#ff00ff', card: '#0d0030', border: 'rgba(0,255,204,0.3)',
    glow: 'rgba(0,255,204,0.5)'
  },
  ai_startup: {
    bg: '#050b18', bg2: '#0c1526', text: '#f0f4ff', textMuted: '#94a3b8',
    accent: '#6366f1', accent2: '#06b6d4', card: '#0f1d38', border: 'rgba(99,102,241,0.3)',
    glow: 'rgba(99,102,241,0.4)'
  },
  portfolio: {
    bg: '#0d1117', bg2: '#161b22', text: '#e6edf3', textMuted: '#8b949e',
    accent: '#58a6ff', accent2: '#3fb950', card: '#21262d', border: 'rgba(88,166,255,0.2)',
    glow: 'rgba(88,166,255,0.35)'
  },
  corporate: {
    bg: '#ffffff', bg2: '#f5f7fa', text: '#1a202c', textMuted: '#4a5568',
    accent: '#1a56db', accent2: '#047857', card: '#edf2f7', border: 'rgba(0,0,0,0.1)',
    glow: 'rgba(26,86,219,0.25)'
  },
  ecommerce: {
    bg: '#fafafa', bg2: '#f0f0f0', text: '#1a1a1a', textMuted: '#525252',
    accent: '#ff6900', accent2: '#ffd700', card: '#ffffff', border: 'rgba(0,0,0,0.1)',
    glow: 'rgba(255,105,0,0.3)'
  }
};

const activeServers = new Map();

function getProjectsBaseDir() {
  const home = os.homedir();
  const dir = path.join(home, 'Projects');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function detectTheme(prompt = '') {
  const p = prompt.toLowerCase();
  if (p.includes('neon') || p.includes('cyber') || p.includes('futuristic')) return 'futuristic_neon';
  if (p.includes('gaming') || p.includes('esport') || p.includes('gamer')) return 'gaming';
  if (p.includes('glass') || p.includes('blur')) return 'glassmorphism';
  if (p.includes('ai') || p.includes('startup') || p.includes('saas') || p.includes('tech')) return 'ai_startup';
  if (p.includes('portfolio') || p.includes('cv') || p.includes('resume') || p.includes('developer')) return 'portfolio';
  if (p.includes('shop') || p.includes('store') || p.includes('e-commerce') || p.includes('ecommerce') || p.includes('buy') || p.includes('coffee')) return 'ecommerce';
  if (p.includes('corporate') || p.includes('business') || p.includes('company') || p.includes('agency')) return 'corporate';
  if (p.includes('light') || p.includes('white') || p.includes('clean') || p.includes('minimal')) return 'light';
  return 'dark';
}

function slugify(name) {
  return String(name || 'my-website')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'website';
}

function generateCleanFallback(plan) {
  const tv = THEME_CSS_VARS[plan.theme] || THEME_CSS_VARS.dark;
  const title = plan.title || 'Welcome';
  const desc = plan.description || 'Built autonomously by FUL WebForge AI';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — FUL WebForge</title>
  <meta name="description" content="${desc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Navigation -->
  <nav class="navbar">
    <div class="nav-container">
      <a href="#" class="logo"><span class="logo-dot"></span>${title}</a>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#about">About</a>
        <a href="#showcase">Showcase</a>
        <a href="#contact" class="btn-nav">Contact Us</a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <header class="hero">
    <div class="hero-content">
      <div class="badge">🚀 Powered by FUL WebForge</div>
      <h1 class="hero-title">${title}</h1>
      <p class="hero-sub">${desc}</p>
      <div class="hero-actions">
        <a href="#contact" class="btn btn-primary">Get Started Today</a>
        <a href="#features" class="btn btn-secondary">Explore Features</a>
      </div>
    </div>
    <div class="hero-glow"></div>
  </header>

  <!-- Features Grid -->
  <section id="features" class="section">
    <div class="section-head">
      <h2>Why Choose Us</h2>
      <p>Modern architecture engineered for ultimate performance and delightful experience.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>Lightning Fast</h3>
        <p>Built with lightweight, ultra-optimized code that loads in under 100 milliseconds.</p>
      </div>
      <div class="card">
        <div class="card-icon">🛡️</div>
        <h3>Rock-Solid Security</h3>
        <p>Enterprise-grade security standards with modern best practices baked right in.</p>
      </div>
      <div class="card">
        <div class="card-icon">✨</div>
        <h3>Adaptive Aesthetics</h3>
        <p>Responsive across all mobile phones, tablets, laptops, and ultra-wide desktop monitors.</p>
      </div>
      <div class="card">
        <div class="card-icon">🤖</div>
        <h3>AI-Driven Innovations</h3>
        <p>Seamlessly integrated with autonomous companion intelligence that grows with you.</p>
      </div>
    </div>
  </section>

  <!-- About Section -->
  <section id="about" class="section section-alt">
    <div class="about-container">
      <div class="about-text">
        <h2>Crafted With Precision</h2>
        <p>Designed and generated by FUL's autonomous developer intelligence. We turn bold visions into production-grade websites instantly.</p>
        <div class="stats-row">
          <div class="stat"><span class="stat-num">99.9%</span><span class="stat-lbl">Uptime</span></div>
          <div class="stat"><span class="stat-num">0ms</span><span class="stat-lbl">Latency</span></div>
          <div class="stat"><span class="stat-num">100%</span><span class="stat-lbl">Satisfaction</span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact Section -->
  <section id="contact" class="section">
    <div class="section-head">
      <h2>Let's Build Something Great</h2>
      <p>Have an idea or project in mind? Reach out and let's get connected.</p>
    </div>
    <div class="contact-card">
      <form id="contactForm" onsubmit="event.preventDefault(); alert('Message sent successfully! Thank you.');">
        <div class="form-group">
          <input type="text" placeholder="Your Name" required class="form-input">
        </div>
        <div class="form-group">
          <input type="email" placeholder="Your Email" required class="form-input">
        </div>
        <div class="form-group">
          <textarea placeholder="Your Message" rows="4" required class="form-input"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Send Message</button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>© ${new Date().getFullYear()} ${title}. Generated autonomously by FUL WebForge AI.</p>
  </footer>

  <script src="js/script.js"></script>
</body>
</html>`;
}

function generateCss(plan) {
  const tv = THEME_CSS_VARS[plan.theme] || THEME_CSS_VARS.dark;

  return `/* FUL WebForge Stylesheet — Theme: ${plan.theme} */
:root {
  --bg: ${tv.bg};
  --bg2: ${tv.bg2};
  --text: ${tv.text};
  --text-muted: ${tv.textMuted};
  --accent: ${tv.accent};
  --accent2: ${tv.accent2};
  --card: ${tv.card};
  --border: ${tv.border};
  --glow: ${tv.glow};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
}

body {
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 10, 10, 0.75);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: var(--text);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--glow);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: var(--accent);
}

.btn-nav {
  padding: 8px 18px;
  border-radius: 20px;
  background: var(--accent);
  color: #ffffff !important;
  box-shadow: 0 2px 10px var(--glow);
}

.hero {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  overflow: hidden;
}

.hero-content {
  max-width: 800px;
  position: relative;
  z-index: 2;
}

.badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 24px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(38px, 6vw, 68px);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(135deg, var(--text) 40%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-sub {
  font-size: clamp(16px, 2vw, 20px);
  color: var(--text-muted);
  margin-bottom: 36px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: all 0.25s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #ffffff;
  box-shadow: 0 4px 20px var(--glow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px var(--glow);
}

.btn-secondary {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg2);
  border-color: var(--accent);
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--glow) 0%, transparent 70%);
  filter: blur(80px);
  z-index: 1;
  pointer-events: none;
}

.section {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-alt {
  background: var(--bg2);
  border-radius: 28px;
  border: 1px solid var(--border);
}

.section-head {
  text-align: center;
  max-width: 650px;
  margin: 0 auto 60px;
}

.section-head h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(28px, 4vw, 42px);
  margin-bottom: 14px;
}

.section-head p {
  color: var(--text-muted);
  font-size: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 32px 24px;
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow: 0 12px 30px var(--glow);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.card h3 {
  font-size: 19px;
  margin-bottom: 10px;
}

.card p {
  color: var(--text-muted);
  font-size: 14px;
}

.stats-row {
  display: flex;
  gap: 40px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: var(--accent);
}

.stat-lbl {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.contact-card {
  max-width: 500px;
  margin: 0 auto;
  background: var(--card);
  border: 1px solid var(--border);
  padding: 36px;
  border-radius: 20px;
}

.form-group {
  margin-bottom: 18px;
}

.form-input {
  width: 100%;
  padding: 14px 18px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--accent);
}

.footer {
  text-align: center;
  padding: 40px 24px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .section { padding: 60px 18px; }
  .stats-row { gap: 20px; }
}`;
}

function generateJs(plan) {
  return `// FUL WebForge Interactive Client Logic
document.addEventListener('DOMContentLoaded', () => {
  console.log('[FUL WebForge] Loaded successfully: ${plan.title}');

  // Smooth appearance animation on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .section-head, .about-text').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
  });
});`;
}

function generateReadme(plan, previewUrl) {
  return `# ${plan.title}

Generated autonomously by **FUL WebForge**.

## 🚀 Quick Start
- **Theme**: \`${plan.theme}\`
- **Generated**: ${new Date().toLocaleString()}
- **Live Local URL**: [${previewUrl}](${previewUrl})

## 📁 File Structure
- \`index.html\` — Main semantic HTML layout
- \`css/style.css\` — Themed CSS variables and responsive rules
- \`js/script.js\` — Interactive animations and scroll effects
`;
}

function findFreePort(start = 5500, end = 5600) {
  return new Promise((resolve) => {
    const testPort = (p) => {
      if (p >= end) return resolve(5500);
      const srv = http.createServer();
      srv.listen(p, () => {
        srv.close(() => resolve(p));
      });
      srv.on('error', () => testPort(p + 1));
    };
    testPort(start);
  });
}

async function startPreviewServer(projectDir, projectName) {
  if (activeServers.has(projectName)) {
    try { activeServers.get(projectName).close(); } catch {}
    activeServers.delete(projectName);
  }

  const port = await findFreePort();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(projectDir, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`[WebForge] Preview server active at http://localhost:${port}`);
  });

  activeServers.set(projectName, server);
  const url = `http://localhost:${port}`;

  // Launch in system default browser
  try {
    if (process.platform === 'win32') {
      exec(`start "" "${url}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {}

  return url;
}

async function buildWebsite({ prompt = '', title, theme, customHtml, customCss, customJs } = {}) {
  const p = prompt.trim();
  const guessedTheme = theme || detectTheme(p);
  const guessedTitle = title || (p ? p.slice(0, 32).replace(/[^\w\s]/g, '').trim() : 'Modern Website');
  const projSlug = slugify(guessedTitle);

  const plan = {
    title: guessedTitle,
    slug: projSlug,
    theme: guessedTheme,
    description: p || 'Modern high-converting web project created by FUL'
  };

  const baseDir = getProjectsBaseDir();
  const projectDir = path.join(baseDir, projSlug);

  fs.mkdirSync(path.join(projectDir, 'css'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'js'), { recursive: true });

  const html = customHtml || generateCleanFallback(plan);
  const css = customCss || generateCss(plan);
  const js = customJs || generateJs(plan);

  fs.writeFileSync(path.join(projectDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(projectDir, 'css', 'style.css'), css, 'utf8');
  fs.writeFileSync(path.join(projectDir, 'js', 'script.js'), js, 'utf8');

  // Start live preview server and open browser
  const previewUrl = await startPreviewServer(projectDir, projSlug);
  const readme = generateReadme(plan, previewUrl);
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme, 'utf8');

  return {
    ok: true,
    title: plan.title,
    theme: plan.theme,
    slug: projSlug,
    projectDir,
    previewUrl,
    message: `Website "${plan.title}" generated successfully with ${plan.theme} theme! Opened live preview at ${previewUrl}.`
  };
}

function listProjects() {
  const baseDir = getProjectsBaseDir();
  try {
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    return items
      .filter(i => i.isDirectory() && fs.existsSync(path.join(baseDir, i.name, 'index.html')))
      .map(i => ({
        name: i.name,
        path: path.join(baseDir, i.name),
        hasPreview: activeServers.has(i.name)
      }));
  } catch {
    return [];
  }
}

class WebsiteBuilder {
  constructor() {}
  async buildWebsite(opts) {
    const res = await buildWebsite(opts);
    return res.message || 'Website built successfully.';
  }
  async previewWebsite(opts) {
    const site = typeof opts === 'string' ? opts : (opts.site_id_or_name || opts.site_name || opts.name);
    const srv = await startPreviewServer(site, opts.port || 5500);
    if (opts.open_browser !== false && srv.url) {
      try {
        const { shell } = require('electron');
        if (shell && shell.openExternal) shell.openExternal(srv.url).catch(() => {});
        else exec(`start ${srv.url}`, () => {});
      } catch {
        exec(`start ${srv.url}`, () => {});
      }
    }
    return `Preview server running at ${srv.url}`;
  }
  listWebsites() {
    return listProjects().map(p => ({
      name: p.name,
      dir: p.path,
      theme: 'custom',
      updatedAt: new Date().toISOString()
    }));
  }
}

module.exports = {
  WebsiteBuilder,
  buildWebsite,
  startPreviewServer,
  listProjects,
  detectTheme,
  getProjectsBaseDir,
  THEME_CSS_VARS
};
