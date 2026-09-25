#!/usr/bin/env node
// Real-browser checks (header controls, themes, RTL, contrast, overflow, no-JS).
// smoke.js cannot do these: it runs the prototype against a DOM stub.
//
// Usage: node scripts/browser.mjs [baseUrl]      (default http://localhost:8936/)
// Needs Playwright with a Chromium install. Dev tool only; nothing here ships.
// Set PLAYWRIGHT_DIR to a node_modules folder containing `playwright` if it is
// not resolvable normally.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8936/';
const ORIGIN = new URL(BASE).origin;

const candidates = [
  process.env.PLAYWRIGHT_DIR,
  join(homedir(), 'AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules'),
].filter(Boolean);
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  const dir = candidates.find((d) => existsSync(d + '/playwright'));
  if (!dir) throw new Error('Playwright not found; set PLAYWRIGHT_DIR');
  ({ chromium } = createRequire(dir + '/')('playwright'));
}

import { readdirSync } from 'node:fs';
// The installed Chromium may not match the Playwright build; use any present one.
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), 'AppData/Local/ms-playwright');
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => /^chromium_headless_shell-/.test(d)).sort().reverse();
  for (const d of dirs) {
    const exe = `${root}/${d}/chrome-headless-shell-win64/chrome-headless-shell.exe`;
    if (existsSync(exe)) return exe;
  }
  return undefined;
}
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }
let failures = 0;
let total = 0;
const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;

async function test(label, fn) {
  if (only && !only.test(label)) return;
  total += 1;
  try {
    const result = await fn();
    if (result === false) throw new Error('returned false');
    console.log('  ok   ' + label);
  } catch (err) {
    failures += 1;
    console.log('  FAIL ' + label + ' — ' + String(err.message).split('\n')[0]);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function open(path = '', opts = {}) {
  // flutter: true lets the Flutter phone load (assets/phone.js may swap it in).
  // By default it is blocked, so every other check sees the HTML phone, which
  // is what they were written for, and never races a swap.
  const { init, viewport = { width: 1280, height: 900 }, flutter = false, ...ctxOpts } = opts;
  // The swap checks below test phone.js's own machinery. With the scroll-driven
  // cinema live, the swap needs a script hook the current Flutter build does not
  // have yet (kept-html:no-script-hook, tested in the cinema section), so unless a
  // check asks otherwise they run against the static section (reduced motion),
  // where the swap works exactly as before.
  if (flutter && ctxOpts.reducedMotion === undefined) ctxOpts.reducedMotion = 'reduce';
  const ctx = await browser.newContext({ viewport, ...ctxOpts });
  if (init) await ctx.addInitScript(init);
  if (!flutter) await ctx.route('**/flutter_bootstrap.js', (r) => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
  page.consoleErrors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') page.consoleErrors.push(m.text()); });
  await page.goto(BASE + path, { waitUntil: 'load' });
  page.ctx = ctx;
  return page;
}
const done = (page) => page.ctx.close();
const attr = (page, name) => page.evaluate((n) => document.documentElement.getAttribute(n), name);
const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// ---------------------------------------------------------------- theme ----
await test('theme: dark by default, even when the OS prefers light', async () => {
  const p = await open('', { colorScheme: 'light' });
  assert((await attr(p, 'data-theme')) === 'dark', 'data-theme=' + (await attr(p, 'data-theme')));
  assert((await bg(p)) === 'rgb(26, 25, 25)', await bg(p));
  await done(p);
});

await test('theme: no flash — data-theme, lang, dir set before any external script runs', async () => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    localStorage.setItem('ti-theme', 'bright');
    localStorage.setItem('ti-lang', 'ar');
  });
  await ctx.route('**/assets/*.js', (r) => r.abort()); // only the inline head script may act
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  assert((await attr(p, 'data-theme')) === 'bright', 'theme ' + (await attr(p, 'data-theme')));
  assert((await attr(p, 'dir')) === 'rtl', 'dir ' + (await attr(p, 'dir')));
  assert((await attr(p, 'lang')) === 'ar-SA', 'lang ' + (await attr(p, 'lang')));
  assert((await bg(p)) === 'rgb(245, 244, 242)', await bg(p));
  await ctx.close();
});

await test('theme: switch toggles, and the choice survives a reload', async () => {
  const p = await open();
  await p.click('#theme-btn');
  assert((await attr(p, 'data-theme')) === 'bright');
  assert((await bg(p)) === 'rgb(245, 244, 242)', await bg(p));
  await p.reload();
  assert((await attr(p, 'data-theme')) === 'bright', 'not remembered');
  await p.click('#theme-btn');
  await p.reload();
  assert((await attr(p, 'data-theme')) === 'dark', 'dark not remembered');
  await done(p);
});

await test('theme: works with storage blocked (no errors, switch still flips)', async () => {
  const p = await open('', {
    init: () => {
      const boom = () => { throw new Error('blocked'); };
      Object.defineProperty(window, 'localStorage', { get: boom });
    },
  });
  assert(p.errors.length === 0, p.errors.join('|'));
  await p.click('#theme-btn');
  assert((await attr(p, 'data-theme')) === 'bright');
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="ar"]');
  assert((await attr(p, 'dir')) === 'rtl');
  assert(p.errors.length === 0, p.errors.join('|'));
  await done(p);
});

await test('theme: the phone keeps its light look in both themes', async () => {
  const p = await open();
  const screen = () => p.evaluate(() => getComputedStyle(document.querySelector('.phone__screen')).backgroundColor);
  const textColor = () => p.evaluate(() => getComputedStyle(document.querySelector('.phone__screen')).color);
  const dark = await screen();
  const darkText = await textColor();
  await p.click('#theme-btn');
  const bright = await screen();
  const brightText = await textColor();
  assert(dark === bright && dark === 'rgb(245, 244, 242)', dark + ' / ' + bright);
  for (const t of [darkText, brightText]) {
    assert(/^rgb\((\d+), (\d+), (\d+)\)$/.test(t) && Number(t.match(/\d+/)[0]) < 100, 'phone text is not dark: ' + darkText + ' / ' + brightText);
  }
  await done(p);
});

// ---------------------------------------------------------- language menu ---
await test('menu: opens and closes by mouse; outside click closes; ARIA state follows', async () => {
  const p = await open();
  const btn = p.locator('#lang-btn');
  assert((await btn.getAttribute('aria-haspopup')) === 'menu');
  assert((await btn.getAttribute('aria-expanded')) === 'false');
  assert(!(await p.locator('#lang-menu').isVisible()));
  await btn.click();
  assert(await p.locator('#lang-menu').isVisible(), 'menu not visible');
  assert((await btn.getAttribute('aria-expanded')) === 'true');
  await p.mouse.click(600, 500);
  assert(!(await p.locator('#lang-menu').isVisible()), 'outside click did not close');
  assert((await btn.getAttribute('aria-expanded')) === 'false');
  await done(p);
});

await test('menu: lists both languages in their own names, active one checked, no flags', async () => {
  const p = await open();
  await p.click('#lang-btn');
  const items = await p.$$eval('#lang-menu [role="menuitemradio"]', (els) =>
    els.map((e) => ({ text: e.textContent.trim(), checked: e.getAttribute('aria-checked'), lang: e.getAttribute('lang') }))
  );
  assert(items.length === 2, 'items ' + items.length);
  assert(items[0].text === 'English' && items[0].checked === 'true' && items[0].lang === 'en', JSON.stringify(items));
  assert(items[1].text === 'العربية' && items[1].checked === 'false' && items[1].lang === 'ar', JSON.stringify(items));
  const html = await p.$eval('.site-header', (e) => e.innerHTML);
  assert(!/[\u{1F1E6}-\u{1F1FF}]/u.test(html), 'flag emoji found');
  assert((await p.locator('#lang-menu').getAttribute('role')) === 'menu');
  await done(p);
});

await test('menu: keyboard — Tab reaches both, Enter opens, arrows move, Escape returns focus', async () => {
  const p = await open();
  await p.keyboard.press('Tab');
  assert((await p.evaluate(() => document.activeElement.id)) === 'lang-btn', 'first tab stop');
  await p.keyboard.press('Tab');
  assert((await p.evaluate(() => document.activeElement.id)) === 'theme-btn', 'second tab stop');
  await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Enter');
  assert(await p.locator('#lang-menu').isVisible(), 'Enter did not open');
  const focused = () => p.evaluate(() => document.activeElement.getAttribute('data-lang'));
  assert((await focused()) === 'en', 'focus starts on the active item: ' + (await focused()));
  await p.keyboard.press('ArrowDown');
  assert((await focused()) === 'ar', 'ArrowDown');
  await p.keyboard.press('ArrowDown');
  assert((await focused()) === 'en', 'wraps');
  await p.keyboard.press('End');
  assert((await focused()) === 'ar', 'End');
  await p.keyboard.press('Home');
  assert((await focused()) === 'en', 'Home');
  await p.keyboard.press('Escape');
  assert(!(await p.locator('#lang-menu').isVisible()), 'Escape did not close');
  assert((await p.evaluate(() => document.activeElement.id)) === 'lang-btn', 'focus not returned');
  await p.keyboard.press('Space');
  assert(await p.locator('#lang-menu').isVisible(), 'Space did not open');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  assert((await attr(p, 'dir')) === 'rtl', 'Enter on item did not switch');
  assert((await p.evaluate(() => document.activeElement.id)) === 'lang-btn', 'focus after choose');
  assert(!(await p.locator('#lang-menu').isVisible()));
  await p.keyboard.press('Enter');
  await p.keyboard.press('Tab');
  assert(!(await p.locator('#lang-menu').isVisible()), 'Tab did not close');
  await done(p);
});

await test('menu: arrow key on the closed button opens it', async () => {
  const p = await open();
  await p.focus('#lang-btn');
  await p.keyboard.press('ArrowDown');
  assert(await p.locator('#lang-menu').isVisible());
  await done(p);
});

await test('menu: focus rings are visible on keyboard focus', async () => {
  const p = await open();
  await p.keyboard.press('Tab');
  const ring = await p.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  assert(ring.style !== 'none' && ring.width >= 2, JSON.stringify(ring));
  await done(p);
});

await test('menu: tap targets are at least 44px (button, theme, items)', async () => {
  for (const viewport of [{ width: 360, height: 700 }, { width: 1280, height: 900 }]) {
    const p = await open('', { viewport });
    await p.click('#lang-btn');
    const boxes = await p.$$eval('#lang-btn, #theme-btn, #lang-menu [role="menuitemradio"]', (els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return [e.id || e.dataset.lang, r.width, r.height]; })
    );
    for (const [id, w, h] of boxes) assert(w >= 43.99 && h >= 43.99, `${id} ${w}x${h} at ${viewport.width}`);
    await done(p);
  }
});

// ------------------------------------------------------------- language ----
await test('lang: choosing Arabic sets lang/dir, translates the controls, and persists', async () => {
  const p = await open();
  const enLabel = await p.getAttribute('#theme-btn', 'aria-label');
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="ar"]');
  assert((await attr(p, 'lang')) === 'ar-SA' && (await attr(p, 'dir')) === 'rtl');
  const arLabel = await p.getAttribute('#theme-btn', 'aria-label');
  assert(arLabel && arLabel !== enLabel && /[؀-ۿ]/.test(arLabel), 'theme label ' + arLabel);
  const arLang = await p.getAttribute('#lang-btn', 'aria-label');
  assert(arLang && /[؀-ۿ]/.test(arLang), 'lang label ' + arLang);
  assert((await p.locator('#lang-btn').innerText()).includes('العربية'), 'current name shown');
  await p.reload();
  assert((await attr(p, 'dir')) === 'rtl', 'not remembered');
  await done(p);
});

await test('lang: ?lang=ar deep link works and beats a saved English choice; default is English', async () => {
  const p = await open('?lang=ar', { init: () => localStorage.setItem('ti-lang', 'en') });
  assert((await attr(p, 'dir')) === 'rtl' && (await attr(p, 'lang')) === 'ar-SA');
  await done(p);
  const q = await open('', { locale: 'ar-SA', init: () => {} });
  assert((await attr(q, 'dir')) === 'ltr' && (await attr(q, 'lang')) === 'en', 'must not auto-redirect by browser language');
  await done(q);
});

await test('lang: RTL mirrors the cluster and keeps the popover on screen', async () => {
  for (const w of [360, 1280]) {
    const en = await open('', { viewport: { width: w, height: 800 } });
    const enBox = await en.$eval('.hdr__cluster', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
    await en.click('#lang-btn');
    const enMenu = await en.$eval('#lang-menu', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
    assert(enBox[1] > w / 2 && enMenu[0] >= 0 && enMenu[1] <= w, `LTR ${enBox} ${enMenu} @${w}`);
    const enBtn = await en.$eval('#lang-btn', (e) => e.getBoundingClientRect().right);
    assert(Math.abs(enMenu[1] - enBtn) < 2, `LTR popover not aligned to the button's end edge: ${enMenu[1]} vs ${enBtn}`);
    await done(en);
    const ar = await open('?lang=ar', { viewport: { width: w, height: 800 } });
    const arBox = await ar.$eval('.hdr__cluster', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
    await ar.click('#lang-btn');
    const arMenu = await ar.$eval('#lang-menu', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
    assert(arBox[0] < w / 2 && arMenu[0] >= 0 && arMenu[1] <= w, `RTL ${arBox} ${arMenu} @${w}`);
    const arBtn = await ar.$eval('#lang-btn', (e) => e.getBoundingClientRect().left);
    assert(Math.abs(arMenu[0] - arBtn) < 2, `RTL popover not aligned to the button's end edge: ${arMenu[0]} vs ${arBtn}`);
    assert(Math.abs(arBox[0] - (w - enBox[1])) < 2, `not a mirror: ${arBox} vs ${enBox}`);
    await done(ar);
  }
});

// -------------------------------------------------------------- motion -----
await test('motion: menu animates opacity/transform only, and not at all under reduced motion', async () => {
  const p = await open();
  await p.click('#lang-btn');
  const m = await p.$eval('#lang-menu', (e) => { const s = getComputedStyle(e); return [s.animationName, s.transitionProperty]; });
  assert(/menu-in/.test(m[0]), 'animation ' + m);
  const css = await (await fetch(BASE + 'assets/app.css')).text();
  const kf = css.match(/@keyframes menu-in\s*{[^}]*}[^}]*}/)[0];
  assert(!/(width|height|top|left|margin|padding)\s*:/.test(kf), 'layout props animate: ' + kf);
  await done(p);
  const r = await open('', { reducedMotion: 'reduce' });
  await r.click('#lang-btn');
  const dur = await r.$eval('#lang-menu', (e) => getComputedStyle(e).animationDuration);
  assert(parseFloat(dur) <= 0.001, 'duration ' + dur);
  await done(r);
});

// ------------------------------------------------------------ contrast -----
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const CONTRAST_TARGETS = [
  // [selector, minimum, what]
  ['.story__beat', 4.5, 'story body'],
  ['#pain .story__small', 4.5, 'small print (muted)'],
  ['#pain .story__pressure', 4.5, 'pressure line (coral text)'],
  ['#agitate .story__closing', 4.5, 'closing line'],
  ['.hdr__label', 4.5, 'header label (muted)'],
  ['#lang-btn', 4.5, 'language button text'],
  ['#why-not .section-lede', 4.5, 'section lede (muted)'],
  ['#why-not li', 4.5, 'list body'],
  ['#who p', 4.5, 'who copy'],
  ['.hello__title', 3, 'Welcome (large)'],
  ['.hello__lead', 4.5, 'This is my project'],
  ['.hello__cue', 4.5, 'scroll cue'],
  ['.welcome__title', 3, 'welcome title (large)'],
  ['.welcome__lead', 4.5, 'welcome lead'],
  ['.welcome__body', 4.5, 'welcome body'],
  ['.welcome__note', 4.5, 'welcome note (muted)'],
  ['.welcome__go', 4.5, 'welcome button'],
  ['.welcome__skip', 4.5, 'welcome skip link'],
  ['.wcard__status', 4.5, 'welcome card status'],
  ['.wcard__label', 4.5, 'welcome card label'],
  ['.story__bridge', 4.5, 'bridge line'],
  ['.ending__beat', 4.5, 'ending beat'],
  ['.ending__relief', 4.5, 'ending relief line (green)'],
  ['.ending__fix', 4.5, 'ending fix line'],
  ['.welcome__fix', 4.5, 'welcome fix sentence'],
  ['.stream__row--today .stream__step', 4.5, 'stream step'],
  ['.stream__row--today .stream__end', 4.5, 'stream Today end (coral)'],
  ['.stream__row--proposed .stream__end', 4.5, 'stream Proposed end (green)'],
  ['.case__list dt', 4.5, 'case label'],
  ['.case__list dd', 4.5, 'case text'],
  ['.case__fix dd', 4.5, 'case fix text'],
  ['.skipped li', 4.5, 'not-built list'],
  ['.ships__lead', 4.5, 'ships first lead'],
  ['.sources li', 4.5, 'sources list'],
  ['.climax__tab-name', 4.5, 'climax tab name'],
  ['.climax__slot-label', 4.5, 'climax slot label'],
  ['#pain h1', 3, 'H1 (large)'],
  ['#pain .story__rule', 3, 'coral rule (graphic)'],
];
for (const theme of ['dark', 'bright']) {
  await test(`contrast (${theme}): text 4.5:1, large text and graphics 3:1`, async () => {
    const p = await open('', { init: `localStorage.setItem('ti-theme','${theme}')` });
    const rows = await p.evaluate((targets) => {
      const parse = (s) => s.match(/[\d.]+/g).map(Number);
      const effBg = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c.length === 3 || c[3] > 0.99) return c.slice(0, 3);
        }
        return [255, 255, 255];
      };
      return targets.map(([sel]) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        const s = getComputedStyle(el);
        const isGraphic = /rule/.test(sel);
        const fg = parse(isGraphic ? s.backgroundColor : s.color).slice(0, 3);
        return { sel, fg, bg: effBg(isGraphic ? el.parentElement : el) };
      });
    }, CONTRAST_TARGETS);
    const report = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      assert(!row.missing, 'missing ' + row.sel);
      const r = ratio(row.fg, row.bg);
      report.push(`${CONTRAST_TARGETS[i][2]} ${r.toFixed(2)}`);
      assert(r >= CONTRAST_TARGETS[i][1], `${CONTRAST_TARGETS[i][2]} ${r.toFixed(2)} < ${CONTRAST_TARGETS[i][1]}`);
    }
    if (process.env.VERBOSE) console.log('       ' + theme + ': ' + report.join('; '));
    await done(p);
  });
}

await test('contrast: header icon buttons and focus ring reach 3:1 against the header in both themes', async () => {
  for (const theme of ['dark', 'bright']) {
    const p = await open('', { init: `localStorage.setItem('ti-theme','${theme}')` });
    await p.keyboard.press('Tab');
    const v = await p.evaluate(() => {
      const parse = (s) => s.match(/[\d.]+/g).map(Number);
      // At the top the header is see-through, so what it sits on is the page ground.
      const ground = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
      const ring = parse(getComputedStyle(document.activeElement).outlineColor).slice(0, 3);
      const icon = parse(getComputedStyle(document.querySelector('#theme-btn')).color).slice(0, 3);
      // Scrolled, it is the frosted tint over whatever is under it. Worst case
      // for an icon is content of its own colour: composite the tint over that.
      const glass = parse(getComputedStyle(document.querySelector('.site-header'), '::before').backgroundColor);
      const over = (top, under) => top.slice(0, 3).map((c, i) => Math.round(c * top[3] + under[i] * (1 - top[3])));
      return { ground, ring, icon, worst: over(glass.length === 4 ? glass : [...glass, 1], icon) };
    });
    assert(ratio(v.ring, v.ground) >= 3, theme + ' ring (top) ' + ratio(v.ring, v.ground).toFixed(2));
    assert(ratio(v.icon, v.ground) >= 3, theme + ' icon (top) ' + ratio(v.icon, v.ground).toFixed(2));
    assert(ratio(v.icon, v.worst) >= 3, theme + ' icon (frosted, worst case) ' + ratio(v.icon, v.worst).toFixed(2));
    assert(ratio(v.ring, v.worst) >= 3, theme + ' ring (frosted, worst case) ' + ratio(v.ring, v.worst).toFixed(2));
    await done(p);
  }
});

