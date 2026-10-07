// Tiny static server for local measurement and the journey audit.
//   node scripts/serve.mjs [dir=dist] [port=8940]
// Serves pre-built .br / .gz siblings when the client accepts them (as a real
// host would), otherwise gzips on the fly; no caching.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { extname, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8940);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain' };
const readIf = async (f) => { try { return await readFile(f); } catch { return null; } };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname).slice(1);
  if (p === '') p = 'index.html';
  const file = resolve(root, p);
  try {
    if (!file.startsWith(root)) throw new Error('no');
    if ((await stat(file)).isDirectory()) throw new Error('dir');
    const h = { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' };
    const ae = req.headers['accept-encoding'] || '';
    let body = null;
    if (/\bbr\b/.test(ae) && (body = await readIf(file + '.br'))) h['content-encoding'] = 'br';
    else if (/gzip/.test(ae) && (body = await readIf(file + '.gz'))) h['content-encoding'] = 'gzip';
    else {
      body = await readFile(file);
      if (/gzip/.test(ae) && !/\.woff2$/.test(file)) { body = gzipSync(body, { level: 6 }); h['content-encoding'] = 'gzip'; }
    }
    res.writeHead(200, h); res.end(body);
  } catch (e) { if (process.env.DEBUG) console.error(e.message); res.writeHead(404); res.end('not found'); }
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on', port));
