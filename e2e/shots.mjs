// Side-by-side screenshots: the HTML phone (reference, read only) and the
// Flutter phone, same state, 390px wide. Writes <out>/<name>-<lang>-{html,htmlfix,flutter}.png
//   node e2e/shots.mjs <outDir> [flutterBase] [htmlBase]     ONLY=name,name to limit
import { chromium, exe, fixReference } from './lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'shots';
const FL = process.argv[3] || 'http://127.0.0.1:8940';
const HT = process.argv[4] || 'http://127.0.0.1:8936';
mkdirSync(out, { recursive: true });

const tab = (t, mode) => [{ screen: 'tab', tab: 'nav.' + t, mode }, `tab=${t}&mode=${mode}`];
const scr = (screen, scenarioId = 'silent-block', mode = 'proposed') =>
  [{ screen, scenarioId, mode }, `screen=${screen}&scenario=${scenarioId}&mode=${mode}`];
// name: [html state, flutter query]
const shots = {
  home: tab('home', 'today'), shop: tab('shop', 'today'), payments: tab('payments', 'today'), profile: tab('profile', 'today'),
  'payments-proposed': tab('payments', 'proposed'), 'profile-proposed': tab('profile', 'proposed'),
  checkout: [{ screen: 'checkout', mode: 'today' }, 'screen=checkout'],
  processing: [{ screen: 'processing' }, 'screen=processing&delay=600000'],
  today: scr('decline', 'silent-block', 'today'),
};
for (const sc of ['silent-block', 'new-account', 'limit-cut']) {
  for (const s of ['decline', 'limit', 'recovery']) shots[`${sc}-${s}`] = scr(s, sc);
}
const only = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(shots);

const browser = await chromium.launch({ executablePath: exe });
async function htmlShots(fix, suffix, lang) {
  const h = await browser.newPage({ viewport: { width: 1000, height: 1100 }, reducedMotion: 'reduce' });
  await h.goto(`${HT}/index.html`);
  await h.evaluate(() => document.documentElement.setAttribute('data-theme', 'bright'));
  if (fix) await fixReference(h);
  await h.evaluate((l) => window.PAGE.setLang(l), lang);
  for (const name of only) {
    const [state] = shots[name];
    await h.evaluate((s) => window.PROTOTYPE.set(Object.assign({ mode: 'today', scenarioId: 'silent-block' }, s)), state);
    await h.waitForTimeout(400);
    await h.locator('.phone').screenshot({ path: `${out}/${name}-${lang}-${suffix}.png` });
  }
  await h.close();
}
for (const lang of ['en', 'ar']) {
  await htmlShots(false, 'html', lang);
  await htmlShots(true, 'htmlfix', lang);
  for (const name of only) {
    const [, q] = shots[name];
    const f = await browser.newPage({ viewport: { width: 500, height: 900 }, reducedMotion: 'reduce' });
    await f.goto(`${FL}/host.html?lang=${lang}&controls=0&${q}`);
    await f.waitForSelector('flutter-view', { timeout: 30000 });
    await f.waitForTimeout(2500);
    await f.locator('#phone-host').screenshot({ path: `${out}/${name}-${lang}-flutter.png` });
    await f.close();
  }
}
await browser.close();
console.log('done');