// ------------------------------------------------------ header behaviour -----
// The header is see-through at the top, frosts once the page moves, fills a
// hairline coral then green with the scroll, and names the beat being read.
const scrollTo = async (p, y) => { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(120); };
const protoTop = (p) => p.evaluate(() => document.getElementById('prototype').getBoundingClientRect().top + window.scrollY);
const glassOpacity = (p) => p.evaluate(() => Number(getComputedStyle(document.querySelector('.site-header'), '::before').opacity));

await test('header: see-through at the top, frosted (blur, tint) once scrolled, back at the top again', async () => {
  const p = await open('');
  await p.waitForTimeout(500);
  assert((await glassOpacity(p)) === 0, 'frost visible at the top: ' + (await glassOpacity(p)));
  await scrollTo(p, 600);
  await p.waitForTimeout(500); // the fade is 0.35s
  assert((await glassOpacity(p)) === 1, 'frost missing when scrolled: ' + (await glassOpacity(p)));
  const bd = await p.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.site-header'), '::before');
    return (s.backdropFilter || s.webkitBackdropFilter || '');
  });
  assert(/blur\(/.test(bd), 'no backdrop blur: ' + bd);
  await scrollTo(p, 0);
  await p.waitForTimeout(500);
  assert((await glassOpacity(p)) === 0, 'frost stuck after returning to the top');
  await done(p);
});

await test('header: stays pinned and never moves the page (no layout shift while frosting)', async () => {
  const p = await open('');
  const h0 = await p.evaluate(() => document.querySelector('.site-header').getBoundingClientRect().height);
  await scrollTo(p, 900);
  const r = await p.evaluate(() => { const b = document.querySelector('.site-header').getBoundingClientRect(); return { top: b.top, h: b.height }; });
  assert(r.top === 0, 'header top ' + r.top);
  assert(Math.abs(r.h - h0) < 0.5, 'header height changed ' + h0 + ' -> ' + r.h);
  await done(p);
});

await test('header: the hairline fills coral to the phone, then green, and mirrors in RTL', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const vars = () => p.evaluate(() => {
      const s = document.querySelector('.site-header').style;
      return { story: parseFloat(s.getPropertyValue('--p-story')), relief: parseFloat(s.getPropertyValue('--p-relief')) };
    });
    let v = await vars();
    assert(v.story === 0 && v.relief === 0, lang + ' at the top ' + JSON.stringify(v));
    const turn = (await protoTop(p)) - 450;
    await scrollTo(p, Math.round(turn / 2));
    v = await vars();
    assert(v.story > 0.3 && v.story < 0.7 && v.relief === 0, lang + ' halfway to the phone ' + JSON.stringify(v));
    await scrollTo(p, Math.round(turn + 30));
    v = await vars();
    assert(v.story === 1, lang + ' story bar not full at the phone ' + JSON.stringify(v));
    await scrollTo(p, 1e6);
    v = await vars();
    assert(v.story === 1 && v.relief > 0.95, lang + ' at the bottom ' + JSON.stringify(v));
    const origin = await p.evaluate(() => getComputedStyle(document.querySelector('.hdr__bar--pressure')).transformOrigin.split(' ')[0]);
    const width = await p.evaluate(() => document.querySelector('.hdr__bar--pressure').getBoundingClientRect().width);
    assert(lang === '' ? parseFloat(origin) === 0 : parseFloat(origin) === width || parseFloat(origin) > 100, lang + ' origin ' + origin);
    await done(p);
  }
});

await test('header: the label names the beat being read, in both languages, and falls back to marked English if a beat has no Arabic yet', async () => {
  const p = await open('');
  const label = () => p.evaluate(() => document.getElementById('hdr-label').textContent);
  assert((await label()) === 'Why was I declined?', 'top label ' + (await label()));
  await scrollTo(p, (await protoTop(p)) + 50);
  assert((await label()) === 'The same decline, told properly', 'phone label ' + (await label()));
  await scrollTo(p, 0);
  assert((await label()) === 'Why was I declined?', 'label did not return to the title: ' + (await label()));
  await done(p);
  const a = await open('?lang=ar');
  const arWanted = await a.evaluate(() => window.STRINGS.ar['chapter.falling']);
  assert(/[؀-ۿ]/.test(arWanted) && arWanted !== 'TODO_AR', 'no Arabic for the phone beat: ' + arWanted);
  await scrollTo(a, (await protoTop(a)) + 50);
  const t = await a.evaluate(() => { const l = document.getElementById('hdr-label'); return { text: l.textContent, lang: l.getAttribute('lang'), dir: l.getAttribute('dir') }; });
  assert(t.text === arWanted && t.lang === null && t.dir === null, 'arabic label ' + JSON.stringify(t));
  // The fallback: if a beat's Arabic is still the marker, English shows, marked as English, never the marker.
  await scrollTo(a, 0);
  await a.evaluate(() => { window.STRINGS.ar['chapter.falling'] = 'TODO_AR'; });
  await scrollTo(a, (await protoTop(a)) + 50);
  const f = await a.evaluate(() => { const l = document.getElementById('hdr-label'); return { text: l.textContent, lang: l.getAttribute('lang'), dir: l.getAttribute('dir') }; });
  assert(f.text === 'The same decline, told properly' && f.lang === 'en' && f.dir === 'ltr', 'fallback ' + JSON.stringify(f));
  assert(!/TODO_AR/.test(f.text), 'the marker leaked');
  await scrollTo(a, 0);
  const title = await a.evaluate(() => { const l = document.getElementById('hdr-label'); return { text: l.textContent, lang: l.getAttribute('lang') }; });
  assert(/[؀-ۿ]/.test(title.text) && title.lang === null, 'arabic title ' + JSON.stringify(title));
  await done(a);
});

await test('header: with JavaScript off it is a solid bar, so nothing scrolls under a see-through header', async () => {
  const p = await open('', { javaScriptEnabled: false });
  const c = await p.evaluate(() => getComputedStyle(document.querySelector('.site-header')).backgroundColor);
  assert(/rgb\(26, 25, 25\)/.test(c) || /rgba\(26, 25, 25, 1\)/.test(c), 'header background without JS: ' + c);
  const shown = await p.evaluate(() => getComputedStyle(document.querySelector('.hdr__progress')).display);
  assert(shown === 'none', 'progress hairline shown without JS: ' + shown);
  await done(p);
});

await test('header: reduced motion removes the frost fade and the label fade', async () => {
  const p = await open('', { reducedMotion: 'reduce' });
  const t = await p.evaluate(() => getComputedStyle(document.querySelector('.site-header'), '::before').transitionDuration);
  assert(/^0s(, 0s)*$/.test(t), 'frost transition ' + t);
  await scrollTo(p, (await protoTop(p)) + 50);
  const a = await p.evaluate(() => getComputedStyle(document.getElementById('hdr-label')).animationName);
  assert(a === 'none', 'label animation ' + a);
  await done(p);
});

await test('header: the language menu still opens and stays readable over the frosted bar', async () => {
  const p = await open('');
  await scrollTo(p, 700);
  await p.click('#lang-btn');
  const vis = await p.evaluate(() => {
    const m = document.getElementById('lang-menu');
    const r = m.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { hidden: m.hidden, covered: !m.contains(top) };
  });
  assert(!vis.hidden && !vis.covered, 'menu hidden or covered ' + JSON.stringify(vis));
  await done(p);
});

// ------------------------------------------------- opening: welcome, intro -----
// Screen 1 is a full-viewport Welcome over moving colour, screen 2 is the
// design-project intro (a sheet that slides over it), then the story.
const VIEWPORTS = [[1280, 800], [390, 800], [1440, 900]];

await test('opening: Welcome fills the first screen, then the design-project intro, then the story, in DOM and scroll order', async () => {
  for (const [w, h] of VIEWPORTS) {
    const p = await open('', { viewport: { width: w, height: h } });
    const t = await p.evaluate(() => {
      const $ = (s) => document.querySelector(s);
      const doc = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, w: r.width, left: r.left, cy: r.top + scrollY + r.height / 2, cx: r.left + r.width / 2 }; };
      const hello = $('#hello'), intro = $('#welcome'), pain = $('#pain h1');
      return {
        entryFirst: $('#entry').firstElementChild.className,
        openingKids: [...$('.opening').children].map((c) => c.id),
        follows: !!($('.opening').compareDocumentPosition($('#pain')) & Node.DOCUMENT_POSITION_FOLLOWING),
        hello: doc(hello), intro: doc(intro), pain: doc(pain),
        title: doc($('.hello__title')), titleText: $('.hello__title').textContent.trim(),
        lead: doc($('.hello__lead')), leadText: $('.hello__lead').textContent.trim(),
        vh: innerHeight, vw: innerWidth,
        introLead: $('.welcome__lead').textContent, introNote: $('.welcome__note').textContent, introTitle: $('.welcome__title').textContent,
      };
    });
    const tag = `${w}x${h}`;
    assert(/opening/.test(t.entryFirst), 'the opening is not first in main: ' + t.entryFirst);
    assert(t.openingKids.join() === 'hello,welcome', 'opening children: ' + t.openingKids);
    assert(t.follows, 'the story does not follow the opening');
    assert(t.titleText === 'Welcome', 'title: ' + t.titleText);
    assert(t.leadText === 'This is my project.', 'lead: ' + t.leadText);
    assert(Math.abs(t.hello.h - t.vh) <= 1 && t.hello.top <= 1, `${tag}: screen 1 is not one full viewport: ${t.hello.top}/${t.hello.h}`);
    assert(Math.abs(t.title.cx - t.vw / 2) <= 2, `${tag}: title not centred horizontally`);
    assert(Math.abs(t.title.cy - t.vh / 2) <= t.vh * 0.14, `${tag}: title not in the middle of the screen: ${t.title.cy} vs ${t.vh / 2}`);
    assert(t.title.w >= t.vw * 0.6, `${tag}: title is not very large: ${t.title.w}px of ${t.vw}px`);
    assert(t.lead.top > t.title.top + t.title.h * 0.6 && Math.abs(t.lead.cx - t.vw / 2) <= 2, `${tag}: lead is not centred under the title`);
    assert(t.intro.top >= t.hello.top + t.hello.h * 0.95 && t.pain.top > t.intro.top + t.intro.h * 0.5, `${tag}: scroll order is wrong`);
    assert(t.pain.top <= t.vh * 3, `${tag}: the story hook is ${(t.pain.top / t.vh).toFixed(2)} viewports down (more than 3)`);
    assert(/design project/i.test(t.introLead), 'intro lead: ' + t.introLead);
    assert(/independent/i.test(t.introNote) && /affiliated/i.test(t.introNote), 'intro note: ' + t.introNote);
    assert(t.introTitle === 'Why was I declined?', 'intro title: ' + t.introTitle);
    if (process.env.VERBOSE) console.log(`       ${tag}: story hook at ${(t.pain.top / t.vh).toFixed(2)} viewports`);
    await done(p);
  }
});

await test('opening: the scroll cue is a real, keyboard-reachable link to the intro', async () => {
  const p = await open('');
  const c = await p.evaluate(() => {
    const a = document.querySelector('.hello__cue');
    const r = a.getBoundingClientRect();
    return { tag: a.tagName, href: a.getAttribute('href'), ok: !!document.querySelector(a.getAttribute('href')), w: r.width, h: r.height, text: a.textContent.trim(), tab: a.tabIndex };
  });
  assert(c.tag === 'A' && c.href === '#welcome' && c.ok, JSON.stringify(c));
  assert(c.w >= 44 && c.h >= 44 && c.text.length > 0 && c.tab >= 0, JSON.stringify(c));
  let reached = false;
  for (let i = 0; i < 8 && !reached; i += 1) { await p.keyboard.press('Tab'); reached = await p.evaluate(() => document.activeElement.classList.contains('hello__cue')); }
  assert(reached, 'Tab never reaches the cue');
  await done(p);
});

await test('opening: the background colours move (slow transform layers, both themes), palette only, transform and opacity only', async () => {
  for (const theme of ['dark', 'bright']) {
    const p = await open('', { init: `localStorage.setItem('ti-theme','${theme}')` });
    const info = await p.evaluate(() => {
      const blobs = [...document.querySelectorAll('.hello__blob')];
      const props = new Set();
      for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) {
        if (rule.type === CSSRule.KEYFRAMES_RULE && /^sky-/.test(rule.name)) for (const kf of rule.cssRules) for (const k of kf.style) props.add(k);
      }
      return {
        n: blobs.length,
        names: blobs.map((b) => getComputedStyle(b).animationName),
        durs: blobs.map((b) => parseFloat(getComputedStyle(b).animationDuration)),
        iter: blobs.map((b) => getComputedStyle(b).animationIterationCount),
        images: blobs.map((b) => getComputedStyle(b).backgroundImage).join(' '),
        filters: blobs.map((b) => getComputedStyle(b).filter + '|' + getComputedStyle(b).backdropFilter),
        kfProps: [...props],
        t0: blobs.map((b) => getComputedStyle(b).transform),
      };
    });
    assert(info.n >= 3, theme + ': need at least 3 colour layers, got ' + info.n);
    assert(info.names.every((n) => n !== 'none'), theme + ': a layer is not animated: ' + info.names);
    assert(info.iter.every((i) => i === 'infinite'), theme + ': a layer stops: ' + info.iter);
    assert(info.durs.every((d) => d >= 14), theme + ': too fast to be a drift: ' + info.durs);
    assert(new Set(info.durs).size === info.n, theme + ': layers share a tempo: ' + info.durs);
    assert(info.kfProps.length > 0 && info.kfProps.every((k) => k === 'transform' || k === 'opacity'), theme + ': keyframes animate ' + info.kfProps);
    assert(info.filters.every((f) => f === 'none|none'), theme + ': a filter is on a layer: ' + info.filters);
    const rgbs = [...info.images.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map((m) => m.slice(1, 4).map(Number));
    const coral = rgbs.some(([r, g, b]) => r > 200 && g > 90 && g < 140 && b < 120);
    const green = rgbs.some(([r, g, b]) => g > 230 && r < 130 && b < 170);
    assert(coral && green, `${theme}: the palette's coral and green are not both in the layers: ${JSON.stringify(rgbs.slice(0, 6))}`);
    await p.waitForTimeout(1500);
    const t1 = await p.$$eval('.hello__blob', (bs) => bs.map((b) => getComputedStyle(b).transform));
    info.t0.forEach((m, i) => assert(m !== t1[i], `${theme}: layer ${i} did not move in 1.5s: ${m}`));
    await done(p);
  }
});

await test('opening: the moving colour really paints differently over time (frames differ), and holds still under reduced motion', async () => {
  const shot = async (pg) => (await pg.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 800 } })).toString('base64');
  const p = await open('');
  await p.addStyleTag({ content: '.hello__copy,.hello__cue{visibility:hidden !important}' });
  const at = async (ms) => {
    await p.evaluate((t) => document.getAnimations().forEach((a) => { if (a.timeline instanceof DocumentTimeline) { a.pause(); a.currentTime = t; } }), ms);
    return shot(p);
  };
  const a = await at(1000), b = await at(9000), c = await at(20000);
  assert(a !== b && b !== c && a !== c, 'frames are identical: colour does not move');
  await done(p);
  const q = await open('', { reducedMotion: 'reduce' });
  await q.addStyleTag({ content: '.hello__copy,.hello__cue{visibility:hidden !important}' });
  const s1 = await shot(q);
  await q.waitForTimeout(1500);
  const s2 = await shot(q);
  assert(s1 === s2, 'reduced motion: the background still moves');
  const st = await q.evaluate(() => ({
    names: [...document.querySelectorAll('.hello *')].map((e) => getComputedStyle(e).animationName),
    img: getComputedStyle(document.querySelector('.hello__blob')).backgroundImage,
    op: [...document.querySelectorAll('.hello__title,.hello__word,.hello__lead,.hello__cue')].map((e) => getComputedStyle(e).opacity),
    tr: getComputedStyle(document.querySelector('.hello__word')).transform,
  }));
  assert(st.names.every((n) => n === 'none'), 'reduced motion: animations still run: ' + [...new Set(st.names)]);
  assert(/gradient/.test(st.img), 'reduced motion: no still frame of colour');
  assert(st.op.every((o) => o === '1') && (st.tr === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(st.tr)), 'reduced motion: text not final: ' + st.op + st.tr);
  await done(q);
});

