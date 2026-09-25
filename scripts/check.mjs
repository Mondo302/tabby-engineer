#!/usr/bin/env node
// Automated checks, run after every increment (build-loop Phase 3 gate).
// Usage: node scripts/check.mjs
//
// Checks:
//   1. <div> tags balanced in every HTML file
//   2. no duplicate id="" attributes
//   3. every JS file parses (node --check)
//   4. every local href/src resolves to a real file
//   5. anonymity: no identifying strings anywhere (round one is judged blind);
//      every file is scanned, phone/ included. Text files as UTF-8, binaries
//      (.wasm, fonts, images) as raw bytes read as latin1, so a build path or
//      name embedded in a wasm file is caught too. Nothing is skipped.
//   7. phone/ integrity: one version folder, matching assets/phone-version.js,
//      the files the loader needs, and a content hash that still matches

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.vercel']);

// Identity must never reach the published entry. Judged blind in round one.
// The identifying terms are NOT listed in this file, because a public repo would then
// publish them. They live in an untracked file at the repo root, .identity-terms
// (one regular expression per line; blank lines and # comments are ignored; it is listed
// in .gitignore). Without that file only the generic patterns below run, and the check
// says so on its last line.
const TERMS_FILE = join(ROOT, '.identity-terms');
const FORBIDDEN = [/C:[\\/]+Users[\\/]+/i, new RegExp('Obsidian' + ' Vault', 'i')];
const FORBIDDEN_RESEARCH_NAMES = [];
let termsLoaded = false;
if (existsSync(TERMS_FILE)) {
  termsLoaded = true;
  for (const line of readFileSync(TERMS_FILE, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (t && !t.startsWith('#')) FORBIDDEN.push(new RegExp(t, 'i'));
  }
}

const failures = [];
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

// --- 1 + 2 + 4: HTML structure and links -----------------------------------
for (const file of files.filter((f) => extname(f) === '.html')) {
  const html = readFileSync(file, 'utf8');
  const name = rel(file);

  const open = (html.match(/<div\b/gi) || []).length;
  const close = (html.match(/<\/div>/gi) || []).length;
  if (open !== close) fail(name, `div imbalance: ${open} open, ${close} close`);

  const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(name, `duplicate id(s): ${[...new Set(dupes)].join(', ')}`);

  const refs = [...html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#|\/\/)/i.test(ref)) continue;
    const target = resolve(dirname(file), ref.split(/[?#]/)[0]);
    if (!existsSync(target)) fail(name, `broken local link: ${ref}`);
  }
}

// --- 3: JavaScript parses ---------------------------------------------------
for (const file of files.filter((f) => ['.js', '.mjs'].includes(extname(f)))) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    fail(rel(file), `syntax error: ${String(err.stderr || err).split('\n')[0]}`);
  }
}

// --- 5: anonymity -----------------------------------------------------------
const BINARY = new Set(['.wasm', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.br', '.gz']);
for (const file of files) {
  if (rel(file) === '.identity-terms') continue; // the terms file lists the terms, by design
  const text = readFileSync(file, BINARY.has(extname(file).toLowerCase()) ? 'latin1' : 'utf8');
  for (const pattern of FORBIDDEN) {
    if (pattern.test(text)) fail(rel(file), `ANONYMITY: matches ${pattern}`);
  }
  for (const pattern of FORBIDDEN_RESEARCH_NAMES) {
    if (pattern.test(text)) fail(rel(file), `PRIVACY: real research name matches ${pattern}`);
  }
}

// --- 6: no-JS copy stays in sync with strings.js, and unverified quotes stay out
// Sections 1 and 2 ship their English as static HTML so they read with
// JavaScript off; page.js re-fills them from strings.js. If the two ever
// differ, the page would visibly change text when the script loads.
{
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, 'assets/strings.js'), 'utf8'), sandbox);
  const EN = sandbox.window.STRINGS.en;
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  let staticCount = 0;
  for (const m of html.matchAll(/<(\w+)[^>]*\sdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const [, , key, inner] = m;
    if (!norm(inner)) continue;
    staticCount += 1;
    if (EN[key] === undefined) fail('index.html', `static copy for unknown key ${key}`);
    else if (norm(inner) !== norm(EN[key])) fail('index.html', `static copy out of sync with strings.js: ${key}`);
  }
  if (staticCount < 15) fail('index.html', `sections 1 and 2 should ship static English (found ${staticCount} filled nodes)`);

  const raw = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const verifies = (raw.match(/<!--\s*VERIFY:/g) || []).length;
  if (verifies < 2) fail('index.html', `expected 2 <!-- VERIFY: --> markers for the unverified quotes, found ${verifies}`);
  // The quoted help-centre wording must not be live in the visible page or strings.
  for (const phrase of [/make more transactions/i, /regardless of whether or not you are overdue/i]) {
    if (phrase.test(html)) fail('index.html', `unverified quote is visible: ${phrase}`);
    if (Object.values(EN).some((v) => phrase.test(v))) fail('strings.js', `unverified quote is in the string table: ${phrase}`);
  }
}

// --- 7: phone/ integrity ------------------------------------------------------
// One version folder, named in assets/phone-version.js, holding what the loader
// needs, whose content still hashes to its own name (catches a hand edit).
{
  const versionFile = join(ROOT, 'assets/phone-version.js');
  const m = existsSync(versionFile) && /PHONE_BASE\s*=\s*'phone\/([0-9a-f]{10})\/'/.exec(readFileSync(versionFile, 'utf8'));
  if (!m) fail('assets/phone-version.js', 'missing or malformed (run scripts/sync-phone.mjs)');
  else {
    const dirs = existsSync(join(ROOT, 'phone')) ? readdirSync(join(ROOT, 'phone')) : [];
    if (dirs.length !== 1 || dirs[0] !== m[1]) fail('phone', `expected exactly phone/${m[1]}/, found [${dirs.join(', ')}]`);
    else {
      const base = join(ROOT, 'phone', m[1]);
      for (const need of ['main.dart.js', 'main.dart.wasm', 'main.dart.mjs', 'flutter.js', 'flutter_bootstrap.js', 'canvaskit/canvaskit.wasm', 'assets/FontManifest.json']) {
        if (!existsSync(join(base, need))) fail('phone/' + m[1], `missing ${need}`);
      }
      const { createHash } = await import('node:crypto');
      const h = createHash('sha256');
      const inner = walk(base).map((f) => f.slice(base.length + 1).replace(/\\/g, '/')).sort();
      for (const r of inner) h.update(r + '\0').update(readFileSync(join(base, r)));
      if (h.digest('hex').slice(0, 10) !== m[1]) fail('phone/' + m[1], 'content hash does not match its folder name (edited by hand? re-run sync-phone.mjs)');
      for (const r of inner) if (/\.(br|gz|map|symbols)$/.test(r)) fail('phone/' + m[1], `should not ship: ${r}`);
    }
  }
}

// --- report -----------------------------------------------------------------
const counts = {
  html: files.filter((f) => extname(f) === '.html').length,
  js: files.filter((f) => ['.js', '.mjs'].includes(extname(f))).length,
  css: files.filter((f) => extname(f) === '.css').length,
};

if (failures.length) {
  console.error('\nCHECKS FAILED\n');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\n${failures.length} problem(s).\n`);
  process.exit(1);
}

console.log(
  `\nChecks pass — ${counts.html} html, ${counts.js} js, ${counts.css} css.\n` +
    '  ✓ divs balanced   ✓ no duplicate ids   ✓ js parses\n' +
    '  ✓ local links resolve   ' +
      (termsLoaded ? '✓ anonymity clean' : '⚠ anonymity: generic patterns only (no .identity-terms file)') +
      '\n'
);
