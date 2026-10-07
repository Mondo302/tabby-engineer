// First-frame timing, cold, unthrottled and Fast 3G + 4x CPU, median of N.
//   node e2e/timing.mjs [base] [runs]
import { chromium, exe } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8940';
const N = Number(process.argv[3] || 3);
const b = await chromium.launch({ executablePath: exe });
async function once(throttle) {
  const ctx = await b.newContext({ viewport: { width: 500, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (throttle) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.addInitScript(() => {
    window.__ff = null;
    const mark = () => { if (window.__ff === null) window.__ff = performance.now(); };
    window.addEventListener('flutter-first-frame', mark, true);
    document.addEventListener('flutter-first-frame', mark, true);
  });
  await page.goto(`${BASE}/host.html`);
  await page.waitForFunction(() => window.__ff !== null, null, { timeout: 90000 });
  const v = await page.evaluate(() => Math.round(window.__ff));
  await ctx.close();
  return v;
}
for (const t of [false, true]) {
  const r = [];
  for (let i = 0; i < N; i++) r.push(await once(t));
  r.sort((a, c) => a - c);
  console.log(t ? 'Fast3G+4xCPU' : 'unthrottled ', 'first frame ms (sorted):', r.join(', '));
}
await b.close();