await test('opening: text on the moving colour holds contrast in every sampled frame, both themes (pixel-sampled, worst pixel)', async () => {
  for (const theme of ['dark', 'bright']) {
    const p = await open('', { viewport: { width: 1280, height: 800 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    await p.waitForTimeout(3800); // the words have all arrived
    const want = [['.hello__title', 3], ['.hello__lead', 4.5], ['.hello__cue', 4.5]];
    const boxes = await p.evaluate((w) => w.map(([s]) => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); return { s, x: Math.max(0, r.left), y: Math.max(0, r.top), w: r.width, h: r.height, fg: getComputedStyle(el).color }; }), want);
    await p.addStyleTag({ content: '.hello__title,.hello__lead,.hello__cue{color:transparent !important;border-color:transparent !important} .hello__cue *{visibility:hidden !important}' });
    const probe = await p.context().newPage();
    const worst = {};
    for (const ms of [0, 3000, 6500, 10000, 14000, 19000, 25000, 33000, 41000, 52000, 70000]) {
      await p.evaluate((t) => document.getAnimations().forEach((a) => { if (a.animationName && /^sky-/.test(a.animationName)) { a.pause(); a.currentTime = t; } }), ms);
      for (const b of boxes) {
        const png = await p.screenshot({ clip: { x: b.x, y: b.y, width: Math.min(b.w, 1280 - b.x), height: b.h } });
        const px = await probe.evaluate(async (data) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data; const out = [];
          for (let i = 0; i < d.length; i += 4 * 7) out.push([d[i], d[i + 1], d[i + 2]]);
          return out;
        }, png.toString('base64'));
        const fg = b.fg.match(/[\d.]+/g).map(Number).slice(0, 3);
        const r = Math.min(...px.map((q) => ratio(fg, q)));
        worst[b.s] = Math.min(worst[b.s] === undefined ? 99 : worst[b.s], r);
      }
    }
    if (process.env.VERBOSE) console.log('       ' + theme + ' worst pixel: ' + JSON.stringify(worst, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
    for (const [s, min] of want) assert(worst[s] >= min, `${theme}: ${s} worst-pixel contrast ${worst[s].toFixed(2)} < ${min}`);
    await done(p);
  }
});

await test('opening: the intro card stays undrawn until the intro scrolls into view, then draws three EMPTY fields and stops', async () => {
  const p = await open('');
  await p.waitForTimeout(3000);
  const before = await p.evaluate(() => ({
    seen: document.getElementById('welcome').classList.contains('is-seen'),
    op: getComputedStyle(document.querySelector('.wcard')).opacity,
    draw: [...document.querySelectorAll('.wcard__empty')].map((e) => getComputedStyle(e).transform),
  }));
  assert(!before.seen && before.op === '0', 'card already shown off screen: ' + JSON.stringify(before));
  assert(before.draw.every((d) => /matrix\(0, 0, 0, 1/.test(d)), 'empty rows already drawn off screen: ' + before.draw);
  await p.evaluate(() => window.scrollTo(0, document.getElementById('welcome').getBoundingClientRect().top + scrollY));
  await p.waitForTimeout(3400);
  const s = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.wcard__row')];
    return {
      seen: document.getElementById('welcome').classList.contains('is-seen'),
      labels: rows.map((r) => r.querySelector('.wcard__label').textContent),
      empties: rows.map((r) => r.querySelector('.wcard__empty').textContent.trim() === '' && getComputedStyle(r.querySelector('.wcard__empty')).transform),
      opacity: [...document.querySelectorAll('.wcard, .wcard__dot')].map((e) => getComputedStyle(e).opacity),
    };
  });
  assert(s.seen, 'not marked seen after scrolling to it');
  assert(s.labels.join('|') === 'Reason|Next review|What to do next', 'labels ' + s.labels);
  assert(s.empties.every((e) => e && (e === 'none' || /matrix\(1, 0, 0, 1/.test(e))), 'a field is not fully drawn or has content: ' + s.empties);
  assert(s.opacity.every((o) => o === '1'), 'card not fully shown: ' + s.opacity);
  await done(p);
});

await test('opening: the intro reveals as a sheet over the pinned Welcome (no fade-up on every block), still and final with reduced motion', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  const at0 = await p.evaluate(() => ({ pos: getComputedStyle(document.getElementById('hello')).position }));
  await p.evaluate(() => window.scrollTo(0, 400));
  await p.waitForTimeout(200);
  const mid = await p.evaluate(() => ({
    hello: document.getElementById('hello').getBoundingClientRect().top,
    sheet: document.getElementById('welcome').getBoundingClientRect().top,
    radius: getComputedStyle(document.getElementById('welcome')).borderTopLeftRadius,
    bg: getComputedStyle(document.getElementById('welcome')).backgroundColor,
    anim: [...document.querySelectorAll('.welcome__title,.welcome__lead,.welcome__body,.welcome__note,.welcome__links')].map((e) => getComputedStyle(e).animationName),
  }));
  assert(at0.pos === 'sticky', 'Welcome is not pinned: ' + at0.pos);
  assert(Math.abs(mid.hello) <= 1, 'Welcome scrolled away instead of staying pinned: ' + mid.hello);
  assert(mid.sheet > 300 && mid.sheet < 500, 'the intro is not sliding over it: ' + mid.sheet);
  assert(parseFloat(mid.radius) >= 12 && mid.bg !== 'rgba(0, 0, 0, 0)', 'the sheet has no edge or no ground: ' + mid.radius + ' ' + mid.bg);
  assert(mid.anim.every((n) => n === 'none'), 'blocks still fade up one by one: ' + mid.anim);
  await done(p);
  const q = await open('', { reducedMotion: 'reduce' });
  const s = await q.evaluate(() => ({
    names: [...document.querySelectorAll('.welcome *, .wcard')].map((e) => getComputedStyle(e).animationName),
    opacity: [...document.querySelectorAll('.welcome__title, .wcard, .wcard__dot')].map((e) => getComputedStyle(e).opacity),
    draw: [...document.querySelectorAll('.wcard__empty')].map((e) => getComputedStyle(e).transform),
  }));
  assert(s.names.every((n) => n === 'none'), 'animations still run: ' + [...new Set(s.names)]);
  assert(s.opacity.every((o) => o === '1') && s.draw.every((d) => d === 'none' || /matrix\(1, 0, 0, 1/.test(d)), 'not final at once: ' + s.opacity + s.draw);
  await done(q);
});

await test('opening: anchor jumps scroll smoothly, and instantly under reduced motion', async () => {
  for (const [rm, sel] of [[false, '.hello__cue'], [false, '.welcome__go'], [true, '.hello__cue']]) {
    const p = await open('', { viewport: { width: 1280, height: 800 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
    const targetOf = () => p.evaluate((s) => {
      const t = document.querySelector(document.querySelector(s).getAttribute('href'));
      return t.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(t).scrollMarginTop) || 0);
    }, sel);
    if (sel === '.welcome__go') { await p.evaluate(() => window.scrollTo(0, document.getElementById('welcome').offsetTop)); await p.waitForTimeout(250); }
    const target = await targetOf();
    const start = await p.evaluate(() => scrollY);
    await p.click(sel);
    await p.waitForTimeout(rm ? 80 : 110);
    const early = await p.evaluate(() => scrollY);
    if (rm) assert(Math.abs(early - target) <= 2, `reduced motion: not instant (${early} vs ${target})`);
    else assert(Math.abs(early - start) > 4 && Math.abs(early - target) > 4, `${sel}: not a smooth scroll (start ${start}, at ${early}, target ${target})`);
    await p.waitForTimeout(1800);
    const end = await p.evaluate(() => scrollY);
    assert(Math.abs(end - target) <= 2, `${sel}: did not land on its target (${end} vs ${target})`);
    await done(p);
  }
});

// Every button and link this page adds must answer a hover, a press and a
// keyboard focus, each visibly different from rest, at 4.5:1 for text and
// 3:1 for icons and focus rings, in both themes, at 44px or more.
const REACTIVE = ['.hello__cue', '.welcome__go', '.welcome__skip', '#lang-btn', '#theme-btn', '.hdr__item[data-lang="ar"]'];
const REACTIVE_SELECTOR = REACTIVE.join(',');
const STATE_PROPS = ['color', 'backgroundColor', 'borderTopColor', 'outlineStyle', 'outlineWidth', 'outlineColor', 'transform', 'textDecorationThickness', 'textDecorationColor', 'boxShadow'];
const snapState = (p, sel) => p.$eval(sel, (el, props) => {
  const s = getComputedStyle(el);
  // computed colours serialise as rgb()/rgba(), or, for color-mix(), as color(srgb r g b / a) with 0..1 channels
  const parse = (v) => {
    const n = (v.match(/[\d.]+(?:e-?\d+)?/g) || [0, 0, 0, 0]).map(Number);
    return /^color\(/.test(v) ? [n[0] * 255, n[1] * 255, n[2] * 255, ...(n.length > 3 ? [n[3]] : [])] : n;
  };
  const over = (top, under) => { const a = top.length === 4 ? top[3] : 1; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)); };
  // what the control sits on: every ancestor background composited, then its own, over the page
  let ground = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
  const chain = []; for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) chain.unshift(n);
  for (const n of chain) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0) ground = over(c, ground); }
  const own = parse(s.backgroundColor);
  const bgc = own.length === 4 && own[3] === 0 ? ground : over(own, ground);
  const r = { width: el.offsetWidth, height: el.offsetHeight }; // layout size: a pressed control is scaled, its target is not
  return { ...Object.fromEntries(props.map((k) => [k, s[k]])), fgRgb: parse(s.color).slice(0, 3), bgRgb: bgc, groundRgb: ground, ringRgb: parse(s.outlineColor).slice(0, 3), w: r.width, h: r.height, tdur: s.transitionDuration, focusVisible: el.matches(':focus-visible') };
}, STATE_PROPS);
const changed = (a, b) => STATE_PROPS.filter((k) => a[k] !== b[k]);

for (const theme of ['dark', 'bright']) {
  await test(`reactive (${theme}): every added button and link changes on hover, press and keyboard focus, holds contrast in each state, and is at least 44px`, async () => {
    const p = await open('', { viewport: { width: 1280, height: 800 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    const bad = [];
    for (const sel of REACTIVE) {
      const inMenu = sel.startsWith('.hdr__item');
      if (inMenu) await p.click('#lang-btn');
      await p.locator(sel).scrollIntoViewIfNeeded();
      await p.mouse.move(2, 2); await p.waitForTimeout(350);
      const rest = await snapState(p, sel);
      await p.hover(sel); await p.waitForTimeout(350);
      const hover = await snapState(p, sel);
      await p.mouse.down(); await p.waitForTimeout(350);
      const active = await snapState(p, sel);
      await p.mouse.move(2, 2); await p.mouse.up(); await p.waitForTimeout(350);
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      if (inMenu) {
        // reach the item the way a keyboard does: ArrowUp on the menu button opens it on its last item (Arabic)
        await p.locator('#lang-btn').focus(); await p.keyboard.press('Escape'); await p.keyboard.press('ArrowUp');
      } else {
        await p.keyboard.press('Shift+Tab'); // a key press makes the next focus() count as keyboard focus
        await p.locator(sel).focus();
      }
      await p.waitForTimeout(350);
      const focus = await snapState(p, sel);
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      if (inMenu) await p.keyboard.press('Escape');
      if (!changed(rest, hover).length) bad.push(`${sel}: hover looks like rest`);
      if (!changed(hover, active).length) bad.push(`${sel}: pressed looks like hover`);
      if (active.transform === rest.transform) bad.push(`${sel}: pressed has no shape change, so touch gets no feedback`);
      if (!focus.focusVisible || focus.outlineStyle === 'none' || parseFloat(focus.outlineWidth) < 2) bad.push(`${sel}: no visible focus ring (${focus.outlineStyle} ${focus.outlineWidth})`);
      if (focus.outlineStyle === rest.outlineStyle && focus.outlineWidth === rest.outlineWidth) bad.push(`${sel}: focus is not different from rest`);
      for (const [name, s] of [['rest', rest], ['hover', hover], ['active', active], ['focus', focus]]) {
        const tr = ratio(s.fgRgb, s.bgRgb);
        if (tr < 4.5) bad.push(`${sel} ${name}: text/icon ${tr.toFixed(2)} < 4.5`);
        if (s.w < 43.99 || s.h < 43.99) bad.push(`${sel} ${name}: ${s.w}x${s.h} under 44px`);
      }
      const ring = ratio(focus.ringRgb, focus.groundRgb);
      if (ring < 3) bad.push(`${sel}: focus ring ${ring.toFixed(2)} < 3`);
      const longest = Math.max(...focus.tdur.split(',').map(parseFloat));
      if (longest > 0.3) bad.push(`${sel}: transition ${longest}s over 0.3s`);
      if (process.env.VERBOSE) console.log(`       ${theme} ${sel}: hover ${changed(rest, hover)} | press ${changed(hover, active)} | ring ${ring.toFixed(1)}`);
    }
    assert(bad.length === 0, bad.join('; '));
    await done(p);
  });
}

await test('reactive: transitions on the new controls are short and only colour or transform; none under reduced motion', async () => {
  for (const rm of [false, true]) {
    const p = await open('', { reducedMotion: rm ? 'reduce' : 'no-preference' });
    await p.click('#lang-btn');
    const rows = await p.$$eval(REACTIVE_SELECTOR, (els) => els.map((e) => { const s = getComputedStyle(e); return { id: e.className || e.id, props: s.transitionProperty.split(',').map((x) => x.trim()), dur: s.transitionDuration.split(',').map(parseFloat) }; }));
    assert(rows.length === REACTIVE.length, 'controls missing: ' + rows.length);
    for (const r of rows) {
      r.props.forEach((pr, i) => {
        const d = r.dur[i % r.dur.length];
        if (rm) assert(d <= 0.001, `${r.id}: still transitions under reduced motion (${pr} ${d}s)`);
        else if (d > 0) {
          assert(d >= 0.1 && d <= 0.3, `${r.id}: ${pr} lasts ${d}s`);
          assert(['background-color', 'color', 'border-color', 'transform', 'opacity', 'text-decoration-color'].includes(pr), `${r.id}: transitions ${pr}`);
        }
      });
      if (!rm) assert(r.dur.some((d) => d > 0), `${r.id}: no transition at all`);
    }
    await done(p);
  }
});



await test('welcome: readable with JavaScript off, and the two links land on real targets', async () => {
  const p = await open('', { javaScriptEnabled: false });
  const s = await p.evaluate(() => ({
    text: document.querySelector('.welcome').innerText,
    go: document.querySelector('.welcome__go').getAttribute('href'),
    skip: document.querySelector('.welcome__skip').getAttribute('href'),
    goOk: !!document.querySelector(document.querySelector('.welcome__go').getAttribute('href')),
    skipOk: !!document.querySelector(document.querySelector('.welcome__skip').getAttribute('href')),
  }));
  assert(/design project/i.test(s.text) && /never say why/i.test(s.text), 'text missing without JS: ' + s.text);
  assert(s.goOk && s.skipOk, 'a welcome link has no target: ' + s.go + ' ' + s.skip);
  // the opening is pure CSS: with JavaScript off the words show, the colour still drifts, the card is final
  const o = await p.evaluate(() => ({
    hello: document.querySelector('.hello').innerText,
    names: [...document.querySelectorAll('.hello__blob')].map((b) => getComputedStyle(b).animationName),
    op: [...document.querySelectorAll('.hello__title,.hello__lead,.hello__cue,.wcard,.wcard__dot')].map((e) => getComputedStyle(e).opacity),
    draw: [...document.querySelectorAll('.wcard__empty')].map((e) => getComputedStyle(e).transform),
    pos: getComputedStyle(document.querySelector('.hello')).position,
  }));
  assert(/Welcome/.test(o.hello) && /This is my project\./.test(o.hello) && o.hello.trim().length > 0, 'opening text missing without JS: ' + o.hello);
  assert(o.names.length >= 3 && o.names.every((n) => n !== 'none'), 'the colour does not move without JS: ' + o.names);
  await p.waitForTimeout(3500);
  const late = await p.evaluate(() => ({
    op: [...document.querySelectorAll('.hello__title,.hello__lead,.hello__cue,.wcard,.wcard__dot')].map((e) => getComputedStyle(e).opacity),
    draw: [...document.querySelectorAll('.wcard__empty')].map((e) => getComputedStyle(e).transform),
  }));
  assert(late.op.every((x) => x === '1'), 'opening not shown without JS: ' + late.op);
  assert(late.draw.every((d) => d === 'none' || /matrix\(1, 0, 0, 1/.test(d)), 'card rows not drawn without JS: ' + late.draw);
  await done(p);
});

await test('story arc: the beats come in order (hook, opening, rising, climax, falling, conclusion) and the header names each', async () => {
  const p = await open('');
  const marks = await p.evaluate(() => [...document.querySelectorAll('[data-chapter]')].map((e) => e.getAttribute('data-chapter')));
  const order = marks.filter((k, i) => k !== marks[i - 1]);
  assert(order.join() === 'hook,opening,rising,climax,falling,conclusion', 'order ' + order.join());
  const en = await p.evaluate(() => window.STRINGS.en);
  const idx = await p.evaluate(() => [...document.querySelectorAll('[data-chapter]')].length);
  for (let i = 0; i < idx; i += 1) {
    const key = marks[i];
    await p.evaluate((n) => {
      const el = document.querySelectorAll('[data-chapter]')[n];
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3);
    }, i);
    await p.waitForTimeout(150);
    const label = await p.evaluate(() => document.getElementById('hdr-label').textContent);
    assert(label === en['chapter.' + key], `marker ${i} (${key}): label "${label}"`);
  }
  await done(p);
});

await test('story arc: the climax (the app never shows the limit) comes after the evidence widens, and the ending follows the phone', async () => {
  const p = await open('');
  const y = await p.evaluate(() => {
    const top = (sel) => document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
    const app = [...document.querySelectorAll('#agitate .story__beat')].find((e) => /opened the app/.test(e.textContent));
    const other = [...document.querySelectorAll('#agitate .story__beat')].find((e) => /asked someone else/.test(e.textContent));
    const help = [...document.querySelectorAll('#agitate .story__beat')].find((e) => /help centre/.test(e.textContent));
    return { help: help.getBoundingClientRect().top + scrollY, other: other.getBoundingClientRect().top + scrollY, app: app.getBoundingClientRect().top + scrollY, closing: top('.story__closing'), proto: top('#prototype'), ending: top('#ending'), why: top('#why-not') };
  });
  assert(y.help < y.other && y.other < y.app && y.app < y.closing && y.closing < y.proto && y.proto < y.ending && y.ending < y.why, JSON.stringify(y));
  await done(p);
});

// -------------------------------------------------------------- climax -----
const climaxTop = (p) => p.evaluate(() => document.querySelector('.climax').getBoundingClientRect().top + window.scrollY);
const xOpacities = (p) => p.evaluate(() => [...document.querySelectorAll('.climax__x')].map((e) => Number(getComputedStyle(e).opacity)));

await test('climax: four tabs, named as the app names them in both languages, none holding the limit, and a slot that stays EMPTY', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const v = await p.evaluate(() => {
      const L = window.PAGE.lang;
      const names = [...document.querySelectorAll('.climax__tab-name')].map((e) => e.textContent);
      const want = ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile'].map((k) => window.STRINGS[L][k]);
      const slot = document.querySelector('.climax__slot');
      return {
        names, want,
        slotKids: [...slot.children].map((e) => e.className),
        empty: document.querySelector('.climax__slot-empty').textContent.trim() === '' && document.querySelector('.climax__slot-empty').children.length === 0,
        slotText: slot.textContent.trim(),
        label: document.querySelector('.climax__slot-label').textContent === window.STRINGS[L]['profile.limit'],
        hidden: document.querySelector('.climax').getAttribute('aria-hidden'),
        tabs: document.querySelectorAll('.climax__tab').length,
      };
    });
    assert(v.tabs === 4 && v.names.join('|') === v.want.join('|'), lang + ' tabs ' + v.names + ' vs ' + v.want);
    assert(v.empty && v.label && v.slotKids.join() === 'climax__slot-label,climax__slot-empty', lang + ' the limit slot holds something: ' + JSON.stringify(v));
    assert(v.hidden === 'true', lang + ' decorative picture is exposed to assistive tech');
    await done(p);
  }
});

await test('climax: each tab is crossed off in turn as the picture scrolls into view (and resets above it)', async () => {
  const p = await open('');
  await scrollTo(p, 0);
  let o = await xOpacities(p);
  assert(o.every((v) => v === 0), 'crosses shown before the picture is reached: ' + o);
  const delays = await p.evaluate(() => [...document.querySelectorAll('.climax__x')].map((e) => parseFloat(getComputedStyle(e).transitionDelay)));
  await scrollTo(p, (await climaxTop(p)) - 300);
  await p.waitForTimeout(4200);
  o = await xOpacities(p);
  assert(o.every((v) => v === 1), 'not every tab crossed once seen: ' + o);
  const seen = await p.evaluate(() => [...document.querySelectorAll('.climax__x')].map((e) => parseFloat(getComputedStyle(e).transitionDelay)));
  assert(seen.every((d, i) => i === 0 || d > seen[i - 1]), 'the crosses are not staggered one after another: ' + seen);
  const edge = await p.evaluate(() => { const b = getComputedStyle(document.querySelector('.climax__slot'), '::before'); return [b.opacity, b.borderTopColor, getComputedStyle(document.querySelector('.climax__x')).color]; });
  assert(edge[0] === '1' && edge[1] === edge[2], 'the slot edge did not warm to the pressure colour at the end: ' + edge);
  await scrollTo(p, 0);
  await p.waitForTimeout(300);
  o = await xOpacities(p);
  assert(o.every((v) => v < 1), 'crosses stay after scrolling back above the picture: ' + o);
  void delays;
  await done(p);
});

await test('climax: readable in its finished state with JavaScript off and with reduced motion', async () => {
  for (const opts of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
    const p = await open('', opts);
    const o = await xOpacities(p);
    assert(o.every((v) => v === 1), JSON.stringify(opts) + ' crosses hidden: ' + o);
    const shown = await p.evaluate(() => getComputedStyle(document.querySelector('.climax')).display);
    assert(shown !== 'none', JSON.stringify(opts) + ' picture not shown');
    await done(p);
  }
});

// ------------------------------------------------- the eight content pieces -----
const seenIn = async (p, sel) => { await scrollTo(p, (await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel)) - 300); await p.waitForTimeout(4200); };

await test('pieces: the one-sentence fix sits in the intro sheet, ahead of the story, in both languages', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const v = await p.evaluate(() => {
      const el = document.querySelector('.welcome__fix');
      const L = window.PAGE.lang;
      return { text: el.textContent, want: window.STRINGS[L]['welcome.fix'], inSheet: !!el.closest('#welcome'), before: el.compareDocumentPosition(document.getElementById('pain')) & Node.DOCUMENT_POSITION_FOLLOWING };
    });
    assert(v.text === v.want && v.inSheet && v.before, lang + ' ' + JSON.stringify(v));
    if (!lang) assert(/say why/i.test(v.text) && /looked at again/i.test(v.text) && /one thing/i.test(v.text), 'the fix sentence lost a part: ' + v.text);
    await done(p);
  }
});

