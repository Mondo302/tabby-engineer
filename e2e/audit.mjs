// Real-browser audit of the release build served on localhost.
//   node e2e/audit.mjs [baseUrl]        (default http://127.0.0.1:8940)
// Asserts: zero requests leave localhost on a cold load (EN and AR), zero
// console errors / page errors, the decline screen paints, and a failed
// Flutter load leaves the fallback message visible. Reports first-load
// numbers unthrottled and with a Fast 3G + 4x CPU profile.
// Needs Playwright with a Chromium; set PLAYWRIGHT_DIR to a node_modules dir.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8940';
const ORIGIN = new URL(BASE).origin;
const pw = process.env.PLAYWRIGHT_DIR || (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/npm-cache/_npx/e41f203b7505f1fb/node_modules';
const { chromium } = createRequire(pw + '/')('playwright');
const root = (process.env.LOCALAPPDATA || '').replace(/\\/g, '/') + '/ms-playwright';
const exe = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
  .map((d) => `${root}/${d}/chrome-headless-shell-win64/chrome-headless-shell.exe`).find(existsSync);

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch({ executablePath: exe });

async function coldLoad(lang, { throttle = false, inject = false, block = null, query = '', after = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const requests = [], errors = [], sizes = new Map();
  ctx.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.loadingFinished', (e) => sizes.set(e.requestId, e.encodedDataLength));
  if (throttle) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  if (block) await page.route(block, (r) => r.abort());
  await page.addInitScript(() => {
    window.__firstFrame = null;
    const mark = () => { if (window.__firstFrame === null) window.__firstFrame = performance.now(); };
    window.addEventListener('flutter-first-frame', mark, true);
    document.addEventListener('flutter-first-frame', mark, true);
  });
  if (inject) await page.addInitScript(() => { fetch('https://fonts.gstatic.com/probe').catch(() => {}); });
  await page.goto(`${BASE}/host.html?lang=${lang}${query}`, { waitUntil: 'load' });
  if (!block) {
    await page.waitForFunction(() => window.__firstFrame !== null, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
  } else {
    await page.waitForTimeout(3000);
  }
  const afterResult = after ? await after(page) : null;
  const info = await page.evaluate(() => ({
    firstFrame: window.__firstFrame,
    fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null,
    fallbackVisible: (() => { const f = document.getElementById('phone-fallback'); return !!f && !f.hidden && f.offsetParent !== null; })(),
    hasView: !!document.querySelector('flutter-view'),
    dir: getComputedStyle(document.querySelector('flutter-view') || document.body).direction,
  }));
  const transferred = [...sizes.values()].reduce((a, b) => a + b, 0);
  await ctx.close();
  return { requests, errors, info, transferred, afterResult };
}

const foreign = (reqs) => reqs.filter((u) => /^https?:|^wss?:/.test(u) && new URL(u).origin !== ORIGIN);

for (const lang of ['en', 'ar']) {
  const r = await coldLoad(lang);
  check(`[${lang}] phone embedded and first frame painted`, r.info.hasView && r.info.firstFrame !== null && !r.info.fallbackVisible);
  check(`[${lang}] zero requests leave localhost (${r.requests.length} total)`, foreign(r.requests).length === 0, foreign(r.requests).join(' '));
  check(`[${lang}] zero console/page errors`, r.errors.length === 0, r.errors.join(' | '));
}

// Tour: the four tabs and the checkout -> processing -> decline path, in both
// languages, through the real accessibility tree (Flutter web builds it when
// its placeholder is activated). Copy is read from the exported strings, not
// retyped. Asserts: nothing leaves localhost, no console errors, the limit is
// on none of the four tabs, the riyal glyph needs no font request.
const STRINGS = JSON.parse(readFileSync(new URL('../assets/data/strings.json', import.meta.url), 'utf8'));
async function tour(lang) {
  const S = (k) => STRINGS[lang][k] ?? STRINGS.en[k];
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1000 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const requests = [], errors = [], fonts = [];
  ctx.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (/font|\.woff2?|\.ttf|gstatic/i.test(r.url()) || /font/.test(r.headers()['content-type'] || '')) fonts.push(r.url()); });
  await page.goto(`${BASE}/host.html?lang=${lang}&mode=today&controls=0&h=802`, { waitUntil: 'load' });
  await page.waitForSelector('flutter-view', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('flt-semantics-placeholder').dispatchEvent('click');
  await page.waitForTimeout(500);
  const tree = async () => (await page.locator('flt-semantics').evaluateAll((els) => els.map((e) => (e.textContent || '').trim()))).join(' | ');
  const press = async (label) => { await page.locator('flt-semantics[role=button]', { hasText: label }).first().click({ force: true }); await page.waitForTimeout(500); };

  const seen = {};
  for (const [tab, marker] of [['nav.home', 'home.storesForYou'], ['nav.shop', 'shop.forYou'], ['nav.payments', 'payments.clear'], ['nav.profile', 'profile.logout']]) {
    await press(S(tab));
    const t = await tree();
    seen[tab] = t;
    check(`[${lang}] tab ${tab} shows its content`, t.includes(S(marker)), '');
  }
  // the strongest fact: no limit anywhere across the four tabs
  const limitCopy = ['payments.limitCard', 'payments.limitLink', 'profile.limit', 'profile.limitSub', 'limit.blocked'].map(S);
  const leaked = Object.entries(seen).flatMap(([tab, t]) => limitCopy.filter((c) => t.includes(c)).map((c) => `${tab}: ${c}`));
  check(`[${lang}] no limit figure or copy on any of the four tabs`, leaked.length === 0, leaked.join(' ; '));

  // Host hooks, as the HTML page's controls would call them.
  await page.evaluate(() => window.setPhoneMode('proposed'));
  await page.waitForTimeout(500);
  check(`[${lang}] setPhoneMode('proposed') shows the decline`, (await tree()).includes(S('decline.title')));
  await page.evaluate(() => window.setPhoneMode('today'));
  await page.waitForTimeout(500);
  check(`[${lang}] setPhoneMode('today') shows the dead-end help article`, (await tree()).includes(S('today.title')));
  await page.evaluate(() => window.setPhoneScenario('new-account'));
  await page.waitForTimeout(500);
  const sc = JSON.parse(readFileSync(new URL('../assets/data/scenarios.json', import.meta.url), 'utf8')).find((x) => x.id === 'new-account');
  check(`[${lang}] setPhoneScenario switches to Proposed with that case's reason`, (await tree()).includes(S(sc.reasonKey)));
  await page.evaluate(() => window.setPhoneScenario('silent-block'));
  await page.waitForTimeout(500);

  // The whole journey.
  await press(S('nav.shop'));
  await press(S('product.buy'));
  check(`[${lang}] checkout opens`, (await tree()).includes(S('checkout.pay')));
  await press(S('checkout.pay'));
  check(`[${lang}] processing shows the checking message`, (await tree()).includes(S('checkout.processing')));
  await page.waitForTimeout(1600);
  check(`[${lang}] decline appears after the pause`, (await tree()).includes(S('decline.title')));
  await press(S('decline.limitLink'));
  check(`[${lang}] limit screen opens`, (await tree()).includes(S('limit.forward')));
  await press(S('limit.forward'));
  check(`[${lang}] recovery screen opens`, (await tree()).includes(S('recovery.action')));
  await press(S('recovery.action'));
  check(`[${lang}] recovery action returns to the decline`, (await tree()).includes(S('decline.title')));
  await press(S('nav.home'));
  check(`[${lang}] a tab tap leaves the flow`, (await tree()).includes(S('home.storesForYou')));

  check(`[${lang}] tour: zero requests leave localhost (${requests.length} total)`, foreign(requests).length === 0, foreign(requests).join(' '));
  check(`[${lang}] tour: no font requested anywhere but our own bundle`, fonts.every((u) => new URL(u).origin === ORIGIN), fonts.filter((u) => new URL(u).origin !== ORIGIN).join(' '));
  check(`[${lang}] tour: zero console/page errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}
for (const lang of ['en', 'ar']) await tour(lang);
// Load a screen AFTER picking a scenario, the way a judge would: turn on the
// semantics tree (real browser accessibility nodes), press the scenario card,
// then the "how your limit works" link, and read back what the phone says.
// The picker click must change facts (the reason text), not just a label.
async function pickAndDrill(page, lang) {
  await page.waitForSelector('flt-semantics-placeholder', { state: 'attached' });
  await page.evaluate(() => document.querySelector('flt-semantics-placeholder').click());
  const labelOf = () => page.evaluate(() =>
    [...document.querySelectorAll('flt-semantics')].map((n) => n.getAttribute('aria-label') || n.textContent || '').join(' | '));
  await page.waitForFunction(() => document.querySelectorAll('flt-semantics').length > 5);
  const before = await labelOf();
  const card = lang === 'en' ? /The new account/ : /الحساب الجديد/;
  await page.getByRole('button', { name: card }).first().click();
  await page.waitForTimeout(600);
  const afterPick = await labelOf();
  const link = lang === 'en' ? /See how your limit works/ : /اعرف كيف يعمل حدّك/;
  await page.getByRole('button', { name: link }).first().click();
  await page.waitForTimeout(600);
  const onLimit = await labelOf();
  return { before, afterPick, onLimit };
}
for (const lang of ['en', 'ar']) {
  const r = await coldLoad(lang, { query: '&h=1130&screen=decline', after: (p) => pickAndDrill(p, lang) });
  const a = r.afterResult;
  const reasonNew = lang === 'en' ? /still new/ : /جديد/;
  const reasonPaused = lang === 'en' ? /paused spending/ : /أوقفت/;
  check(`[${lang}] picking a scenario swaps the phone's facts (reason text changes)`,
    reasonPaused.test(a.before) && !reasonPaused.test(a.afterPick) && reasonNew.test(a.afterPick));
  check(`[${lang}] limit screen loads after picking (new account: 4 of 6 payments)`,
    lang === 'en' ? /4 of 6 on-time payments/.test(a.onLimit) : /4 من 6/.test(a.onLimit));
  check(`[${lang}] after picking + drilling: zero requests leave localhost (${r.requests.length} total)`, foreign(r.requests).length === 0, foreign(r.requests).join(' '));
  check(`[${lang}] after picking + drilling: zero console/page errors`, r.errors.length === 0, r.errors.join(' | '));
}

// The audit must be able to fail: a deliberate third-party request is caught.
const bad = await coldLoad('en', { inject: true });
check('audit catches an injected third-party request (mutation check)', foreign(bad.requests).length > 0);

// Failed Flutter load leaves a visible fallback in the host div.
const broken = await coldLoad('en', { block: /main.dart.(js|mjs|wasm)$/ });
check('failed Flutter load shows the fallback message in the div', broken.info.fallbackVisible && !broken.info.hasView);

// First-load numbers.
async function median(opts, n) {
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(await coldLoad('en', opts));
  const ff = runs.map((r) => r.info.firstFrame).sort((a, b) => a - b);
  const fc = runs.map((r) => r.info.fcp).sort((a, b) => a - b);
  return { firstFrameMs: ff.map(Math.round), fcpMs: fc.map((x) => Math.round(x)), transferredKB: Math.round(runs[0].transferred / 1024), requests: runs[0].requests.length };
}
console.log('unthrottled (3 cold runs, sorted):', JSON.stringify(await median({}, 3)));
console.log('Fast 3G + 4x CPU (3 cold runs, sorted):', JSON.stringify(await median({ throttle: true }, 3)));

await browser.close();
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
