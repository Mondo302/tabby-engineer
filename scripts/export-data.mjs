// Reads the HTML phone's data files (read-only) and writes JSON for the
// Flutter phone, so both share one source of truth for copy and scenarios.
// Usage: node scripts/export-data.mjs [path-to-html-project/assets]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] || (process.env.USERPROFILE || '').replace(/\\/g, '/') + '/tabby-imagine/assets');
const out = resolve(here, '..', 'assets', 'data');
mkdirSync(out, { recursive: true });

const sandbox = { window: {} };
for (const f of ['strings.js', 'scenarios.js', 'app-data.js']) {
  runInNewContext(readFileSync(resolve(src, f), 'utf8'), sandbox, { filename: f });
}
const { STRINGS, SCENARIOS, APP_DATA } = sandbox.window;
if (!STRINGS || !SCENARIOS || !APP_DATA) throw new Error('expected window.STRINGS/SCENARIOS/APP_DATA');

// Locale facts the phone needs, taken from the same Intl calls the HTML
// phone uses (prototype.js locale()): Gregorian calendar and Western digits
// in Arabic. Exported so Dart never retypes month names.
const locales = { en: 'en-GB', ar: 'ar-SA-u-ca-gregory-nu-latn' };
const format = {};
for (const [lang, loc] of Object.entries(locales)) {
  const months = [];
  for (let m = 0; m < 12; m += 1) {
    const parts = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' })
      .formatToParts(new Date(2026, m, 15));
    months.push(parts.find((p) => p.type === 'month').value);
  }
  const numLoc = lang === 'ar' ? loc : 'en-US';
  const group = new Intl.NumberFormat(numLoc).formatToParts(1000000).find((p) => p.type === 'group').value;
  const dayFirst = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' })
    .formatToParts(new Date(2026, 0, 15)).map((p) => p.type).filter((t) => t !== 'literal');
  format[lang] = { months, group, dateOrder: dayFirst };
}

const write = (name, data) =>
  writeFileSync(resolve(out, name), JSON.stringify(data, null, 1) + '\n');
// The phone only speaks its own screens: drop the page's own copy (hero,
// header, language menu, the two explainer sections).
// test/export_keys_test.dart fails if a key the Dart code names goes missing.
const PAGE_ONLY = /^(page|header|lang|s1|s2)./;
const trimmed = Object.fromEntries(Object.entries(STRINGS).map(([lang, table]) =>
  [lang, Object.fromEntries(Object.entries(table).filter(([k]) => !PAGE_ONLY.test(k)))]));
write('strings.json', trimmed);
write('scenarios.json', SCENARIOS);
write('app-data.json', APP_DATA);
write('format.json', format);

// Fonts come from the same project so the two phones share glyphs.
for (const f of ['plex-sans-400', 'plex-sans-600', 'plex-arabic-400', 'plex-arabic-600']) {
  copyFileSync(resolve(src, 'fonts', f + '.woff2'), resolve(here, '..', 'assets', 'fonts', f + '.woff2'));
}
console.log('exported:', Object.keys(trimmed.en).length, 'of', Object.keys(STRINGS.en).length, 'en strings kept,', SCENARIOS.length, 'scenarios');
