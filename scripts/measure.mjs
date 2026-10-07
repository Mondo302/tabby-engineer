#!/usr/bin/env node
// Cold-load measurements for the whole entry page, in Chromium.
//
//   node scripts/serve.mjs 8937            (Brotli, like a real host)
//   node scripts/measure.mjs [baseUrl] [runs=3]
//
// For each profile (unthrottled; Fast 3G + 4x CPU slowdown) it opens the page
// in a fresh context (cold cache), waits for the phone to settle, and reports
// the median of `runs`:
//   bytes         every byte received over the wire (encodedDataLength: what
//                 the Brotli-served responses actually cost, headers included)
//   load          the window load event
//   html phone    when the HTML phone first exists (usable: prototype.js has
//                 rendered it and it answers taps)
//   flutter swap  when assets/phone.js swapped the Flutter phone in
//                 (or "kept HTML: <reason>" when it did not)
// Dev tool only; nothing here ships.

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8937/';
const RUNS = Number(process.argv[3] || 3);

const dirs = [process.env.PLAYWRIGHT_DIR, join(homedir(), 'AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules')].filter(Boolean);
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch {
  const d = dirs.find((x) => existsSync(x + '/playwright'));
  if (!d) throw new Error('Playwright not found; set PLAYWRIGHT_DIR');
  ({ chromium } = createRequire(d + '/')('playwright'));
}
const shell = (() => {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), 'AppData/Local/ms-playwright');
  if (!existsSync(root)) return undefined;
  return readdirSync(root).filter((d) => /^chromium_headless_shell-/.test(d)).sort().reverse()
    .map((d) => `${root}/${d}/chrome-headless-shell-win64/chrome-headless-shell.exe`).find(existsSync);
})();
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: shell }); }

const PROFILES = {
  unthrottled: null,
  'Fast 3G + 4x CPU': { down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8, latency: 150, cpu: 4 },
};

async function once(profile) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    window.__t = {};
    const watch = () => {
      const root = document.getElementById('prototype-root');
      if (root && root.querySelector('.phone') && !window.__t.html) window.__t.html = performance.now();
      const st = document.getElementById('prototype-stage');
      const s = st && st.dataset.phoneStatus;
      if (s && s !== 'idle' && s !== 'loading' && !window.__t.done) { window.__t.done = performance.now(); window.__t.status = s; }
    };
    new MutationObserver(watch).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phone-status'] });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (profile) {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: profile.down, uploadThroughput: profile.up, latency: profile.latency });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  }
  let bytes = 0;
  const urls = new Map();
  cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, e.request.url));
  const sizes = new Map();
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; sizes.set(e.requestId, e.encodedDataLength); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 120000 });
  const load = await page.evaluate(() => performance.timing.loadEventStart - performance.timing.navigationStart);
  // settle: swapped, or gave up (12 s timeout inside the page), or a hard cap
  await page.waitForFunction(() => window.__t && window.__t.done, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500); // late bytes: semantics, fonts
  const t = await page.evaluate(() => window.__t);
  const status = await page.getAttribute('#prototype-stage', 'data-phone-status');
  const list = [...urls].map(([id, u]) => [sizes.get(id) || 0, u.replace(new URL(BASE).origin, '')]).sort((a, b) => b[0] - a[0]);
  await ctx.close();
  return { bytes, load, html: t.html, swap: t.status === 'flutter' ? t.done : null, status, list };
}

const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const ms = (n) => (n == null ? 'n/a' : Math.round(n) + ' ms');
for (const [name, profile] of Object.entries(PROFILES)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(profile));
  console.log(`\n== ${name}  (${RUNS} cold runs, median)`);
  console.log('  bytes transferred :', kb(med(runs.map((r) => r.bytes))), ' [' + runs.map((r) => kb(r.bytes)).join(', ') + ']');
  console.log('  load event        :', ms(med(runs.map((r) => r.load))));
  console.log('  HTML phone usable :', ms(med(runs.map((r) => r.html))));
  console.log('  Flutter swapped   :', ms(med(runs.map((r) => r.swap))), ' outcomes: ' + runs.map((r) => r.status).join(', '));
  if (process.env.LIST) for (const [n, u] of runs[0].list.slice(0, 14)) console.log('     ', String(n).padStart(9), u);
}
await browser.close();
