#!/usr/bin/env node
// Static server that behaves like a compressing host: Brotli (quality 11,
// what a good CDN edge does at best) when the client accepts it, else gzip.
// Used to measure real transferred bytes; nothing here ships.
//
//   node scripts/serve.mjs [port=8937]
//
// Files up to 2 MB are compressed up front, larger ones (the fallback
// CanvasKit builds, rarely fetched) on first request. Cache-Control follows
// vercel.json so a reload behaves as it would deployed.

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8937);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain',
};
const COMPRESSIBLE = /\.(html|js|mjs|css|json|wasm|svg|txt|ttf)$|NOTICES$/;
const br = promisify(brotliCompress), gz = promisify(gzip);
const cache = new Map();

async function packed(file, body, kind) {
  const key = kind + file + (await stat(file)).mtimeMs; // a changed file is compressed again
  if (!cache.has(key)) {
    cache.set(key, kind === 'br'
      ? br(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: body.length } })
      : gz(body, { level: 9 }));
  }
  return cache.get(key);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'scripts'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full)); else out.push(full);
  }
  return out;
}

const cacheControl = (p) => /^phone\/[0-9a-f]{10}\//.test(p) ? 'public, max-age=31536000, immutable' : 'no-cache';

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1) || 'index.html';
    const file = resolve(ROOT, p);
    if (!file.startsWith(ROOT) || (await stat(file)).isDirectory()) throw new Error('nf');
    const body = await readFile(file);
    const h = { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': cacheControl(p) };
    const ae = req.headers['accept-encoding'] || '';
    let out = body;
    if (COMPRESSIBLE.test(file) && /\bbr\b/.test(ae)) { out = await packed(file, body, 'br'); h['content-encoding'] = 'br'; }
    else if (COMPRESSIBLE.test(file) && /gzip/.test(ae)) { out = await packed(file, body, 'gz'); h['content-encoding'] = 'gzip'; }
    h['content-length'] = out.length;
    h.vary = 'Accept-Encoding';
    if (process.env.ISOLATE) { // experiment: cross-origin isolation, see README
      h['cross-origin-opener-policy'] = 'same-origin';
      h['cross-origin-embedder-policy'] = 'require-corp';
    }
    res.writeHead(200, h);
    res.end(out);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, '127.0.0.1', async () => {
  for (const f of await walk(ROOT)) {
    if (COMPRESSIBLE.test(f) && (await stat(f)).size <= 2 * 1024 * 1024) await packed(f, await readFile(f), 'br');
  }
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}/ (Brotli ready)`);
});
