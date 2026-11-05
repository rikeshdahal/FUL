'use strict';

/*
  FUL Browser Automation Engine powered by Playwright.
  Allows FUL to control the browser, automate web tasks, scrape data,
  fill forms, download assets, and control web apps (TikTok, Instagram, GitHub, YouTube, etc.).
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

let detectedBrowserConfig = null;

function detectBrowserConfig() {
  if (detectedBrowserConfig) return detectedBrowserConfig;
  
  // Prefer Microsoft Edge as it is preinstalled on Windows 11 and lightning fast
  try {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (fs.existsSync(edgePath)) {
      detectedBrowserConfig = { channel: 'msedge' };
      return detectedBrowserConfig;
    }
  } catch {}

  // Fallback to Brave
  try {
    if (fs.existsSync(BRAVE_PATH)) {
      detectedBrowserConfig = { executablePath: BRAVE_PATH };
      return detectedBrowserConfig;
    }
  } catch {}

  // Fallback to default Playwright Chromium
  detectedBrowserConfig = {};
  return detectedBrowserConfig;
}

async function launchBrowser({ headless = false, ...extra } = {}) {
  const baseConfig = detectBrowserConfig();
  const config = {
    ...baseConfig,
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    ...extra
  };
  const browser = await chromium.launch(config);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function runBrowserScript(scriptCode, { headless = false, timeout = 35000, description = '' } = {}) {
  const code = String(scriptCode || '').trim();
  if (!code) return { ok: false, message: 'No script provided.' };

  const logs = [];
  const logCapture = (...args) => {
    logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };

  let browserInstance = null;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Browser task timed out after ${timeout / 1000}s`)), timeout)
  );

  const executionPromise = (async () => {
    const { browser, context, page } = await launchBrowser({ headless });
    browserInstance = browser;

    // Wrap execution with sandbox helpers
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction(
      'playwright', 'chromium', 'browser', 'context', 'page', 'console',
      code
    );

    const customConsole = {
      log: logCapture,
      info: logCapture,
      warn: logCapture,
      error: logCapture
    };

    const result = await runner({ chromium }, chromium, browser, context, page, customConsole);
    return result;
  })();

  try {
    const result = await Promise.race([executionPromise, timeoutPromise]);
    let output = '';
    if (logs.length) output += logs.join('\n');
    if (result !== undefined && result !== null) {
      const resStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      output += (output ? '\n' : '') + resStr;
    }
    return {
      ok: true,
      message: output || (description ? `Completed: ${description}` : 'Browser automation completed successfully.')
    };
  } catch (err) {
    return {
      ok: false,
      message: `Browser automation error: ${err.message}${logs.length ? '\nOutput: ' + logs.join('\n') : ''}`
    };
  } finally {
    if (browserInstance) {
      try { await browserInstance.close(); } catch {}
    }
  }
}

async function openWebsites(urls = [], { headless = false } = {}) {
  const list = Array.isArray(urls) ? urls : [urls];
  const validUrls = list.map(u => {
    const s = String(u).trim();
    return /^https?:\/\//i.test(s) ? s : 'https://' + s;
  });

  if (!validUrls.length) return { ok: false, message: 'No URLs specified.' };

  try {
    const { browser, context, page } = await launchBrowser({ headless });
    await page.goto(validUrls[0]);
    for (let i = 1; i < validUrls.length; i++) {
      const newPage = await context.newPage();
      await newPage.goto(validUrls[i]);
    }
    return { ok: true, message: `Opened in browser: ${validUrls.join(', ')}` };
  } catch (err) {
    return { ok: false, message: `Failed to open websites: ${err.message}` };
  }
}

async function scrapePage(url, { selector = 'body', textOnly = true } = {}) {
  let browserInstance = null;
  try {
    const { browser, page } = await launchBrowser({ headless: true });
    browserInstance = browser;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    let content = '';
    if (textOnly) {
      content = await page.$eval(selector, el => el.innerText || el.textContent);
    } else {
      content = await page.$eval(selector, el => el.innerHTML);
    }
    return { ok: true, content: String(content || '').trim().slice(0, 3000) };
  } catch (err) {
    return { ok: false, message: `Scrape error: ${err.message}` };
  } finally {
    if (browserInstance) {
      try { await browserInstance.close(); } catch {}
    }
  }
}

module.exports = {
  launchBrowser,
  runBrowserScript,
  openWebsites,
  scrapePage,
  detectBrowserConfig
};