await test('pieces: value stream — Today breaks, Proposed goes on, both from the same first step, in both languages', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const v = await p.evaluate(() => {
      const L = window.PAGE.lang;
      const rows = ['today', 'proposed'].map((k) => [...document.querySelectorAll('.stream__row--' + k + ' .stream__step')].map((e) => ({ key: e.getAttribute('data-i18n'), text: e.textContent, end: e.classList.contains('stream__end') })));
      return { rows, ok: rows.flat().every((s) => s.text === window.STRINGS[L][s.key]), heads: [...document.querySelectorAll('.stream__h')].map((e) => e.textContent), before: document.querySelector('.stream').compareDocumentPosition(document.getElementById('prototype-stage')) & Node.DOCUMENT_POSITION_FOLLOWING };
    });
    assert(v.rows[0].length === 5 && v.rows[1].length === 5, lang + ' step counts ' + v.rows.map((r) => r.length));
    assert(v.rows[0][0].key === 'stream.declined' && v.rows[1][0].key === 'stream.declined', lang + ' the two streams do not start from the same step');
    assert(v.rows[0][4].end && v.rows[1][4].end && v.rows[0].slice(0, 4).every((s) => !s.end), lang + ' only the last step of each row is the end');
    assert(v.ok && v.heads.length === 2 && v.before, lang + ' text not from the string tables or stream sits after the phone: ' + JSON.stringify(v.heads));
    const c = await p.evaluate(() => [getComputedStyle(document.querySelector('.stream__row--today .stream__end')).borderTopStyle, getComputedStyle(document.querySelector('.stream__row--today .stream__end')).color, getComputedStyle(document.querySelector('.stream__row--proposed .stream__end')).color]);
    assert(c[0] === 'dashed', lang + ' Today does not end in a dashed break: ' + c[0]);
    assert(c[1] !== c[2], lang + ' Today and Proposed ends are the same colour');
    await done(p);
  }
});

await test('pieces: the stream plays when it is on screen, and shows finished with JavaScript off or reduced motion', async () => {
  const p = await open('');
  await scrollTo(p, 0);
  const op = () => p.evaluate(() => [...document.querySelectorAll('.stream__step')].map((e) => Number(getComputedStyle(e).opacity)));
  assert((await op()).every((v) => v === 0), 'steps shown before the stream is reached: ' + (await op()));
  await seenIn(p, '.stream');
  assert((await op()).every((v) => v === 1), 'not every step shown once seen: ' + (await op()));
  const d = await p.evaluate(() => [...document.querySelectorAll('.stream__row--today .stream__step')].map((e) => parseFloat(getComputedStyle(e).transitionDelay)));
  assert(d.every((x, i) => i === 0 || x > d[i - 1]), 'steps are not staggered: ' + d);
  await done(p);
  for (const opts of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
    const q = await open('', opts);
    const o = await q.evaluate(() => [...document.querySelectorAll('.stream__step')].map((e) => Number(getComputedStyle(e).opacity)));
    assert(o.every((v) => v === 1), JSON.stringify(opts) + ' steps hidden: ' + o);
    await done(q);
  }
});

await test('pieces: three cases, each with what happened, what was missing and what the screen says instead; only the fix carries the green rule', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const v = await p.evaluate(() => {
      const L = window.PAGE.lang;
      const cards = [...document.querySelectorAll('#cases .case')];
      return {
        n: cards.length,
        parts: cards.map((c) => [...c.querySelectorAll('dt')].map((e) => e.textContent).join('|')),
        wantParts: window.STRINGS[L]['cases.fact'] + '|' + window.STRINGS[L]['cases.gap'] + '|' + window.STRINGS[L]['cases.fix'],
        fixRules: cards.map((c) => [...c.querySelectorAll('dl > div')].map((d) => getComputedStyle(d).borderInlineStartWidth)),
        cols: getComputedStyle(document.querySelector('#cases .cases__grid')).gridTemplateColumns.split(' ').length,
        empty: [...document.querySelectorAll('#cases dd, #cases dt, #cases h3')].filter((e) => !e.textContent.trim()).length,
      };
    });
    assert(v.n === 3 && v.parts.every((x) => x === v.wantParts), lang + ' cards ' + JSON.stringify(v.parts));
    assert(v.fixRules.every((r) => r[0] === '0px' && r[1] === '0px' && r[2] === '3px'), lang + ' green rule is not the fix alone: ' + JSON.stringify(v.fixRules));
    assert(v.cols === 3 && v.empty === 0, lang + ' desktop columns ' + v.cols + ', empty parts ' + v.empty);
    await done(p);
  }
  const m = await open('', { viewport: { width: 390, height: 800 } });
  const c = await m.evaluate(() => getComputedStyle(document.querySelector('#cases .cases__grid')).gridTemplateColumns.split(' ').length);
  assert(c === 1, 'phone shows ' + c + ' columns');
  await done(m);
});

await test('pieces: what was not built, how the test would run, what ships first, sources and limits are all present in both languages, in order below the phone', async () => {
  for (const lang of ['', '?lang=ar']) {
    const p = await open(lang);
    const v = await p.evaluate(() => {
      const L = window.PAGE.lang;
      const ids = ['prototype', 'ending', 'cases', 'skipped', 'why-not', 'who', 'metrics', 'ships', 'sources'];
      const tops = ids.map((i) => document.getElementById(i).getBoundingClientRect().top + window.scrollY);
      const T = (s) => window.STRINGS[L][s];
      const q = (s) => document.querySelector(s);
      return {
        ordered: tops.every((t, i) => i === 0 || t > tops[i - 1]),
        skipped: document.querySelectorAll('#skipped li').length,
        how: q('#metrics [data-i18n="page.metricsHow"]').textContent === T('page.metricsHow'),
        ships: q('#ships .ships__lead').textContent === T('ships.p1'),
        limits: document.querySelectorAll('#sources .sources--limits li').length,
        links: [...document.querySelectorAll('#sources a')].map((a) => a.getAttribute('href')),
        numbers: /9/.test(T('sources.l1')) && /28/.test(T('sources.l1')) && /2,024/.test(T('sources.l1')),
      };
    });
    assert(v.ordered, lang + ' sections are out of order');
    assert(v.skipped === 3 && v.how && v.ships && v.limits === 5, lang + ' ' + JSON.stringify({ s: v.skipped, h: v.how, sh: v.ships, l: v.limits }));
    assert(v.links.length === 3 && v.links.every((h) => /^https:\/\//.test(h)), lang + ' source links ' + v.links);
    assert(!v.links.some((h) => /help-tabby-card/.test(h)), lang + ' a Tabby Card article is linked');
    assert(v.numbers, lang + ' the review-count numbers drifted from the research (9 of 28, 2,024)');
    await done(p);
  }
});

// ------------------------------------------------------------ overflow -----
await test('layout: no horizontal scroll at 360/390/768/1280, both languages, both themes', async () => {
  const bad = [];
  for (const width of [360, 390, 768, 1280]) {
    for (const lang of ['en', 'ar']) {
      for (const theme of ['dark', 'bright']) {
        const p = await open(lang === 'ar' ? '?lang=ar' : '', {
          viewport: { width, height: 800 },
          init: `localStorage.setItem('ti-theme','${theme}')`,
        });
        await p.click('#lang-btn');
        const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        if (w[0] > w[1]) bad.push(`${width}/${lang}/${theme}: ${w[0]}>${w[1]}`);
        await done(p);
      }
    }
  }
  assert(bad.length === 0, bad.join(', '));
});

// -------------------------------------------------------------- content ----
await test('no-JS: sections 1 and 2 copy is readable; unverified quotes stay out', async () => {
  const p = await open('', { javaScriptEnabled: false });
  const text = await p.evaluate(() => document.querySelector('#pain').innerText + '\n' + document.querySelector('#agitate').innerText);
  for (const s of [
    'She never paid late. Tabby still shut her out for months.',
    'Someone I know used Tabby for a SAR 1,000 plane ticket.',
    'Tabby’s message to her: try again in a few months.',
    'Nobody told her it was fixed.',
    'It isn’t her account. It’s how it’s built.',
    'Four tabs. Home, Shop, Payments, Profile.',
    'None of them shows your spending limit.',
    'About 9 of the 28 Trustpilot reviews',
    'the one number the app never shows you',
  ]) assert(text.includes(s), 'missing: ' + s);
  const vm = await import('node:vm');
  const { readFileSync } = await import('node:fs');
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(readFileSync(new URL('../assets/strings.js', import.meta.url), 'utf8'), sb);
  const flat = text.replace(/\s+/g, ' ');
  for (const [k, v] of Object.entries(sb.window.STRINGS.en)) {
    if (!/^s[12]\./.test(k)) continue;
    const want = v.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    assert(flat.includes(want), 'static page lacks ' + k);
  }
  assert(!/make more transactions/i.test(text), 'unverified quote is visible');
  assert(!/regardless of whether/i.test(text), 'unverified quote is visible');
  assert(!(await p.locator('.hdr__cluster').isVisible()), 'JS-only controls shown without JS');
  assert((await attr(p, 'data-theme')) === 'dark');
  await done(p);
});

await test('no-JS: static English equals the strings.js English (kept in sync)', async () => {
  // check.mjs compares the source files; here the rendered result is compared too.
  const p = await open('');
  const before = await p.evaluate(() => document.querySelector('#agitate').innerText);
  const q = await open('', { javaScriptEnabled: false });
  const after = await q.evaluate(() => document.querySelector('#agitate').innerText);
  assert(before === after, 'JS render differs from static HTML');
  await done(p); await done(q);
});

await test('content: the story is written in Arabic, lays out right to left, and carries no English fallback mark', async () => {
  const p = await open('?lang=ar');
  const v = await p.evaluate(() => {
    const h = document.querySelector('#pain h1');
    const ends = [...document.querySelectorAll('#ending [data-i18n], #welcome [data-i18n], #hello [data-i18n]')];
    return {
      arabic: /[؀-ۿ]/.test(h.textContent),
      lang: h.getAttribute('lang'),
      dir: getComputedStyle(document.querySelector('#pain')).direction,
      marked: ends.filter((e) => e.getAttribute('lang') === 'en').map((e) => e.getAttribute('data-i18n')),
      latinOnly: ends.filter((e) => !/[؀-ۿ]/.test(e.textContent)).map((e) => e.getAttribute('data-i18n')),
    };
  });
  assert(v.arabic && v.lang === null, JSON.stringify(v));
  assert(v.dir === 'rtl', 'story direction ' + v.dir);
  assert(v.marked.length === 0, 'English fallback marks left: ' + v.marked);
  assert(v.latinOnly.length === 0, 'opening/ending text with no Arabic: ' + v.latinOnly);
  await done(p);
});

await test('privacy: zero third-party requests (menu open, both languages)', async () => {
  const p = await open();
  const seen = [];
  p.on('request', (r) => seen.push(r.url()));
  await p.reload();
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="ar"]');
  await p.click('#theme-btn');
  await p.waitForTimeout(300);
  const foreign = seen.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:'));
  assert(foreign.length === 0, foreign.join(', '));
  await done(p);
});


// ------------------------------------------------------ scroll motion (inc. 2)
// Section 1 is a scene: months strip, coral markers that land as you scroll,
// an empty bubble that then fills, one marker that turns neutral beside a slot
// that stays empty. Section 2 stacks evidence, tightens a frame, warms the
// ground a little, and lets the closing line stand alone before the phone.
const wait = (p, ms) => p.waitForTimeout(ms);
const jump = (p, y) => p.evaluate((v) => window.scrollTo(0, v), y);
const pageMax = (p) => p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const opacityOf = (p, sel) => p.$eval(sel, (e) => parseFloat(getComputedStyle(e).opacity));
const markerOpacities = (p) => p.$$eval('#pain .marker', (els) => els.map((e) => parseFloat(getComputedStyle(e).opacity)));
const onCount = (p, sel) => p.$$eval(sel, (els) => els.filter((e) => e.classList.contains('is-on')).length);
// put an element's top at `frac` of the viewport height
const beatAt = (p, sel, frac) => p.evaluate(([s, f]) => {
  const el = document.querySelector(s);
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * f);
}, [sel, frac]);
const painEnd = (p) => p.evaluate(() => {
  const s = document.querySelector('#pain'); return s.getBoundingClientRect().bottom + scrollY - innerHeight;
});
const centerClosing = (p) => p.evaluate(() => {
  const c = document.querySelector('#agitate .story__closing').getBoundingClientRect();
  window.scrollTo(0, c.top + scrollY + c.height / 2 - innerHeight / 2);
});

await test('scene 1: at the top the markers are hidden and the late beats dim; scrolled through, all are revealed', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  assert(await p.$('#pain.is-live'), 'scene is not live');
  const top = await markerOpacities(p);
  assert(top.length === 6, 'markers ' + top.length);
  assert(top.every((o) => o < 0.1), 'markers visible at top: ' + top);
  assert((await opacityOf(p, '#pain .story__beat:nth-child(9)')) < 0.5, 'a late beat is not dim at the top');
  await jump(p, await painEnd(p));
  await wait(p, 2600);
  const end = await markerOpacities(p);
  assert(end.every((o) => o > 0.9), 'markers not all revealed: ' + end);
  assert((await opacityOf(p, '#pain .story__beat:nth-child(10)')) > 0.95, 'last beat not fully shown');
  assert(p.errors.length === 0, p.errors.join('|'));
  await done(p);
});

await test('scene 1: markers land progressively with scroll, and nothing shifts layout', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  const h0 = await pageMax(p);
  const layoutTop = (els) => els.map((e) => { let t = 0; for (let n = e; n; n = n.offsetParent) t += n.offsetTop; return t; }); // layout position: a transform must not count
  const tops0 = await p.$$eval('#pain .story__beat', layoutTop);
  const end = await painEnd(p);
  const counts = [];
  for (let y = 0; y <= end; y += 900 * 0.15) { await jump(p, y); await wait(p, 60); counts.push(await onCount(p, '#pain .marker')); }
  for (let i = 1; i < counts.length; i += 1) assert(counts[i] >= counts[i - 1], 'count fell going down: ' + counts);
  assert(new Set(counts).size >= 5, 'not progressive, saw ' + [...new Set(counts)]);
  const first = counts.find((c) => c > 0);
  assert(first <= 2, 'all at once: first nonzero count ' + first);
  assert(counts[counts.length - 1] === 6, 'not all landed: ' + counts);
  assert((await pageMax(p)) === h0, 'page height changed while scrolling');
  const tops1 = await p.$$eval('#pain .story__beat', layoutTop);
  assert(JSON.stringify(tops0) === JSON.stringify(tops1), 'beats moved: layout shift');
  await done(p);
});

await test('scene 1: the bubble arrives empty, then its text resolves', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  assert(await p.$('#pain .scene__bubble'), 'no bubble');
  assert((await opacityOf(p, '#pain .scene__bubble-text')) < 0.05, 'text visible before its beat');
  await beatAt(p, '#pain .story__beat:nth-child(7)', 0.45);
  await wait(p, 300);
  assert(await p.$eval('#pain .scene__bubble', (e) => e.classList.contains('is-on')), 'bubble did not arrive at the "try again" beat');
  const early = await opacityOf(p, '#pain .scene__bubble-text');
  assert(early < 0.3, 'text already there (bubble not empty first): ' + early);
  await wait(p, 2600);
  assert((await opacityOf(p, '#pain .scene__bubble-text')) > 0.95, 'text never resolved');
  const said = await p.$eval('#pain .scene__bubble-text', (e) => e.textContent.trim().toLowerCase());
  assert(said.includes('try again in a few months'), said);
  await done(p);
});

await test('scene 1: one marker turns neutral at the end and the notification slot beside it stays empty', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  assert((await p.$$('#pain .marker.is-neutral')).length === 0, 'neutral at the top');
  assert(await p.$('#pain .scene__slot'), 'no slot');
  assert((await opacityOf(p, '#pain .scene__slot')) < 0.1, 'slot visible at the top');
  await jump(p, await painEnd(p));
  await wait(p, 2600);
  assert((await p.$$('#pain .marker.is-neutral')).length === 1, 'exactly one marker must turn neutral');
  const slot = await p.$eval('#pain .scene__slot', (e) => {
    const r = e.getBoundingClientRect();
    return { text: e.textContent.trim(), kids: e.childElementCount, w: r.width, h: r.height, o: parseFloat(getComputedStyle(e).opacity), cx: r.left + r.width / 2 };
  });
  assert(slot.o > 0.9 && slot.w >= 40 && slot.h >= 24, 'slot not visibly there ' + JSON.stringify(slot));
  assert(slot.text === '' && slot.kids === 0, 'slot is not empty: ' + JSON.stringify(slot));
  const nx = await p.$eval('#pain .marker.is-neutral', (e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; });
  assert(Math.abs(nx - slot.cx) < 90, 'slot is not beside the neutral marker ' + nx + ' vs ' + slot.cx);
  await done(p);
});

