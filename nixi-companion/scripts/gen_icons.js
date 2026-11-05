const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Tray icon: 32x32 dark pill with glowing eyes
  await page.setContent('<body style="margin:0;background:transparent"><svg id="svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="6" width="28" height="20" rx="10" fill="#0d1117" stroke="#3b82f6" stroke-width="1.5"/><rect x="9" y="11" width="4" height="10" rx="2" fill="#ffffff"/><rect x="19" y="11" width="4" height="10" rx="2" fill="#ffffff"/></svg></body>');
  await page.locator('#svg').screenshot({ path: path.join(__dirname, '..', 'icons', 'tray.png'), omitBackground: true });
  console.log('Created icons/tray.png');

  // 2. GitHub icon: 64x64
  await page.setContent('<body style="margin:0;background:transparent"><svg id="svg" width="64" height="64" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#181717"/><path fill="#ffffff" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg></body>');
  await page.locator('#svg').screenshot({ path: path.join(__dirname, '..', 'icons', 'github.png'), omitBackground: true });
  console.log('Created icons/github.png');

  // 3. TikTok icon: 64x64
  await page.setContent('<body style="margin:0;background:transparent"><svg id="svg" width="64" height="64" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#000000"/><path fill="#ffffff" d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.102a2.895 2.895 0 0 1 2.373-4.535c.318 0 .628.051.918.146V9.426a6.34 6.34 0 0 0-.918-.066c-3.504 0-6.345 2.841-6.345 6.345s2.841 6.345 6.345 6.345c3.468 0 6.286-2.784 6.343-6.239l.002-.106V8.928a8.212 8.212 0 0 0 4.765 1.517V6.999a4.834 4.834 0 0 1-1-.313z"/><path fill="#25F4EE" d="M12.374 9.426v3.458c-.29-.095-.6-.146-.918-.146a2.895 2.895 0 0 0-2.373 4.535l.068.102a2.896 2.896 0 0 0 5.201-1.743V2h.445v.441a4.793 4.793 0 0 0 3.77 4.245v.313a4.834 4.834 0 0 0 1 .313V6.999a8.212 8.212 0 0 1-4.765-1.517v6.777l-.002.106c-.057 3.455-2.875 6.239-6.343 6.239a6.345 6.345 0 0 1-6.345-6.345c0-3.504 2.841-6.345 6.345-6.345.312 0 .618.023.918.066z" opacity="0.6"/></svg></body>');
  await page.locator('#svg').screenshot({ path: path.join(__dirname, '..', 'icons', 'tiktok.png'), omitBackground: true });
  console.log('Created icons/tiktok.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

