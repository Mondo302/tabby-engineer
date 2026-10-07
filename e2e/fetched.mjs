// Lists every same-origin file a cold load fetches (and its on-wire size).
//   node e2e/fetched.mjs [base]
import { chromium, exe } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8940';
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 500, height: 900 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const sizes = new Map(), urls = new Map();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, e.request.url));
cdp.on('Network.loadingFinished', (e) => sizes.set(e.requestId, e.encodedDataLength));
await page.goto(`${BASE}/host.html`);
await page.waitForSelector('flutter-view');
await page.waitForTimeout(2500);
let total = 0;
for (const [id, u] of urls) { const n = sizes.get(id) ?? 0; total += n; console.log(String(n).padStart(9), u.replace(BASE, '')); }
console.log(String(total).padStart(9), 'TOTAL on the wire');
await b.close();