const FINAL_STATE = async (p) => {
  const mo = await markerOpacities(p);
  assert(mo.length === 6 && mo.every((o) => o === 1), 'markers not all final: ' + mo);
  assert((await p.$$('#pain .marker.is-neutral')).length === 1, 'neutral marker missing');
  assert((await opacityOf(p, '#pain .scene__bubble')) === 1 && (await opacityOf(p, '#pain .scene__bubble-text')) === 1, 'bubble not final');
  assert((await opacityOf(p, '#pain .scene__slot')) === 1, 'slot not shown');
  assert((await p.$eval('#pain .scene__slot', (e) => e.textContent.trim())) === '', 'slot not empty');
  const beats = await p.$$eval('#pain .story__beat, #agitate .story__beat, #agitate .story__act, #agitate .story__closing', (els) => els.map((e) => parseFloat(getComputedStyle(e).opacity)));
  assert(beats.every((o) => o === 1), 'copy is dimmed: ' + beats);
  assert((await opacityOf(p, '#prototype')) === 1, 'phone section hidden');
};
await test('reduced motion: everything is final and shown, no transitions, scene not live', async () => {
  const p = await open('', { reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  assert(!(await p.$('#pain.is-live')), 'scene went live under reduced motion');
  await FINAL_STATE(p);
  const durs = await p.$$eval('#pain .marker, #pain .scene__bubble, #pain .scene__bubble-text, #pain .scene__slot, #pain .story__beat, #agitate .story__act, #agitate .story__closing', (els) =>
    els.map((e) => Math.max(...getComputedStyle(e).transitionDuration.split(',').map(parseFloat))));
  assert(durs.every((d) => d <= 0.001), 'transitions still on: ' + [...new Set(durs)]);
  assert(await p.$eval('#agitate .story__tension', (e) => getComputedStyle(e).display === 'none' || parseFloat(getComputedStyle(e).opacity) === 0), 'tension overlay on');
  const end = await pageMax(p);
  await jump(p, end / 2); await wait(p, 200);
  assert((await markerOpacities(p)).every((o) => o === 1), 'markers changed on scroll under reduced motion');
  await done(p);
});
await test('JS off: the scene and evidence show in their final state, copy intact', async () => {
  const p = await open('', { javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  await FINAL_STATE(p);
  await done(p);
});

for (const [w, h] of [[390, 844], [360, 740]]) {
  await test(`phone ${w}: the scene animates (not switched off), strip stays in view, no sideways scroll`, async () => {
    const p = await open('', { viewport: { width: w, height: h } });
    assert(await p.$('#pain.is-live'), 'not live on a phone');
    assert((await markerOpacities(p)).every((o) => o < 0.1), 'markers visible at top');
    await beatAt(p, '#pain .story__beat:nth-child(5)', 0.15);
    await wait(p, 1800);
    const mid = await onCount(p, '#pain .marker');
    assert(mid >= 1 && mid < 6, 'mid-scroll marker count ' + mid);
    const vis = await p.$eval('#pain .scene__viz', (e) => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.left, r.right]; });
    assert(vis[1] - vis[0] > 60 && vis[3] - vis[2] > w * 0.6, 'strip has no size: ' + vis);
    assert(vis[0] >= 0 && vis[1] <= h && vis[2] >= 0 && vis[3] <= w, 'strip not on screen: ' + vis);
    await beatAt(p, '#pain .story__beat:nth-child(8)', 0.15);
    await wait(p, 300);
    const vis2 = await p.$eval('#pain .scene__viz', (e) => e.getBoundingClientRect().top);
    assert(Math.abs(vis2 - vis[0]) < 2, 'strip is not pinned: ' + vis[0] + ' vs ' + vis2);
    await jump(p, await painEnd(p));
    await wait(p, 2600);
    assert((await markerOpacities(p)).every((o) => o > 0.9), 'not all landed');
    assert((await opacityOf(p, '#pain .scene__slot')) > 0.9, 'slot hidden');
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert(sw[0] <= sw[1], 'sideways scroll ' + sw);
    await done(p);
  });
}

for (const theme of ['dark', 'bright']) {
  for (const lang of ['en', 'ar']) {
    await test(`scene 1 + 2 work in ${theme} / ${lang}: strip and menu stay placed, no errors, no sideways scroll`, async () => {
      const p = await open(lang === 'ar' ? '?lang=ar' : '', { viewport: { width: 1280, height: 800 }, init: `localStorage.setItem('ti-theme','${theme}')` });
      assert(await p.$('#pain.is-live'), 'not live');
      await jump(p, await painEnd(p));
      await wait(p, 2600);
      assert((await markerOpacities(p)).every((o) => o > 0.9), 'markers not revealed');
      const box = await p.$eval('#pain .scene__viz', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; });
      assert(box[0] >= 0 && box[1] <= 1280 && box[2] >= 0 && box[3] <= 800, 'strip off screen ' + box);
      await p.click('#lang-btn');
      const menu = await p.$eval('#lang-menu', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
      assert(menu[0] >= 0 && menu[1] <= 1280, 'menu misplaced ' + menu);
      await p.keyboard.press('Escape');
      await jump(p, (await pageMax(p)) * 0.7);
      await wait(p, 300);
      const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert(sw[0] <= sw[1], 'sideways scroll ' + sw);
      assert(p.errors.length === 0, p.errors.join('|'));
      await done(p);
    });
  }
}

await test('pacing: scene 1 needs at least 2.5 screens of scrolling; every transition lasts at least 0.6s', async () => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await open('', { viewport: { width: w, height: h } });
    await wait(p, 300); // the easing is armed a frame after load
    const span = await p.evaluate(() => {
      const b = [...document.querySelectorAll('#pain .story__beat')];
      return (b[b.length - 1].getBoundingClientRect().bottom - b[0].getBoundingClientRect().top) / innerHeight;
    });
    assert(span >= 2.5, `scene spans ${span.toFixed(2)} screens at ${w}`);
    const durs = await p.$$eval('#pain .marker, #pain .scene__bubble, #pain .scene__bubble-text, #pain .scene__slot, #pain .story__beat, #agitate .story__act, #agitate .story__closing, #agitate .story__frame, #agitate .story__tension, #prototype', (els) =>
      els.map((e) => [e.className || e.id, Math.max(...getComputedStyle(e).transitionDuration.split(',').map(parseFloat))]));
    const quick = durs.filter(([, d]) => d < 0.6);
    assert(quick.length === 0, 'too quick: ' + JSON.stringify(quick.slice(0, 3)));
    await done(p);
  }
});

await test('motion: the story only ever transitions transform and opacity (plus colour on the marker)', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  const bad = await p.$$eval('#pain *, #agitate *, #prototype', (els) => {
    const out = [];
    for (const e of els) {
      const s = getComputedStyle(e);
      const props = s.transitionProperty.split(',').map((x) => x.trim());
      const dur = s.transitionDuration.split(',').map(parseFloat);
      props.forEach((pr, i) => { if (dur[i % dur.length] > 0 && !['opacity', 'transform', 'color'].includes(pr)) out.push(pr); });
    }
    return out;
  });
  assert(bad.length === 0, 'transitions on: ' + [...new Set(bad)]);
  const css = await (await fetch(BASE + 'assets/app.css')).text();
  assert(css.includes('scroll motion'), 'motion block missing');
  assert(!/transition:[^;]*\ball\b/.test(css.slice(css.indexOf('scroll motion'))), 'transition: all');
  await done(p);
});

await test('scene 2: evidence acts stack in one at a time, the frame tightens, the ground warms only slightly', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  assert(await p.$('#agitate.is-live'), 'agitate not live');
  const start = await p.$eval('#agitate', (e) => e.getBoundingClientRect().top + scrollY);
  const end = await p.$eval('#agitate .story__closing', (e) => { const r = e.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }); // the tension end state (closing centred, phone not yet in)
  assert((await opacityOf(p, '#agitate .story__act[data-act="3"]')) < 0.3, 'act 3 shown before its turn');
  const seen = [], scales = [], warm = [];
  for (let y = start - 300; y <= end; y += 900 * 0.2) {
    await jump(p, y); await wait(p, 120);
    seen.push(await onCount(p, '#agitate .story__act'));
    scales.push(await p.$eval('#agitate .story__frame', (e) => new DOMMatrix(getComputedStyle(e).transform).a));
    warm.push(await p.$eval('#agitate .story__tension', (e) => parseFloat(getComputedStyle(e).opacity)));
  }
  for (let i = 1; i < seen.length; i += 1) assert(seen[i] >= seen[i - 1], 'acts left going down ' + seen);
  assert(new Set(seen).size >= 3, 'acts not stacked one by one: ' + [...new Set(seen)]);
  assert(seen[seen.length - 1] === 3, 'not all acts in');
  await wait(p, 2500);
  const fin = await p.$eval('#agitate .story__frame', (e) => new DOMMatrix(getComputedStyle(e).transform).a);
  assert(fin < 1 && fin <= Math.min(...scales) + 1e-6, 'frame did not tighten ' + scales);
  assert(new Set(scales.map((s) => s.toFixed(2))).size >= 3, 'frame not stepwise ' + scales);
  const w = await p.$eval('#agitate .story__tension', (e) => parseFloat(getComputedStyle(e).opacity));
  assert(w > 0.03 && w <= 0.11, 'warmth not subtle-but-present: ' + w);
  assert(Math.max(...warm) <= 0.11, 'too warm ' + warm);
  await done(p);
});

await test('scene 2: the closing line stands alone for a full screen, then the phone section lifts in', async () => {
  const p = await open('', { viewport: { width: 1440, height: 900 } });
  assert(!(await p.$eval('#prototype', (e) => e.classList.contains('is-in'))), 'phone section already in at the top');
  const endBox = await p.$eval('#agitate .story__end', (e) => e.getBoundingClientRect().height);
  assert(endBox >= 900 * 0.95, 'closing scene is only ' + endBox + 'px tall');
  await centerClosing(p);
  await wait(p, 2600);
  const r = await p.evaluate(() => {
    const vh = innerHeight;
    const c = document.querySelector('#agitate .story__closing').getBoundingClientRect();
    const others = [...document.querySelectorAll('#agitate .story__act, #agitate h2, #prototype h2, #prototype .phone')].filter((e) => {
      const b = e.getBoundingClientRect(); return b.bottom > 0 && b.top < vh;
    }).map((e) => e.className || e.tagName);
    return { inView: c.top >= 0 && c.bottom <= vh, others, o: parseFloat(getComputedStyle(document.querySelector('#agitate .story__closing')).opacity) };
  });
  assert(r.inView && r.o > 0.95, 'closing not shown: ' + JSON.stringify(r));
  assert(r.others.length === 0, 'closing is not alone; also on screen: ' + r.others);
  await p.evaluate(() => window.scrollBy(0, innerHeight * 0.9));
  await wait(p, 2600);
  assert(await p.$eval('#prototype', (e) => e.classList.contains('is-in')), 'phone section did not lift in');
  assert((await opacityOf(p, '#prototype')) > 0.95, 'phone section not visible');
  await done(p);
});

for (const theme of ['dark', 'bright']) {
  await test(`contrast (${theme}): at the tension end state, effective text stays 4.5:1 (3:1 large)`, async () => {
    const p = await open('', { viewport: { width: 1440, height: 900 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    await centerClosing(p);
    await wait(p, 2800);
    const rows = await p.evaluate(() => {
      const parse = (s) => s.match(/[\d.]+/g).map(Number);
      const tension = document.querySelector('#agitate .story__tension');
      const to = parseFloat(getComputedStyle(tension).opacity);
      const tc = parse(getComputedStyle(tension).backgroundColor).slice(0, 3);
      const base = parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
      const ground = base.map((v, i) => v * (1 - to) + tc[i] * to);
      const eff = (el) => {
        let a = 1; for (let n = el; n; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity);
        const c = parse(getComputedStyle(el).color).slice(0, 3);
        return c.map((v, i) => v * a + ground[i] * (1 - a));
      };
      const pick = (sel, n = 0) => document.querySelectorAll(sel)[n];
      const list = [
        ['past act body', pick('#agitate .story__act[data-act="1"] .story__beat', 0), 4.5],
        ['past act body (last act)', pick('#agitate .story__act[data-act="3"] .story__beat:not(.story__pressure)', 1), 4.5],
        ['act pressure line', pick('#agitate .story__pressure', 0), 4.5],
        ['closing', pick('#agitate .story__closing'), 4.5],
        ['h2', pick('#agitate h2'), 3],
        ['scene 1 past beat', pick('#pain .story__beat:not(.story__pressure)', 0), 4.5],
        ['scene 1 pressure', pick('#pain .story__pressure', 0), 4.5],
        ['marker label', pick('#pain .marker__label', 0), 4.5],
      ];
      return { to, ground, rows: list.map(([n, el, min]) => ({ n, min, fg: el ? eff(el) : null })) };
    });
    assert(rows.to > 0.03, 'tension overlay not on at the end state: ' + rows.to);
    const out = [];
    for (const r of rows.rows) {
      assert(r.fg, 'missing ' + r.n);
      const c = ratio(r.fg, rows.ground);
      out.push(`${r.n} ${c.toFixed(2)}`);
      assert(c >= r.min, `${r.n} ${c.toFixed(2)} < ${r.min}`);
    }
    if (process.env.VERBOSE) console.log('       ' + theme + ' warm=' + rows.to + ': ' + out.join('; '));
    await done(p);
  });
}


// ------------------------------------------------- phone: dark page, light phone
// The phone is the light object on the dark page. Every screen state has to
// stay readable in DARK mode, in both languages, so its text and icons are
// sampled against the colour actually behind them.
const PHONE_STATES = [];
for (const mode of ['today', 'proposed']) {
  for (const scenarioId of ['silent-block', 'new-account', 'limit-cut']) {
    for (const screen of ['decline', 'limit', 'recovery', 'checkout']) PHONE_STATES.push({ mode, scenarioId, screen });
  }
}
for (const tab of ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile']) PHONE_STATES.push({ mode: 'proposed', scenarioId: 'silent-block', screen: 'tab', tab });

async function samplePhone(p) {
  return p.evaluate(() => {
    const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const effBg = (el) => {
      // composite translucent layers down to an opaque colour
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c.length === 3 || c[3] > 0)) layers.push(c);
        if (c.length === 3 || c[3] >= 0.99) break;
      }
      let base = [255, 255, 255];
      for (const c of layers.reverse()) { const a = c.length === 4 ? c[3] : 1; base = base.map((v, i) => c[i] * a + v * (1 - a)); }
      return base;
    };
    const out = [];
    const screen = document.querySelector('.phone__screen');
    for (const el of screen.querySelectorAll('*')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || el.getBoundingClientRect().width === 0) continue;
      let alpha = 1;
      for (let n = el; n && n !== screen; n = n.parentElement) alpha *= parseFloat(getComputedStyle(n).opacity);
      if (own) {
        const fg = parse(s.color);
        const px = parseFloat(s.fontSize), w = parseInt(s.fontWeight, 10);
        out.push({ kind: 'text', label: (el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 24), fg: fg.slice(0, 3), a: (fg[3] === undefined ? 1 : fg[3]) * alpha, bg: effBg(el), large: px >= 24 || (px >= 18.66 && w >= 700) });
      }
      if (el.tagName.toLowerCase() === 'svg' && !el.closest('[class*="statusbar"]')) {
        const stroke = parse(s.stroke === 'none' ? s.color : s.stroke);
        if (stroke.length >= 3) out.push({ kind: 'icon', label: 'svg in ' + (el.parentElement.className || el.parentElement.tagName), fg: stroke.slice(0, 3), a: alpha, bg: effBg(el.parentElement) });
      }
    }
    return out;
  });
}
const blend = (fg, bgc, a) => fg.map((v, i) => v * a + bgc[i] * (1 - a));

for (const lang of ['en', 'ar']) {
  await test(`phone (${lang}, DARK page): text 4.5:1 and icons 3:1 on every screen state`, async () => {
    const p = await open(lang === 'ar' ? '?lang=ar' : '', { viewport: { width: 390, height: 844 }, init: `localStorage.setItem('ti-theme','dark')` });
    const bad = [];
    let sampled = 0;
    for (const st of PHONE_STATES) {
      await p.evaluate((s) => { window.PROTOTYPE.set(s); document.getAnimations().forEach((a) => { if (a.effect.getComputedTiming().iterations !== Infinity) a.finish(); }); }, st); // screen-enter fades are not the state under test
      await wait(p, 30);
      for (const r of await samplePhone(p)) {
        sampled += 1;
        const c = ratio(blend(r.fg, r.bg, r.a), r.bg);
        const need = r.kind === 'icon' || r.large ? 3 : 4.5;
        if (c < need) bad.push(`${st.mode}/${st.scenarioId}/${st.screen}${st.tab ? '/' + st.tab : ''} ${r.label} ${c.toFixed(2)}<${need}`);
      }
    }
    assert(sampled > 300, 'sampled too little: ' + sampled);
    if (process.env.VERBOSE) console.log([...new Set(bad.map((b) => b.replace(/^[^ ]+ /, '')))].join(String.fromCharCode(10)));
    assert(bad.length === 0, bad.length + ' unreadable: ' + [...new Set(bad)].slice(0, 6).join(' | '));
    await done(p);
  });
}

await test('phone: uses its own light tokens whatever the page theme (computed, dark and bright identical)', async () => {
  const read = (p) => p.evaluate(() => {
    const phone = document.querySelector('.phone');
    const s = getComputedStyle(phone);
    return ['--text', '--surface', '--text-muted', '--line', '--ink', '--paper', '--n-100', '--n-500', '--app-bg'].map((k) => s.getPropertyValue(k).trim()).join('|');
  });
  const a = await open('', { init: `localStorage.setItem('ti-theme','dark')` });
  const b = await open('', { init: `localStorage.setItem('ti-theme','bright')` });
  const da = await read(a), db = await read(b);
  assert(da === db, 'phone tokens differ by theme: ' + da + ' vs ' + db);
  await done(a); await done(b);
});

// ------------------------------------------------------------ the riyal sign --
await test('riyal: no U+20C1 character in the phone strings, the rendered phone, or its labels', async () => {
  const strings = await (await fetch(BASE + 'assets/strings.js')).text();
  assert(!strings.includes('\u20C1'), 'U+20C1 still in strings.js');
  for (const lang of ['en', 'ar']) {
    const p = await open(lang === 'ar' ? '?lang=ar' : '', { viewport: { width: 390, height: 844 } });
    const seen = [];
    for (const st of PHONE_STATES) {
      await p.evaluate((s) => window.PROTOTYPE.set(s), st);
      seen.push(await p.evaluate(() => {
        const root = document.querySelector('#prototype-root');
        const attrs = [...root.querySelectorAll('*')].flatMap((e) => [...e.attributes].map((a) => a.value)).join(' ');
        return root.textContent + ' ' + attrs;
      }));
    }
    const all = seen.join(' ');
    assert(!all.includes('\u20C1'), lang + ': U+20C1 in rendered phone');
    assert(!/\{sar\}|\{amount\}/.test(all), lang + ': a placeholder leaked into the phone');
    await done(p);
  }
});

