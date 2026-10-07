// One image per screen: [EN html | EN flutter | AR html | AR flutter], for reviewing by eye.
//   node e2e/sheets.mjs <dir> [html|htmlfix]
import { chromium, exe } from './lib.mjs';
import { readdirSync, readFileSync } from 'node:fs';
const dir = process.argv[2];
const ref = process.argv[3] || 'htmlfix';
const b = await chromium.launch({ executablePath: exe });
const page = await b.newPage({ viewport: { width: 1700, height: 900 } });
const names = [...new Set(readdirSync(dir).filter((f) => f.endsWith(`-en-${ref}.png`)).map((f) => f.replace(`-en-${ref}.png`, '')))];
const uri = (f) => 'data:image/png;base64,' + readFileSync(`${dir}/${f}`).toString('base64');
const cell = (label, f) => `<div style="color:#fff;font:12px sans-serif">${label}<br><img src="${uri(f)}"></div>`;
for (const n of names) {
  await page.setContent(`<body style="margin:0;background:#888;display:flex;gap:12px;padding:8px;align-items:flex-start">${
    cell('EN html', `${n}-en-${ref}.png`)}${cell('EN flutter', `${n}-en-flutter.png`)}${cell('AR html', `${n}-ar-${ref}.png`)}${cell('AR flutter', `${n}-ar-flutter.png`)}</body>`);
  await page.locator('body').screenshot({ path: `${dir}/${n}-sheet.png` });
}
await b.close();
