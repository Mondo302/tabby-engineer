// Builds the phone and produces dist/: a folder ready to host statically.
//   node scripts/build-deploy.mjs [--no-build] [--js]
//   FLUTTER=C:/src/flutter/bin/flutter.bat overrides the SDK path.
// - release build, wasm (skwasm) with the JS+CanvasKit fallback that Flutter
//   selects itself for browsers without WasmGC; --js builds JS-only instead.
//   No source maps, no CDN (nothing is fetched from another origin).
// - keeps only what a browser can request: drops .symbols, the "heavy",
//   "wimp" and "webparagraph" engine variants, unused shaders.
// - writes .br (Brotli q11) and .gz (gzip 9) next to every compressible file
//   and prints raw / gzip / Brotli totals. host.html and flutter_bootstrap.js
//   (the failure fallback) are copied as built.
// Host it with Content-Encoding negotiation (or the .br/.gz siblings) and the
// right MIME types: .wasm application/wasm, .mjs text/javascript.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, 'build', 'web');
const dist = join(root, 'dist');
const args = new Set(process.argv.slice(2));

if (!args.has('--no-build')) {
  const flutter = process.env.FLUTTER || 'C:/src/flutter/bin/flutter.bat';
  const flags = ['build', 'web', '--release', '--no-web-resources-cdn', '--no-source-maps'];
  if (!args.has('--js')) flags.push('--wasm');
  const r = spawnSync(flutter, flags, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) { console.error('flutter build failed'); process.exit(1); }
}
if (!existsSync(join(build, 'main.dart.js'))) { console.error('no build/web; run without --no-build'); process.exit(1); }

const DROP = [/\.symbols$/, /^canvaskit\/(wimp|skwasm_heavy)\./, /^canvaskit\/webparagraph\//,
  /^assets\/shaders\//, /^assets\/AssetManifest\.bin\.json$/, /\.last_build_id$/];
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(build, dist, {
  recursive: true,
  filter: (src) => { const rel = relative(build, src).split(sep).join('/'); return !DROP.some((re) => re.test(rel)); },
});

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const skip = /\.(woff2|png|br|gz)$/; // already compressed
let raw = 0, gz = 0, br = 0;
const rows = [];
for (const f of walk(dist)) {
  const body = readFileSync(f);
  raw += body.length;
  if (skip.test(f)) { gz += body.length; br += body.length; continue; }
  const g = gzipSync(body, { level: 9 });
  const b = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } });
  writeFileSync(f + '.gz', g);
  writeFileSync(f + '.br', b);
  gz += g.length; br += b.length;
  rows.push([relative(dist, f).split(sep).join('/'), body.length, g.length, b.length]);
}
const kb = (n) => (n / 1024).toFixed(1).padStart(9) + ' KB';
console.log('\nfile'.padEnd(46) + 'raw'.padStart(12) + 'gzip'.padStart(12) + 'brotli'.padStart(12));
for (const r of rows.sort((a, b) => b[1] - a[1])) console.log(r[0].padEnd(44) + kb(r[1]) + kb(r[2]) + kb(r[3]));
console.log('\ndist total (every file shipped):'.padEnd(44) + kb(raw) + kb(gz) + kb(br));
console.log('dist/ ready. Serve it with Content-Encoding br/gzip; see header of this script.');