await test('riyal: drawn as a mask glyph that really paints, sized to the text, named for screen readers, identical in both themes', async () => {
  for (const theme of ['dark', 'bright']) {
    const p = await open('', { viewport: { width: 390, height: 844 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    await p.evaluate(() => window.PROTOTYPE.set({ mode: 'proposed', screen: 'decline', scenarioId: 'silent-block' }));
    await wait(p, 200);
    const info = await p.$$eval('#prototype-root .riyal', (els) => els.map((e) => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return { w: r.width, h: r.height, role: e.getAttribute('role'), label: e.getAttribute('aria-label'), mask: s.maskImage || s.webkitMaskImage, fs: parseFloat(getComputedStyle(e.parentElement).fontSize) };
    }));
    assert(info.length >= 3, theme + ': riyal glyphs found ' + info.length);
    for (const g of info) {
      assert(/riyal\.png/.test(g.mask), 'mask not the local glyph: ' + g.mask);
      assert(g.w > g.fs * 0.5 && g.h > g.fs * 0.5 && g.h < g.fs * 1.4, `glyph ${g.w}x${g.h} for ${g.fs}px text`);
      assert(g.role === 'img' && /Saudi riyal/i.test(g.label), 'not named: ' + g.role + '/' + g.label);
    }
    // paint check: the mask file loads, and the glyph is a shape: neither a solid
    // block (mask ignored) nor empty (mask failed to load).
    const el = await p.$('#prototype-root .riyal');
    await el.scrollIntoViewIfNeeded();
    const size = await p.evaluate(() => new Promise((res) => {
      const img = new Image(); img.onload = () => res([img.naturalWidth, img.naturalHeight]); img.onerror = () => res([0, 0]);
      img.src = new URL('assets/riyal.png', location.href).href;
    }));
    assert(size[0] > 50 && size[1] > 50, 'riyal.png did not load: ' + size);
    const masked = await el.screenshot();
    await el.evaluate((e) => { e.style.setProperty('-webkit-mask', 'none'); e.style.setProperty('mask', 'none'); });
    const solid = await el.screenshot();
    await el.evaluate((e) => { e.style.removeProperty('-webkit-mask'); e.style.removeProperty('mask'); e.style.backgroundColor = 'transparent'; });
    const empty = await el.screenshot();
    assert(!masked.equals(solid), 'the mask is not applied (glyph is a solid block)');
    assert(!masked.equals(empty), 'the glyph paints nothing');
    await done(p);
  }
  const p = await open('?lang=ar', { viewport: { width: 390, height: 844 } });
  await p.evaluate(() => window.PROTOTYPE.set({ mode: 'proposed', screen: 'decline', scenarioId: 'silent-block' }));
  const label = await p.$eval('#prototype-root .riyal', (e) => e.getAttribute('aria-label'));
  assert(/[؀-ۿ]/.test(label), 'Arabic name missing: ' + label);
  await done(p);
});


// ------------------------------------------- phone: facts, insulation, chrome --
// Earlier checks proved screens RENDER; these assert what they SAY.
const digits = (s) => Number(String(s).replace(/[^\d]/g, ''));
const inkOf = (p) => p.evaluate(() => {
  const i = document.createElement('i'); i.style.background = 'var(--ink)';
  document.querySelector('.phone').appendChild(i);
  const c = getComputedStyle(i).backgroundColor; i.remove(); return c;
});
for (const lang of ['en', 'ar']) {
  await test(`checkout (${lang}): the instalment strip is requested/4 in every scenario and agrees with the terms line`, async () => {
    const p = await open(lang === 'ar' ? '?lang=ar' : '', { viewport: { width: 390, height: 844 } });
    const scenarios = await p.evaluate(() => window.SCENARIOS.map((s) => ({ id: s.id, requested: s.requested, months: s.planMonths || 4 })));
    assert(scenarios.length === 3, 'expected three scenarios');
    for (const sc of scenarios) {
      await p.evaluate((id) => window.PROTOTYPE.set({ mode: 'proposed', screen: 'checkout', scenarioId: id }), sc.id);
      const got = await p.evaluate(() => ({
        cells: [...document.querySelectorAll('.screen--checkout .schedule__amount')].map((e) => e.textContent),
        terms: document.querySelector('.checkout__terms').textContent,
        total: document.querySelector('.checkout__total .figure').textContent,
      }));
      const each = Math.round(sc.requested / sc.months);
      assert(got.cells.length === sc.months, `${sc.id}: ${got.cells.length} cells`);
      assert(digits(got.total) === sc.requested, `${sc.id}: total ${got.total}`);
      for (const c of got.cells) assert(digits(c) === each, `${sc.id}: strip cell "${c}" != ${each}`);
      assert(digits(got.terms.match(/[\d,]+/)[0]) === each, `${sc.id}: terms line "${got.terms}" != ${each}`);
      assert(got.cells.reduce((a, c) => a + digits(c), 0) === sc.requested, `${sc.id}: strip does not sum to the total`);
    }
    await done(p);
  });
}

await test('phone insulation: computed margins of phone text ignore page-level .section rules (mutation)', async () => {
  const p = await open('', { viewport: { width: 390, height: 844 } });
  const read = () => p.evaluate(() => {
    const out = [];
    for (const st of [{ screen: 'tab', tab: 'nav.shop' }, { screen: 'checkout' }, { screen: 'decline' }, { screen: 'tab', tab: 'nav.home' }, { screen: 'tab', tab: 'nav.payments' }]) {
      window.PROTOTYPE.set({ mode: 'proposed', scenarioId: 'new-account', ...st });
      for (const e of document.querySelectorAll('.phone *')) {
        const s = getComputedStyle(e);
        out.push(`${st.screen}/${st.tab || ''} ${e.tagName} ${typeof e.className === 'string' ? e.className : ''} ${s.marginTop} ${s.marginBottom} ${s.maxWidth}`);
      }
    }
    return out;
  });
  const before = await read();
  assert(before.length > 200, 'sampled too little');
  // The intended look = the page with its .section p/a/em rules absent.
  await p.evaluate(() => {
    for (const sheet of document.styleSheets) {
      for (let i = sheet.cssRules.length - 1; i >= 0; i -= 1) if (/\.section (p|a|em)\b/.test(sheet.cssRules[i].selectorText || '')) sheet.deleteRule(i);
    }
  });
  const intended = await read();
  const bad = before.findIndex((x, i) => x !== intended[i]);
  assert(bad === -1, 'page .section rules leak into the phone: ' + before[bad] + '  vs intended  ' + intended[bad]);
  // Restore the page, then ALTER its existing .section p rules (as a redesign would).
  await p.reload();
  await p.evaluate(() => {
    for (const sheet of document.styleSheets) for (const r of sheet.cssRules) {
      if (/.section p/.test(r.selectorText || '')) { r.style.setProperty('margin', '41px 0', 'important'); r.style.setProperty('max-width', '3px', 'important'); }
    }
  });
  const mutated = await read();
  const bad2 = mutated.findIndex((x, i) => x !== intended[i]);
  assert(bad2 === -1, 'a page-level .section p change moved the phone: ' + mutated[bad2]);
  await done(p);
});

await test('phone: primary buttons (Buy, Pay) have the ink background, plain .btn stays outlined', async () => {
  const p = await open('', { viewport: { width: 390, height: 844 } });
  for (const theme of ['dark', 'bright']) {
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    for (const st of [{ screen: 'tab', tab: 'nav.shop' }, { screen: 'checkout' }]) {
      await p.evaluate((s) => window.PROTOTYPE.set({ mode: 'proposed', scenarioId: 'silent-block', ...s }), st);
      const ink = await inkOf(p);
      const r = await p.$eval('.phone .btn--primary', (b) => ({ bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color }));
      assert(r.bg === ink && ink !== 'rgba(0, 0, 0, 0)', `${theme}/${st.screen}: primary bg ${r.bg} != ink ${ink}`);
      assert(r.color !== r.bg, 'primary text equals its background');
    }
  }
  await p.evaluate(() => window.PROTOTYPE.set({ mode: 'proposed', screen: 'recovery', scenarioId: 'silent-block' }));
  const plain = await p.$eval('.phone .btn:not(.btn--primary)', (e) => getComputedStyle(e).backgroundColor);
  assert(plain !== (await inkOf(p)), 'plain .btn became primary');
  await done(p);
});

for (const theme of ['dark', 'bright']) {
  await test(`phone (${theme} page): tab bar buttons have no browser chrome and icons reach 3:1`, async () => {
    const p = await open('', { viewport: { width: 390, height: 844 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    for (const tab of ['nav.home', 'nav.shop', 'nav.payments', 'nav.profile']) {
      await p.evaluate((t) => window.PROTOTYPE.set({ mode: 'proposed', screen: 'tab', tab: t }), tab);
      const items = await p.$$eval('.tabbar__item', (els) => els.map((e) => {
        const s = getComputedStyle(e), svg = e.querySelector('svg'), ss = getComputedStyle(svg);
        const parse = (c) => c.match(/[\d.]+/g).map(Number);
        const bar = parse(getComputedStyle(e.parentElement).backgroundColor).slice(0, 3);
        const own = parse(s.backgroundColor);
        const a = own.length === 4 ? own[3] : 1;
        return { active: e.classList.contains('is-active'), border: ['Top', 'Right', 'Bottom', 'Left'].map((k) => s['border' + k + 'Width'] + ' ' + s['border' + k + 'Style']), bg: a === 0 ? bar : own.slice(0, 3), bgAlpha: a, stroke: parse(ss.stroke === 'none' ? s.color : ss.stroke).slice(0, 3), op: parseFloat(ss.opacity) * parseFloat(s.opacity) };
      }));
      assert(items.length === 4, 'tab items ' + items.length);
      for (const it of items) {
        assert(it.border.every((b) => /^0px|none$/.test(b)), 'tab button border: ' + it.border);
        if (!it.active) assert(it.bgAlpha === 0, 'inactive tab button paints a background (default button grey): alpha ' + it.bgAlpha + ' rgb ' + it.bg);
        const c = ratio(it.stroke.map((v, i) => v * it.op + it.bg[i] * (1 - it.op)), it.bg);
        assert(c >= 3, `${tab} ${it.active ? 'active' : 'inactive'} icon ${c.toFixed(2)} < 3`);
      }
    }
    await done(p);
  });
}

// ------------------------------------------------- Flutter phone (inc. 3b) ----
// assets/phone.js may swap the Flutter build of the phone in for the HTML
// phone. Everything about that is checked here in a real browser. Flutter
// draws to a canvas, so what it says is read from its accessibility tree
// (flt-semantics, the real DOM nodes a screen reader gets) and what it looks
// like from screenshot pixels.
const STAGE = '#prototype-stage';
// These checks test the swap machinery itself. While the scroll story (cinema) is
// live the swap also needs a script hook and the phone is locked (inert) in
// scenes 1-7, both tested in the cinema section; so they run against the static
// section (reduced motion), where the swap behaves exactly as it always has.
const SWAP_MOTION = 'reduce';
const swapped = async (p, ms = 60000) => {
  try {
    await p.waitForFunction(() => document.getElementById('prototype-stage').dataset.phoneStatus === 'flutter', null, { timeout: ms });
  } catch (e) {
    throw new Error('the Flutter phone did not swap in; status: ' + (await phoneStatus(p)));
  }
};
const settled = (p, ms = 60000) => p.waitForFunction(
  () => !/^(idle|loading)$/.test(document.getElementById('prototype-stage').dataset.phoneStatus), null, { timeout: ms });
const phoneStatus = (p) => p.getAttribute(STAGE, 'data-phone-status');
// put the stage under the header and let the section's own lift-in (1.8s) finish,
// so rectangles read now are the ones a screenshot taken next will show
const toStage = async (p) => {
  await p.evaluate(() => {
    const y = document.getElementById('prototype-stage').getBoundingClientRect().top + scrollY - 70;
    window.scrollTo(0, y);
  });
  await p.waitForTimeout(2300);
};
const semText = (p) => p.evaluate(() => [...document.querySelectorAll('#phone-host flt-semantics')]
  .map((n) => (n.getAttribute('aria-label') || n.textContent || '').trim()).join(' | '));
const semRect = (p, text) => p.evaluate((t) => {
  const n = [...document.querySelectorAll('#phone-host flt-semantics[role=button]')]
    .find((e) => ((e.getAttribute('aria-label') || '') + (e.textContent || '')).includes(t));
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}, text);
const semClick = async (p, text) => {
  await p.evaluate((t) => {
    const n = [...document.querySelectorAll('#phone-host flt-semantics[role=button]')]
      .find((e) => ((e.getAttribute('aria-label') || '') + (e.textContent || '')).includes(t));
    n.click();
  }, text);
  await p.waitForTimeout(400);
};
const scratch = await (await browser.newContext()).newPage();
async function pixels(buf, pts, k = 1) { // k: device pixels per CSS pixel of the screenshot
  return scratch.evaluate(async ([b64, list, K]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return list.map(([x, y]) => [...g.getImageData(Math.round(x * K), Math.round(y * K), 1, 1).data].slice(0, 3));
  }, [buf.toString('base64'), pts, k]);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (a, b, tol = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const stageBox = (p) => p.$eval(STAGE, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const exposed = (p) => p.evaluate(() => {
  const inert = (el) => !!el.closest('[inert]') || !!el.closest('[aria-hidden="true"]');
  return {
    html: !inert(document.getElementById('prototype-root')),
    flutter: !inert(document.getElementById('phone-host')),
  };
});

await test('phone (flutter): loads and paints inside the page, then swaps in over the HTML phone', async () => {
  const p = await open('', { flutter: true, viewport: { width: 1280, height: 1100 } });
  await swapped(p);
  assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'flutter', 'engine');
  assert(await p.$('#phone-host flutter-view'), 'no flutter-view inside the host');
  await p.waitForTimeout(600); // let the crossfade end
  const vis = await p.evaluate(() => ({
    host: getComputedStyle(document.getElementById('phone-host')).visibility + '/' + getComputedStyle(document.getElementById('phone-host')).opacity,
    html: getComputedStyle(document.getElementById('prototype-root')).visibility,
  }));
  assert(vis.host === 'visible/1' && vis.html === 'hidden', JSON.stringify(vis));
  // it really painted: the phone screen (light) is in the middle of the stage, on a dark page
  await toStage(p);
  const box = await stageBox(p);
  const shot = await p.screenshot();
  const gutter = await pixels(shot, [560, 640, 720].flatMap((dy) => [[box.x + box.w / 2 - 178, box.y + dy], [box.x + box.w / 2 + 178, box.y + dy]]));
  const lit = gutter.filter((c) => near(c, hex('#f5f4f2'), 12)).length;
  assert(lit >= 5, 'phone screen not painted: ' + JSON.stringify(gutter));
  const [page0] = await pixels(shot, [[box.x + 20, box.y + box.h / 2]]);
  assert(near(page0, hex('#1a1919'), 12), 'page ground: ' + page0);
  assert(/Today/.test(await semText(p)), 'no Flutter accessibility text: ' + (await semText(p)).slice(0, 80));
  // the accessibility tree: the three cases, Today, Proposed, Buy and the four tabs
  await p.waitForFunction(() => document.querySelectorAll('#phone-host flt-semantics[role=button]').length >= 10, null, { timeout: 8000 })
    .catch(() => { throw new Error('Flutter accessibility tree has too few buttons'); });
  assert(p.errors.length === 0, p.errors.join('; '));
  await done(p);
});

await test('phone (flutter): the swap moves nothing (geometry equal, layout-shift score zero)', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ t: e.startTime, v: e.value, input: e.hadRecentInput }); })
      .observe({ type: 'layout-shift', buffered: true });
  });
  // hold the loader back so the "before" reading is the HTML phone alone
  await ctx.route('**/flutter_bootstrap.js', async (r) => { await new Promise((ok) => setTimeout(ok, 3500)); await r.continue(); });
  const p = await ctx.newPage();
  p.errors = [];
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await p.evaluate(() => { document.getElementById('prototype').scrollIntoView(); });
  const geo = () => p.evaluate(() => {
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x, b.y + scrollY, b.width, b.height].map((v) => Math.round(v * 100) / 100); };
    return { stage: r('#prototype-stage'), section: r('#prototype'), next: r('#why-not'), doc: document.documentElement.scrollHeight };
  });
  // settle any scroll-motion transitions first, then read the "before" geometry
  await p.waitForTimeout(2200);
  assert((await phoneStatus(p)) !== 'flutter', 'already swapped: the "before" reading would be the Flutter phone');
  const before = await geo();
  const at = await p.evaluate(() => performance.now());
  await swapped(p);
  await p.waitForTimeout(600);
  const after = await geo();
  assert(JSON.stringify(before) === JSON.stringify(after), 'geometry moved: ' + JSON.stringify(before) + ' -> ' + JSON.stringify(after));
  const shifts = await p.evaluate(() => window.__shifts);
  const during = shifts.filter((s) => s.t >= at - 50 && !s.input).reduce((a, s) => a + s.v, 0);
  assert(during < 0.0005, 'layout-shift score during load and swap: ' + during);
  await done(p);
});

// A blocked file is reported by the loader at once ("failed"); the one file the
// loader cannot report on (the renderer's wasm) is caught by the 12 s timeout.
for (const [what, pattern, wasmOff, expected] of [
  ['main.dart.wasm', '**/main.dart.wasm', false, 'failed'],
  ['main.dart.mjs', '**/main.dart.mjs', false, 'failed'],
  ['main.dart.js (JS build path, WasmGC emulated missing)', '**/main.dart.js', true, 'failed'],
  ['everything under phone/', '**/phone/**', false, 'failed'],
  ['canvaskit/skwasm.wasm (the loader hangs; the timeout ends it)', '**/canvaskit/skwasm.wasm', false, 'timeout'],
]) {
  await test(`phone (flutter): blocked ${what} keeps the HTML phone and the page works`, async () => {
    const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((off) => {
      window.PHONE_OPTIONS = { timeoutMs: 9000 };
      if (off) WebAssembly.validate = () => false; // Flutter reads this to choose the JS build
    }, wasmOff);
    await ctx.route(pattern, (r) => r.abort());
    const p = await ctx.newPage();
    p.errors = [];
    p.on('pageerror', (e) => p.errors.push(String(e)));
    await p.goto(BASE, { waitUntil: 'load' });
    p.ctx = ctx;
    await settled(p, 30000);
    assert((await phoneStatus(p)) === 'kept-html:' + expected, 'status ' + (await phoneStatus(p)) + ', wanted kept-html:' + expected);
    assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'html', 'engine');
    assert((await exposed(p)).html === true, 'HTML phone not exposed');
    // and it works: pick another case, the decline explains it
    await p.click('#prototype-root .scenarios__item:nth-child(2)');
    assert((await p.evaluate(() => window.PROTOTYPE.state.scenarioId)) === 'new-account', 'HTML phone did not respond');
    const own = p.errors.filter((e) => !(expected === 'timeout' && /Failed to fetch/.test(e))); // Flutter's own unhandled rejection when its renderer file is blocked
    assert(own.length === 0, own.join('; '));
    await done(p);
  });
}

await test('phone (flutter): a load that takes longer than the limit is abandoned, and the HTML phone stays', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.PHONE_OPTIONS = { timeoutMs: 3000 }; });
  // the engine file arrives after the limit
  await ctx.route('**/main.dart.wasm', async (r) => { await new Promise((ok) => setTimeout(ok, 7000)); await r.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await settled(p, 20000);
  assert((await phoneStatus(p)) === 'kept-html:timeout', await phoneStatus(p));
  await p.waitForTimeout(8000); // even when Flutter does finish later, it must not swap in
  assert((await phoneStatus(p)) === 'kept-html:timeout', 'changed to ' + (await phoneStatus(p)));
  assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'html');
  assert(!(await p.$('flt-semantics-placeholder')), 'the parked accessibility button was left on the page');
  await done(p);
});

await test('phone (flutter): the JS + CanvasKit build path also loads and swaps (WasmGC emulated missing)', async () => {
  const p = await open('', {
    flutter: true, viewport: { width: 1280, height: 900 },
    init: () => { WebAssembly.validate = () => false; },
  });
  await swapped(p);
  assert(/Today/.test(await semText(p)), 'no text');
  await done(p);
});

for (const [what, script] of [
  ['Save-Data', () => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } })],
  ['effectiveType 2g', () => Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g' } })],
  ['effectiveType slow-2g', () => Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: 'slow-2g' } })],
  ['no WebAssembly', () => { delete window.WebAssembly; }],
]) {
  await test(`phone (flutter): ${what} keeps the HTML phone and never requests the Flutter files`, async () => {
    const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(script);
    const seen = [];
    const p = await ctx.newPage();
    p.on('request', (r) => seen.push(r.url()));
    await p.goto(BASE, { waitUntil: 'load' });
    p.ctx = ctx;
    await p.evaluate(() => document.getElementById('prototype').scrollIntoView());
    await p.waitForTimeout(3500); // past load + idle, and the phone is on screen
    assert(/^kept-html:/.test(await phoneStatus(p)), 'status ' + (await phoneStatus(p)));
    assert(!seen.some((u) => /\/phone\//.test(u)), 'requested: ' + seen.filter((u) => /\/phone\//.test(u)).join(', '));
    assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'html');
    await done(p);
  });
}

await test('phone (flutter): a narrow screen (390) keeps the HTML phone; widening the window then starts the load', async () => {
  const p = await open('', { flutter: true, viewport: { width: 390, height: 844 } });
  await p.evaluate(() => document.getElementById('prototype').scrollIntoView());
  await p.waitForTimeout(3000);
  assert((await phoneStatus(p)) === 'kept-html:narrow', await phoneStatus(p));
  await p.setViewportSize({ width: 900, height: 900 });
  await swapped(p);
  await p.setViewportSize({ width: 400, height: 900 }); // and back: the HTML phone is the one built for this width
  await p.waitForFunction(() => document.getElementById('prototype-stage').dataset.engine === 'html', null, { timeout: 5000 });
  assert((await exposed(p)).html === true && (await exposed(p)).flutter === false);
  await done(p);
});

await test('phone (flutter): touching the HTML phone before the swap keeps it (and its state)', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 1000 } });
  // hold the loader back so there is time to act before Flutter is ready
  await ctx.route('**/flutter_bootstrap.js', async (r) => { await new Promise((ok) => setTimeout(ok, 4500)); await r.continue(); });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(String(e)));
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await p.evaluate(() => document.getElementById('prototype').scrollIntoView());
  await p.waitForTimeout(2300); // the section lifts in first
  await p.click('#prototype-root .scenarios__item:nth-child(3)'); // the limit cut
  await settled(p, 40000);
  assert((await phoneStatus(p)) === 'kept-html:interacted', await phoneStatus(p));
  assert((await p.evaluate(() => window.PROTOTYPE.state.scenarioId)) === 'limit-cut', 'state lost');
  assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'html');
  assert((await exposed(p)).html && !(await exposed(p)).flutter);
  await p.waitForTimeout(800);
  assert(await p.isVisible('#prototype-root .phone'), 'HTML phone hidden');
  await done(p);
});

await test('phone (flutter): keyboard focus in the HTML phone also keeps it', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 1000 } });
  await ctx.route('**/flutter_bootstrap.js', async (r) => { await new Promise((ok) => setTimeout(ok, 4500)); await r.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await p.waitForTimeout(2300);
  await p.focus('#prototype-root .scenarios__item');
  await settled(p, 40000);
  assert((await phoneStatus(p)) === 'kept-html:interacted', await phoneStatus(p));
  assert(await p.evaluate(() => document.activeElement.classList.contains('scenarios__item')), 'focus was moved');
  await done(p);
});

