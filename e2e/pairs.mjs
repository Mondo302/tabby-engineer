// Composes <name>-html[fix].png | <name>-flutter.png into <name>-pair.png for review.
//   node e2e/pairs.mjs <dir> [html|htmlfix]   (default htmlfix: the phone as its own CSS describes it)
import { chromium, exe } from './lib.mjs';
import { readdirSync, readFileSync } from 'node:fs';
const dir = process.argv[2];
const ref = process.argv[3] || 'htmlfix';
const b = await chromium.launch({ executablePath: exe });
const page = await b.newPage({ viewport: { width: 900, height: 1300 } });
const names = readdirSync(dir).filter((f) => f.endsWith(`-${ref}.png`)).map((f) => f.replace(`-${ref}.png`, ''));
const uri = (f) => 'data:image/png;base64,' + readFileSync(`${dir}/${f}`).toString('base64');
for (const n of names) {
  await page.setContent(`<body style="margin:0;background:#888;display:flex;gap:16px;padding:8px;align-items:flex-start"><div style="color:#fff;font:12px sans-serif">HTML<br><img src="${uri(`${n}-${ref}.png`)}"></div><div style="color:#fff;font:12px sans-serif">FLUTTER<br><img src="${uri(n + '-flutter.png')}"></div></body>`);
  await page.locator('body').screenshot({ path: `${dir}/${n}-pair.png` });
}
await b.close();