await test('phone (flutter): exactly one phone is exposed to assistive technology, before and after the swap', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 1100 } });
  await ctx.route('**/flutter_bootstrap.js', async (r) => { await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  assert((await phoneStatus(p)) !== 'flutter', 'swapped too early to observe the "before"');
  const before = await exposed(p);
  assert(before.html && !before.flutter, 'before: ' + JSON.stringify(before));
  assert(/button "Today"/.test(await p.locator('#prototype').ariaSnapshot()), 'HTML phone missing from the accessibility tree');
  await swapped(p);
  await p.waitForTimeout(400);
  const after = await exposed(p);
  assert(!after.html && after.flutter, 'after: ' + JSON.stringify(after));
  const snap = await p.locator('#prototype').ariaSnapshot();
  const today = (snap.match(/button "Today"/g) || []).length;
  assert(today === 1, 'the Today button is in the accessibility tree ' + today + ' times:\n' + snap.slice(0, 600));
  assert(!(await p.isVisible('#prototype-root .phone')), 'HTML phone still visible');
  await done(p);
});

await test('phone (flutter): pressing Tab before the swap keeps the HTML phone (its buttons are the ones a keyboard reaches)', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 1000 } });
  await ctx.route('**/flutter_bootstrap.js', async (r) => { await new Promise((ok) => setTimeout(ok, 3500)); await r.continue(); });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await p.keyboard.press('Tab'); // anywhere on the page
  await settled(p, 40000);
  assert((await phoneStatus(p)) === 'kept-html:keyboard', await phoneStatus(p));
  assert((await p.$eval(STAGE, (e) => e.dataset.engine)) === 'html');
  await done(p);
});

await test('phone (flutter): focus stays where it was at the swap, and the Flutter phone is one tab stop that Tab can leave', async () => {
  const p = await open('', { flutter: true, viewport: { width: 1280, height: 1100 } });
  await p.focus('#theme-btn');
  await swapped(p);
  assert(await p.evaluate(() => document.activeElement.id === 'theme-btn'), 'focus moved by the swap');
  // walk forward with Tab until focus lands inside the Flutter host
  let inHost = false;
  for (let i = 0; i < 12 && !inHost; i++) {
    await p.keyboard.press('Tab');
    inHost = await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#phone-host'));
  }
  assert(inHost, 'Tab never reached the Flutter phone');
  assert(!(await p.evaluate(() => !!document.activeElement.closest('#prototype-root'))), 'focus is in the hidden HTML phone');
  await p.keyboard.press('Tab');
  assert(!(await p.evaluate(() => !!document.activeElement.closest('#phone-host'))), 'keyboard trap: Tab cannot leave the Flutter phone');
  await done(p);
});

await test('phone (flutter): the page language menu changes the Flutter text, both directions (read from its accessibility tree)', async () => {
  const p = await open('', { flutter: true, viewport: { width: 1280, height: 1100 } });
  await swapped(p);
  let t = await semText(p);
  assert(/Today/.test(t) && /Proposed/.test(t) && !/اليوم/.test(t), 'EN: ' + t.slice(0, 100));
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="ar"]');
  await p.waitForTimeout(700);
  t = await semText(p);
  assert(/اليوم/.test(t) && /المقترح/.test(t) && !/Proposed/.test(t), 'AR: ' + t.slice(0, 100));
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="en"]');
  await p.waitForTimeout(700);
  t = await semText(p);
  assert(/Today/.test(t) && !/اليوم/.test(t), 'EN again: ' + t.slice(0, 100));
  await done(p);
});

await test('phone (flutter): starts in the saved page language, and its own controls work', async () => {
  const p = await open('', { flutter: true, viewport: { width: 1280, height: 1100 }, init: `localStorage.setItem('ti-lang','ar')` });
  await swapped(p);
  const t = await semText(p);
  assert(/اليوم/.test(t) && !/Proposed/.test(t), t.slice(0, 100));
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="en"]');
  await p.waitForTimeout(600);
  const before = await semText(p);
  await semClick(p, 'Today'); // the phone's own toggle, driven through its accessibility tree
  await p.waitForTimeout(600);
  const after = await semText(p);
  assert(before !== after, 'pressing Today changed nothing');
  await done(p);
});

for (const [start, next] of [['dark', 'bright'], ['bright', 'dark']]) {
  await test(`phone (flutter): page theme ${start} -> ${next} recolours the Flutter picker chips, contrast met in both`, async () => {
    const p = await open('', { flutter: true, viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2, init: `localStorage.setItem('ti-theme','${start}')` });
    await swapped(p);
    await toStage(p);
    const measure = async (theme) => {
      const ground = hex(theme === 'dark' ? '#1a1919' : '#f5f4f2');
      const idle = await semRect(p, 'The new account');
      const active = await semRect(p, 'The never-late payer');
      const buf = await p.screenshot();
      const [cardBg, activeBg] = await pixels(buf, [
        [idle.x + 5, idle.y + idle.h / 2], [active.x + 5, active.y + active.h / 2]], 2);
      const cardBgWant = hex(theme === 'dark' ? '#292826' : '#ffffff');
      const activeWant = hex(theme === 'dark' ? '#f5f4f2' : '#1a1919');
      assert(near(cardBg, cardBgWant, 4), `${theme}: idle chip is ${cardBg}, want ${cardBgWant}`);
      assert(near(activeBg, activeWant, 4), `${theme}: selected chip is ${activeBg}, want ${activeWant}`);
      // graphics >= 3:1 against the page: the selected chip, and the idle chip's outline
      assert(ratio(activeBg, ground) >= 3, `${theme}: selected chip vs page ${ratio(activeBg, ground).toFixed(2)}`);
      const edge = (await pixels(buf, [-1, -0.5, 0, 0.5, 1, 1.5].map((d) => [idle.x + d, idle.y + idle.h / 2]), 2)).sort((a, b) => ratio(b, ground) - ratio(a, ground))[0];
      assert(ratio(edge, ground) >= 3, `${theme}: idle chip outline vs page ${ratio(edge, ground).toFixed(2)} (${edge})`);
      // the Today / Proposed toggle follows the page too: track and the selected pill
      const pillRect = await semRect(p, 'Proposed');
      const trackRect = await semRect(p, 'Today');
      const [pill, track] = await pixels(buf, [[pillRect.x + 6, pillRect.y + pillRect.h / 2], [trackRect.x + 6, trackRect.y + trackRect.h / 2]], 2);
      assert(near(pill, hex(theme === 'dark' ? '#f5f4f2' : '#ffffff'), 4), `${theme}: selected pill is ${pill}`);
      assert(near(track, hex(theme === 'dark' ? '#3d3b3a' : '#ebe7e4'), 4), `${theme}: toggle track is ${track}`);
      return { cardBg, activeBg, pill, track };
    };
    const first = await measure(start);
    await p.click('#theme-btn');
    await p.waitForTimeout(900);
    const second = await measure(next);
    assert(JSON.stringify(first) !== JSON.stringify(second), 'chips did not change with the page theme');
    await done(p);
  });
}

await test('privacy: zero third-party requests across the whole load, Flutter included', async () => {
  const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
  const seen = [];
  ctx.on('request', (r) => seen.push(r.url()));
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  p.ctx = ctx;
  await swapped(p);
  await p.click('#lang-btn');
  await p.click('#lang-menu [data-lang="ar"]');
  await p.click('#theme-btn');
  await p.waitForTimeout(1500);
  assert(seen.some((u) => /main\.dart\.(wasm|js)/.test(u)), 'Flutter did not load, so this proves nothing');
  const foreign = seen.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  assert(foreign.length === 0, foreign.join(', '));
  await done(p);
});

await test('console: no errors and no failed requests across the whole load, Flutter included, both languages', async () => {
  for (const lang of ['', '?lang=ar']) {
    const ctx = await browser.newContext({ reducedMotion: SWAP_MOTION, viewport: { width: 1280, height: 900 } });
    const bad = [];
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') bad.push('console: ' + m.text()); });
    p.on('pageerror', (e) => bad.push('pageerror: ' + e));
    // Chromium cancels the body of a font it already received (Flutter fetches each font
    // and also hands it to FontFace); that shows as ERR_ABORTED after a 200 and is not a failure
    const got = new Set();
    p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); else got.add(r.url()); });
    p.on('requestfailed', (r) => { if (!(/ERR_ABORTED/.test(r.failure()?.errorText || '') && got.has(r.url()))) bad.push('requestfailed: ' + r.url()); });
    await p.goto(BASE + lang, { waitUntil: 'load' });
    p.ctx = ctx;
    await swapped(p);
    await p.click('#theme-btn');
    await p.waitForTimeout(1200);
    assert(bad.length === 0, `${lang || 'en'}: ` + bad.join(' ; '));
    await done(p);
  }
});

await test('layout (flutter swapped): no horizontal scroll at 360/390/500/768/1280, both languages, both themes', async () => {
  const bad = [];
  for (const width of [360, 390, 500, 768, 1280]) {
    for (const lang of ['en', 'ar']) {
      for (const theme of ['dark', 'bright']) {
        const p = await open(lang === 'ar' ? '?lang=ar' : '', {
          flutter: true, viewport: { width, height: 900 }, init: `localStorage.setItem('ti-theme','${theme}')`,
        });
        await p.evaluate(() => document.getElementById('prototype').scrollIntoView());
        if (width > 480) await swapped(p); else { await p.waitForTimeout(2500); assert((await phoneStatus(p)) === 'kept-html:narrow'); }
        await p.waitForTimeout(500);
        const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        if (w[0] > w[1]) bad.push(`${width}/${lang}/${theme}: ${w[0]}>${w[1]}`);
        await done(p);
      }
    }
  }
  assert(bad.length === 0, bad.join(', '));
});

await test('motion: the swap fades in about a third of a second, and not at all under reduced motion', async () => {
  const dur = (p) => p.evaluate(() => {
    const t = (s) => getComputedStyle(document.querySelector(s)).transitionDuration;
    return [t('#phone-host'), t('#prototype-root')];
  });
  // Normal motion means the cinema is live, so the swap needs the script hook; a stub stands in for it.
  const a = await open('', { flutter: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', init: () => { window.setPhoneScreen = () => {}; window.setPhoneControls = () => {}; } });
  await swapped(a);
  const on = await dur(a);
  assert(on.every((d) => /^0\.3\d*s/.test(d)), 'normal motion: ' + on);
  await done(a);
  const b = await open('', { flutter: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await swapped(b);
  const off = await dur(b);
  assert(off.every((d) => /^0s/.test(d)), 'reduced motion: ' + off);
  await done(b);
});

// ------------------------------------------------------------- cinema -----
// The phone plays her case as the visitor scrolls: a tall block with a pinned
// stage (position: sticky, no scroll-jacking), the header retracting while it is
// pinned, narration beside the phone. Everything here uses real wheel scrolling
// where it claims a scene, because the director reads scroll position only.
const SCENE_STATES = [
  { mode: 'today', screens: ['tab'], tab: 'nav.shop' },
  { mode: 'today', screens: ['checkout'] },
  { mode: 'today', screens: ['processing', 'decline'] }, // the phone's own 1.4 s timer may already have moved on
  { mode: 'today', screens: ['decline'] },
  { mode: 'proposed', screens: ['decline'] },
  { mode: 'proposed', screens: ['limit'] },
  { mode: 'proposed', screens: ['recovery'] },
  { mode: 'proposed', screens: ['tab'], tab: 'nav.shop' },
];
const sceneY = (p, n) => p.evaluate((i) => {
  const beat = document.querySelectorAll('.cinema__beat')[i - 1];
  if (!beat) throw new Error('no beat ' + i);
  return Math.round(beat.getBoundingClientRect().top + window.scrollY + 3);
}, n);
const wheelTo = async (p, y) => {
  await p.mouse.move(640, 400);
  for (let i = 0; i < 120; i += 1) {
    const cur = await p.evaluate(() => window.scrollY);
    const d = y - cur;
    if (Math.abs(d) <= 1) break;
    await p.mouse.wheel(0, Math.max(-300, Math.min(300, d)));
    await p.waitForTimeout(35);
  }
  await p.waitForTimeout(250);
};
const wheelToScene = async (p, n) => wheelTo(p, await sceneY(p, n));
const phoneState = (p) => p.evaluate(() => window.PROTOTYPE.state);
const activeScene = (p) => p.evaluate(() => [...document.querySelectorAll('.cinema__scene')].findIndex((li) => li.getAttribute('aria-current') === 'step') + 1);
// the header slides in about 0.3s; read it once that has finished
const hdr = async (p) => { await p.waitForTimeout(450); return hdrNow(p); };
const hdrNow = (p) => p.evaluate(() => {
  const h = document.querySelector('.site-header');
  const inner = document.querySelector('.hdr__inner').getBoundingClientRect();
  const bar = document.querySelector('.hdr__progress').getBoundingClientRect();
  let op = 1;
  for (let n = document.querySelector('.hdr__progress'); n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
  return { cinema: h.classList.contains('is-cinema'), innerTop: inner.top, innerBottom: inner.bottom, innerOpacity: Number(getComputedStyle(document.querySelector('.hdr__inner')).opacity), barTop: bar.top, barH: bar.height, barOpacity: op };
});
const hidden = (h) => h.cinema && h.innerBottom <= 1 && h.innerOpacity < 0.05;
const shown = (h) => !h.cinema && h.innerTop >= -0.5 && h.innerOpacity > 0.95;

await test('cinema: each scene sets its state on the HTML phone by real scrolling, in both directions', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  assert(await p.$('.cinema.is-scripted'), 'the cinema is not live');
  assert((await p.$$('.cinema__scene')).length === 8, 'expected 8 scenes');
  const bad = [];
  const check = async (n, dir) => {
    const s = await phoneState(p);
    const want = SCENE_STATES[n - 1];
    const ok = s.mode === want.mode && want.screens.includes(s.screen) && (!want.tab || s.tab === want.tab) && s.scenarioId === 'silent-block';
    if (!ok || (await activeScene(p)) !== n) bad.push(`${dir} scene ${n}: ${JSON.stringify(s)} caption ${await activeScene(p)}`);
  };
  for (let n = 1; n <= 8; n += 1) { await wheelToScene(p, n); await check(n, 'down'); }
  for (let n = 7; n >= 1; n -= 1) { await wheelToScene(p, n); await check(n, 'up'); }
  assert(bad.length === 0, bad.join(' | '));
  assert(p.errors.length === 0, p.errors.join('; '));
  await done(p);
});

await test('cinema: no scroll-jacking (no scroll-snap, position: sticky, wheel and touch listeners never cancel)', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  const r = await p.evaluate(async () => {
    const st = getComputedStyle(document.querySelector('.cinema__stage'));
    const snap = getComputedStyle(document.documentElement).scrollSnapType + '/' + getComputedStyle(document.body).scrollSnapType;
    let prevented = false;
    const y0 = window.scrollY;
    const probe = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true });
    document.querySelector('.cinema__stage').dispatchEvent(probe);
    prevented = probe.defaultPrevented;
    const t = new Event('touchmove', { cancelable: true, bubbles: true });
    document.querySelector('.cinema__stage').dispatchEvent(t);
    return { pos: st.position, snap, prevented, touchPrevented: t.defaultPrevented, y0 };
  });
  assert(r.pos === 'sticky', 'stage position ' + r.pos);
  assert(/^none\/none$/.test(r.snap), 'scroll-snap ' + r.snap);
  assert(!r.prevented && !r.touchPrevented, 'a wheel or touch event was cancelled');
  await done(p);
});

await test('cinema: the header retracts while the stage is pinned, keeps its hairline, and returns on scroll-up, focus, Escape and after the last scene', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  assert(shown(await hdr(p)), 'header not shown at the top');
  await wheelToScene(p, 4);
  let h = await hdr(p);
  assert(hidden(h), 'not retracted in the stage ' + JSON.stringify(h));
  assert(h.barTop <= 3 && h.barH >= 1.5 && h.barOpacity > 0.95, 'hairline not visible at the top edge ' + JSON.stringify(h));
  // scroll up a little: it comes back
  await wheelTo(p, (await p.evaluate(() => window.scrollY)) - 200);
  h = await hdr(p);
  assert(shown(h), 'not back on scroll-up ' + JSON.stringify(h));
  // scroll down again: it leaves again
  await wheelTo(p, (await p.evaluate(() => window.scrollY)) + 400);
  h = await hdr(p);
  assert(hidden(h), 'did not retract again on scroll-down ' + JSON.stringify(h));
  // keyboard focus in a header control brings it back
  // focus without letting the browser scroll it into view (a scroll-up alone would also bring it back)
  await p.evaluate(() => document.getElementById('theme-btn').focus({ preventScroll: true }));
  await p.waitForTimeout(200);
  h = await hdr(p);
  assert(shown(h), 'not back on focus ' + JSON.stringify(h));
  await p.evaluate(() => document.activeElement.blur());
  await wheelTo(p, (await p.evaluate(() => window.scrollY)) + 300);
  assert(hidden(await hdr(p)), 'did not retract after blur');
  // Escape brings it back
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  assert(shown(await hdr(p)), 'not back on Escape');
  // after the last scene the block is left and the header is simply the header
  await p.evaluate(() => { const b = document.getElementById('ending').getBoundingClientRect(); window.scrollTo(0, b.top + scrollY - 100); });
  await p.waitForTimeout(400);
  assert(shown(await hdr(p)), 'not back after the cinema ' + JSON.stringify(await hdr(p)));
  await done(p);
});

await test('cinema: during the scenes the phone is not clickable and the case picker and Today/Proposed toggle are hidden', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  for (const n of [1, 4, 6]) {
    await wheelToScene(p, n);
    const r = await p.evaluate(() => {
      const stage = document.getElementById('prototype-stage');
      const ph = document.querySelector('.phone').getBoundingClientRect();
      const hit = document.elementFromPoint(ph.x + ph.width / 2, ph.y + ph.height / 2);
      const vis = (sel) => [...document.querySelectorAll(sel)].some((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && !e.closest('[inert]'); });
      return { inert: stage.inert, pe: getComputedStyle(stage).pointerEvents, hitInside: !!(hit && hit.closest('#prototype-stage')), toggle: vis('.toggle'), picker: vis('.scenarios'), ah: stage.getAttribute('aria-hidden') };
    });
    assert(r.inert && r.pe === 'none' && !r.hitInside, `scene ${n}: phone clickable ${JSON.stringify(r)}`);
    assert(!r.toggle && !r.picker, `scene ${n}: controls visible ${JSON.stringify(r)}`);
    assert(r.ah === 'true', `scene ${n}: phone exposed to assistive tech`);
  }
  await done(p);
});

// A real pointer press at the element's centre. Playwright's own click first scrolls
// the element into view, and any page scroll here (by design) moves the story.
const tap = async (p, sel, i) => {
  const b = await p.locator(sel).nth(i).boundingBox();
  if (!b) throw new Error('not rendered: ' + sel);
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await p.waitForTimeout(150);
};

await test('cinema: scene 8 unlocks the phone and its controls, and they work', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  await wheelToScene(p, 8);
  const r = await p.evaluate(() => {
    const stage = document.getElementById('prototype-stage');
    return { inert: stage.inert, ah: stage.getAttribute('aria-hidden'), pe: getComputedStyle(stage).pointerEvents };
  });
  assert(!r.inert && r.ah === null && r.pe !== 'none', 'phone still locked ' + JSON.stringify(r));
  assert(await p.locator('.toggle').isVisible() && await p.locator('.scenarios').isVisible(), 'controls not visible');
  await tap(p, '.toggle__btn', 0); // Today
  assert((await phoneState(p)).mode === 'today', 'Today did not switch the phone');
  await tap(p, '.scenarios__item', 1);
  assert((await phoneState(p)).scenarioId !== 'silent-block', 'the case picker did nothing');
  await tap(p, '.tabbar__item', 1);
  await tap(p, '.btn--primary', 0); // Buy
  assert((await phoneState(p)).screen === 'checkout', 'Buy did not reach the checkout');
  // scrolling back into the story locks it again and returns to her case
  await wheelToScene(p, 5);
  const s = await phoneState(p);
  assert(s.scenarioId === 'silent-block' && s.mode === 'proposed' && s.screen === 'decline', 'scene 5 after free play: ' + JSON.stringify(s));
  assert(await p.evaluate(() => document.getElementById('prototype-stage').inert), 'phone not locked again');
  await done(p);
});

await test('cinema: English and Arabic narration exist for every scene, no TODO_AR, and render in both languages', async () => {
  const keys = ['cinema.skip', 'cinema.label', 'cinema.modeToday', 'cinema.modeProposed'];
  for (let n = 1; n <= 8; n += 1) keys.push(`cinema.s${n}.title`, `cinema.s${n}.text`);
  for (const lang of ['en', 'ar']) {
    const p = await open(lang === 'ar' ? '?lang=ar' : '', { viewport: { width: 1280, height: 800 } });
    const r = await p.evaluate((ks) => {
      const out = { missing: [], todo: [], wrongScript: [], rendered: [] };
      for (const l of ['en', 'ar']) for (const k of ks) {
        const v = window.STRINGS[l][k];
        if (!v) out.missing.push(l + ':' + k);
        else if (/TODO_AR/.test(v)) out.todo.push(l + ':' + k);
        else if (l === 'ar' && !/[؀-ۿ]/.test(v)) out.wrongScript.push(l + ':' + k);
        else if (l === 'en' && /[؀-ۿ]/.test(v)) out.wrongScript.push(l + ':' + k);
      }
      const lis = [...document.querySelectorAll('.cinema__scene')];
      for (let i = 0; i < lis.length; i += 1) {
        out.rendered.push([lis[i].querySelector('.cinema__title').textContent.trim() === window.STRINGS[document.documentElement.lang.slice(0, 2)]['cinema.s' + (i + 1) + '.title'],
          lis[i].querySelector('.cinema__line').textContent.trim() === window.STRINGS[document.documentElement.lang.slice(0, 2)]['cinema.s' + (i + 1) + '.text']]);
      }
      out.count = lis.length;
      out.skip = document.querySelector('.cinema__skip').textContent.trim();
      return out;
    }, keys);
    assert(r.missing.length === 0, 'missing ' + r.missing.join(','));
    assert(r.todo.length === 0, 'TODO_AR in ' + r.todo.join(','));
    assert(r.wrongScript.length === 0, 'wrong script ' + r.wrongScript.join(','));
    assert(r.count === 8 && r.rendered.every((x) => x[0] && x[1]), lang + ' rendered narration differs from strings.js');
    assert(r.skip.length > 3 && !/TODO/.test(r.skip), 'skip link text ' + r.skip);
    await done(p);
  }
});

await test('cinema: the phone sits at the inline-start (left in English, right in Arabic) and the narration at the inline-end', async () => {
  for (const [lang, want] of [['', 'ltr'], ['?lang=ar', 'rtl']]) {
    const p = await open(lang, { viewport: { width: 1280, height: 800 } });
    await wheelToScene(p, 4);
    const g = await p.evaluate(() => {
      const c = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, r: r.right, cx: r.left + r.width / 2 }; };
      return { dir: document.documentElement.dir, phone: c('.phone'), cap: c('.cinema__caption') };
    });
    assert(g.dir === want, 'dir ' + g.dir);
    if (want === 'ltr') assert(g.phone.cx < g.cap.cx && g.phone.l < 640 && g.phone.r <= g.cap.l + 1, 'EN geometry ' + JSON.stringify(g));
    else assert(g.phone.cx > g.cap.cx && g.phone.r > 640 && g.phone.l >= g.cap.r - 1, 'AR geometry ' + JSON.stringify(g));
    await done(p);
  }
});

await test('cinema: the whole phone fits the viewport while pinned (1280x800 side by side, 390x800 stacked with its caption)', async () => {
  for (const [w, h] of [[1280, 800], [1440, 720], [390, 800], [360, 640]]) {
    const p = await open('', { viewport: { width: w, height: h } });
    for (const n of [1, 5, 8]) {
      await wheelToScene(p, n);
      const g = await p.evaluate(() => {
        const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right }; };
        return { phone: r('.phone'), cap: r('.cinema__caption'), vh: innerHeight, vw: innerWidth };
      });
      assert(g.phone.t >= -1 && g.phone.b <= g.vh + 1 && g.phone.l >= -1 && g.phone.r <= g.vw + 1, `${w}x${h} scene ${n}: phone outside the viewport ${JSON.stringify(g)}`);
      assert(g.cap.b <= g.vh + 1 && g.cap.t >= -1, `${w}x${h} scene ${n}: caption outside the viewport ${JSON.stringify(g.cap)}`);
      if (w < 960) assert(g.phone.b <= g.cap.t + 2, `${w}x${h}: caption overlaps the phone ${JSON.stringify(g)}`);
    }
    await done(p);
  }
});

await test('cinema: no sideways scroll at 360, 390, 768 and 1280, both languages and themes, in scenes 1, 4 and 8', async () => {
  const bad = [];
  for (const width of [360, 390, 768, 1280]) for (const lang of ['', '?lang=ar']) for (const theme of ['dark', 'bright']) {
    const p = await open(lang, { viewport: { width, height: 800 }, init: `localStorage.setItem('ti-theme','${theme}')` });
    for (const n of [1, 4, 8]) {
      await scrollTo(p, await sceneY(p, n));
      const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (w[0] > w[1]) bad.push(`${width}/${lang || 'en'}/${theme}/scene ${n}: ${w[0]}>${w[1]}`);
    }
    await done(p);
  }
  assert(bad.length === 0, bad.join(', '));
});

for (const theme of ['dark', 'bright']) {
  await test(`cinema (${theme}): narration and the Today/Proposed badge reach 4.5:1, and the badge flips coral to green`, async () => {
    const seen = {};
    for (const lang of ['', '?lang=ar']) {
      const p = await open(lang, { viewport: { width: 1280, height: 800 }, init: `localStorage.setItem('ti-theme','${theme}')` });
      for (const n of [1, 4, 5, 7, 8]) {
        await scrollTo(p, await sceneY(p, n));
        await p.waitForTimeout(700); // the caption crossfade and the badge colour finish
        const row = await p.evaluate(() => {
          const parse = (s) => s.match(/[\d.]+/g).map(Number);
          const effBg = (el) => { for (let x = el; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c.length === 3 || c[3] > 0.99) return c.slice(0, 3); } return [255, 255, 255]; };
          const li = document.querySelector('.cinema__scene[aria-current="step"]');
          const badge = document.querySelector('.cinema__badge');
          const one = (el) => ({ fg: parse(getComputedStyle(el).color).slice(0, 3), bg: effBg(el), op: Number(getComputedStyle(el).opacity) });
          return { title: one(li.querySelector('.cinema__title')), line: one(li.querySelector('.cinema__line')), badge: one(badge), badgeText: badge.textContent.trim(), badgeVisible: getComputedStyle(badge).visibility !== 'hidden' };
        });
        for (const part of ['title', 'line']) assert(ratio(row[part].fg, row[part].bg) >= 4.5 && row[part].op > 0.95, `${lang || 'en'} scene ${n} ${part} ${ratio(row[part].fg, row[part].bg).toFixed(2)}`);
        if (n !== 8) {
          assert(row.badgeVisible && row.badgeText.length > 0, `scene ${n}: no badge`);
          assert(ratio(row.badge.fg, row.badge.bg) >= 4.5, `${lang || 'en'} scene ${n} badge ${ratio(row.badge.fg, row.badge.bg).toFixed(2)}`);
          seen[(lang ? 'ar' : 'en') + n] = row.badge.fg.join();
        }
      }
      await done(p);
    }
    assert(seen.en4 !== seen.en5, 'the badge colour did not change between Today and Proposed');
    assert(seen.en1 === seen.en4 && seen.en5 === seen.en7, 'the badge colour does not follow the mode');
    assert(seen.ar4 === seen.en4 && seen.ar5 === seen.en5, 'the Arabic badge colours differ');
  });
}

await test('cinema: only opacity and transform animate in the cinema (no layout property in any transition)', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  assert(await p.$('.cinema.is-scripted .cinema__caption'), 'the cinema is not live');
  await wheelToScene(p, 4);
  const bad = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.cinema, .cinema *, .site-header, .site-header *')) {
      const s = getComputedStyle(el);
      const props = s.transitionProperty.split(',').map((x) => x.trim());
      const dur = s.transitionDuration.split(',').map((x) => parseFloat(x));
      props.forEach((pr, i) => { if (dur[i % dur.length] > 0 && /^(all|width|height|top|left|right|bottom|margin.*|padding.*|inset.*|font.*|line-height|letter-spacing)$/.test(pr)) out.push((el.className || el.tagName) + ': ' + pr); });
    }
    return out;
  });
  assert(bad.length === 0, bad.slice(0, 6).join(' | '));
  await done(p);
});

for (const opts of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
  const what = opts.reducedMotion ? 'reduced motion' : 'JavaScript off';
  await test(`cinema (${what}): the section is static, every scene reads in order, the header never retracts`, async () => {
    const p = await open('', { ...opts, viewport: { width: 1280, height: 800 } });
    const r = await p.evaluate(() => {
      const c = document.getElementById('cinema');
      const lis = [...document.querySelectorAll('.cinema__scene')];
      const vis = lis.map((li) => { const s = getComputedStyle(li); const b = li.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) === 1 && b.height > 10; });
      const tops = lis.map((li) => li.getBoundingClientRect().top);
      const skip = document.querySelector('.cinema__skip');
      const stage = document.querySelector('.cinema__stage');
      return {
        scripted: c.classList.contains('is-scripted'), n: lis.length, allVisible: vis.every(Boolean), inOrder: tops.every((t, i) => i === 0 || t > tops[i - 1]),
        skipShown: skip ? getComputedStyle(skip).display !== 'none' : false, stagePos: getComputedStyle(stage).position,
        beats: getComputedStyle(document.querySelector('.cinema__beats')).display, text: lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim()).join(' ').length,
      };
    });
    assert(!r.scripted, 'the cinema went live');
    assert(r.n === 8 && r.allVisible && r.inOrder, 'scenes not all readable in order ' + JSON.stringify(r));
    assert(!r.skipShown && r.stagePos !== 'sticky' && r.beats === 'none', 'cinema chrome present in the static section ' + JSON.stringify(r));
    assert(r.text > 200, 'scene text missing');
    if (opts.reducedMotion) {
      const s = await p.evaluate(() => ({ st: window.PROTOTYPE.state, inert: document.getElementById('prototype-stage').inert, toggle: !!document.querySelector('#prototype-root .toggle'), picker: !!document.querySelector('#prototype-root .scenarios'), host: document.getElementById('cinema-controls').hasAttribute('data-live') }));
      assert(s.st.mode === 'proposed' && s.st.screen === 'tab' && !s.inert && s.toggle && s.picker && !s.host, 'phone not in its final proposed state with controls ' + JSON.stringify(s));
    }
    await scrollTo(p, await p.evaluate(() => document.getElementById('cinema').getBoundingClientRect().top + scrollY + 200));
    await scrollTo(p, (await p.evaluate(() => scrollY)) + 400);
    assert(!(await p.evaluate(() => document.querySelector('.site-header').classList.contains('is-cinema'))), 'header retracted');
    await done(p);
  });
}

await test('phone: the one button with nothing behind it (the Today screen "Got it") is marked disabled and has no pointer affordance', async () => {
  const p = await open('', { reducedMotion: 'reduce' });
  await p.evaluate(() => window.PROTOTYPE.set({ mode: 'today', screen: 'decline' }));
  const b = await p.evaluate(() => {
    const el = document.querySelector('.screen--today button');
    return { dis: el.getAttribute('aria-disabled'), type: el.type, cursor: getComputedStyle(el).cursor, n: document.querySelectorAll('.screen--today button').length };
  });
  assert(b.n === 1 && b.dis === 'true' && b.type === 'button' && b.cursor === 'default', JSON.stringify(b));
  await done(p);
});

await test('cinema: the Skip link is the first thing in the stage, reaches the ending and brings the header back', async () => {
  const p = await open('', { viewport: { width: 1280, height: 800 } });
  await wheelToScene(p, 2);
  const box = await p.evaluate(() => { const a = document.querySelector('.cinema__skip'); const r = a.getBoundingClientRect(); return { w: r.width, h: r.height, first: document.querySelector('.cinema__stage').firstElementChild === a, href: a.getAttribute('href'), top: r.top }; });
  assert(box.first && box.href === '#ending' && box.w >= 44 && box.h >= 44 && box.top >= 0, 'skip link ' + JSON.stringify(box));
  await p.click('.cinema__skip');
  // the jump may be a smooth scroll: wait until it has stopped
  let last = -1;
  for (let i = 0; i < 40; i += 1) { await p.waitForTimeout(100); const now = await p.evaluate(() => window.scrollY); if (now === last) break; last = now; }
  // the ending lifts in (a transform), so compare its layout position, not its painted one
  const y = await p.evaluate(() => { let t = 0; for (let e = document.getElementById('ending'); e; e = e.offsetParent) t += e.offsetTop; return t - window.scrollY; });
  assert(y < 300 && y > -300, 'did not reach the ending: ' + y);
  assert(shown(await hdr(p)), 'header did not come back after the skip');
  await done(p);
});

await test('cinema: the Flutter path drives the same scenes (mode before screen, its own controls always off: the caption drives it), recorded through a stub hook', async () => {
  const p = await open('', {
    viewport: { width: 1280, height: 800 },
    init: () => {
      window.__calls = [];
      for (const n of ['setPhoneMode', 'setPhoneScenario', 'setPhoneScreen', 'setPhoneControls']) window[n] = (...a) => window.__calls.push([n, ...a]);
    },
  });
  const bad = [];
  const expected = [
    ['today', 'tab', 'nav.shop', false], ['today', 'checkout', undefined, false], ['today', 'processing', undefined, false], ['today', 'decline', undefined, false],
    ['proposed', 'decline', undefined, false], ['proposed', 'limit', undefined, false], ['proposed', 'recovery', undefined, false], ['proposed', 'tab', 'nav.shop', false],
  ];
  for (let n = 1; n <= 8; n += 1) {
    await p.evaluate(() => { window.__calls.length = 0; });
    await wheelToScene(p, n);
    const calls = await p.evaluate(() => window.__calls);
    const [mode, screen, tab, controls] = expected[n - 1];
    const iMode = calls.findIndex((c) => c[0] === 'setPhoneMode' && c[1] === mode);
    const iScreen = calls.findIndex((c) => c[0] === 'setPhoneScreen' && c[1] === screen && (tab === undefined || c[2] === tab));
    const ctl = calls.filter((c) => c[0] === 'setPhoneControls').pop();
    if (n === 1 && iScreen < 0 && iMode < 0) continue; // scene 1 is already showing when the page loads; its calls happen at start-up
    if (iMode < 0 || iScreen < 0 || iMode > iScreen) bad.push(`scene ${n}: ${JSON.stringify(calls)}`);
    if (!ctl || ctl[1] !== controls) bad.push(`scene ${n}: controls ${JSON.stringify(ctl)}`);
  }
  assert(bad.length === 0, bad.join(' | '));
  const first = await p.evaluate(() => window.__calls.length);
  assert(first > 0, 'nothing recorded');
  await done(p);
});

await test('cinema: in the last scene the caption controls drive the Flutter phone (case, then mode) through the hooks', async () => {
  const p = await open('', {
    viewport: { width: 1280, height: 800 },
    init: () => {
      window.__calls = [];
      for (const n of ['setPhoneMode', 'setPhoneScenario', 'setPhoneScreen', 'setPhoneControls']) window[n] = (...a) => window.__calls.push([n, ...a]);
    },
  });
  await wheelToScene(p, 8);
  await p.evaluate(() => { window.__calls.length = 0; });
  const btn = p.locator('#cinema-controls .scenarios__item').nth(1);
  const box = await btn.boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(150);
  let calls = await p.evaluate(() => window.__calls);
  const iS = calls.findIndex((c) => c[0] === 'setPhoneScenario' && c[1] === 'new-account');
  const iM = calls.findIndex((c) => c[0] === 'setPhoneMode' && c[1] === 'proposed');
  assert(iS >= 0 && iM > iS, 'case pick not forwarded: ' + JSON.stringify(calls));
  await p.evaluate(() => { window.__calls.length = 0; });
  const today = p.locator('#cinema-controls .toggle__btn').first();
  const tb = await today.boundingBox();
  await p.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await p.waitForTimeout(150);
  calls = await p.evaluate(() => window.__calls);
  assert(calls.some((c) => c[0] === 'setPhoneMode' && c[1] === 'today'), 'mode not forwarded: ' + JSON.stringify(calls));
  await done(p);
});

await test('cinema: the Flutter phone drives on start-up too (scene 1 pushed to the hooks before any scrolling)', async () => {
  const p = await open('', {
    viewport: { width: 1280, height: 800 },
    init: () => {
      window.__calls = [];
      for (const n of ['setPhoneMode', 'setPhoneScenario', 'setPhoneScreen', 'setPhoneControls']) window[n] = (...a) => window.__calls.push([n, ...a]);
    },
  });
  await p.waitForTimeout(500);
  const calls = await p.evaluate(() => window.__calls);
  assert(calls.some((c) => c[0] === 'setPhoneScreen' && c[1] === 'tab') && calls.some((c) => c[0] === 'setPhoneControls' && c[1] === false), JSON.stringify(calls));
  await done(p);
});

await test('cinema (flutter): without a screen hook the HTML phone is kept (kept-html:no-script-hook); with one the swap goes ahead', async () => {
  // An older Flutter build without the story hooks is simulated by refusing the
  // assignment of setPhoneScreen (the synced build defines it at start-up).
  const a = await open('', { flutter: true, reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 }, init: () => { Object.defineProperty(window, 'setPhoneScreen', { configurable: true, get() { return undefined; }, set() {} }); } });
  await settled(a);
  assert((await phoneStatus(a)) === 'kept-html:no-script-hook', 'status without the hook: ' + (await phoneStatus(a)));
  assert((await a.$eval(STAGE, (e) => e.dataset.engine)) === 'html', 'engine changed');
  assert(await a.evaluate(() => document.getElementById('phone-host').getAttribute('aria-hidden') === 'true'), 'Flutter phone exposed');
  await wheelToScene(a, 5);
  assert((await phoneState(a)).screen === 'decline', 'the HTML phone stopped following the story');
  await done(a);
  const b = await open('', { flutter: true, reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 }, init: () => { window.setPhoneScreen = () => {}; window.setPhoneControls = () => {}; } });
  await swapped(b);
  assert((await phoneStatus(b)) === 'flutter', 'status with the hook: ' + (await phoneStatus(b)));
  await done(b);
});

await test('cinema (flutter, real build): the synced phone has the story hooks, swaps in, and its own controls stay off', async () => {
  const p = await open('', { flutter: true, reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 } });
  await swapped(p);
  assert((await phoneStatus(p)) === 'flutter', 'status ' + (await phoneStatus(p)));
  const hooks = await p.evaluate(() => ['setPhoneScreen', 'setPhoneControls', 'setPhoneMode', 'setPhoneScenario'].map((n) => typeof window[n]));
  assert(hooks.every((t) => t === 'function'), 'hooks ' + hooks);
  await wheelToScene(p, 6);
  await p.waitForTimeout(600);
  const shot = await p.locator('#phone-host').screenshot();
  assert(shot.length > 5000, 'Flutter phone did not paint');
  await done(p);
});

await browser.close();
console.log(failures ? `\n${failures} of ${total} browser check(s) FAILED\n` : `\nBrowser checks pass (${total})\n`);
process.exit(failures ? 1 : 0);
